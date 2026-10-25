import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'

// DM threads: GET lists mine, POST finds-or-creates with someone.
async function me(request) {
  const u = await getUserFromToken(request).catch(() => null)
  return u?.email ? u.email.toLowerCase().trim() : null
}

async function peerInfo(emails) {
  try {
    const users = await getCollection('users')
    const docs = await users.find({ email: { $in: emails } }, { projection: { email: 1, name: 1, avatar: 1 } }).toArray()
    return Object.fromEntries(docs.map(d => [String(d.email).toLowerCase(), d]))
  } catch {
    return {}
  }
}

export async function GET(request) {
  try {
    const email = await me(request)
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const col = await getCollection('direct_threads')
    const threads = await col.find({ members: email }).sort({ lastAt: -1 }).limit(30).toArray()
    const others = [...new Set(threads.flatMap(t => t.members).filter(m => m !== email))]
    const info = await peerInfo(others)
    const myKey = email.replace(/\./g, '_')
    return NextResponse.json(threads.map(t => {
      const peerEmail = t.members.find(m => m !== email)
      const peer = info[peerEmail] || {}
      return {
        _id: t._id.toString(),
        peerEmail,
        peerName: peer.name || peerEmail.split('@')[0],
        peerAvatar: peer.avatar || '',
        lastMessage: t.lastMessage || '',
        lastAt: t.lastAt || t.createdAt,
        unread: (t.unread || {})[myKey] || 0,
      }
    }))
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const email = await me(request)
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { withEmail } = await request.json()
    const other = String(withEmail || '').toLowerCase().trim()
    if (!other) return NextResponse.json({ error: 'withEmail required' }, { status: 400 })
    if (other === email) return NextResponse.json({ error: 'Cannot chat yourself' }, { status: 400 })
    const users = await getCollection('users')
    const target = await users.findOne({ email: other })
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const col = await getCollection('direct_threads')
    const members = [email, other].sort()
    let thread = await col.findOne({ members: { $all: members, $size: 2 } })
    if (!thread) {
      const now = new Date().toISOString()
      const res = await col.insertOne({ members, lastMessage: '', lastAt: now, unread: {}, createdAt: now })
      thread = { _id: res.insertedId, members }
    }
    return NextResponse.json({ id: thread._id.toString() }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
