import { NextResponse } from 'next/server'
import { getCollection, getDB } from '@/lib/db'
import { mergeActivities, normalizeCourse } from '@/lib/curriculum'
import { requireWriter, revision } from '../_lib'

// GET /api/curriculum/activities?course=COS+202&topic=<id>&university=UNILAG
// Returns core ladder first, then the university's approved additions.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const course = searchParams.get('course')
    const topic = searchParams.get('topic')
    const university = (searchParams.get('university') || '').toUpperCase() || null
    if (!course) return NextResponse.json({ error: 'course required' }, { status: 400 })

    const col = await getCollection('topic_activities')
    const filter = { courseCode: normalizeCourse(course) }
    if (topic) filter.topicId = topic
    const docs = await col.find(filter).sort({ order: 1 }).toArray()
    const core = docs.filter(d => (d.origin || 'core') === 'core')
    const uni = university ? docs.filter(d => d.origin === university && d.status !== 'pending') : []
    const items = mergeActivities(core, uni).map(d => ({ ...d, _id: d._id.toString() }))
    return NextResponse.json({ courseCode: normalizeCourse(course), topicId: topic || null, university, items })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
  }
}

// POST — officials publish to their own university layer (admins: anywhere).
// Body: { courseCode, topicId, kind, title, payload?, order?, university? }
export async function POST(request) {
  try {
    const body = await request.json()
    const { courseCode, topicId, kind, title, payload, order } = body
    if (!courseCode || !topicId || !kind || !title) {
      return NextResponse.json({ error: 'courseCode, topicId, kind, title required' }, { status: 400 })
    }
    if (!['learn', 'watch', 'drill', 'play', 'prove'].includes(kind)) {
      return NextResponse.json({ error: 'Invalid kind' }, { status: 400 })
    }
    const origin = (body.university || '').toUpperCase() || null
    if (!origin) return NextResponse.json({ error: 'university required (core is platform-only)' }, { status: 400 })

    const gate = await requireWriter(request, origin)
    if (gate.error) return NextResponse.json({ error: gate.error }, { status: 403 })

    const db = await getDB()
    const doc = {
      courseCode: normalizeCourse(courseCode), topicId, kind, title,
      payload: payload || {}, order: order ?? 9,
      origin, status: 'approved',
      createdBy: gate.user.email, updatedAt: new Date().toISOString(),
    }
    const result = await db.collection('topic_activities').insertOne(doc)
    await revision(db, { action: 'create', collection: 'topic_activities', docId: result.insertedId, before: null, after: doc, by: gate.user.email, university: origin })
    return NextResponse.json({ success: true, id: result.insertedId.toString() }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create activity: ' + error.message }, { status: 500 })
  }
}
