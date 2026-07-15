import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

export async function POST(request) {
  try {
    const body = await request.json()
    const { event, data = {} } = body

    if (!event) {
      return NextResponse.json({ error: 'event required' }, { status: 400 })
    }

    const col = await getCollection('analytics')
    await col.insertOne({
      event,
      data,
      createdAt: new Date(),
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '7d'
    const eventFilter = searchParams.get('event')
    const dateFilter = searchParams.get('date')

    const col = await getCollection('analytics')

    const now = new Date()
    const daysBack = range === '24h' ? 1 : range === '30d' ? 30 : 7
    const since = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

    const match = { createdAt: { $gte: since } }

    // Date filter: narrow to a specific day (YYYY-MM-DD)
    if (dateFilter) {
      match.createdAt = {
        $gte: new Date(`${dateFilter}T00:00:00.000Z`),
        $lt: new Date(`${dateFilter}T23:59:59.999Z`),
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
      { $addFields: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } } },
      { $group: { _id: { day: '$day', sessionId: '$data.sessionId' } } },
      { $group: { _id: '$_id.day', users: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray()

    const avgQuiz = quizScores[0] || null

    return NextResponse.json({
      range,
      totalEvents,
      uniqueVisitors,
      signedInCount,
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
