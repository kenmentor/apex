import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'

function normCourse(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/^([A-Z]+)(\d+)$/, '$1 $2') || null
}

function canContribute(user) {
  return !!user && (!!user.admin || ['editor', 'official', 'admin'].includes(user.role))
}

// POST /api/contribute/topics — add a new topic shell to a course.
// Content gets attached afterwards via the Add flow.
export async function POST(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canContribute(user)) return NextResponse.json({ error: 'Contributor only' }, { status: 403 })
    const body = await request.json()
    const courseCode = normCourse(body.courseCode)
    const title = String(body.title || '').trim().slice(0, 200)
    if (!courseCode) return NextResponse.json({ error: 'courseCode required' }, { status: 400 })
    if (title.length < 3) return NextResponse.json({ error: 'Give the topic a title' }, { status: 400 })
    const col = await getCollection('curriculum_topics')
    const dupe = await col.findOne({ courseCode, title })
    if (dupe) return NextResponse.json({ error: 'That topic already exists', id: String(dupe._id) }, { status: 409 })
    const max = await col.find({ courseCode }).sort({ order: -1 }).limit(1).toArray().catch(() => [])
    const order = max.length && Number.isFinite(max[0].order) ? max[0].order + 1 : 1
    const id = `contrib-${Date.now().toString(36)}`
    const res = await col.insertOne({
      courseCode, id, title, order,
      origin: 'contributor',
      authorEmail: String(user.email).toLowerCase(),
      createdAt: new Date().toISOString(),
    })
    return NextResponse.json({ success: true, id: res.insertedId.toString(), topicId: id }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
