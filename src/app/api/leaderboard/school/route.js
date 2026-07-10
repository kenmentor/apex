import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const school = searchParams.get('name')
    if (!school) return NextResponse.json({ error: 'Missing school name' }, { status: 400 })

    const scoresCol = await getCollection('scores')
    const docs = await scoresCol
      .find({ school: { $regex: `^${school}$`, $options: 'i' } })
      .sort({ percentage: -1, timeSpent: 1 })
      .limit(100)
      .toArray()

    return NextResponse.json(docs.map(s => ({
      ...s,
      _id: s._id.toString(),
      percentage: s.percentage || Math.round((s.score / s.total) * 100),
    })))
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
