import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

// GET /api/topic-content?course=COS+202&topic=<topicId>&title=<fallback title>
// Groups a topic's content into media tabs: video | audio | pdf | text | other.
// Matching is keyword-based: theory entries carry keyword arrays, readings
// carry numbered section titles, videos carry titles/descriptions.
const STOP = new Set((
  'the and for with from that this these those are was were has have had not but you your can all any per via into over under about its our out who whom which what when where while will would there their them they then than this that these those also such into onto upon de la en el y e der die das und the'.split(/\s+/)
))

function normalizeCourse(code) {
  return (code || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/^([A-Z]+)(\d+)$/, '$1 $2')
}

function tokens(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w))
}

function overlap(a, b) {
  const setB = new Set(b)
  return a.filter(w => setB.has(w))
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const courseCode = normalizeCourse(searchParams.get('course'))
    const topicParam = (searchParams.get('topic') || '').trim()
    const titleParam = (searchParams.get('title') || '').trim()
    if (!courseCode) return NextResponse.json({ error: 'course required' }, { status: 400 })

    const courseCodes = [...new Set([courseCode, courseCode.replace(/\s+/g, '')])]
    const [topics, videos, readings, theory, materials] = await Promise.all([
      getCollection('curriculum_topics').then(c => c.find({ courseCode }).sort({ order: 1 }).toArray()).catch(() => []),
      getCollection('videos').then(c => c.find({ courseCode }).sort({ order: 1 }).toArray()).catch(() => []),
      getCollection('readings').then(c => c.find({ courseCode, status: { $nin: ['pending', 'rejected', 'revoked'] } }).sort({ order: 1 }).toArray()).catch(() => []),
      getCollection('theory_references').then(c => c.find({ courseCode }).toArray()).catch(() => []),
      // Approved contributor uploads (user_materials) — pending review items stay out.
      getCollection('user_materials').then(c => c.find({ courseCode: { $in: courseCodes }, isPublic: { $ne: false }, status: { $nin: ['pending', 'rejected', 'revoked'] } }).sort({ createdAt: -1 }).limit(500).toArray()).catch(() => []),
    ])

    const clean = topics.map(t => ({ ...t, _id: t._id.toString() }))
    let idx = clean.findIndex(t => String(t.id) === topicParam || String(t._id) === topicParam)
    const topic = idx >= 0 ? clean[idx] : null
    const title = topic?.title || titleParam || 'Topic'
    // Exact-title sets used for single-homing (videos + uploads).
    const titleNorm = String(title || '').trim().toLowerCase()
    const topicNorms = new Set(clean.map(t => String(t.title || '').trim().toLowerCase()).filter(Boolean))
    const prev = idx > 0 ? { id: String(clean[idx - 1].id ?? clean[idx - 1]._id), title: clean[idx - 1].title } : null
    const next = idx >= 0 && idx < clean.length - 1
      ? { id: String(clean[idx + 1].id ?? clean[idx + 1]._id), title: clean[idx + 1].title }
      : null

    const tTokens = [...new Set(tokens(title))]
    const need = Math.max(1, Math.ceil(tTokens.length * 0.2))
    const match = (textTokens, weight = 1) => overlap(textTokens, tTokens).length * weight >= need
      ? overlap(textTokens, tTokens).length * weight : 0

    const tabs = { video: [], audio: [], pdf: [], text: [], other: [] }
    const seenInTab = { video: new Set(), audio: new Set(), pdf: new Set(), text: new Set(), other: new Set() }
    // Same link twice in one tab = duplicate: keep the first, drop the rest.
    const push = (tab, item, score) => {
      const k = item.url || item.id
      if (k && seenInTab[tab].has(k)) return
      if (k) seenInTab[tab].add(k)
      tabs[tab].push({ ...item, _score: score })
    }

    for (const v of videos) {
      const s = match([...tokens(v.title), ...tokens(v.description)])
      const url = String(v.url || '')
      // Exact topic homing (same rule as contributor uploads): a video with
      // `topic` set lives ONLY under that exact topic title and stays out of
      // every other topic — no keyword spreading. Without `topic`, falls back
      // to keyword matching like before.
      const vNorm = String(v.topic || '').trim().toLowerCase()
      const exactV = vNorm && vNorm === titleNorm
      if (vNorm && !exactV && topicNorms.has(vNorm)) continue
      const tab = /(\.mp3|\.wav|\.ogg|\.m4a)/i.test(url) || v.audioUrl ? 'audio' : 'video'
      push(exactV ? tab : (s > 0 ? tab : 'other'), { id: String(v._id), kind: tab, title: v.title, url: v.url, description: v.description || '' }, exactV ? 100 : s)
    }

    for (const r of readings) {
      const s = match(tokens(r.title))
      const item = { id: String(r._id), kind: 'text', title: r.title, content: r.content || '', source: 'reading', coverUrl: r.coverUrl || r.cover || null }
      if (r.pdfUrl || /\.pdf$/i.test(String(r.url || ''))) {
        push(s > 0 ? 'pdf' : 'other', { ...item, kind: 'pdf', url: r.pdfUrl || r.url }, s)
      } else {
        push(s > 0 ? 'text' : 'other', item, s)
      }
    }

    for (const t of theory) {
      const kwTokens = [...(t.keywords || [])].flatMap(k => tokens(k))
      const s = Math.max(match(kwTokens, 2), match([...tokens(t.question), ...tokens((t.mainConcepts || []).join(' '))]))
      const item = {
        id: String(t._id), kind: 'text', title: t.question || 'Theory',
        concepts: t.mainConcepts || [], keywords: t.keywords || [], source: 'theory',
        coverUrl: t.coverUrl || t.cover || null,
      }
      push(s > 0 ? 'text' : 'other', item, s)
    }

    // Contributor uploads: exact topic name match always lands in its tab;
    // otherwise fall back to keyword matching like everything else.
    // Single-homed: homed to another course topic → stays out of this one.
    for (const m of (materials || [])) {
      const url = String(m.url || '')
      const kind = String(m.itemKind || 'file')
      const audioLike = /\.mp3|\.wav|\.ogg|\.m4a/i.test(url)
      const pdfLike = kind === 'pdf' || /\.pdf$/i.test(url) || /\.pdf$/i.test(String(m.fileName || ''))
      let tab = 'other'
      let itemKind = kind
      if (kind === 'video' && !audioLike) { tab = 'video'; itemKind = 'video' }
      else if (kind === 'audio' || audioLike) { tab = 'audio'; itemKind = 'audio' }
      else if (pdfLike) { tab = 'pdf'; itemKind = 'pdf' }
      else if (kind === 'notes' || kind === 'text') { tab = 'text'; itemKind = 'text' }
      const item = {
        id: `m-${String(m._id)}`, kind: itemKind,
        title: m.title || m.fileName || 'Untitled',
        url: m.url || null, description: '',
        ...(tab === 'text' ? { content: '', source: 'upload' } : {}),
      }
      const mNorm = String(m.topic || '').trim().toLowerCase()
      const exact = mNorm === titleNorm
      if (!exact && mNorm && topicNorms.has(mNorm)) continue // homed elsewhere
      const s = exact ? 100 : match(tokens(m.title || m.fileName))
      push(exact ? tab : (s > 0 ? tab : 'other'), item, s)
    }

    for (const k of Object.keys(tabs)) {
      tabs[k].sort((a, b) => (b._score || 0) - (a._score || 0))
      tabs[k] = tabs[k].slice(0, k === 'other' ? 12 : 50).map(({ _score, ...rest }) => rest)
    }

    return NextResponse.json({
      topic: { id: topicParam, title, order: topic?.order ?? null, prev, next },
      courseCode,
      counts: Object.fromEntries(Object.entries(tabs).map(([k, v]) => [k, v.length])),
      tabs,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
