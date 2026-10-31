import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

function slug(v) {
  return String(v || '').toLowerCase()
}

// GET /api/departments/[code] — discipline-first:
// a CCMAS discipline resolves to its programmes, each with its core courses.
// Falls back to the legacy departments collection (GSS, COS, CSC, MTH, PHY, MED)
// so old deep links keep working.
export async function GET(request, { params }) {
  try {
    const { code } = params
    const want = slug(code)

    const discCol = await getCollection('disciplines').catch(() => null)
    if (discCol) {
      const discs = await discCol.find({}).toArray().catch(() => [])
      const disc = discs.find(d => slug(d.code) === want)
      if (disc) {
        const progCol = await getCollection('programmes')
        const courseCol = await getCollection('curriculum_courses')
        const progs = await progCol.find({ disciplineCode: disc.code }).sort({ name: 1 }).toArray()
        const levels = {}
        for (const p of progs) {
          const courses = await courseCol
            .find({ programmeCode: p.code, core: true })
            .sort({ level: 1, code: 1 })
            .toArray()
            .catch(() => [])
          levels[p.name || p.code] = courses.map(c => ({
            _id: c._id.toString(),
            id: c._id.toString(),
            code: c.code,
            title: c.title || c.code,
            level: c.level || null,
            units: c.units ?? null,
          }))
        }
        return NextResponse.json({ code: disc.code, title: disc.title || disc.code, levels })
      }
    }

    // Legacy fallback (old 6-entry departments collection).
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
