import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'

function normCourse(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/^([A-Z]+)(\d+)$/, '$1 $2').slice(0, 32) || null
}

function toId(id) {
  try { return new ObjectId(String(id)) } catch { return null }
}

// PATCH /api/materials/[id] — owner only: { title, courseCode, description, isPublic }
export async function PATCH(request, { params }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const id = toId(params?.id)
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    const col = await getCollection('user_materials')
    const doc = await col.findOne({ _id: id })
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (String(doc.ownerEmail).toLowerCase() !== String(user.email).toLowerCase()) {
      return NextResponse.json({ error: 'Only the owner can edit' }, { status: 403 })
    }
    const body = await request.json()
    const update = { updatedAt: new Date().toISOString() }
    if (body.title !== undefined) update.title = String(body.title).slice(0, 200) || doc.title
    if (body.courseCode !== undefined) update.courseCode = body.courseCode ? normCourse(body.courseCode) : null
    if (body.description !== undefined) update.description = body.description ? String(body.description).slice(0, 500) : null
    if (body.isPublic !== undefined) update.isPublic = body.isPublic !== false
    await col.updateOne({ _id: id }, { $set: update })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/materials/[id] — any uploader can remove themselves; the central
// file (and its single stored copy) is deleted only when the last uploader leaves.
export async function DELETE(request, { params }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const email = String(user.email).toLowerCase()
    const id = toId(params?.id)
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    const col = await getCollection('user_materials')
    const doc = await col.findOne({ _id: id })
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const uploaders = [...new Set([...(doc.uploaders || [doc.ownerEmail]), ])].map(e => String(e).toLowerCase())
    if (!uploaders.includes(email) && String(doc.ownerEmail).toLowerCase() !== email) {
      return NextResponse.json({ error: 'Only an uploader can delete' }, { status: 403 })
    }
    const rest = uploaders.filter(e => e !== email)
    if (rest.length > 0) {
      await col.updateOne({ _id: id }, { $set: { uploaders: rest, updatedAt: new Date().toISOString() } })
      return NextResponse.json({ success: true, left: true })
    }
    await col.deleteOne({ _id: id })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
