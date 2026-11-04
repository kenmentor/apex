import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-server'

export async function POST(request) {
  try {
    const raw = await request.text().catch(() => '')
    if (!raw) return NextResponse.json({ error: 'empty body' }, { status: 400 })
    if (raw.length > 100000) return NextResponse.json({ error: 'body too large' }, { status: 413 })
    let body = null
    try {
      body = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
    }
    const { event, data = {} } = body || {}

    if (!event) {
      return NextResponse.json({ error: 'event required' }, { status: 400 })
    }

    const col = await getCollection('analytics')
    await col.insertOne({
      event,
      data,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Admins only' }, { status: 403 })
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '7d'
    const eventFilter = searchParams.get('event')
    const dateFilter = searchParams.get('date')

    const col = await getCollection('analytics')

    const now = new Date()
    const daysBack = range === '24h' ? 1 : range === '30d' ? 30 : 7
    const since = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

    const match = { createdAt: { $gte: since.toISOString() } }

    // Date filter: narrow to a specific day (YYYY-MM-DD)
    if (dateFilter) {
      match.createdAt = {
        $gte: `${dateFilter}T00:00:00.000Z`,
        $lt: `${dateFilter}T23:59:59.999Z`,
      }
    }

    // Event filter: narrow to a specific event type
    if (eventFilter) {
      match.event = eventFilter
    }

    // Total events
    const totalEvents = await col.countDocuments(match)

    // Unique visitors (by sessionId)
    const sessions = await col.aggregate([
      { $match: match },
      { $group: { _id: '$data.sessionId' } },
      { $count: 'total' },
    ]).toArray()
    const uniqueVisitors = sessions[0]?.total || 0

    // Unique signed-in users
    const signedInUsers = await col.aggregate([
      { $match: { ...match, 'data.email': { $exists: true, $ne: null } } },
      { $group: { _id: '$data.email' } },
      { $count: 'total' },
    ]).toArray()
    const signedInCount = signedInUsers[0]?.total || 0

    // Page views by path
    const pageViews = await col.aggregate([
      { $match: { ...match, event: 'page_view' } },
      { $group: { _id: '$data.path', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]).toArray()

    // Events breakdown
    const eventsBreakdown = await col.aggregate([
      { $match: match },
      { $group: { _id: '$event', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray()

    // Quiz stats
    const quizStarted = await col.countDocuments({ ...match, event: 'quiz_started' })
    const quizCompleted = await col.countDocuments({ ...match, event: 'quiz_completed' })

    // Average quiz score
    const quizScores = await col.aggregate([
      { $match: { ...match, event: 'quiz_completed', 'data.score': { $exists: true } } },
      { $group: { _id: null, avgScore: { $avg: '$data.score' }, avgTotal: { $avg: '$data.total' }, avgTime: { $avg: '$data.timeSpent' }, count: { $sum: 1 } } },
    ]).toArray()

    // Average session duration (from sessions)
    const sessionDurations = await col.aggregate([
      { $match: { ...match, event: 'session_end', 'data.duration': { $exists: true } } },
      { $group: { _id: null, avgDuration: { $avg: '$data.duration' } } },
    ]).toArray()

    // Daily active users
    const dailyActive = await col.aggregate([
      { $match: match },
      { $addFields: { day: { $substr: ['$createdAt', 0, 10] } } },
      { $group: { _id: { day: '$day', sessionId: '$data.sessionId' } } },
      { $group: { _id: '$_id.day', users: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray()

    const avgQuiz = quizScores[0] || null

    // ---- Growth: signups come from the users collection itself ----
    let signups = 0
    let signupsDaily = []
    try {
      const users = await getCollection('users')
      const sinceDate = new Date(since.getTime())
      signups = await users.countDocuments({ createdAt: { $gte: sinceDate } }).catch(() => 0)
      if (!signups) {
        // Legacy docs may carry ISO strings instead of Dates.
        signups = await users.countDocuments({ createdAt: { $gte: since.toISOString() } }).catch(() => 0)
      }
      const perDay = await users.aggregate([
        { $match: { $or: [{ createdAt: { $gte: sinceDate } }, { createdAt: { $gte: since.toISOString() } }] } },
        { $group: { _id: { $substr: [{ $toString: '$createdAt' }, 0, 10] }, n: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]).toArray().catch(() => [])
      signupsDaily = perDay.map(d => ({ date: d._id, users: d.n }))
    } catch {}

    const installs = await col.countDocuments({ ...match, event: 'pwa_install' }).catch(() => 0)
    const shares = await col.countDocuments({ ...match, event: 'share_completed' }).catch(() => 0)

    let contributor = { pending: 0, approved: 0, declined: 0 }
    try {
      const reqs = await getCollection('contributor_requests')
      const agg = await reqs.aggregate([
        { $group: { _id: '$status', n: { $sum: 1 } } },
      ]).toArray().catch(() => [])
      for (const r of agg) contributor[r._id] = r.n
    } catch {}

    // ---- Learning: quizzes by course + flashcards ----
    const quizByCourse = await col.aggregate([
      { $match: { ...match, event: 'quiz_started' } },
      { $group: { _id: '$data.course', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 5 },
    ]).toArray().catch(() => [])
    const flashcards = await col.countDocuments({ ...match, event: 'flashcard_open' }).catch(() => 0)

    // ---- Content: uploads + notes from source collections; demand from search ----
    let uploadsByKind = []
    let notesCreated = 0
    try {
      const mats = await getCollection('user_materials')
      uploadsByKind = await mats.aggregate([
        { $match: { createdAt: { $gte: since.toISOString() } } },
        { $group: { _id: '$itemKind', n: { $sum: 1 } } },
        { $sort: { n: -1 } },
      ]).toArray().catch(() => [])
      const nodes = await getCollection('library_nodes')
      notesCreated = await nodes.countDocuments({ itemKind: 'notes', createdAt: { $gte: since.toISOString() } }).catch(() => 0)
    } catch {}
    const topSearches = await col.aggregate([
      { $match: { ...match, event: 'search_executed' } },
      { $group: { _id: '$data.query_string', n: { $sum: 1 }, avgResults: { $avg: '$data.results_count' } } },
      { $sort: { n: -1 } },
      { $limit: 8 },
    ]).toArray().catch(() => [])
    const zeroSearches = await col.aggregate([
      { $match: { ...match, event: 'search_executed', 'data.results_count': 0 } },
      { $group: { _id: '$data.query_string', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 8 },
    ]).toArray().catch(() => [])
    const videoPlays = await col.countDocuments({ ...match, event: 'video_play' }).catch(() => 0)
    const videoByCourse = await col.aggregate([
      { $match: { ...match, event: 'video_play' } },
      { $group: { _id: '$data.courseCode', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 5 },
    ]).toArray().catch(() => [])

    // ---- Stability: telemetry store uses Date objects (not ISO strings) ----
    let runtimeErrors = []
    let rageClicks = 0
    try {
      const tcol = await getCollection('telemetry')
      const tmatch = { createdAt: { $gte: since } }
      runtimeErrors = await tcol.aggregate([
        { $match: { ...tmatch, event: 'runtime_error_caught' } },
        { $group: { _id: '$payload.error_message', n: { $sum: 1 } } },
        { $sort: { n: -1 } },
        { $limit: 5 },
      ]).toArray().catch(() => [])
      rageClicks = await tcol.countDocuments({ ...tmatch, event: 'ui_rage_click' }).catch(() => 0)
    } catch {}
    runtimeErrors = runtimeErrors.map(e => ({ message: String(e._id || 'unknown').slice(0, 120), n: e.n }))

    return NextResponse.json({
      range,
      totalEvents,
      uniqueVisitors,
      signedInCount,
      signups,
      signupsDaily,
      installs,
      shares,
      contributor,
      flashcards,
      videoPlays,
      videoByCourse: videoByCourse.map(v => ({ course: v._id || 'General', n: v.n })),
      quizByCourse: quizByCourse.map(q => ({ course: q._id || 'General', n: q.n })),
      uploadsByKind: uploadsByKind.map(u => ({ kind: u._id || 'file', n: u.n })),
      notesCreated,
      topSearches: topSearches.map(s => ({ q: s._id, n: s.n, avgResults: Math.round(s.avgResults || 0) })),
      zeroSearches: zeroSearches.map(s => ({ q: s._id, n: s.n })),
      runtimeErrors,
      rageClicks,
      pageViews: pageViews.map(p => ({ path: p._id, count: p.count })),
      eventsBreakdown: eventsBreakdown.map(e => ({ event: e._id, count: e.count })),
      quiz: {
        started: quizStarted,
        completed: quizCompleted,
        completionRate: quizStarted > 0 ? Math.round((quizCompleted / quizStarted) * 100) : 0,
        avgScore: avgQuiz ? Math.round((avgQuiz.avgScore / avgQuiz.avgTotal) * 100) : 0,
        avgTimePerQuiz: avgQuiz ? Math.round(avgQuiz.avgTime) : 0,
        totalQuizzes: avgQuiz?.count || 0,
      },
      avgSessionDuration: sessionDurations[0] ? Math.round(sessionDurations[0].avgDuration) : 0,
      dailyActive: dailyActive.map(d => ({ date: d._id, users: d.users })),
    })
  } catch (error) {
    console.error('Analytics GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
