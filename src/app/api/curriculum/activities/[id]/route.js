import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { ObjectId } from 'mongodb'
import { requireWriter, revision } from '../../_lib'

// PATCH — edit an activity. Core items are locked (platform-only);
// university items editable by that university's officials (admins: any).
export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const db = await getDB()
    const col = db.collection('topic_activities')
    const existing = await col.findOne({ _id: new ObjectId(id) })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if ((existing.origin || 'core') === 'core') {
      return NextResponse.json({ error: 'Core curriculum is locked (platform-only edits).' }, { status: 403 })
    }

    const gate = await requireWriter(request, existing.origin)
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: 403 })

    const body = await request.json()
    const update = {}
    for (const k of ['title', 'kind', 'payload', 'order', 'status']) {
      if (body[k] !== undefined) update[k] = body[k]
    }
    if (!Object.keys(update).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    update.updatedAt = new Date().toISOString()

    await col.updateOne({ _id: existing._id }, { $set: update })
    await revision(db, { action: 'update', collection: 'topic_activities', docId: id, before: existing, after: { ...existing, ...update }, by: gate.user.email, university: existing.origin })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update: ' + error.message }, { status: 500 })
  }
}

// DELETE — removes a university addition (core can never be deleted here).
export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const db = await getDB()
    const col = db.collection('topic_activities')
    const existing = await col.findOne({ _id: new ObjectId(id) })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if ((existing.origin || 'core') === 'core') {
      return NextResponse.json({ error: 'Core curriculum cannot be deleted here.' }, { status: 403 })
    }

    const gate = await requireWriter(request, existing.origin)
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: 403 })

    await col.deleteOne({ _id: existing._id })
    await revision(db, { action: 'delete', collection: 'topic_activities', docId: id, before: existing, after: null, by: gate.user.email, university: existing.origin })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete: ' + error.message }, { status: 500 })
  }
}
