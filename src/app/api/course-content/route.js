import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

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

    const [topics, videos, readings, theory] = await Promise.all([
      getCollection('curriculum_topics').then(c => c.find({ courseCode }).sort({ order: 1 }).toArray()).catch(() => []),
      getCollection('videos').then(c => c.find({ courseCode }).sort({ order: 1 }).toArray()).catch(() => []),
      getCollection('readings').then(c => c.find({ courseCode }).sort({ order: 1 }).toArray()).catch(() => []),
      getCollection('theory_references').then(c => c.find({ courseCode }).toArray()).catch(() => []),
    ])

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

    const out = topics.map(t => {      const title = t.title || 'Topic'
      const tTokens = [...new Set(tokens(title))]
      const need = Math.max(1, Math.ceil(tTokens.length * 0.2))
      const match = (textTokens, weight = 1) => overlap(textTokens, tTokens).length * weight >= need
        ? overlap(textTokens, tTokens).length * weight : 0

      const tabs = { video: [], audio: [], pdf: [], text: [], other: [] }
      const push = (tab, item, score) => tabs[tab].push({ ...item, _score: score })

      for (const v of vPre) {
        const s = match(v.toks)
        const item = { id: String(v.src._id), kind: 'video', title: v.src.title, url: v.src.url, description: v.src.description || '' }
        if (v.isAudio) push(s > 0 ? 'audio' : 'other', { ...item, kind: 'audio' }, s)
        else push(s > 0 ? 'video' : 'other', item, s)
      }
      for (const r of rPre) {
        const s = match(r.toks)
        const item = { id: String(r.src._id), kind: 'text', title: r.src.title, content: r.src.content || '', source: 'reading', coverUrl: r.src.coverUrl || r.src.cover || null }
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

    return NextResponse.json({
      courseCode,
      topics: out,
      all,
      totals: Object.fromEntries(Object.entries(all).map(([k, v]) => [k, v.length])),
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
