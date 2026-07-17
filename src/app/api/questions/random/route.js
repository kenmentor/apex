import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const courses = searchParams.get('courses')

    const col = await getCollection('questions')
    let filter = {}
    if (courses) {
      const codes = courses.split(',').map(c => c.trim().toUpperCase())
      filter = { courseCode: { $in: codes } }
    }

    const total = await col.countDocuments(filter)
    if (total === 0) return NextResponse.json(null)

    const skip = Math.floor(Math.random() * total)
    const docs = await col.find(filter).skip(skip).limit(1).toArray()
    if (!docs.length) return NextResponse.json(null)

    const d = docs[0]
    return NextResponse.json({
      id: d.id,
      question: d.question,
      options: d.options,
      correctAnswer: d.correctAnswer,
      explanation: d.explanation,
      courseCode: d.courseCode,
      section: d.section,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
