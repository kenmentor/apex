import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

// GET /api/search?q=&type=&course=&limit=
// Study-content search only (no groups/posts): quiz, theory, notes, pdf, video, audio.
// Response: { q, course, type, groups: { quiz, theory, notes, pdf, video, audio }, counts }
const TYPES = ['quiz', 'theory', 'notes', 'pdf', 'video', 'audio']

function normalizeCourse(code) {
  return (code || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/^([A-Z]+)(\d+)$/, '$1 $2')
}

function courseHref(code) {
  return `/courses/${String(code || '').toLowerCase().replace(/\s+/g, '')}`
}

function escapeRegExp(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function titleOf(s, n = 120) {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t
}

function isPdfDoc(d) {
  return Boolean(d.pdfUrl) || /\.pdf(\?|$)/i.test(String(d.url || ''))
}

function isAudioDoc(d) {
  const url = String(d.url || d.audioUrl || '')
  return Boolean(d.audioUrl) || /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(url)
}

// $text first, regex fallback (missing index, short/symbol queries).
async function searchCol(col, q, baseFilter, regexFields, limit) {
  const sanitized = String(q || '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim()
  if (sanitized) {
    try {
      const docs = await col
        .find({ $text: { $search: sanitized }, ...baseFilter }, { projection: { score: { $meta: 'textScore' } } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .maxTimeMS(2000)
        .toArray()
      return docs
    } catch {
      // fall through to regex
    }
  }
  const rx = { $regex: escapeRegExp(q), $options: 'i' }
  const or = regexFields.map((f) => ({ [f]: rx }))
  const filter = Object.keys(baseFilter).length ? { $and: [baseFilter, { $or: or }] } : { $or: or }
  return col.find(filter).limit(limit).maxTimeMS(2000).toArray()
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const type = (searchParams.get('type') || '').toLowerCase().trim()
    const courseRaw = (searchParams.get('course') || '').trim()
    const limitRaw = parseInt(searchParams.get('limit') || '8', 10)
    const limit = Math.min(25, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 8))

    if (!q || q.length < 2) return NextResponse.json({ error: 'q (min 2 chars) required' }, { status: 400 })
    if (type && !TYPES.includes(type)) return NextResponse.json({ error: 'invalid type' }, { status: 400 })

    const course = courseRaw ? normalizeCourse(courseRaw) : null
    const baseFilter = course ? { courseCode: { $in: [course, course.replace(/\s+/g, '')] } } : {}

    const want = (t) => !type || type === t
    const needQuestions = want('quiz')
    const needTheory = want('theory')
    const needReadings = want('notes') || want('pdf')
    const needVideos = want('video') || want('audio')

    const [questionsCol, theoryCol, readingsCol, videosCol] = await Promise.all([
      needQuestions ? getCollection('questions') : null,
      needTheory ? getCollection('theory_references') : null,
      needReadings ? getCollection('readings') : null,
      needVideos ? getCollection('videos') : null,
    ])

    const fetchN = needReadings && !type ? limit * 2 : limit
    const fetchV = needVideos && !type ? limit * 2 : limit

    const [qDocs, tDocs, rDocs, vDocs] = await Promise.all([
      questionsCol ? searchCol(questionsCol, q, baseFilter, ['question', 'explanation', 'section'], limit) : [],
      theoryCol ? searchCol(theoryCol, q, baseFilter, ['question', 'keywords', 'mainConcepts'], limit) : [],
      readingsCol ? searchCol(readingsCol, q, baseFilter, ['title', 'content'], fetchN) : [],
      videosCol ? searchCol(videosCol, q, baseFilter, ['title', 'description'], fetchV) : [],
    ])

    const quiz = qDocs.map((d) => ({
      id: String(d._id), kind: 'quiz', courseCode: d.courseCode,
      title: titleOf(d.question), subtitle: `${d.courseCode || ''}${d.section ? ` · ${d.section}` : ''} · Quiz`,
      href: `${courseHref(d.courseCode)}/quiz`,
    }))

    const theory = tDocs.map((d) => ({
      id: String(d._id), kind: 'theory', courseCode: d.courseCode,
      title: titleOf(d.question), subtitle: `${d.courseCode || ''} · Theory${d.difficulty ? ` · ${d.difficulty}` : ''}`,
      href: `${courseHref(d.courseCode)}/theory`,
    }))

    const readingItems = rDocs.map((d) => {
      const pdf = isPdfDoc(d)
      return {
        id: String(d._id), kind: pdf ? 'pdf' : 'notes', courseCode: d.courseCode,
        title: titleOf(d.title), subtitle: `${d.courseCode || ''} · ${pdf ? 'PDF' : 'Note'}`,
        href: courseHref(d.courseCode), url: d.pdfUrl || d.url || null,
      }
    })
    const notes = readingItems.filter((i) => i.kind === 'notes' && want('notes')).slice(0, limit)
    const pdf = readingItems.filter((i) => i.kind === 'pdf' && want('pdf')).slice(0, limit)

    const mediaItems = vDocs.map((d) => {
      const audio = isAudioDoc(d)
      return {
        id: String(d._id), kind: audio ? 'audio' : 'video', courseCode: d.courseCode,
        title: titleOf(d.title), subtitle: `${d.courseCode || ''} · ${audio ? 'Audio' : 'Video'}`,
        href: d.url || courseHref(d.courseCode),
      }
    })
    const video = mediaItems.filter((i) => i.kind === 'video' && want('video')).slice(0, limit)
    const audio = mediaItems.filter((i) => i.kind === 'audio' && want('audio')).slice(0, limit)

    const groups = { quiz, theory, notes, pdf, video, audio }
    const counts = Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length]))

    return NextResponse.json({ q, course, type: type || null, groups, counts })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
