import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { ObjectId } from 'mongodb'

// Live session room: chat + voice notes, polled every few seconds.
// GET ?meetingId=&since=ISO&limit= — members read messages.
// POST { meetingId, text?, audioUrl?, duration? } — members send (meeting must be live).
async function loadMeeting(groupId, meetingId) {
  try {
    const col = await getCollection('group_meetings')
    return await col.findOne({ _id: new ObjectId(meetingId), groupId })
  } catch {
    return null
  }
}

function meetingLive(m) {
  if (!m || m.status === 'ended' || m.status === 'cancelled') return false
  const now = Date.now()
  const start = new Date(m.startsAt).getTime()
  const end = start + (Number(m.durationMin) || 60) * 60000
  return now >= start && now <= end + 15 * 60000
}

export async function GET(request, { params }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const meetingId = searchParams.get('meetingId')
    const since = searchParams.get('since')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    if (!meetingId) return NextResponse.json({ error: 'meetingId required' }, { status: 400 })

    const spaces = await getCollection('spaces')
    let space = null
    try { space = await spaces.findOne({ _id: new ObjectId(id) }) } catch {}
    if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!(space.members || []).includes(user.email)) return NextResponse.json({ error: 'Members only' }, { status: 403 })

    const col = await getCollection('group_live_messages')
    const filter = { groupId: id, meetingId }
    if (since) {
      const d = new Date(since)
      if (!Number.isNaN(d.getTime())) filter.createdAt = { $gt: since }
    }
    const docs = await col.find(filter).sort({ createdAt: since ? 1 : -1 }).limit(limit).toArray()
    const messages = (since ? docs : docs.reverse()).map(m => ({ ...m, _id: m._id.toString() }))
    return NextResponse.json({ messages })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const { meetingId, text, audioUrl, duration } = await request.json()
    if (!meetingId) return NextResponse.json({ error: 'meetingId required' }, { status: 400 })
    const cleanText = String(text || '').trim().slice(0, 1000)
    const cleanAudio = String(audioUrl || '').trim().slice(0, 500)
    if (!cleanText && !cleanAudio) return NextResponse.json({ error: 'Empty message' }, { status: 400 })
    if (cleanAudio && !/^https:\/\//.test(cleanAudio)) return NextResponse.json({ error: 'Invalid audio' }, { status: 400 })

    const spaces = await getCollection('spaces')
    let space = null
    try { space = await spaces.findOne({ _id: new ObjectId(id) }) } catch {}
    if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!(space.members || []).includes(user.email)) return NextResponse.json({ error: 'Members only' }, { status: 403 })

    const meeting = await loadMeeting(id, meetingId)
    if (!meeting) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    if (!meetingLive(meeting)) return NextResponse.json({ error: 'Session has ended' }, { status: 403 })

    const col = await getCollection('group_live_messages')
    const doc = {
      groupId: id,
      meetingId,
      kind: cleanAudio ? 'audio' : 'text',
      text: cleanText || null,
      audioUrl: cleanAudio || null,
      duration: Math.max(0, Math.min(3600, Number(duration) || 0)),
      authorEmail: user.email,
      authorName: user.name || user.email,
      createdAt: new Date().toISOString(),
    }
    const result = await col.insertOne(doc)
    return NextResponse.json({ success: true, id: result.insertedId.toString() }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
