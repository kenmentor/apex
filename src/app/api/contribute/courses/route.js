import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'

function normCourse(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/^([A-Z]+)(\d+)$/, '$1 $2')
}

function normLevel(level) {
  const raw = String(level || '').trim()
  if (/^\d{3}$/.test(raw)) return `${raw} Level`
  return raw.slice(0, 24) || null
}

function canContribute(user) {
  return !!user && (!!user.admin || ['editor', 'official', 'admin'].includes(user.role))
}

// POST /api/contribute/courses — a department team adds a new course to its
// programme. Stored as a core row (origin: contributor) so plans, browse and
// search pick it up like every other course.
export async function POST(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canContribute(user)) return NextResponse.json({ error: 'Contributor only' }, { status: 403 })
    const body = await request.json()
    const code = normCourse(body.code)
    const title = String(body.title || '').trim().slice(0, 200)
    const programme = String(body.programme || '').toUpperCase().trim()
    if (!code) return NextResponse.json({ error: 'Course code required (e.g. COS 204)' }, { status: 400 })
    if (!title) return NextResponse.json({ error: 'Course title required' }, { status: 400 })
    if (!programme) return NextResponse.json({ error: 'Programme required' }, { status: 400 })
    const col = await getCollection('curriculum_courses')
    const exists = await col.findOne({ programmeCode: programme, code })
    if (exists) return NextResponse.json({ error: `${code} already exists in ${programme}`, id: String(exists._id) }, { status: 409 })
    const now = new Date().toISOString()
    const res = await col.insertOne({
      programmeCode: programme,
      code,
      title,
      level: normLevel(body.level),
      core: true,
      origin: 'contributor',
      addedBy: String(user.email).toLowerCase(),
      university: null,
      semester: null,
      units: null,
      createdAt: now,
      updatedAt: now,
    })
    return NextResponse.json({ success: true, id: res.insertedId.toString(), code }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
