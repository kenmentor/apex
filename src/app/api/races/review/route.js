import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

// Outlier review: flags accounts with extreme win rates or inhuman times
// for manual inspection. Read-only; no auto-bans in V1.
export async function GET() {
  try {
    const col = await getCollection('game_sessions')
    const settled = await col.find({ status: 'settled' }).toArray()
    const wins = {}
    const plays = {}
    const fastFlags = []
    for (const s of settled) {
      for (const e of s.entries || []) {
        plays[e.email] = (plays[e.email] || 0) + 1
        if ((e.seconds || 0) < 10 && (s.topicIds || []).length >= 2) fastFlags.push({ email: e.email, session: s._id.toString(), seconds: e.seconds })
      }
      const ranked = s.ranked || []
      if (ranked.length && ranked[0]?.email) wins[ranked[0].email] = (wins[ranked[0].email] || 0) + 1
    }
    const suspects = Object.entries(plays)
      .filter(([, p]) => p >= 5)
      .map(([email, p]) => ({ email, plays: p, wins: wins[email] || 0, winRate: Math.round(((wins[email] || 0) / p) * 100) }))
      .filter(r => r.winRate >= 90)
    return NextResponse.json({ suspects, fastFlags: fastFlags.slice(0, 50) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
