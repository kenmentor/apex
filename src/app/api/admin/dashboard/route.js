import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

export async function GET() {
  try {
    const col = await getCollection('analytics')

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const baseMatch = { createdAt: { $gte: sevenDaysAgo } }
    const todayMatch = { createdAt: { $gte: todayStart } }

    // Total events
    const totalEvents = await col.countDocuments(baseMatch)

    // Unique sessions
    const sessions = await col.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$data.sessionId' } },
      { $count: 'total' },
    ]).toArray()
    const uniqueSessions = sessions[0]?.total || 0

    // Unique sessions today
    const todaySessions = await col.aggregate([
      { $match: todayMatch },
      { $group: { _id: '$data.sessionId' } },
      { $count: 'total' },
    ]).toArray()
    const todayUnique = todaySessions[0]?.total || 0

    // Active users right now (last 5 min)
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000)
    const activeNow = await col.aggregate([
      { $match: { createdAt: { $gte: fiveMinAgo } } },
      { $group: { _id: '$data.sessionId' } },
      { $count: 'total' },
    ]).toArray()

    // Page refreshes
    const pageRefreshes = await col.countDocuments({
      ...baseMatch,
      event: 'page_refresh',
    })

    // PWA vs Web
    const pwaCount = await col.aggregate([
      { $match: { ...baseMatch, event: 'page_view', 'data.isPwa': true } },
      { $group: { _id: '$data.sessionId' } },
      { $count: 'total' },
    ]).toArray()
    const webPwaSessions = {
      pwa: pwaCount[0]?.total || 0,
      web: uniqueSessions - (pwaCount[0]?.total || 0),
    }

    // Download clicks
    const downloadClicks = await col.countDocuments({
      ...baseMatch,
      event: 'download_click',
    })

    // Peak active hours (hourly distribution)
    const hourlyActivity = await col.aggregate([
      { $match: baseMatch },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]).toArray()

    // Flashcard stats
    const flashcardOpens = await col.countDocuments({
      ...baseMatch,
      event: 'flashcard_open',
    })
    const flashcardTimes = await col.aggregate([
      { $match: { ...baseMatch, event: 'flashcard_time', 'data.duration': { $exists: true } } },
      { $group: { _id: null, avgDuration: { $avg: '$data.duration' }, total: { $sum: 1 } } },
    ]).toArray()

    // Click-through rate
    const navigationClicks = await col.countDocuments({
      ...baseMatch,
      event: 'navigation_click',
    })
    const pageViews = await col.countDocuments({
      ...baseMatch,
      event: 'page_view',
    })
    const ctr = pageViews > 0 ? Math.round((navigationClicks / pageViews) * 100) : 0

    // Session engagement (avg events per session)
    const sessionsWithCount = await col.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$data.sessionId', count: { $sum: 1 } } },
      { $group: { _id: null, avgEvents: { $avg: '$count' }, maxEvents: { $max: '$count' } } },
    ]).toArray()
    const avgEventsPerSession = sessionsWithCount[0]?.avgEvents || 0
    const maxEventsPerSession = sessionsWithCount[0]?.maxEvents || 0

    // Heartbeats (active time indicator)
    const heartbeats = await col.countDocuments({
      ...baseMatch,
      event: 'heartbeat',
    })
    const estimatedActiveMinutes = heartbeats * 0.5

    // Top pages
    const topPages = await col.aggregate([
      { $match: { ...baseMatch, event: 'page_view' } },
      { $group: { _id: '$data.path', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]).toArray()

    // Events breakdown
    const eventsBreakdown = await col.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$event', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray()

    return NextResponse.json({
      totalEvents,
      uniqueSessions,
      todayUnique,
      activeNow: activeNow[0]?.total || 0,
      pageRefreshes,
      webPwaSessions,
      downloadClicks,
      peakHours: hourlyActivity.map(h => ({ hour: h._id, count: h.count })),
      flashcard: {
        opens: flashcardOpens,
        avgTimeSeconds: flashcardTimes[0] ? Math.round(flashcardTimes[0].avgDuration) : 0,
        totalTimeSessions: flashcardTimes[0]?.total || 0,
      },
      engagement: {
        ctr,
        navigationClicks,
        pageViews,
        avgEventsPerSession: Math.round(avgEventsPerSession * 10) / 10,
        maxEventsPerSession,
        estimatedActiveMinutes: Math.round(estimatedActiveMinutes),
      },
      topPages: topPages.map(p => ({ path: p._id, count: p.count })),
      eventsBreakdown: eventsBreakdown.map(e => ({ event: e._id, count: e.count })),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
