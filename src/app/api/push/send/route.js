import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { sendToAll, sendToUser } from '@/lib/push'
import { requireAdmin } from '@/lib/auth-server'

export async function POST(request) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, message, url, email } = body

    if (!title || !message) {
      return NextResponse.json({ error: 'title and message required' }, { status: 400 })
    }

    const link = url || '/'

    // Also save as in-app notification
    const notifCol = await getCollection('notifications')
    const subsCol = await getCollection('push_subscriptions')

    if (email) {
      await notifCol.insertOne({
        userEmail: email,
        type: 'admin',
        title,
        message,
        link,
        read: false,
        createdAt: new Date().toISOString(),
      })
      await sendToUser(email, title, message, link, getCollection)
      return NextResponse.json({ success: true, sentTo: email })
    }

    // Broadcast to all
    const subs = await subsCol.find({}).project({ userEmail: 1 }).toArray()
    for (const sub of subs) {
      if (sub.userEmail) {
        await notifCol.insertOne({
          userEmail: sub.userEmail,
          type: 'admin',
          title,
          message,
          link,
          read: false,
          createdAt: new Date().toISOString(),
        })
      }
    }
    await sendToAll(title, message, link, getCollection)

    return NextResponse.json({ success: true, sentTo: 'all' })
  } catch (err) {
    console.error('POST /api/push/send error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
