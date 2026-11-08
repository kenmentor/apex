import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { normalizeCourse } from '@/lib/curriculum'

// GET /api/curriculum/courses?programme=COS&level=200+Level&university=UNILAG
// Core courses + that university's own additions (core never duplicated).
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const programme = searchParams.get('programme')
    const level = searchParams.get('level')
    const code = searchParams.get('code')
    const university = (searchParams.get('university') || '').toUpperCase() || null

    const col = await getCollection('curriculum_courses')
    // Programme/level match AND (core OR own university layer).
    // With ?code=, returns every programme mapping of that course code.
    const query = {
      ...(code ? { code: normalizeCourse(code) } : {}),
      ...(programme ? { programmeCode: programme.toUpperCase() } : {}),
      ...(level ? { level } : {}),
      $or: [{ core: true }, ...(university ? [{ university }] : [])],
    }

    const docs = await col.find(query).sort({ semester: 1, code: 1 }).toArray()
    return NextResponse.json(docs.map(d => ({ ...d, _id: d._id.toString() })))
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 })
  }
}
