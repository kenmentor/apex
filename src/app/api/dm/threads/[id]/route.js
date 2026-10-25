import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { ObjectId } from 'mongodb'

async function loadThread(id, email) {
  if (!ObjectId.isValid(id)) return { error: 'Not found', status: 404 }
  const col = await getCollection('direct_threads')
  const thread = await col.findOne({ _id: new ObjectId(id) })
  if (!thread || !(thread.members || []).includes(email)) return { error: 'Not found', status: 404 }
  return { thread, col }
}

export async function GET(request, { params }) {
  try {
    const u = await getUserFromToken(request).catch(() => null)
    const email = u?.email ? u.email.toLowerCase().trim() : null
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const found = await loadThread(id, email)
    if (found.error) return NextResponse.json({ error: found.error }, { status: found.status })
    const { thread, col } = found

    const msgsCol = await getCollection('direct_messages')
    const messages = await msgsCol.find({ threadId: thread._id.toString() }).sort({ createdAt: 1 }).limit(200).toArray()
    // Opening marks my side read.
    await msgsCol.updateMany({ threadId: thread._id.toString(), to: email, read: false }, { $set: { read: true } })
    await col.updateOne({ _id: thread._id }, { $set: { [`unread.${email.replace(/\./g, '_')}`]: 0 } })

    const peerEmail = thread.members.find(m => m !== email)
    let peerName = peerEmail.split('@')[0]
    try {
      const users = await getCollection('users')
      const peer = await users.findOne({ email: peerEmail })
      if (peer?.name) peerName = peer.name
    } catch {}

    return NextResponse.json({
      peerEmail,
      peerName,
      messages: messages.map(m => ({
        _id: m._id.toString(),
        from: m.from,
        text: m.text,
        createdAt: m.createdAt,
        mine: m.from === email,
      })),
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const u = await getUserFromToken(request).catch(() => null)
    const email = u?.email ? u.email.toLowerCase().trim() : null
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const found = await loadThread(id, email)
    if (found.error) return NextResponse.json({ error: found.error }, { status: found.status })
    const { thread, col } = found

    const { text } = await request.json()
    const clean = String(text || '').trim().slice(0, 1000)
    if (!clean) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

    const other = thread.members.find(m => m !== email)
    const now = new Date().toISOString()
    const msgsCol = await getCollection('direct_messages')
    const res = await msgsCol.insertOne({ threadId: thread._id.toString(), from: email, to: other, text: clean, read: false, createdAt: now })

    const unread = { ...(thread.unread || {}) }
    const otherKey = other.replace(/\./g, '_')
    unread[otherKey] = (unread[otherKey] || 0) + 1
    await col.updateOne({ _id: thread._id }, { $set: { lastMessage: clean.slice(0, 80), lastAt: now, unread } })

    // One inbox nudge per unread streak (not one per message).
    if ((unread[otherKey] || 0) <= 1) {
      try {
        const notifCol = await getCollection('notifications')
        await notifCol.insertOne({
          userEmail: other,
          type: 'dm',
          title: `Message from ${u.name || email.split('@')[0]}`,
          message: clean.slice(0, 120),
          link: `/dm/${thread._id.toString()}`,
          read: false,
          createdAt: now,
        })
      } catch {}
    }

    return NextResponse.json({ id: res.insertedId.toString(), createdAt: now }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
