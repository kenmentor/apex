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

function toOut(d) {
  return {
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
    uploaders: d.uploaders || [d.ownerEmail],
    isPublic: d.isPublic !== false,
    createdAt: d.createdAt,
  }
}

// GET /api/materials?q=&course=&type=&mine=1&limit=&sha256=
// Public by default (isPublic !== false). `mine=1` adds requester's private docs.
// `sha256=` looks up the requester's own prior upload of identical bytes (dedupe).
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const course = normCourse(searchParams.get('course'))
    const type = (searchParams.get('type') || '').toLowerCase().trim()
    const mine = searchParams.get('mine') === '1'
    const sha256 = (searchParams.get('sha256') || '').toLowerCase().trim()
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '25', 10) || 25))

    let me = null
    try { me = (await getUserFromToken(request))?.email?.toLowerCase() || null } catch {}

    if (sha256) {
      if (!/^[0-9a-f]{64}$/.test(sha256)) return NextResponse.json({ error: 'Invalid sha256' }, { status: 400 })
      if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const col = await getCollection('user_materials')
      const doc = await col.findOne({ sha256 })
      return NextResponse.json(doc ? [toOut(doc)] : [])
    }

    const filter = {}
    if (course) filter.courseCode = { $in: [course, course.replace(/\s+/g, '')] }
    if (type) filter.itemKind = type
    if (q) {
      const rx = { $regex: escRx(q), $options: 'i' }
      filter.$or = [{ title: rx }, { fileName: rx }, { description: rx }]
    }
    // Pending / rejected / revoked contributions stay out of public views
    // until an admin approves them; owners always see their own.
    const liveOnly = { status: { $nin: ['pending', 'rejected', 'revoked'] } }
    if (mine && me) {
      filter.$and = [{ $or: [{ isPublic: true, ...liveOnly }, { ownerEmail: me }] }]
    } else {
      filter.isPublic = true
      filter.status = { $nin: ['pending', 'rejected', 'revoked'] }
    }

    const col = await getCollection('user_materials')
    const docs = await col.find(filter).sort({ createdAt: -1 }).limit(limit).toArray()
    return NextResponse.json(docs.map(toOut))
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
    const sha256 = String(body?.sha256 || '').toLowerCase()
    const hasHash = /^[0-9a-f]{64}$/.test(sha256)
    const ownerEmail = String(user.email).toLowerCase()
    const wantPublic = body?.isPublic !== false

    const col = await getCollection('user_materials')
    // Same bytes uploaded before by ANYONE → one stored file for everybody.
    // The joiner is recorded and visibility ORs public (they already hold
    // identical bytes, so nothing leaks). No url needed to join.
    if (hasHash) {
      const existing = await col.findOne({ sha256 })
      if (existing) {
        const uploaders = [...new Set([...(existing.uploaders || [existing.ownerEmail]), ownerEmail])]
        const isPublic = existing.isPublic !== false || wantPublic
        await col.updateOne(
          { _id: existing._id },
          { $set: { uploaders, isPublic, updatedAt: new Date().toISOString() } }
        )
        return NextResponse.json({ success: true, id: existing._id.toString(), isPublic, deduped: true })
      }
    }

    const url = String(body?.url || '').slice(0, 1000)
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })
    const fileName = String(body?.fileName || body?.title || 'upload').slice(0, 200)
    const title = String(body?.title || fileName).slice(0, 200)
    const itemKind = body?.itemKind || kindOf(body?.mime, fileName)

    const now = new Date().toISOString()
    const doc = {
      ownerEmail,
      uploaders: [ownerEmail],
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
      ...(/^[0-9a-f]{64}$/.test(String(body?.sha256 || '').toLowerCase()) ? { sha256: String(body.sha256).toLowerCase() } : {}),
      createdAt: now,
      updatedAt: now,
    }
    const res = await col.insertOne(doc)
    return NextResponse.json({ success: true, id: res.insertedId.toString(), isPublic: doc.isPublic }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
