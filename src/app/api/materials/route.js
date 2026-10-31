import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'

function normCourse(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/^([A-Z]+)(\d+)$/, '$1 $2').slice(0, 32) || null
}

function escRx(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function kindOf(mime, fileName) {
  const m = String(mime || '')
  const n = String(fileName || '').toLowerCase()
  if (m === 'application/pdf' || n.endsWith('.pdf')) return 'pdf'
  if (m.startsWith('video/')) return 'video'
  if (m.startsWith('audio/')) return 'audio'
  if (m.startsWith('image/')) return 'image'
  return 'file'
}

// GET /api/materials?q=&course=&type=&mine=1&limit=
// Public by default (isPublic !== false). `mine=1` adds requester's private docs.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const course = normCourse(searchParams.get('course'))
    const type = (searchParams.get('type') || '').toLowerCase().trim()
    const mine = searchParams.get('mine') === '1'
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '25', 10) || 25))

    let me = null
    try { me = (await getUserFromToken(request))?.email?.toLowerCase() || null } catch {}

    const filter = {}
    if (course) filter.courseCode = { $in: [course, course.replace(/\s+/g, '')] }
    if (type) filter.itemKind = type
    if (q) {
      const rx = { $regex: escRx(q), $options: 'i' }
      filter.$or = [{ title: rx }, { fileName: rx }, { description: rx }]
    }
    if (mine && me) {
      filter.$and = [{ $or: [{ isPublic: true }, { ownerEmail: me }] }]
    } else {
      filter.isPublic = true
    }

    const col = await getCollection('user_materials')
    const docs = await col.find(filter).sort({ createdAt: -1 }).limit(limit).toArray()
    return NextResponse.json(docs.map(d => ({
      id: String(d._id),
      title: d.title,
      fileName: d.fileName,
      url: d.url,
      itemKind: d.itemKind,
      mime: d.mime || null,
      size: d.size || null,
      courseCode: d.courseCode || null,
      description: d.description || null,
      ownerEmail: d.ownerEmail,
      isPublic: d.isPublic !== false,
      createdAt: d.createdAt,
    })))
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/materials — central store. Default isPublic=true per product rule.
export async function POST(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const url = String(body?.url || '').slice(0, 1000)
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })
    const fileName = String(body?.fileName || body?.title || 'upload').slice(0, 200)
    const title = String(body?.title || fileName).slice(0, 200)
    const itemKind = body?.itemKind || kindOf(body?.mime, fileName)

    const now = new Date().toISOString()
    const doc = {
      ownerEmail: String(user.email).toLowerCase(),
      title,
      fileName,
      url,
      publicId: body?.publicId ? String(body.publicId).slice(0, 200) : null,
      mime: body?.mime ? String(body.mime).slice(0, 100) : null,
      size: Number.isFinite(Number(body?.size)) ? Number(body.size) : null,
      itemKind: String(itemKind).slice(0, 24),
      courseCode: normCourse(body?.courseCode),
      description: body?.description ? String(body.description).slice(0, 500) : null,
      isPublic: body?.isPublic === false ? false : true,
      createdAt: now,
      updatedAt: now,
    }
    const col = await getCollection('user_materials')
    const res = await col.insertOne(doc)
    return NextResponse.json({ success: true, id: res.insertedId.toString(), isPublic: doc.isPublic }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
