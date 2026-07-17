import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { sendToUser } from '@/lib/push'

export async function POST() {
  try {
    const scoresCol = await getCollection('scores')
    const subsCol = await getCollection('push_subscriptions')
    const notifCol = await getCollection('notifications')

    const subs = await subsCol.find({}).project({ userEmail: 1 }).toArray()
    const emailedUsers = [...new Set(subs.map(s => s.userEmail).filter(Boolean))]
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    let sent = 0

    for (const email of emailedUsers) {
      const lastScore = await scoresCol.findOne(
        { email },
        { sort: { createdAt: -1 } }
      )

      if (lastScore && lastScore.createdAt < sevenDaysAgo) {
        const course = lastScore.course || 'your courses'
        await notifCol.insertOne({
          userEmail: email,
          type: 'reminder',
          title: '⏰ Miss your quiz?',
          message: `It's been a while since you last studied ${course}. Pick up where you left off!`,
          link: '/courses',
          read: false,
          createdAt: new Date().toISOString(),
        })
        const ok = await sendToUser(
          email,
          '⏰ Miss your quiz?',
          `It's been a while since you last studied ${course}. Pick up where you left off!`,
          '/courses',
          getCollection
        )
        if (ok) sent++
      }
    }

    return NextResponse.json({ success: true, reminded: sent })
  } catch (err) {
    console.error('POST /api/push/remind error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
