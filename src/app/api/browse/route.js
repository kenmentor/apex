import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

// GET /api/browse?level=200+Level
// Library shelves for one level: videos, audio, PDFs, text, quizzes.
// Level matching is by course-code number ("COS 202" → 200 Level);
// items without a course code show on every level.
function levelDigit(level) {
  const m = String(level || '').match(/(\d)/)
  return m ? m[1] : null
}

function codeDigit(code) {
  const m = String(code || '').match(/(\d)\d*\s*$/)
  return m ? m[1] : null
}

function inLevel(courseCode, digit) {
  if (!digit) return true
  if (!courseCode) return true
  const d = codeDigit(courseCode)
  return !d || d === digit
}

function titleOf(s, n = 90) {
  const t = String(s || '').replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t
}

function yearOf(d) {
  const t = d.createdAt || d.updatedAt || null
  if (!t) return null
  const y = new Date(t).getFullYear()
  return Number.isFinite(y) ? y : null
}

function courseHref(code) {
  return `/courses/${String(code || '').toLowerCase().replace(/\s+/g, '')}`
}

function isPdfDoc(d) {
  return Boolean(d.pdfUrl) || /\.pdf(\?|$)/i.test(String(d.url || ''))
}

function isAudioDoc(d) {
  const url = String(d.url || d.audioUrl || '')
  return Boolean(d.audioUrl) || /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(url)
}

// Development mocks: 10 samples per media type so the library shelves can
// be reviewed full. Only served with ?mock=1 — never mixed into real data.
function mockShelves(digit) {
  const lv = digit ? `${digit}00 Level` : '200 Level'
  const courses = ['COS 202', 'GSS 212', 'MTH 101', 'PHY 102', 'CHM 101', 'CSC 203', 'ENT 211', 'BIO 101', 'STA 111', 'ENG 101']
  const pickCourse = (i) => courses[i % courses.length]
  const videos = [
    { id: 'Big Buck Bunny — Full Movie', yt: 'aqz-KE-bpKQ' },
    { id: 'Sintel — Third Open Movie', yt: 'eRsGyueVLvQ' },
  ]
  const videoItems = Array.from({ length: 10 }, (_, i) => {
    const known = videos[i]
    return {
      id: `mock-v${i}`, kind: 'video',
      title: known ? known.id : `${['Arrays & Strings', 'Logic Gates', 'Cell Division', 'Thermodynamics', 'Quadratic Equations', 'Photosynthesis', 'Circular Motion', 'Organic Chemistry'][i - 2] || 'Study Session'} — Full Explanation`,
      subtitle: `${pickCourse(i)} · Video`,
      url: known ? `https://www.youtube.com/watch?v=${known.yt}` : null,
      thumb: known ? null : `https://picsum.photos/seed/study-vid-${i}/640/360`,
      courseCode: pickCourse(i),
    }
  })
  const audioItems = Array.from({ length: 10 }, (_, i) => ({
    id: `mock-a${i}`, kind: 'audio',
    title: `${['Philosophy Recap', 'Physics Audio Notes', 'Biology Mnemonics', 'Chemistry Drill', 'Maths Formula Chant', 'History Timeline', 'Economics Summary', 'Literature Review', 'Statistics Walkthrough', 'Logic Puzzles'][i]}`,
    subtitle: `${pickCourse(i)} · by library`,
    url: i < 2 ? 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' : null,
    art: `https://picsum.photos/seed/study-aud-${i}/200/200`,
    courseCode: pickCourse(i),
  }))
  const REAL_PDFS = [
    { title: 'Linear Algebra', sub: 'MTH 101 · by Cherney, Denton & Waldron', url: 'https://www.math.ucdavis.edu/~linear/linear-guest.pdf', course: 'MTH 101', year: 2016 },
    { title: 'Attention Is All You Need', sub: 'CSC 282 · by Vaswani et al.', url: 'https://arxiv.org/pdf/1706.03762', course: 'CSC 282', year: 2017 },
  ]
  const pdfItems = Array.from({ length: 10 }, (_, i) => {
    const real = REAL_PDFS[i]
    return {
      id: `mock-p${i}`, kind: 'pdf',
      title: real ? real.title : `${pickCourse(i)} — ${['Past Questions 2024', 'Lecture Note Pack', 'Exam Prep Guide', 'Solved Examples', 'Handout Series'][i % 5]}`,
      subtitle: real ? real.sub : `${pickCourse(i)} · by library`,
      // Real files, hotlinked for layout testing (no download needed).
      url: real ? real.url : 'https://www.math.ucdavis.edu/~linear/linear-guest.pdf',
      // Even indexes carry an uploaded cover; odd indexes render the PDF's
      // own first page — proving both thumbnail paths side by side.
      coverUrl: i % 2 === 0 ? `https://picsum.photos/seed/study-pdf-${i}/400/600` : null,
      courseCode: real ? real.course : pickCourse(i), year: real ? real.year : 2024,
    }
  })
  const textItems = Array.from({ length: 10 }, (_, i) => ({
    id: `mock-t${i}`, kind: 'text',
    title: `${['What is Epistemology?', 'Understanding Demand & Supply', 'The Carbon Cycle', 'Newton’s Laws, Simply', 'Validity vs Soundness', 'Mitosis vs Meiosis', 'Integration by Parts', 'The Golden Mean', 'Acids & Bases', 'Probability Basics'][i]}`,
    subtitle: `${pickCourse(i)} · Theory`,
    url: null, courseCode: pickCourse(i), source: 'theory',
    concepts: ['Core definition with one worked example.', 'Two common exam traps to avoid.', 'One-line summary for recall.'],
    coverUrl: `https://picsum.photos/seed/study-txt-${i}/800/450`,
  }))
  const quizItems = courses.slice(0, 10).map((c, i) => ({
    id: `mock-q${i}`, kind: 'quiz', courseCode: c,
    title: `${c} Quiz`, subtitle: `${[12, 20, 15, 30, 18, 25, 10, 22, 14, 16][i]} questions · timed`,
    href: `/courses/${c.toLowerCase().replace(/\s+/g, '')}/quiz`,
  }))
  return { level: lv, mock: true, videos: videoItems, audio: audioItems, pdf: pdfItems, text: textItems, quiz: quizItems }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const digit = levelDigit(searchParams.get('level'))
    if (searchParams.get('mock') === '1') return NextResponse.json(mockShelves(digit))

    const [videosCol, theoryCol, readingsCol, questionsCol, materialsCol] = await Promise.all([
      getCollection('videos').catch(() => null),
      getCollection('theory_references').catch(() => null),
      getCollection('readings').catch(() => null),
      getCollection('questions').catch(() => null),
      getCollection('user_materials').catch(() => null),
    ])

    const [vDocs, tDocs, rDocs, mDocs] = await Promise.all([
      videosCol ? videosCol.find({}).sort({ _id: -1 }).limit(60).toArray().catch(() => []) : [],
      theoryCol ? theoryCol.find({}).sort({ _id: -1 }).limit(60).toArray().catch(() => []) : [],
      readingsCol ? readingsCol.find({}).sort({ order: 1 }).limit(60).toArray().catch(() => []) : [],
      materialsCol ? materialsCol.find({ isPublic: true }).sort({ createdAt: -1 }).limit(60).toArray().catch(() => []) : [],
    ])

    const [videos, audio, pdf, text, quiz] = await buildShelves({ vDocs, tDocs, rDocs, mDocs }, questionsCol, digit)

    // Nothing at this level (bank is 100/200-coded) → fall back to all levels
    // rather than an empty library.
    let level = digit ? `${digit}00 Level` : null
    let out = { videos, audio, pdf, text, quiz }
    if (digit && !videos.length && !audio.length && !pdf.length && !text.length && !quiz.length) {
      const [v2, a2, p2, t2, q2] = await buildShelves({ vDocs, tDocs, rDocs, mDocs }, questionsCol, null)
      out = { videos: v2, audio: a2, pdf: p2, text: t2, quiz: q2 }
      level = 'General picks'
    }

    return NextResponse.json({ level, ...out })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function buildShelves({ vDocs, tDocs, rDocs, mDocs }, questionsCol, digit) {
  const limit = 12
  // Level matches first, then backfill with general picks so a level
  // with almost no coded content still sees a full library.
  const pick = (arr, idOf) => {
    const mine = arr.filter(d => inLevel(d.courseCode, digit))
    if (mine.length >= limit || !digit) return mine.slice(0, limit)
    const seen = new Set(mine.map(idOf))
    const fill = arr.filter(d => !seen.has(idOf(d)))
    return [...mine, ...fill].slice(0, limit)
  }
  const idOf = (d) => String(d._id || d.id || d.title)

    const videos = pick(vDocs.filter(v => !isAudioDoc(v)), idOf).map(v => ({
      id: `v-${v._id}`, kind: 'video', title: titleOf(v.title),
      subtitle: v.courseCode || 'Video', url: v.url, courseCode: v.courseCode || null,
    }))

    const audio = [
      ...pick(vDocs.filter(v => isAudioDoc(v)), idOf).map(v => ({
        id: `a-${v._id}`, kind: 'audio', title: titleOf(v.title),
        subtitle: v.courseCode || 'Audio', url: v.audioUrl || v.url, courseCode: v.courseCode || null,
      })),
      ...pick(mDocs.filter(m => m.itemKind === 'audio'), idOf).map(m => ({
        id: `m-${m._id}`, kind: 'audio', title: titleOf(m.title || m.fileName),
        subtitle: `${m.courseCode || 'Upload'} · by ${m.ownerEmail || 'user'}`,
        url: m.url, courseCode: m.courseCode || null,
      })),
    ].slice(0, limit)

    const pdf = [
      ...pick(rDocs.filter(r => isPdfDoc(r)), idOf).map(r => ({
        id: `p-${r._id}`, kind: 'pdf', title: titleOf(r.title),
        subtitle: r.courseCode || 'PDF', url: r.pdfUrl || r.url, courseCode: r.courseCode || null,
      })),
      ...pick(mDocs.filter(m => m.itemKind === 'pdf'), idOf).map(m => ({
        id: `m-${m._id}`, kind: 'pdf', title: titleOf(m.title || m.fileName),
        subtitle: `${m.courseCode || 'Upload'} · by ${m.ownerEmail || 'user'}`,
        url: m.url, courseCode: m.courseCode || null, year: yearOf(m),
      })),
    ].slice(0, limit)

    const text = [
      ...pick(tDocs, idOf).map(t => ({
        id: `t-${t._id}`, kind: 'text', title: titleOf(t.question),
        subtitle: `${t.courseCode || ''} · Theory`, url: null,
        courseCode: t.courseCode || null, concepts: t.mainConcepts || [], source: 'theory',
      })),
      ...pick(rDocs.filter(r => !isPdfDoc(r)), idOf).map(r => ({
        id: `r-${r._id}`, kind: 'text', title: titleOf(r.title),
        subtitle: `${r.courseCode || ''} · Note`, url: null,
        courseCode: r.courseCode || null, content: r.content || '', source: 'reading',
        coverUrl: r.coverUrl || r.cover || null,
      })),
      ...pick(mDocs.filter(m => ['notes', 'image', 'file'].includes(m.itemKind)), idOf).map(m => ({
        id: `m-${m._id}`, kind: m.itemKind === 'image' ? 'image' : 'text',
        title: titleOf(m.title || m.fileName),
        subtitle: `${m.courseCode || 'Upload'} · by ${m.ownerEmail || 'user'}`,
        url: m.url, courseCode: m.courseCode || null, source: 'upload', year: yearOf(m),
        coverUrl: m.itemKind === 'image' ? m.url : null,
      })),
    ].slice(0, limit)

    let quiz = []
    if (questionsCol) {
      try {
        let groups = []
        try {
          groups = await questionsCol.aggregate([
            { $group: { _id: '$courseCode', n: { $sum: 1 } } },
            { $sort: { n: -1 } },
            { $limit: 25 },
          ]).toArray()
        } catch {}
        let mine = groups.filter(g => g._id && inLevel(g._id, digit))
        if (!mine.length && digit) mine = groups.filter(g => g._id)
        quiz = mine
          .slice(0, limit)
          .map(g => ({
            id: `q-${g._id}`, kind: 'quiz', courseCode: g._id,
            title: `${g._id} Quiz`, subtitle: `${g.n} questions · timed`,
            href: `${courseHref(g._id)}/quiz`,
          }))
      } catch {}
    }

    return [videos, audio, pdf, text, quiz]
}
