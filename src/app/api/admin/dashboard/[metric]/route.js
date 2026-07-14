import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

export async function GET(request, { params }) {
  try {
    const { metric } = await params
    const col = await getCollection('events')
    const now = new Date()
    const sevenDays = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDays = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const match = { timestamp: { $gte: sevenDays } }
    const match30 = { timestamp: { $gte: thirtyDays } }

    switch (metric) {

      // ── OVERVIEW ──
      case 'overview': {
        const dailyViews = await col.aggregate([
          { $match: { ...match30, event: 'page_view' } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]).toArray()

        const dailySessions = await col.aggregate([
          { $match: match30 },
          { $group: { _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, session: '$sessionId' } } },
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
          { $group: { _id: { path: '$path', pwa: '$isPwa' }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]).toArray()

        const pwaDaily = await col.aggregate([
          { $match: { ...match30, event: 'page_view', isPwa: true } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]).toArray()

        const webDaily = await col.aggregate([
          { $match: { ...match30, event: 'page_view', isPwa: false } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]).toArray()

        return NextResponse.json({ byPath, pwaDaily, webDaily })
      }

      // ── PAGE REFRESHES ──
      case 'refreshes': {
        const byPath = await col.aggregate([
          { $match: { ...match, event: 'page_refresh' } },
          { $group: { _id: '$path', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]).toArray()

        const daily = await col.aggregate([
          { $match: { ...match30, event: 'page_refresh' } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]).toArray()

        return NextResponse.json({ byPath, daily })
      }

      // ── DOWNLOADS ──
      case 'downloads': {
        const bySource = await col.aggregate([
          { $match: { ...match, event: 'download_click' } },
          { $group: { _id: '$metadata.source', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]).toArray()

        const daily = await col.aggregate([
          { $match: { ...match30, event: 'download_click' } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]).toArray()

        return NextResponse.json({ bySource, daily })
      }

      // ── PEAK HOURS ──
      case 'hours': {
        const hourly = await col.aggregate([
          { $match: match },
          { $group: { _id: { $hour: '$timestamp' }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]).toArray()

        const byEventType = await col.aggregate([
          { $match: match },
          { $group: { _id: { hour: { $hour: '$timestamp' }, event: '$event' }, count: { $sum: 1 } } },
          { $sort: { '_id.hour': 1 } },
        ]).toArray()

        return NextResponse.json({ hourly, byEventType })
      }

      // ── FLASHCARDS ──
      case 'flashcards': {
        const daily = await col.aggregate([
          { $match: { ...match30, event: 'flashcard_open' } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]).toArray()

        const durations = await col.aggregate([
          { $match: { ...match, event: 'flashcard_time', 'metadata.duration': { $exists: true } } },
          { $group: { _id: null, avg: { $avg: '$metadata.duration' }, min: { $min: '$metadata.duration' }, max: { $max: '$metadata.duration' }, count: { $sum: 1 } } },
        ]).toArray()

        const bySection = await col.aggregate([
          { $match: { ...match, event: 'flashcard_open', 'metadata.section': { $exists: true } } },
          { $group: { _id: '$metadata.section', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]).toArray()

        const durationBuckets = await col.aggregate([
          { $match: { ...match, event: 'flashcard_time', 'metadata.duration': { $exists: true } } },
          { $bucket: { groupBy: '$metadata.duration', boundaries: [0, 5, 10, 20, 30, 60, 120, 999999], default: 'unknown', output: { count: { $sum: 1 } } } },
        ]).toArray()

        return NextResponse.json({ daily, durations: durations[0] || null, bySection, durationBuckets })
      }

      // ── ENGAGEMENT ──
      case 'engagement': {
        const eventDepth = await col.aggregate([
          { $match: match },
          { $group: { _id: '$sessionId', count: { $sum: 1 } } },
          { $bucket: { groupBy: '$count', boundaries: [1, 3, 6, 10, 20, 50, 100, 999999], default: 'unknown', output: { sessions: { $sum: 1 } } } },
        ]).toArray()

        const navPaths = await col.aggregate([
          { $match: { ...match, event: 'navigation_click', 'metadata.to': { $exists: true } } },
          { $group: { _id: '$metadata.to', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]).toArray()

        return NextResponse.json({ eventDepth, navPaths })
      }

      // ── TOP PAGES ──
      case 'pages': {
        const pages = await col.aggregate([
          { $match: { ...match30, event: 'page_view' } },
          { $group: { _id: '$path', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]).toArray()

        const daily = await col.aggregate([
          { $match: { ...match30, event: 'page_view' } },
          { $group: { _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, path: '$path' }, count: { $sum: 1 } } },
          { $sort: { '_id.day': 1 } },
        ]).toArray()

        return NextResponse.json({ pages, daily })
      }

      default:
        return NextResponse.json({ error: 'Unknown metric' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
