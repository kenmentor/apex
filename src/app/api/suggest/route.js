import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { notifyAdmins } from '@/lib/notify'

const TARGETS = ['questions', 'readings', 'user_materials', 'auto']

// POST /api/suggest — any signed-in user proposes an edit to live content.
// Goes to the admin review queue (Suggestions tab), never applies directly.
export async function POST(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Sign in to suggest an edit' }, { status: 401 })
    const body = await request.json()
    const { collection, targetId, patch, note, references } = body || {}
    if (!TARGETS.includes(collection)) return NextResponse.json({ error: 'Bad collection' }, { status: 400 })
    if (!patch || typeof patch !== 'object' || Array.isArray(patch) || !Object.keys(patch).length) {
      return NextResponse.json({ error: 'Nothing to suggest — change a field first' }, { status: 400 })
    }
    const noteText = String(note || '').trim().slice(0, 500)
    if (!noteText) return NextResponse.json({ error: 'Say what should change and why' }, { status: 400 })
    const refs = (Array.isArray(references) ? references : String(references || '').split(/[,\n]/))
      .map(r => typeof r === 'string' ? r.trim() : String(r?.url || '').trim())
      .filter(Boolean).slice(0, 10)
      .map(url => ({ label: url.slice(0, 80), url: url.slice(0, 1000) }))

    // Resolve the live item across collections when callers pass 'auto',
    // by ObjectId first, then by bank id.
    const order = collection === 'auto' ? ['readings', 'user_materials', 'questions'] : [collection]
    let target = null
    let targetCollection = collection
    for (const c of order) {
      const targetCol = await getCollection(c)
      try {
        target = await targetCol.findOne({ _id: new ObjectId(String(targetId)) })
      } catch { target = null }
      if (!target) target = await targetCol.findOne({ id: String(targetId) }).catch(() => null)
      if (target) { targetCollection = c; break }
    }
    if (!target) return NextResponse.json({ error: 'Target not found' }, { status: 404 })
    const targetOid = target._id

    const me = String(user.email).toLowerCase()
    const col = await getCollection('suggestions')
    const res = await col.insertOne({
      collection: targetCollection,
      targetId: targetOid,
      targetTitle: String(target.title || target.fileName || target.question || 'Untitled').slice(0, 200),
      targetCourse: target.courseCode || null,
      targetTopic: target.topic || target.section || null,
      patch,
      note: noteText,
      references: refs,
      status: 'pending',
      suggestedBy: me,
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      createdAt: new Date().toISOString(),
    })
    notifyAdmins({
      type: 'contribute',
      title: `New edit suggestion — needs review`,
      message: `${String(target.title || target.fileName || target.question || '').slice(0, 100)} · by ${me}`,
      link: '/admin/review',
    }, me).catch(() => {})
    return NextResponse.json({ success: true, id: res.insertedId.toString() }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
