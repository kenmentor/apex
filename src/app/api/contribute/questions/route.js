import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { notifyAdmins } from '@/lib/notify'

function normCourse(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/^([A-Z]+)(\d+)$/, '$1 $2').slice(0, 32) || null
}

function canContribute(user) {
  return !!user && (!!user.admin || ['editor', 'official', 'admin'].includes(user.role))
}

// POST /api/contribute/questions — one question into the bank, scoped by course.
// Formats: sba (A–E), tf, multi, fib, match, image. Matches the quiz-types lib.
const TYPES = ['sba', 'mtf', 'tf', 'multi', 'fib', 'match', 'image', 'assertion', 'case', 'saq', 'essay', 'meq', 'spotter', 'osce', 'audio', 'viva']

export async function POST(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canContribute(user)) return NextResponse.json({ error: 'Contributor only' }, { status: 403 })
    const body = await request.json()
    const courseCode = normCourse(body.courseCode)
    const questionType = TYPES.includes(String(body.questionType || 'sba')) ? String(body.questionType) : 'sba'
    const question = String(body.question || '').trim()
    if (!courseCode) return NextResponse.json({ error: 'courseCode required' }, { status: 400 })
    if (question.length < 10 && !['match', 'meq', 'osce', 'spotter'].includes(questionType)) return NextResponse.json({ error: 'Question is too short' }, { status: 400 })
    if (body.marks != null) doc.marks = Math.max(1, Math.min(100, Number(body.marks) || 1))

    const me = String(user.email).toLowerCase()
    // Supporting references: [{ label, url }]
    const references = (Array.isArray(body.references) ? body.references : String(body.references || '').split(/[,\n]/))
      .map(r => typeof r === 'string' ? r.trim() : String(r?.url || '').trim())
      .filter(Boolean).slice(0, 10)
      .map(url => ({ label: url.slice(0, 80), url: url.slice(0, 1000) }))
    const changeNote = String(body.changeNote || '').trim().slice(0, 500) || null

    const doc = {
      courseCode,
      // Pending until a general admin approves it in review.
      status: 'pending',
      reviewedBy: null,
      reviewedAt: null,
      changeNote,
      references,
      versions: [{ v: 1, at: new Date().toISOString(), by: me, note: changeNote ? `Submitted: ${changeNote}` : 'Submitted for review' }],
      section: String(body.section || 'Contributed').slice(0, 120),
      id: `contrib-${new ObjectId().toString().slice(-8)}`,
      question,
      questionType,
      explanation: String(body.explanation || '').trim().slice(0, 2000) || null,
      source: 'contributor',
      authorEmail: String(user.email).toLowerCase(),
      year: new Date().getFullYear(),
      createdAt: new Date().toISOString(),
    }

    if (questionType === 'fib') {
      const accept = (Array.isArray(body.blankAnswers) ? body.blankAnswers : [body.blankAnswers])
        .map(s => String(s || '').trim()).filter(Boolean).slice(0, 6)
      if (!accept.length) return NextResponse.json({ error: 'FIB needs at least one accepted answer' }, { status: 400 })
      doc.blankAnswers = accept
      doc.options = {}
      doc.correctAnswer = accept[0]
    } else if (questionType === 'match') {
      const options = {}
      for (const [k, v] of Object.entries(body.options || {})) {
        if (/^[A-Z]$/.test(String(k).toUpperCase()) && String(v || '').trim()) {
          options[String(k).toUpperCase()] = String(v).trim().slice(0, 200)
        }
      }
      const pairs = (body.pairs || []).map(p => ({ stem: String(p.stem || '').trim().slice(0, 200), answer: String(p.answer || '').toUpperCase().slice(0, 1) })).filter(p => p.stem && options[p.answer])
      if (Object.keys(options).length < 2) return NextResponse.json({ error: 'MATCH needs at least 2 options' }, { status: 400 })
      if (pairs.length < 2) return NextResponse.json({ error: 'MATCH needs at least 2 stems' }, { status: 400 })
      doc.options = options
      doc.pairs = pairs
      doc.correctAnswer = pairs.map(p => p.answer)
    } else if (questionType === 'saq') {
      const accept = (Array.isArray(body.blankAnswers) ? body.blankAnswers : [body.blankAnswers])
        .map(s => String(s || '').trim()).filter(Boolean).slice(0, 10)
      if (!accept.length) return NextResponse.json({ error: 'SAQ needs at least one model answer' }, { status: 400 })
      doc.blankAnswers = accept
      doc.options = {}
      doc.correctAnswer = accept[0]
    } else if (questionType === 'essay') {
      doc.rubric = String(body.rubric || '').trim().slice(0, 2000) || null
      doc.options = {}
    } else if (questionType === 'meq') {
      const stages = (body.stages || []).map(s => ({ info: String(s.info || '').trim().slice(0, 2000), question: String(s.question || '').trim().slice(0, 500) })).filter(s => s.question)
      if (stages.length < 2) return NextResponse.json({ error: 'MEQ needs at least 2 stages' }, { status: 400 })
      doc.stages = stages
      doc.options = {}
    } else if (questionType === 'spotter') {
      const url = String(body.imageUrl || '').slice(0, 1000)
      if (!/^https?:\/\//.test(url)) return NextResponse.json({ error: 'Spotter needs an image URL' }, { status: 400 })
      const subs = (body.subQuestions || []).map(s => ({
        q: String(s.q || s.question || '').trim().slice(0, 300),
        answers: (Array.isArray(s.answers) ? s.answers : [s.answers]).map(a => String(a || '').trim()).filter(Boolean).slice(0, 6),
      })).filter(s => s.q && s.answers.length)
      if (!subs.length) return NextResponse.json({ error: 'Spotter needs at least 1 sub-question with answer' }, { status: 400 })
      doc.imageUrl = url
      doc.subQuestions = subs
      doc.options = {}
    } else if (questionType === 'osce') {
      const st = body.station || {}
      const checklist = (body.checklist || []).map(c => ({ text: String(c.text || '').trim().slice(0, 200), marks: Math.max(1, Math.min(20, Number(c.marks) || 1)) })).filter(c => c.text)
      if (checklist.length < 2) return NextResponse.json({ error: 'OSCE needs at least 2 checklist items' }, { status: 400 })
      doc.station = {
        instructions: String(st.instructions || '').trim().slice(0, 1000) || null,
        scenario: String(st.scenario || '').trim().slice(0, 2000) || null,
        task: String(st.task || '').trim().slice(0, 1000) || null,
        minutes: Math.max(1, Math.min(60, Number(st.minutes) || 8)),
      }
      doc.checklist = checklist
      doc.options = {}
    } else if (questionType === 'audio') {
      const url = String(body.audioUrl || '').slice(0, 1000)
      if (!/^https?:\/\//.test(url)) return NextResponse.json({ error: 'Audio question needs a clip URL' }, { status: 400 })
      doc.audioUrl = url
      if (body.followupKind === 'fib' || !body.options || !Object.keys(body.options).length) {
        const accept = (Array.isArray(body.blankAnswers) ? body.blankAnswers : [body.blankAnswers])
          .map(s => String(s || '').trim()).filter(Boolean).slice(0, 6)
        if (!accept.length) return NextResponse.json({ error: 'Audio FIB needs accepted answers' }, { status: 400 })
        doc.followupKind = 'fib'
        doc.blankAnswers = accept
        doc.correctAnswer = accept[0]
        doc.options = {}
      } else {
        const letters = ['A', 'B', 'C', 'D', 'E']
        const options = {}
        for (const l of letters) {
          if (String(body.options[l] || '').trim()) options[l] = String(body.options[l]).trim().slice(0, 300)
        }
        const c = String(body.correctAnswer || '').toUpperCase()
        if (Object.keys(options).length < 2 || !options[c]) return NextResponse.json({ error: 'Audio MCQ needs options + answer' }, { status: 400 })
        doc.followupKind = 'sba'
        doc.options = options
        doc.correctAnswer = c
      }
    } else if (questionType === 'viva') {
      if (!String(body.modelAnswer || '').trim()) return NextResponse.json({ error: 'Viva needs a model answer' }, { status: 400 })
      doc.modelAnswer = String(body.modelAnswer).trim().slice(0, 3000)
      doc.followups = (Array.isArray(body.followups) ? body.followups : String(body.followups || '').split(';')).map(s => String(s || '').trim()).filter(Boolean).slice(0, 8)
      doc.options = {}
    } else if (questionType === 'assertion') {
      const letters = ['A', 'B', 'C', 'D', 'E']
      const std = { A: 'Both are true, and the reason correctly explains the assertion.', B: 'Both are true, but the reason does not correctly explain the assertion.', C: 'Assertion is true, but reason is false.', D: 'Assertion is false, but reason is true.', E: 'Both are false.' }
      const options = {}
      for (const l of letters) {
        const v = String((body.options || {})[l] || '').trim()
        options[l] = v || std[l]
      }
      const c = String(body.correctAnswer || '').toUpperCase()
      if (!options[c]) return NextResponse.json({ error: 'Pick the correct option' }, { status: 400 })
      doc.options = options
      doc.correctAnswer = c
    } else if (questionType === 'case') {
      const vignette = String(body.vignette || question).trim().slice(0, 3000)
      if (vignette.length < 10) return NextResponse.json({ error: 'Case needs a vignette' }, { status: 400 })
      const subs = (body.subQuestions || []).map(s => {
        const opts = {}
        for (const [k, v] of Object.entries(s.options || {})) {
          if (/^[A-E]$/.test(String(k).toUpperCase()) && String(v || '').trim()) {
            opts[String(k).toUpperCase()] = String(v).trim().slice(0, 300)
          }
        }
        const c = String(s.correctAnswer || '').toUpperCase()
        return { question: String(s.question || '').trim().slice(0, 500), options: opts, correctAnswer: opts[c] ? c : null, explanation: String(s.explanation || '').trim().slice(0, 1000) || null }
      }).filter(s => s.question.length >= 3 && Object.keys(s.options).length >= 2 && s.correctAnswer)
      if (!subs.length) return NextResponse.json({ error: 'Case needs at least 1 valid sub-question' }, { status: 400 })
      doc.vignette = vignette
      doc.subQuestions = subs
      doc.options = {}
      doc.correctAnswer = subs.map(s => s.correctAnswer)
    } else if (questionType === 'mtf') {
      const options = {}
      for (const [k, v] of Object.entries(body.options || {})) {
        if (/^[A-Z]$/.test(String(k).toUpperCase()) && String(v || '').trim()) {
          options[String(k).toUpperCase()] = String(v).trim().slice(0, 300)
        }
      }
      if (Object.keys(options).length < 2) return NextResponse.json({ error: 'MTF needs at least 2 options' }, { status: 400 })
      const raw = body.correctAnswer || body.correctMap || {}
      const correct = {}
      for (const k of Object.keys(options)) {
        const v = String(raw[k] ?? '').toLowerCase()
        if (v !== 'true' && v !== 'false') return NextResponse.json({ error: `Judge ${k} True or False` }, { status: 400 })
        correct[k] = v
      }
      doc.options = options
      doc.correctAnswer = correct
    } else {
      const letters = ['A', 'B', 'C', 'D', 'E']
      const options = {}
      for (const l of letters) {
        if (String((body.options || {})[l] || '').trim()) options[l] = String(body.options[l]).trim().slice(0, 300)
      }
      const count = Object.keys(options).length
      if (questionType === 'tf') {
        if (!(options.A && options.B)) return NextResponse.json({ error: 'True/False needs both options' }, { status: 400 })
        const c = String(body.correctAnswer || '').toUpperCase()
        if (!['A', 'B'].includes(c)) return NextResponse.json({ error: 'Pick True or False' }, { status: 400 })
        doc.options = options
        doc.correctAnswer = c
      } else if (questionType === 'multi') {
        if (count < 2) return NextResponse.json({ error: 'MULTI needs at least 2 options' }, { status: 400 })
        const picked = (Array.isArray(body.correctAnswers) ? body.correctAnswers : [body.correctAnswer])
          .map(s => String(s || '').toUpperCase()).filter(a => options[a])
        if (!picked.length) return NextResponse.json({ error: 'Tick at least one correct option' }, { status: 400 })
        doc.options = options
        doc.correctAnswer = [...new Set(picked)]
      } else {
        if (count < 2) return NextResponse.json({ error: 'At least two options (A, B…) are required' }, { status: 400 })
        const c = String(body.correctAnswer || '').toUpperCase()
        if (!options[c]) return NextResponse.json({ error: 'Pick the correct answer' }, { status: 400 })
        doc.options = options
        doc.correctAnswer = c
        if (questionType === 'image') {
          const url = String(body.imageUrl || '').slice(0, 1000)
          if (!/^https?:\/\//.test(url)) return NextResponse.json({ error: 'Image question needs an image URL' }, { status: 400 })
          doc.imageUrl = url
        }
      }
    }

    const col = await getCollection('questions')
    const res = await col.insertOne(doc)
    // General admins review everything before it goes live.
    notifyAdmins({
      type: 'contribute',
      title: `New question for ${courseCode} — needs review`,
      message: `${String(body.question || '').slice(0, 120)} · by ${String(user.email).toLowerCase()}`,
      link: '/admin/review',
    }, user.email).catch(() => {})
    return NextResponse.json({ success: true, id: res.insertedId.toString() }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
