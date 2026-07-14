import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken, requireAdmin } from '@/lib/auth-server'

function normalizeCourse(code) {
  return (code || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/^([A-Z]+)(\d+)$/, '$1 $2')
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const courseCode = searchParams.get('courseCode')

    if (!courseCode) {
      return NextResponse.json({ error: 'courseCode required' }, { status: 400 })
    }

    const refsCol = await getCollection('theory_references')
    const refs = await refsCol
      .find({ courseCode: normalizeCourse(courseCode) })
      .sort({ createdAt: -1 })
      .toArray()

    const safe = refs.map(r => ({
      _id: r._id.toString(),
      courseCode: r.courseCode,
      section: r.section,
      id: r.id,
      question: r.question,
      mainConcepts: r.mainConcepts,
      keywords: r.keywords,
      difficulty: r.difficulty,
      maxPoints: r.maxPoints || 10,
    }))

    return NextResponse.json(safe)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch references' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const user = await requireAdmin(request)
    if (!user) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { courseCode, section, id, question, keywords, mainConcepts, referenceAnswer, difficulty, maxPoints } = body

    if (!courseCode || !id || !question || !referenceAnswer) {
      return NextResponse.json({ error: 'Missing required fields: courseCode, id, question, referenceAnswer' }, { status: 400 })
    }

    const refsCol = await getCollection('theory_references')

    const existing = await refsCol.findOne({
      courseCode: normalizeCourse(courseCode),
      id: id.trim(),
    })

    const doc = {
      courseCode: normalizeCourse(courseCode),
      section: section || 'General',
      id: id.trim(),
      question: question.trim(),
      keywords: Array.isArray(keywords) ? keywords : [],
      mainConcepts: Array.isArray(mainConcepts) ? mainConcepts : [],
      referenceAnswer: referenceAnswer.trim(),
      difficulty: difficulty || 'medium',
      maxPoints: maxPoints || 10,
      updatedAt: new Date().toISOString(),
    }

    if (existing) {
      await refsCol.updateOne(
        { _id: existing._id },
        { $set: doc }
      )
      return NextResponse.json({ success: true, updated: true })
    } else {
      doc.createdAt = new Date().toISOString()
      const result = await refsCol.insertOne(doc)
      return NextResponse.json({ success: true, id: result.insertedId.toString() }, { status: 201 })
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save reference: ' + error.message }, { status: 500 })
  }
}
