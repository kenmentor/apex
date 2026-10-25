import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { normalizeCourse } from '@/lib/curriculum'

// GET /api/curriculum/topics?course=COS+202 — atomic topic list, ordered.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const course = searchParams.get('course')
    if (!course) return NextResponse.json({ error: 'course required' }, { status: 400 })
    const col = await getCollection('curriculum_topics')
    const docs = await col.find({ courseCode: normalizeCourse(course) }).sort({ order: 1 }).toArray()
    return NextResponse.json(docs.map(d => ({ ...d, _id: d._id.toString() })))
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 })
  }
}
