import { getCollection } from '@/lib/db'

function trendKey(now, prev) {
  if (now === prev) return 'flat'
  return now > prev ? 'up' : 'down'
}
function pct(a, b) {
  if (b === 0) return a > 0 ? 100 : 0
  return Math.round(((a - b) / b) * 100)
}

export function compare(a, b) {
  return { now: a, prev: b, change: pct(a, b), trend: trendKey(a, b) }
}

async function periodMetrics(col, since, until) {
  const m = { createdAt: { $gte: since, $lt: until } }

  const totalEvents = await col.countDocuments(m)

  const sessions = await col.aggregate([
    { $match: m },
    { $group: { _id: '$data.sessionId' } },
    { $count: 'total' },
  ]).toArray()

  const quizStarted = await col.countDocuments({ ...m, event: 'quiz_started' })
  const quizCompleted = await col.countDocuments({ ...m, event: 'quiz_completed' })
  const quizScores = await col.aggregate([
    { $match: { ...m, event: 'quiz_completed', 'data.score': { $exists: true } } },
    { $group: { _id: null, avgScore: { $avg: '$data.score' }, avgTotal: { $avg: '$data.total' }, avgTime: { $avg: '$data.timeSpent' } } },
  ]).toArray()
  const sq = quizScores[0] || {}

  const pageViews = await col.countDocuments({ ...m, event: 'page_view' })
  const pageRefreshes = await col.countDocuments({ ...m, event: 'page_refresh' })
  const downloads = await col.countDocuments({ ...m, event: 'download_click' })
  const navClicks = await col.countDocuments({ ...m, event: 'navigation_click' })
  const heartbeats = await col.countDocuments({ ...m, event: 'heartbeat' })
  const flashcardOpens = await col.countDocuments({ ...m, event: 'flashcard_open' })

  const flashcardDurations = await col.aggregate([
    { $match: { ...m, event: 'flashcard_time', 'data.duration': { $exists: true } } },
    { $group: { _id: null, avgDuration: { $avg: '$data.duration' } } },
  ]).toArray()

  const sessionsWithCount = await col.aggregate([
    { $match: m },
    { $group: { _id: '$data.sessionId', count: { $sum: 1 } } },
    { $group: { _id: null, avgEvents: { $avg: '$count' } } },
  ]).toArray()

  const sessionDurations = await col.aggregate([
    { $match: { ...m, event: 'session_end', 'data.duration': { $exists: true } } },
    { $group: { _id: null, avgDuration: { $avg: '$data.duration' } } },
  ]).toArray()

  const pwaViews = await col.aggregate([
    { $match: { ...m, event: 'page_view', 'data.isPwa': true } },
    { $group: { _id: '$data.sessionId' } },
    { $count: 'total' },
  ]).toArray()

  const hourlyActivity = await col.aggregate([
    { $match: m },
    { $group: { _id: { $hour: { $dateFromString: { dateString: '$createdAt' } } }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]).toArray()

  const topPages = await col.aggregate([
    { $match: { ...m, event: 'page_view' } },
    { $group: { _id: '$data.path', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]).toArray()

  const eventsBreakdown = await col.aggregate([
    { $match: m },
    { $group: { _id: '$event', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]).toArray()

  const quizDuration = sq.avgTime || 0
  const ctr = pageViews > 0 ? Math.round((navClicks / pageViews) * 100) : 0

  return {
    totalEvents,
    uniqueSessions: sessions[0]?.total || 0,
    pageViews,
    pageRefreshes,
    downloads,
    navClicks,
    heartbeats,
    ctr,
    estimatedActiveMinutes: Math.round(heartbeats * 0.5),
    avgEventsPerSession: sessionsWithCount[0] ? Math.round(sessionsWithCount[0].avgEvents * 10) / 10 : 0,
    avgSessionDurationSec: sessionDurations[0] ? Math.round(sessionDurations[0].avgDuration) : 0,
    pwaSessions: pwaViews[0]?.total || 0,
    quizStarted,
    quizCompleted,
    quizCompletionRate: quizStarted > 0 ? Math.round((quizCompleted / quizStarted) * 100) : 0,
    quizAvgScore: sq.avgTotal > 0 ? Math.round((sq.avgScore / sq.avgTotal) * 100) : 0,
    quizAvgTimeSec: quizDuration ? Math.round(quizDuration) : 0,
    flashcardOpens,
    flashcardAvgDurationSec: flashcardDurations[0] ? Math.round(flashcardDurations[0].avgDuration) : 0,
    peakHours: hourlyActivity.map(h => ({ hour: h._id, count: h.count })),
    topPages: topPages.map(p => ({ path: p._id, count: p.count })),
    eventsBreakdown: eventsBreakdown.map(e => ({ event: e._id, count: e.count })),
  }
}

export async function getCurrentMetrics() {
  const col = await getCollection('analytics')
  const now = new Date()
  const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  return periodMetrics(col, periodStart.toISOString(), now.toISOString())
}

export async function getComparedMetrics() {
  const col = await getCollection('analytics')
  const now = new Date()
  const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const prevEnd = new Date(periodStart.getTime() - 1)
  const prevStart = new Date(prevEnd.getTime() - 7 * 24 * 60 * 60 * 1000)

  const current = await periodMetrics(col, periodStart.toISOString(), now.toISOString())
  const previous = await periodMetrics(col, prevStart.toISOString(), prevEnd.toISOString())

  const compared = {}
  for (const key of Object.keys(current)) {
    const a = current[key]
    const b = previous[key]
    if (Array.isArray(a)) {
      compared[key] = { now: a, prev: b }
    } else if (typeof a === 'object' && a !== null) {
      const sub = {}
      for (const k of Object.keys(a)) {
        const va = a[k]
        const vb = b?.[k] ?? 0
        sub[k] = compare(va, vb)
      }
      compared[key] = sub
    } else {
      compared[key] = compare(a, b ?? 0)
    }
  }

  const allTrends = Object.values(compared).flatMap(v => {
    if (v.trend) return [v.trend]
    if (typeof v === 'object') return Object.values(v).map(s => s.trend || 'flat')
    return []
  })
  const upCount = allTrends.filter(t => t === 'up').length
  const downCount = allTrends.filter(t => t === 'down').length

  return {
    period: { start: periodStart.toISOString(), end: now.toISOString() },
    previousPeriod: { start: prevStart.toISOString(), end: prevEnd.toISOString() },
    metrics: compared,
    health: {
      score: allTrends.length > 0 ? Math.round((upCount / allTrends.length) * 100) : 0,
      direction: downCount > upCount ? 'declining' : upCount > downCount ? 'improving' : 'stable',
      improving: upCount,
      declining: downCount,
      stable: allTrends.length - upCount - downCount,
      total: allTrends.length,
    },
  }
}
