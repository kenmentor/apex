import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

export async function POST(request) {
  try {
    const { visitorId } = await request.json()
    if (!visitorId) {
      return NextResponse.json({ error: 'visitorId required' }, { status: 400 })
    }

    const visitorsCol = await getCollection('visitors')
    const existing = await visitorsCol.findOne({ visitorId })

    if (existing) {
      await visitorsCol.updateOne(
        { visitorId },
        { $set: { lastVisit: new Date().toISOString() }, $inc: { visits: 1 } }
      )
    } else {
      await visitorsCol.insertOne({
        visitorId,
        visits: 1,
        firstVisit: new Date().toISOString(),
        lastVisit: new Date().toISOString(),
      })
    }

    const totalUnique = await visitorsCol.countDocuments()
    return NextResponse.json({ success: true, totalUnique })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to track visitor' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const visitorsCol = await getCollection('visitors')
    const totalUnique = await visitorsCol.countDocuments()
    const totalVisits = await visitorsCol.aggregate([
      { $group: { _id: null, total: { $sum: '$visits' } } }
    ]).toArray()
    return NextResponse.json({
      uniqueVisitors: totalUnique,
      totalVisits: totalVisits[0]?.total || totalUnique,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch visitor stats' }, { status: 500 })
  }
}
