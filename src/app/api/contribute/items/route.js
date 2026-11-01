import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'

function canContribute(user) {
  return !!user && (!!user.admin || ['editor', 'official', 'admin'].includes(user.role))
}

function normCourse(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/^([A-Z]+)(\d+)$/, '$1 $2').slice(0, 32) || null
}

function out(d) {
  return {
    id: String(d._id),
    kind: d.itemKind || 'file',
    title: d.title,
    url: d.url || null,
    courseCode: d.courseCode || null,
    addedBy: d.addedBy || d.ownerEmail || null,
    uploaders: d.uploaders || [d.ownerEmail].filter(Boolean),
    createdAt: d.createdAt,
  }
}

// GET /api/contribute/items?programme=COS — scope copies the team added.
// Hidden-from-me items are excluded; the files themselves always persist.
export async function GET(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canContribute(user)) return NextResponse.json({ error: 'Contributor only' }, { status: 403 })
    const { searchParams } = new URL(request.url)
    const programme = (searchParams.get('programme') || '').toUpperCase().trim()
    if (!programme) return NextResponse.json({ items: [] })
    const me = String(user.email).toLowerCase()
    const col = await getCollection('user_materials')
    const docs = await col.find({ scopeDept: programme }).sort({ createdAt: -1 }).limit(200).toArray().catch(() => [])
    return NextResponse.json({ items: docs.filter(d => !(d.hiddenBy || []).map(String).includes(me)).map(out) })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/contribute/items — add a scope copy (independent doc, shared file).
// Sources: fresh upload URL, folder file URL, or public search hit.
// Removing later only hides/deletes YOUR association; the file persists.
export async function POST(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canContribute(user)) return NextResponse.json({ error: 'Contributor only' }, { status: 403 })
    const body = await request.json()
    const url = String(body?.url || '').slice(0, 1000)
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })
    const programme = String(body.scopeDept || body.programme || '').toUpperCase().trim()
    if (!programme) return NextResponse.json({ error: 'programme required' }, { status: 400 })

    const me = String(user.email).toLowerCase()
    const now = new Date().toISOString()
    const col = await getCollection('user_materials')
    const doc = {
      ownerEmail: me,
      addedBy: me,
      scopeDept: programme,
      hiddenBy: [],
      topic: typeof body.topic === 'string' && body.topic.trim() ? body.topic.trim().slice(0, 200) : null,
      uploaders: [me],
      title: String(body.title || body.fileName || 'Untitled').slice(0, 200),
      fileName: String(body.fileName || body.title || 'Untitled').slice(0, 200),
      url,
      publicId: body?.publicId ? String(body.publicId).slice(0, 200) : null,
      mime: body?.mime ? String(body.mime).slice(0, 100) : null,
      size: Number.isFinite(Number(body?.size)) ? Number(body.size) : null,
      itemKind: String(body.itemKind || 'file').slice(0, 24),
      courseCode: normCourse(body.courseCode),
      description: body?.description ? String(body.description).slice(0, 500) : null,
      isPublic: body?.isPublic === false ? false : true,
      sha256: /^[0-9a-f]{64}$/i.test(String(body?.sha256 || '')) ? String(body.sha256).toLowerCase() : null,
      createdAt: now,
      updatedAt: now,
    }
    const res = await col.insertOne(doc)
    return NextResponse.json({ success: true, id: res.insertedId.toString() }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
