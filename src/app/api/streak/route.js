import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

function toDateKey(iso) {
  return (iso || '').slice(0, 10)
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

    const users = await getCollection('users')
    const user = await users.findOne({ email: email.toLowerCase().trim() })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const scores = await getCollection('scores')
    const docs = await scores.find({ email: email.toLowerCase().trim() }).toArray()

    const activeDays = {}
    for (const d of docs) {
      const key = toDateKey(d.createdAt)
      if (key) activeDays[key] = true
    }

    const todayKey = new Date().toISOString().slice(0, 10)
    let currentStreak = 0
    const cursor = new Date()
    cursor.setHours(0, 0, 0, 0)
    while (activeDays[toDateKey(cursor.toISOString())]) {
      currentStreak += 1
      cursor.setDate(cursor.getDate() - 1)
    }

    return NextResponse.json({
      email: user.email,
      streak: user.streak || 0,
      currentStreak,
      bestStreak: user.bestStreak || 0,
      points: user.points || 0,
      lastQuizDate: user.lastQuizDate || '',
      days: Object.keys(activeDays).sort(),
      today: todayKey,
      totalQuizzes: docs.length,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
