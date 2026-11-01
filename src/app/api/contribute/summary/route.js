import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'

// GET /api/contribute/summary?programme=COS&level=300+Level
// Contributor scope overview: how much content a department/level owns.
// Requires a signed-in editor, official, or admin.
export async function GET(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const role = user.role || 'student'
    if (!user.admin && role !== 'editor' && role !== 'official') {
      return NextResponse.json({ error: 'Contributor access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const programme = (searchParams.get('programme') || '').toUpperCase().trim() || null
    const level = (searchParams.get('level') || '').trim() || null

    const [coursesCol, questionsCol, videosCol, theoryCol, readingsCol, materialsCol] = await Promise.all([
      getCollection('curriculum_courses').catch(() => null),
      getCollection('questions').catch(() => null),
      getCollection('videos').catch(() => null),
      getCollection('theory_references').catch(() => null),
      getCollection('readings').catch(() => null),
      getCollection('user_materials').catch(() => null),
    ])

    let codes = []
    let titles = {}
    if (coursesCol && programme) {
      const filter = { programmeCode: programme, core: true, ...(level ? { level } : {}) }
      const docs = await coursesCol.find(filter).project({ code: 1, title: 1 }).toArray().catch(() => [])
      codes = [...new Set(docs.map(d => d.code).filter(Boolean))]
      for (const d of docs) if (d.code && !titles[d.code]) titles[d.code] = d.title || d.code
    }

    const inCodes = codes.length ? { $in: codes } : null
    const [questions, videos, theory, readings, materials] = await Promise.all([
      questionsCol && codes.length ? questionsCol.countDocuments({ courseCode: inCodes }).catch(() => 0) : 0,
      videosCol && codes.length ? videosCol.countDocuments({ courseCode: inCodes }).catch(() => 0) : 0,
      theoryCol && codes.length ? theoryCol.countDocuments({ courseCode: inCodes }).catch(() => 0) : 0,
      readingsCol && codes.length ? readingsCol.countDocuments({ courseCode: inCodes }).catch(() => 0) : 0,
      materialsCol ? materialsCol.countDocuments({ ...(codes.length ? { courseCode: { $in: [...codes, ...codes.map(c => c.replace(/\s+/g, ''))] } } : {}), isPublic: true }).catch(() => 0) : 0,
    ])

    return NextResponse.json({
      programme, level,
      courses: codes.length,
      courseCodes: codes.slice(0, 100),
      courseTitles: titles,
      questions, videos, theory, readings, materials,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
