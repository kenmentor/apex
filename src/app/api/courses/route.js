import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

export async function GET() {
  try {
    const coursesCol = await getCollection('courses')
    const questionsCol = await getCollection('questions')

    const docs = await coursesCol.find({}).toArray()

    const results = await Promise.all(docs.map(async (d) => {
      const count = await questionsCol.countDocuments({ courseCode: d.code })
      return { ...d, _id: d._id.toString(), id: d._id.toString(), questionCount: count }
    }))

    return NextResponse.json({ docs: results })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
