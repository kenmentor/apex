import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { fitScore } from '@/lib/fit'

// Suggestion-only rail: never gates browse/join. Returns ranked candidates
// with fit bands labeled; manual browse stays fully available.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

    const users = await getCollection('users')
    const me = await users.findOne({ email: email.toLowerCase().trim() })
    if (!me) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const spaces = await getCollection('spaces')
    const all = await spaces.find({}).limit(100).toArray()

    const completions = await getCollection('completions')
    const myRows = await completions.find({ email: me.email }).toArray()
    const myPct = myRows.length
      ? Math.round((myRows.filter(r => r.kind === 'prove' && (r.percentage || 0) >= 80).length / myRows.length) * 100)
      : 0

    const meProfile = {
      department: me.department || '',
      level: me.level || '',
      completionPct: myPct,
      streak: me.streak || 0,
      intent: me.intent || 'steady-a',
      availability: me.availability || [],
    }

    const ranked = []
    for (const s of all) {
      if ((s.members || []).includes(me.email)) continue
      if ((s.visibility || 'open') === 'invite') continue
      const score = fitScore(
        { ...s, avgCompletionPct: s.avgCompletionPct || 50, avgStreak: s.avgStreak || 0 },
        meProfile
      )
      if (!score) continue
      ranked.push({ ...s, _id: s._id.toString(), fit: score })
    }
    ranked.sort((a, b) => b.fit.total - a.fit.total)

    return NextResponse.json(ranked.slice(0, 3))
  } catch (error) {
    return NextResponse.json({ error: 'Failed to suggest groups' }, { status: 500 })
  }
}
