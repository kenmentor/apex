import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

export async function GET() {
  try {
    const col = await getCollection('analytics')
    const now = new Date()
    const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const prevEnd = new Date(periodStart.getTime() - 1)
    const prevStart = new Date(prevEnd.getTime() - 7 * 24 * 60 * 60 * 1000)

    function trendKey(now, prev) {
      if (now === prev) return 'flat'
      return now > prev ? 'up' : 'down'
    }
    function pct(a, b) {
      if (b === 0) return a > 0 ? 100 : 0
      return Math.round(((a - b) / b) * 100)
    }

    async function periodMetrics(since, until) {
      const m = { createdAt: { $gte: since.toISOString(), $lt: until.toISOString() } }

      const totalEvents = await col.countDocuments(m)
      const sessions = await col.aggregate([
        { $match: m },
        { $group: { _id: '$data.sessionId' } },
        { $count: 'total' },
      ]).toArray()
      const uniqueSessions = sessions[0]?.total || 0

      const quizStarted = await col.countDocuments({ ...m, event: 'quiz_started' })
      const quizCompleted = await col.countDocuments({ ...m, event: 'quiz_completed' })
      const quizScores = await col.aggregate([
        { $match: { ...m, event: 'quiz_completed', 'data.score': { $exists: true } } },
        { $group: { _id: null, avgScore: { $avg: '$data.score' }, avgTotal: { $avg: '$data.total' } } },
      ]).toArray()

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

      const pwaViews = await col.aggregate([
        { $match: { ...m, event: 'page_view', 'data.isPwa': true } },
        { $group: { _id: '$data.sessionId' } },
        { $count: 'total' },
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

      const sq = quizScores[0] || {}
      const avgScore = sq.avgTotal > 0 ? Math.round((sq.avgScore / sq.avgTotal) * 100) : 0

      return {
        totalEvents,
        uniqueSessions,
        quiz: { started: quizStarted, completed: quizCompleted, completionRate: quizStarted > 0 ? Math.round((quizCompleted / quizStarted) * 100) : 0, avgScore },
        pageViews,
        pageRefreshes,
        downloads,
        navClicks,
        heartbeats,
        estimatedActiveMinutes: Math.round(heartbeats * 0.5),
        flashcard: { opens: flashcardOpens, avgDuration: flashcardDurations[0] ? Math.round(flashcardDurations[0].avgDuration) : 0 },
        pwaSessions: pwaViews[0]?.total || 0,
        avgEventsPerSession: sessionsWithCount[0] ? Math.round(sessionsWithCount[0].avgEvents * 10) / 10 : 0,
        avgSessionDurationSec: sessionDurations[0] ? Math.round(sessionDurations[0].avgDuration) : 0,
      }
    }

    const now_P = await periodMetrics(periodStart, now)
    const prev = await periodMetrics(prevStart, prevEnd)

    function diff(metric) {
      const a = now_P[metric]
      const b = prev[metric]
      if (typeof a === 'object') {
        const keys = Object.keys(a)
        const result = {}
        for (const k of keys) {
          const va = a[k]
          const vb = b?.[k] ?? 0
          result[k] = { now: va, prev: vb, change: pct(va, vb), trend: trendKey(va, vb) }
        }
        return result
      }
      return { now: a, prev: b, change: pct(a, b), trend: trendKey(a, b) }
    }

    const metrics = {
      totalEvents: diff('totalEvents'),
      uniqueSessions: diff('uniqueSessions'),
      quiz: diff('quiz'),
      pageViews: diff('pageViews'),
      pageRefreshes: diff('pageRefreshes'),
      downloads: diff('downloads'),
      navClicks: diff('navClicks'),
      heartbeats: diff('heartbeats'),
      estimatedActiveMinutes: diff('estimatedActiveMinutes'),
      flashcard: diff('flashcard'),
      pwaSessions: diff('pwaSessions'),
      avgEventsPerSession: diff('avgEventsPerSession'),
      avgSessionDurationSec: diff('avgSessionDurationSec'),
    }

    // Overall health score: average of all up/neutral trends
    const allTrends = Object.values(metrics).flatMap(v => {
      if (v.now !== undefined) return [v.trend]
      return Object.values(v).map(s => s.trend)
    })
    const upCount = allTrends.filter(t => t === 'up').length
    const downCount = allTrends.filter(t => t === 'down').length
    const total = allTrends.length
    const healthScore = total > 0 ? Math.round((upCount / total) * 100) : 0
    const direction = downCount > upCount ? 'declining' : upCount > downCount ? 'improving' : 'stable'

    return NextResponse.json({
      period: { start: periodStart.toISOString(), end: now.toISOString() },
      previousPeriod: { start: prevStart.toISOString(), end: prevEnd.toISOString() },
      metrics,
      health: { score: healthScore, direction, improving: upCount, declining: downCount, stable: total - upCount - downCount, total },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
