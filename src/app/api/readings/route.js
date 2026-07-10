import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

function normalizeCourse(code) {
  return (code || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/^([A-Z]+)(\d+)$/, '$1 $2')
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const courseCode = searchParams.get('course')

    const col = await getCollection('readings')
    const filter = courseCode ? { courseCode: normalizeCourse(courseCode) } : {}
    const docs = await col.find(filter).sort({ order: 1 }).toArray()

    return NextResponse.json(docs.map(d => ({
      _id: d._id.toString(),
      courseCode: d.courseCode,
      title: d.title,
      order: d.order,
      content: d.content,
    })))
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
