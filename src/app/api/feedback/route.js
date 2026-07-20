import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'

function normalizeCourse(code) {
  return (code || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/^([A-Z]+)(\d+)$/, '$1 $2')
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { course: courseCode, rating, comment } = body

    if (!courseCode || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Course and rating (1-5) are required' }, { status: 400 })
    }

    const userFromToken = await getUserFromToken(request).catch(() => null)

    const feedbackCol = await getCollection('feedback')

    const doc = {
      course: normalizeCourse(courseCode),
      rating: Math.round(rating),
      comment: (comment || '').trim().slice(0, 500),
      userEmail: userFromToken?.email || null,
      userName: userFromToken?.name || null,
      userAvatar: userFromToken?.avatar || null,
      createdAt: new Date().toISOString(),
    }

    const result = await feedbackCol.insertOne(doc)
    return NextResponse.json({ success: true, id: result.insertedId.toString() }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save feedback: ' + error.message }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const courseCode = searchParams.get('course')

    const feedbackCol = await getCollection('feedback')
    const filter = courseCode ? { course: normalizeCourse(courseCode) } : {}
    const docs = await feedbackCol
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()

    return NextResponse.json(docs.map((d) => ({ ...d, _id: d._id.toString() })))
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
  }
}
