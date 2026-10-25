import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { ObjectId } from 'mongodb'

// Mutual progress: mastery %, streak, weekly trend per member (shared courses).
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const spaces = await getCollection('spaces')
    const space = await spaces.findOne({ _id: new ObjectId(id) })
    if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const members = (space.members || []).slice(0, 20)
    if (!members.length) return NextResponse.json([])

    const users = await getCollection('users')
    const completions = await getCollection('completions')
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

    const out = []
    for (const email of members) {
      const u = await users.findOne({ email })
      const rows = await completions.find({ email }).toArray()
      const proves = rows.filter(r => r.kind === 'prove')
      const passed = proves.filter(r => (r.percentage || 0) >= 80)
      const mastery = proves.length ? Math.round((passed.length / proves.length) * 100) : 0
      const recent = proves.filter(r => (r.createdAt || '') >= weekAgo)
      const recentPassed = recent.filter(r => (r.percentage || 0) >= 80)
      out.push({
        email,
        name: u?.name || email,
        mastery,
        streak: u?.streak || 0,
        trend: recent.length ? Math.round((recentPassed.length / recent.length) * 100) : null,
      })
    }
    out.sort((a, b) => b.mastery - a.mastery)
    return NextResponse.json(out)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
  }
}
