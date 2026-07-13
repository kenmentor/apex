import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

export async function GET(request, { params }) {
  try {
    const { code } = params
    const deptCol = await getCollection('departments')
    const dept = await deptCol.findOne({ code: code.toUpperCase() })
    if (!dept) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const currCol = await getCollection('curriculum')
    const curriculum = await currCol.find({ department_code: dept.code }).toArray()

    const courseCol = await getCollection('courses')
    const allCourseCodes = [...new Set(curriculum.flatMap(c => c.course_codes))]
    const courses = await courseCol.find({ code: { $in: allCourseCodes } }).toArray()

    const levels = {}
    for (const entry of curriculum) {
      levels[entry.level] = entry.course_codes.map(cc => {
        const course = courses.find(c => c.code === cc)
        return course ? { ...course, _id: course._id.toString(), id: course._id.toString() } : { code: cc }
      })
    }

    return NextResponse.json({
      ...dept,
      _id: dept._id.toString(),
      id: dept._id.toString(),
      levels,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
