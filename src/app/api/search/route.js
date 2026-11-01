import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'

// GET /api/search?q=&type=&course=&limit=
// Study-content search only (no groups/posts): quiz, theory, notes, pdf, video, audio.
// Response: { q, course, type, groups: { quiz, theory, notes, pdf, video, audio }, counts }
const TYPES = ['quiz', 'theory', 'notes', 'pdf', 'video', 'audio', 'folder']

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

    const [questionsCol, theoryCol, readingsCol, videosCol, materialsCol, nodesCol, membersCol, me] = await Promise.all([
      needQuestions ? getCollection('questions') : null,
      needTheory ? getCollection('theory_references') : null,
      needReadings ? getCollection('readings') : null,
      needVideos ? getCollection('videos') : null,
      getCollection('user_materials'),
      want('folder') ? getCollection('library_nodes') : null,
      want('folder') ? getCollection('library_members') : null,
      want('folder') ? getUserFromToken(request).then(u => (u?.email || '').toLowerCase()).catch(() => '') : Promise.resolve(''),
    ])

    const fetchN = needReadings && !type ? limit * 2 : limit
    const fetchV = needVideos && !type ? limit * 2 : limit

    // Pending / rejected / revoked contributions stay out until an admin approves them.
    const liveOnly = { status: { $nin: ['pending', 'rejected', 'revoked'] } }
    // Folders: your own + ones shared with you (curated collections stay private).
    let fDocs = []
    if (nodesCol && me) {
      try {
        const mems = await (membersCol ? membersCol.find({ email: me }).limit(200).toArray().catch(() => []) : [])
        const { ObjectId } = await import('mongodb')
        const sharedIds = mems.map(m => { try { return new ObjectId(String(m.nodeId)) } catch { return null } }).filter(Boolean)
        const scopeOr = [{ ownerEmail: me }]
        if (sharedIds.length) scopeOr.push({ _id: { $in: sharedIds } })
        const folderFilter = { kind: 'folder', $or: scopeOr, ...(course ? { courseCode: { $in: [course, course.replace(/\s+/g, '')] } } : {}) }
        fDocs = await searchCol(nodesCol, q, folderFilter, ['name', 'subtitle'], limit)
      } catch { fDocs = [] }
    }
    const [qDocs, tDocs, rDocs, vDocs, mDocs] = await Promise.all([
      questionsCol ? searchCol(questionsCol, q, { ...baseFilter, ...liveOnly }, ['question', 'explanation', 'section'], limit) : [],
      theoryCol ? searchCol(theoryCol, q, baseFilter, ['question', 'keywords', 'mainConcepts'], limit) : [],
      readingsCol ? searchCol(readingsCol, q, { ...baseFilter, ...liveOnly }, ['title', 'content'], fetchN) : [],
      videosCol ? searchCol(videosCol, q, baseFilter, ['title', 'description'], fetchV) : [],
      materialsCol ? searchCol(materialsCol, q, { ...baseFilter, isPublic: true, ...liveOnly }, ['title', 'fileName', 'description'], limit) : [],
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

    // Central public uploads from users (default public). Visible to all in search.
    const uploads = (mDocs || []).map((d) => {
      const kind = ['quiz', 'theory', 'notes', 'pdf', 'video', 'audio'].includes(d.itemKind) ? d.itemKind : (
        /\.pdf$/i.test(d.fileName || '') ? 'pdf'
        : (d.mime || '').startsWith('video/') ? 'video'
        : (d.mime || '').startsWith('audio/') ? 'audio' : 'notes'
      )
      return {
        id: `m-${String(d._id)}`, kind, courseCode: d.courseCode,
        title: titleOf(d.title || d.fileName), subtitle: `${d.courseCode || 'Uploads'} · by ${d.ownerEmail || 'user'}`,
        href: d.url, url: d.url,
      }
    })
    for (const u of uploads) {
      if (u.kind === 'notes' && want('notes')) notes.push(u)
      else if (u.kind === 'pdf' && want('pdf')) pdf.push(u)
      else if (u.kind === 'video' && want('video')) video.push(u)
      else if (u.kind === 'audio' && want('audio')) audio.push(u)
      else if ((u.kind === 'quiz' || u.kind === 'theory') && want(u.kind)) {
        if (u.kind === 'quiz') quiz.push(u)
        else theory.push(u)
      }
    }

    // Curated folders (yours + shared with you) matching the query.
    const folders = (want('folder') ? fDocs : []).map((d) => ({
      id: String(d._id), kind: 'folder', courseCode: d.courseCode || null,
      title: titleOf(d.name), subtitle: `${d.courseCode || 'Folder'} · curated collection`,
      href: `/folders?id=${String(d._id)}`,
    }))

    const groups = { quiz, theory, notes, pdf, video, audio, folders }
    const counts = Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length]))

    return NextResponse.json({ q, course, type: type || null, groups, counts })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
