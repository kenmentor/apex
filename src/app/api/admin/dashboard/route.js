import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getComparedMetrics } from '@/lib/metrics'

export async function GET() {
  try {
    const col = await getCollection('analytics')
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000)

    const activeNow = await col.aggregate([
      { $match: { createdAt: { $gte: fiveMinAgo.toISOString() } } },
      { $group: { _id: '$data.sessionId' } },
      { $count: 'total' },
    ]).toArray()

    const todaySessions = await col.aggregate([
      { $match: { createdAt: { $gte: todayStart.toISOString() } } },
      { $group: { _id: '$data.sessionId' } },
      { $count: 'total' },
    ]).toArray()

    const compared = await getComparedMetrics()
    const m = compared.metrics

    // Flatten current values for backward compat with existing admin page
    const flat = {}
    for (const [key, val] of Object.entries(m)) {
      if (val && typeof val === 'object' && 'now' in val) {
        flat[key] = val.now
      } else if (val && typeof val === 'object') {
        flat[key] = {}
        for (const [k, v] of Object.entries(val)) {
          if (v && typeof v === 'object' && 'now' in v) flat[key][k] = v.now
          else flat[key][k] = v
        }
      } else {
        flat[key] = val
      }
    }

    return NextResponse.json({
      ...compared,
      ...flat,
      activeNow: activeNow[0]?.total || 0,
      todayUnique: todaySessions[0]?.total || 0,
      webPwaSessions: {
        pwa: m.pwaSessions?.now ?? 0,
        web: (m.uniqueSessions?.now ?? 0) - (m.pwaSessions?.now ?? 0),
      },
      engagement: {
        ctr: m.ctr?.now ?? 0,
        navigationClicks: m.navClicks?.now ?? 0,
        pageViews: m.pageViews?.now ?? 0,
        avgEventsPerSession: m.avgEventsPerSession?.now ?? 0,
        estimatedActiveMinutes: m.estimatedActiveMinutes?.now ?? 0,
      },
      flashcard: {
        opens: m.flashcardOpens?.now ?? 0,
        avgTimeSeconds: m.flashcardAvgDurationSec?.now ?? 0,
      },
      peakHours: m.peakHours?.now ?? [],
      topPages: m.topPages?.now ?? [],
      eventsBreakdown: m.eventsBreakdown?.now ?? [],
      totalEvents: m.totalEvents?.now ?? 0,
      uniqueSessions: m.uniqueSessions?.now ?? 0,
      pageRefreshes: m.pageRefreshes?.now ?? 0,
      downloadClicks: m.downloads?.now ?? 0,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
