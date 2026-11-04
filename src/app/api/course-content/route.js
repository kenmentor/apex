import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'

// GET /api/course-content?course=COS+202
// Whole course at once: every topic with its media tabs
// (video | audio | pdf | text | other), same keyword matching as topic-content.
// One request powers the flat course layout (tabs + topic headings, no drill-in).
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
    if (!courseCode) return NextResponse.json({ error: 'course required' }, { status: 400 })

    const courseCodes = [...new Set([courseCode, courseCode.replace(/\s+/g, '')])]
    // Optional identity: pending uploads are only ever shown to their
    // uploader (or an admin). Anonymous / other viewers never see them.
    const viewer = await getUserFromToken(request).catch(() => null)
    const viewerEmail = String(viewer?.email || '').toLowerCase().trim()
    const viewerIsAdmin = !!viewer?.admin
    const [topics, videos, readings, theory, materials, pendingAll] = await Promise.all([
      getCollection('curriculum_topics').then(c => c.find({ courseCode }).sort({ order: 1 }).toArray()).catch(() => []),
      getCollection('videos').then(c => c.find({ courseCode }).sort({ order: 1 }).toArray()).catch(() => []),
      getCollection('readings').then(c => c.find({ courseCode, status: { $nin: ['pending', 'rejected', 'revoked'] } }).sort({ order: 1 }).toArray()).catch(() => []),
      getCollection('theory_references').then(c => c.find({ courseCode }).toArray()).catch(() => []),
      // Approved contributor uploads (user_materials) — pending review items stay out.
      getCollection('user_materials').then(c => c.find({ courseCode: { $in: courseCodes }, isPublic: { $ne: false }, status: { $nin: ['pending', 'rejected', 'revoked'] } }).sort({ createdAt: -1 }).limit(500).toArray()).catch(() => []),
      // Pending uploads for this course (scoped to viewer below).
      (viewerEmail
        ? getCollection('user_materials').then(c => c.find({ courseCode: { $in: courseCodes }, status: 'pending' }).sort({ createdAt: -1 }).limit(200).toArray()).catch(() => [])
        : Promise.resolve([])),
    ])
    // Not global: only the uploader's own pending items (admins see all).
    const pending = (pendingAll || []).filter(m =>
      viewerIsAdmin || String(m.ownerEmail || '').toLowerCase() === viewerEmail
    )

    const vPre = videos.map(v => ({
      src: v,
      toks: [...tokens(v.title), ...tokens(v.description)],
      isAudio: /\.mp3|\.wav|\.ogg|\.m4a/i.test(String(v.url || '')) || !!v.audioUrl,
    }))
    const rPre = readings.map(r => ({
      src: r,
      toks: tokens(r.title),
      isPdf: !!(r.pdfUrl || /\.pdf$/i.test(String(r.url || ''))),
    }))
    const tPre = theory.map(t => ({
      src: t,
      kw: [...(t.keywords || [])].flatMap(k => tokens(k)),
      qt: [...tokens(t.question), ...tokens((t.mainConcepts || []).join(' '))],
    }))
    const mPre = (materials || []).map(m => {
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
      return {
        src: m,
        tab,
        topicNorm: String(m.topic || '').trim().toLowerCase(),
        toks: tokens(m.title || m.fileName),
        item: {
          id: `m-${String(m._id)}`, kind: itemKind,
          title: m.title || m.fileName || 'Untitled',
          url: m.url || null,
          description: '',
          by: m.ownerEmail ? String(m.ownerEmail).toLowerCase() : null,
          ...(tab === 'text' ? { content: '', source: 'upload' } : {}),
        },
      }
    })

    // Pending uploads: same tab mapping, but flagged under review. They
    // only ever land on their EXACT topic — no keyword spread, no flat
    // fallback — so they never leak across the course.
    const pPre = (pending || []).map(m => {
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
      return {
        src: m,
        tab,
        topicNorm: String(m.topic || '').trim().toLowerCase(),
        item: {
          id: `p-${String(m._id)}`, kind: itemKind,
          title: m.title || m.fileName || 'Untitled',
          url: m.url || null,
          description: '',
          by: m.ownerEmail ? String(m.ownerEmail).toLowerCase() : null,
          underReview: true,
          ...(tab === 'text' ? { content: '', source: 'upload' } : {}),
        },
      }
    })

    // All exact topic names in this course (for single-homing uploads).
    const topicNorms = new Set(
      topics.map(x => String(x.title || '').trim().toLowerCase()).filter(Boolean)
    )

    const out = topics.map(t => {      const title = t.title || 'Topic'
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

      for (const v of vPre) {
        const s = match(v.toks)
        const item = { id: String(v.src._id), kind: 'video', title: v.src.title, url: v.src.url, description: v.src.description || '' }
        if (v.isAudio) push(s > 0 ? 'audio' : 'other', { ...item, kind: 'audio' }, s)
        else push(s > 0 ? 'video' : 'other', item, s)
      }
      for (const r of rPre) {
        const s = match(r.toks)
        const item = { id: String(r.src._id), kind: 'text', title: r.src.title, content: r.src.content || '', source: 'reading', coverUrl: r.src.coverUrl || r.src.cover || null, by: r.src.authorEmail ? String(r.src.authorEmail).toLowerCase() : null }
        if (r.isPdf) push(s > 0 ? 'pdf' : 'other', { ...item, kind: 'pdf', url: r.src.pdfUrl || r.src.url }, s)
        else push(s > 0 ? 'text' : 'other', item, s)
      }
      for (const th of tPre) {
        const s = Math.max(match(th.kw, 2), match(th.qt))
        const item = {
          id: String(th.src._id), kind: 'text', title: th.src.question || 'Theory',
          concepts: th.src.mainConcepts || [], keywords: th.src.keywords || [], source: 'theory',
          coverUrl: th.src.coverUrl || th.src.cover || null,
        }
        push(s > 0 ? 'text' : 'other', item, s)
      }

      // Contributor uploads: exact topic name match always lands in its tab;
      // otherwise fall back to keyword matching like everything else.
      // Single-homed: an upload whose topic exactly matches a course topic
      // lives ONLY there — never keyword-scattered across other topics.
      const titleNorm = String(title || '').trim().toLowerCase()
      for (const m of mPre) {
        const exact = m.topicNorm && m.topicNorm === titleNorm
        if (!exact && m.topicNorm && topicNorms.has(m.topicNorm)) continue
        const s = exact ? 100 : match(m.toks)
        push(exact ? m.tab : (s > 0 ? m.tab : 'other'), m.item, exact ? s : s)
      }
      // Pending uploads: exact topic match only — never keyword-matched.
      for (const m of pPre) {
        if (m.topicNorm && m.topicNorm === titleNorm) push(m.tab, m.item, 100)
      }

      for (const k of Object.keys(tabs)) {
        tabs[k].sort((a, b) => (b._score || 0) - (a._score || 0))
        tabs[k] = tabs[k].slice(0, k === 'other' ? 6 : 50).map(({ _score, ...rest }) => rest)
      }

      return {
        id: String(t.id ?? t._id),
        title,
        order: t.order ?? null,
        counts: Object.fromEntries(Object.entries(tabs).map(([k, v]) => [k, v.length])),
        tabs,
      }
    })

    // Flat fallback: ALL course media by type, straight from the source
    // collections — used when a course has media but no curriculum topics
    // (or no topic matched anything). No keyword filtering here.
    const all = { video: [], audio: [], pdf: [], text: [] }
    for (const v of vPre) {
      const item = { id: `v-${v.src._id}`, kind: 'video', title: v.src.title, url: v.src.url, description: v.src.description || '' }
      if (v.isAudio) { if (all.audio.length < 100) all.audio.push({ ...item, kind: 'audio' }) }
      else if (all.video.length < 100) all.video.push(item)
    }
    for (const r of rPre) {
      const item = { id: `r-${r.src._id}`, kind: 'text', title: r.src.title, content: r.src.content || '', source: 'reading', coverUrl: r.src.coverUrl || r.src.cover || null }
      if (r.isPdf) { if (all.pdf.length < 100) all.pdf.push({ ...item, kind: 'pdf', url: r.src.pdfUrl || r.src.url }) }
      else if (all.text.length < 100) all.text.push(item)
    }
    for (const th of tPre) {
      if (all.text.length >= 100) break
      all.text.push({
        id: `t-${th.src._id}`, kind: 'text', title: th.src.question || 'Theory',
        concepts: th.src.mainConcepts || [], keywords: th.src.keywords || [], source: 'theory',
        coverUrl: th.src.coverUrl || th.src.cover || null,
      })
    }
    for (const m of mPre) {
      const bucket = all[m.tab]
      if (Array.isArray(bucket) && bucket.length < 100) bucket.push({ ...m.item, topic: m.src.topic || null })
    }

    // Faces behind the content: one users lookup for every uploader/author
    // so the client can render real avatars, not initials.
    let people = {}
    try {
      const emails = new Set()
      for (const m of materials || []) {
        const e = String(m.ownerEmail || '').toLowerCase().trim()
        if (e) emails.add(e)
      }
      for (const m of pending || []) {
        const e = String(m.ownerEmail || '').toLowerCase().trim()
        if (e) emails.add(e)
      }
      for (const r of readings || []) {
        const e = String(r.authorEmail || '').toLowerCase().trim()
        if (e) emails.add(e)
      }
      if (emails.size) {
        const users = await getCollection('users')
        const docs = await users
          .find({ email: { $in: [...emails] } })
          .project({ email: 1, name: 1, avatar: 1, avatarConfig: 1 })
          .toArray()
          .catch(() => [])
        for (const u of docs || []) {
          people[String(u.email || '').toLowerCase()] = {
            name: u.name || null,
            avatar: u.avatar || null,
            avatarConfig: u.avatarConfig || null,
          }
        }
      }
    } catch {}

    return NextResponse.json({
      courseCode,
      topics: out,
      all,
      totals: Object.fromEntries(Object.entries(all).map(([k, v]) => [k, v.length])),
      people,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
