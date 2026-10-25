import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { ObjectId } from 'mongodb'
import { requireWriter } from '../_lib'

// GET /api/curriculum/revisions?university=UNILAG&limit=50 — audit trail.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const university = (searchParams.get('university') || '').toUpperCase() || null
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const db = await getDB()
    const filter = university ? { university } : {}
    const docs = await db.collection('curriculum_revisions').find(filter).sort({ createdAt: -1 }).limit(limit).toArray()
    return NextResponse.json(docs.map(d => ({ ...d, _id: d._id.toString() })))
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch revisions' }, { status: 500 })
  }
}

// POST /api/curriculum/revisions { revisionId } — one-tap rollback
// (restores the before-state; itself logged as a new revision).
export async function POST(request) {
  try {
    const { revisionId } = await request.json()
    if (!revisionId || !ObjectId.isValid(revisionId)) return NextResponse.json({ error: 'revisionId required' }, { status: 400 })
    const db = await getDB()
    const rev = await db.collection('curriculum_revisions').findOne({ _id: new ObjectId(revisionId) })
    if (!rev) return NextResponse.json({ error: 'Revision not found' }, { status: 404 })

    const gate = await requireWriter(request, rev.university)
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: 403 })

    const col = db.collection(rev.collection)
    const targetId = new ObjectId(rev.docId)
    const current = await col.findOne({ _id: targetId })
    if (rev.action === 'create') {
      await col.deleteOne({ _id: targetId })
    } else if (rev.action === 'delete' || rev.before) {
      const { _id, ...restore } = rev.before
      await col.updateOne({ _id: targetId }, { $set: restore }, { upsert: false })
      if (!(await col.findOne({ _id: targetId }))) await col.insertOne({ ...restore, _id: targetId })
    } else {
      return NextResponse.json({ error: 'Nothing to restore' }, { status: 400 })
    }
    await db.collection('curriculum_revisions').insertOne({
      action: 'rollback', collection: rev.collection, docId: rev.docId,
      before: current, after: rev.before || null,
      by: gate.user.email, university: rev.university, of: String(rev._id),
      createdAt: new Date().toISOString(),
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Rollback failed: ' + error.message }, { status: 500 })
  }
}
