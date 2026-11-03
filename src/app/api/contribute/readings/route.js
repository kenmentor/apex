import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { notifyAdmins } from '@/lib/notify'

function normCourse(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/^([A-Z]+)(\d+)$/, '$1 $2').slice(0, 32) || null
}

function canContribute(user) {
  return !!user && (!!user.admin || ['editor', 'official', 'admin'].includes(user.role))
}

// POST /api/contribute/readings — contributor text/notes (rich-text HTML)
// straight into the course bank. Scoped by course; visible in search + plan.
export async function POST(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canContribute(user)) return NextResponse.json({ error: 'Contributor only' }, { status: 403 })
    const body = await request.json()
    const courseCode = normCourse(body.courseCode)
    const title = String(body.title || '').trim().slice(0, 200)
    const content = String(body.content || '').trim()
    if (!courseCode) return NextResponse.json({ error: 'courseCode required' }, { status: 400 })
    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })
    if (!content || content.replace(/<[^>]*>/g, '').trim().length < 10) {
      return NextResponse.json({ error: 'Write a little more first' }, { status: 400 })
    }
    const col = await getCollection('readings')
    const now = new Date().toISOString()
    const me = String(user.email).toLowerCase()
    const references = (Array.isArray(body.references) ? body.references : String(body.references || '').split(/[,\n]/))
      .map(r => typeof r === 'string' ? r.trim() : String(r?.url || '').trim())
      .filter(Boolean).slice(0, 10)
      .map(url => ({ label: url.slice(0, 80), url: url.slice(0, 1000) }))
    const changeNote = String(body.changeNote || '').trim().slice(0, 500) || null
    const res = await col.insertOne({
      courseCode, title, content,
      // Pending until a general admin approves it in review.
      status: 'pending',
      reviewedBy: null,
      reviewedAt: null,
      changeNote,
      references,
      versions: [{ v: 1, at: now, by: me, note: changeNote ? `Submitted: ${changeNote}` : 'Submitted for review' }],
      source: 'contributor',
      authorEmail: me,
      createdAt: now, updatedAt: now,
    })
    notifyAdmins({
      type: 'contribute',
      title: `New note for ${courseCode} — needs review`,
      message: `${title.slice(0, 120)} · by ${String(user.email).toLowerCase()}`,
      link: '/admin/review',
    }, user.email).catch(() => {})
    return NextResponse.json({ success: true, id: res.insertedId.toString() }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
