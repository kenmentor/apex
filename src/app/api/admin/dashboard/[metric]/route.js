import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

export async function GET(request, { params }) {
  try {
    const { metric } = await params
    const col = await getCollection('analytics')
    const now = new Date()
    const sevenDays = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDays = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const match = { createdAt: { $gte: sevenDays.toISOString() } }
    const match30 = { createdAt: { $gte: thirtyDays.toISOString() } }

    switch (metric) {

      // ── OVERVIEW ──
      case 'overview': {
        const dailyViews = await col.aggregate([
          { $match: { ...match30, event: 'page_view' } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: { $dateFromString: { dateString: '$createdAt' } } } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]).toArray()

        const dailySessions = await col.aggregate([
          { $match: match30 },
          { $group: { _id: { day: { $dateToString: { format: '%Y-%m-%d', date: { $dateFromString: { dateString: '$createdAt' } } } }, session: '$data.sessionId' } } },
          { $group: { _id: '$_id.day', count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]).toArray()

        const eventTypes = await col.aggregate([
          { $match: match30 },
          { $group: { _id: '$event', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]).toArray()

        return NextResponse.json({ dailyViews, dailySessions, eventTypes })
      }

      // ── PWA VS WEB ──
      case 'pwa': {
        const byPath = await col.aggregate([
          { $match: { ...match, event: 'page_view' } },
          { $group: { _id: { path: '$data.path', pwa: '$data.isPwa' }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]).toArray()

        const pwaDaily = await col.aggregate([
          { $match: { ...match30, event: 'page_view', 'data.isPwa': true } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: { $dateFromString: { dateString: '$createdAt' } } } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]).toArray()

        const webDaily = await col.aggregate([
          { $match: { ...match30, event: 'page_view', 'data.isPwa': false } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: { $dateFromString: { dateString: '$createdAt' } } } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]).toArray()

        return NextResponse.json({ byPath, pwaDaily, webDaily })
      }

      // ── PAGE REFRESHES ──
      case 'refreshes': {
        const byPath = await col.aggregate([
          { $match: { ...match, event: 'page_refresh' } },
          { $group: { _id: '$data.path', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]).toArray()

        const daily = await col.aggregate([
          { $match: { ...match30, event: 'page_refresh' } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: { $dateFromString: { dateString: '$createdAt' } } } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]).toArray()

        return NextResponse.json({ byPath, daily })
      }

      // ── DOWNLOADS ──
      case 'downloads': {
        const bySource = await col.aggregate([
          { $match: { ...match, event: 'download_click' } },
          { $group: { _id: '$data.source', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]).toArray()

        const daily = await col.aggregate([
          { $match: { ...match30, event: 'download_click' } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: { $dateFromString: { dateString: '$createdAt' } } } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]).toArray()

        return NextResponse.json({ bySource, daily })
      }

      // ── PEAK HOURS ──
      case 'hours': {
        const hourly = await col.aggregate([
          { $match: match },
          { $group: { _id: { $hour: { $dateFromString: { dateString: '$createdAt' } } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]).toArray()

        const byEventType = await col.aggregate([
          { $match: match },
          { $group: { _id: { hour: { $hour: { $dateFromString: { dateString: '$createdAt' } } }, event: '$event' }, count: { $sum: 1 } } },
          { $sort: { '_id.hour': 1 } },
        ]).toArray()

        return NextResponse.json({ hourly, byEventType })
      }

      // ── FLASHCARDS ──
      case 'flashcards': {
        const daily = await col.aggregate([
          { $match: { ...match30, event: 'flashcard_open' } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: { $dateFromString: { dateString: '$createdAt' } } } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]).toArray()

        const durations = await col.aggregate([
          { $match: { ...match, event: 'flashcard_time', 'data.duration': { $exists: true } } },
          { $group: { _id: null, avg: { $avg: '$data.duration' }, min: { $min: '$data.duration' }, max: { $max: '$data.duration' }, count: { $sum: 1 } } },
        ]).toArray()

        const bySection = await col.aggregate([
          { $match: { ...match, event: 'flashcard_open', 'data.section': { $exists: true } } },
          { $group: { _id: '$data.section', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]).toArray()

        const durationBuckets = await col.aggregate([
          { $match: { ...match, event: 'flashcard_time', 'data.duration': { $exists: true } } },
          { $bucket: { groupBy: '$data.duration', boundaries: [0, 5, 10, 20, 30, 60, 120, 999999], default: 'unknown', output: { count: { $sum: 1 } } } },
        ]).toArray()

        return NextResponse.json({ daily, durations: durations[0] || null, bySection, durationBuckets })
      }

      // ── ENGAGEMENT ──
      case 'engagement': {
        const eventDepth = await col.aggregate([
          { $match: match },
          { $group: { _id: '$data.sessionId', count: { $sum: 1 } } },
          { $bucket: { groupBy: '$count', boundaries: [1, 3, 6, 10, 20, 50, 100, 999999], default: 'unknown', output: { sessions: { $sum: 1 } } } },
        ]).toArray()

        const navPaths = await col.aggregate([
          { $match: { ...match, event: 'navigation_click', 'data.to': { $exists: true } } },
          { $group: { _id: '$data.to', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]).toArray()

        return NextResponse.json({ eventDepth, navPaths })
      }

      // ── TOP PAGES ──
      case 'pages': {
        const pages = await col.aggregate([
          { $match: { ...match30, event: 'page_view' } },
          { $group: { _id: '$data.path', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]).toArray()

        const daily = await col.aggregate([
          { $match: { ...match30, event: 'page_view' } },
          { $group: { _id: { day: { $dateToString: { format: '%Y-%m-%d', date: { $dateFromString: { dateString: '$createdAt' } } } }, path: '$data.path' }, count: { $sum: 1 } } },
          { $sort: { '_id.day': 1 } },
        ]).toArray()

        return NextResponse.json({ pages, daily })
      }

      // ── QUIZZES ──
      case 'quizzes': {
        const started = await col.countDocuments({ ...match, event: 'quiz_started' })
        const completed = await col.countDocuments({ ...match, event: 'quiz_completed' })
        const answers = await col.countDocuments({ ...match, event: 'quiz_answer' })

        const dailyStarts = await col.aggregate([
          { $match: { ...match30, event: 'quiz_started' } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: { $dateFromString: { dateString: '$createdAt' } } } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]).toArray()

        const dailyCompletions = await col.aggregate([
          { $match: { ...match30, event: 'quiz_completed' } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: { $dateFromString: { dateString: '$createdAt' } } } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]).toArray()

        const scores = await col.aggregate([
          { $match: { ...match, event: 'quiz_completed', 'data.score': { $exists: true }, 'data.total': { $exists: true } } },
          { $group: { _id: null, avgScore: { $avg: '$data.score' }, avgTotal: { $avg: '$data.total' }, avgTime: { $avg: '$data.timeSpent' }, count: { $sum: 1 } } },
        ]).toArray()

        const scoreBuckets = await col.aggregate([
          { $match: { ...match, event: 'quiz_completed', 'data.score': { $exists: true }, 'data.total': { $exists: true } } },
          { $addFields: { pct: { $multiply: [{ $divide: ['$data.score', '$data.total'] }, 100] } } },
          { $bucket: { groupBy: '$pct', boundaries: [0, 20, 40, 60, 80, 101], default: 'unknown', output: { count: { $sum: 1 } } } },
        ]).toArray()

        const byCourse = await col.aggregate([
          { $match: { ...match, event: 'quiz_completed' } },
          { $group: { _id: '$data.course', count: { $sum: 1 }, avgScore: { $avg: '$data.score' } } },
          { $sort: { count: -1 } },
        ]).toArray()

        return NextResponse.json({
          started, completed, answers,
          completionRate: started > 0 ? Math.round((completed / started) * 100) : 0,
          avgScore: scores[0] && scores[0].avgTotal > 0 ? Math.round((scores[0].avgScore / scores[0].avgTotal) * 100) : 0,
          avgTimeSec: scores[0] ? Math.round(scores[0].avgTime) : 0,
          totalScored: scores[0]?.count || 0,
          dailyStarts, dailyCompletions, scoreBuckets, byCourse,
        })
      }

      // ── RETENTION ──
      case 'retention': {
        const allTime = { createdAt: { $gte: thirtyDays.toISOString() } }

        const dayBuckets = await col.aggregate([
          { $match: allTime },
          { $group: { _id: { day: { $dateToString: { format: '%Y-%m-%d', date: { $dateFromString: { dateString: '$createdAt' } } } }, session: '$data.sessionId' } } },
          { $group: { _id: '$_id.session', days: { $addToSet: '$_id.day' }, count: { $sum: 1 } } },
        ]).toArray()

        const returning = dayBuckets.filter(s => s.days.length > 1).length
        const oneTime = dayBuckets.filter(s => s.days.length === 1).length
        const retentionRate = (returning + oneTime) > 0 ? Math.round((returning / (returning + oneTime)) * 100) : 0

        const daily = await col.aggregate([
          { $match: allTime },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: { $dateFromString: { dateString: '$createdAt' } } } }, sessions: { $addToSet: '$data.sessionId' } } },
          { $sort: { _id: 1 } },
          { $project: { _id: 1, sessionCount: { $size: '$sessions' } } },
        ]).toArray()

        const sessionCounts = dayBuckets.map(s => s.count)
        const avgSessionsPerUser = sessionCounts.length > 0 ? Math.round((sessionCounts.reduce((a, b) => a + b, 0) / sessionCounts.length) * 10) / 10 : 0

        return NextResponse.json({
          returning, oneTime, retentionRate,
          totalUsers: returning + oneTime,
          avgSessionsPerUser,
          dailyActivity: daily.map(d => ({ date: d._id, sessions: d.sessionCount })),
          sessionDepth: [
            { label: '1 session', count: oneTime },
            { label: '2+ sessions', count: returning },
          ],
        })
      }

      // ── ACTIVE USERS ──
      case 'active': {
        const twentyFourHours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        const twoDays = new Date(now.getTime() - 48 * 60 * 60 * 1000)

        // Hourly active users (last 24h) using heartbeats as online signals
        const hourlyActive = await col.aggregate([
          { $match: { createdAt: { $gte: twentyFourHours.toISOString() }, event: 'heartbeat' } },
          { $group: { _id: { hour: { $dateToString: { format: '%Y-%m-%dT%H:00:00Z', date: { $dateFromString: { dateString: '$createdAt' } } } }, session: '$data.sessionId' } } },
          { $group: { _id: '$_id.hour', count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]).toArray()

        // Daily active users (30d) - unique sessions per day
        const dailyActive = await col.aggregate([
          { $match: { ...match30, event: 'heartbeat' } },
          { $group: { _id: { day: { $dateToString: { format: '%Y-%m-%d', date: { $dateFromString: { dateString: '$createdAt' } } } }, session: '$data.sessionId' } } },
          { $group: { _id: '$_id.day', count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]).toArray()

        // Current active users at various windows
        const now_ = new Date()
        const windows = [5, 15, 30, 60]
        const activeWindows = {}
        for (const min of windows) {
          const since = new Date(now_.getTime() - min * 60 * 1000)
          const sessions = await col.aggregate([
            { $match: { createdAt: { $gte: since.toISOString() }, event: 'heartbeat' } },
            { $group: { _id: '$data.sessionId' } },
            { $count: 'total' },
          ]).toArray()
          activeWindows[`${min}min`] = sessions[0]?.total || 0
        }

        // Estimated total unique active users per day (last 7 days)
        const weeklyActive = await col.aggregate([
          { $match: { createdAt: { $gte: sevenDays.toISOString() }, event: 'heartbeat' } },
          { $group: { _id: '$data.sessionId' } },
          { $count: 'total' },
        ]).toArray()

        // Session lengths (from heartbeat count per session)
        const sessionHeartbeats = await col.aggregate([
          { $match: { createdAt: { $gte: twentyFourHours.toISOString() }, event: 'heartbeat' } },
          { $group: { _id: '$data.sessionId', count: { $sum: 1 } } },
          { $bucket: { groupBy: '$count', boundaries: [1, 3, 6, 12, 24, 48, 999999], default: 'unknown', output: { sessions: { $sum: 1 } } } },
        ]).toArray()

        return NextResponse.json({
          hourlyActive,
          dailyActive,
          activeWindows,
          weeklyActive: weeklyActive[0]?.total || 0,
          sessionHeartbeats,
          lastUpdated: now_.toISOString(),
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown metric' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
