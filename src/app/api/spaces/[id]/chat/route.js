import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { ObjectId } from 'mongodb'

// Persistent group chat (WhatsApp-style, always on).
// GET ?since=ISO&limit= — members read messages.
// POST { kind, text?, audioUrl?, fileUrl?, fileName?, fileType?, duration? } — members send.
export async function GET(request, { params }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const since = searchParams.get('since')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    const spaces = await getCollection('spaces')
    let space = null
    try { space = await spaces.findOne({ _id: new ObjectId(id) }) } catch {}
    if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!(space.members || []).includes(user.email)) return NextResponse.json({ error: 'Members only' }, { status: 403 })

    const col = await getCollection('group_chat_messages')
    const filter = { groupId: id }
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
    const { kind, text, audioUrl, fileUrl, fileName, fileType, duration } = await request.json()

    const spaces = await getCollection('spaces')
    let space = null
    try { space = await spaces.findOne({ _id: new ObjectId(id) }) } catch {}
    if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!(space.members || []).includes(user.email)) return NextResponse.json({ error: 'Members only' }, { status: 403 })
    if (space.postingPermission === 'creator_only' && space.creatorEmail !== user.email &&
      !(space.admins || []).includes(user.email)) {
      return NextResponse.json({ error: 'Only admins can chat here' }, { status: 403 })
    }

    const cleanText = String(text || '').trim().slice(0, 1000)
    const cleanAudio = String(audioUrl || '').trim().slice(0, 500)
    const cleanFile = String(fileUrl || '').trim().slice(0, 500)
    const cleanKind = ['text', 'audio', 'file'].includes(kind) ? kind : 'text'
    if (cleanKind === 'text' && !cleanText) return NextResponse.json({ error: 'Empty message' }, { status: 400 })
    if (cleanKind === 'audio' && !/^https:\/\//.test(cleanAudio)) return NextResponse.json({ error: 'Invalid audio' }, { status: 400 })
    if (cleanKind === 'file' && !/^https:\/\//.test(cleanFile)) return NextResponse.json({ error: 'Invalid file' }, { status: 400 })

    const col = await getCollection('group_chat_messages')
    const doc = {
      groupId: id,
      kind: cleanKind,
      text: cleanText || null,
      audioUrl: cleanAudio || null,
      fileUrl: cleanFile || null,
      fileName: String(fileName || 'File').slice(0, 120),
      fileType: String(fileType || 'file').slice(0, 20),
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
