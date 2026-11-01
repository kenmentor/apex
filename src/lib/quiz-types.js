// Quiz formats shared by authoring, the player, the modal and bulk import.
// Medical-school set: SBA (A–E), True/False, Multiple-response,
// Fill-in-the-blank, Matching (EMQ-style), Image-based.
import { closeMatch } from '@/lib/games'

export const TYPES = [
  { id: 'sba', label: 'Single best answer', hint: 'A–E options, one correct' },
  { id: 'mtf', label: 'Multiple True/False', hint: 'Judge EACH option True or False' },
  { id: 'tf', label: 'True / False', hint: 'One statement, True or False' },
  { id: 'multi', label: 'Multiple response', hint: 'Tick ALL correct options' },
  { id: 'fib', label: 'Fill in the blank', hint: 'Type the missing word' },
  { id: 'match', label: 'Matching / EMQ', hint: 'Match each stem to an option' },
  { id: 'image', label: 'Image question', hint: 'Picture + A–D options' },
  { id: 'assertion', label: 'Assertion–Reason', hint: 'Fixed A–E logic options' },
  { id: 'case', label: 'Case-based', hint: 'Clinical case + linked MCQs' },
  { id: 'saq', label: 'Short answer', hint: 'Written answer, marks shown' },
  { id: 'essay', label: 'Essay / Long answer', hint: 'Structured writing, rubric' },
  { id: 'meq', label: 'Modified essay (MEQ)', hint: 'Staged case, unlock in order' },
  { id: 'spotter', label: 'Spotter / OSPE', hint: 'Image + timed spot questions' },
  { id: 'osce', label: 'OSCE station', hint: 'Practice station + checklist' },
  { id: 'audio', label: 'Audio question', hint: 'Clip + follow-up question' },
  { id: 'viva', label: 'Viva practice', hint: 'Answer aloud, model answer' },
]

export const ASSERTION_OPTIONS = {
  A: 'Both are true, and the reason correctly explains the assertion.',
  B: 'Both are true, but the reason does not correctly explain the assertion.',
  C: 'Assertion is true, but reason is false.',
  D: 'Assertion is false, but reason is true.',
  E: 'Both are false.',
}

export function typeOf(q) {
  const t = String(q?.questionType || q?.type || 'sba').toLowerCase()
  return TYPES.some(x => x.id === t) ? t : 'sba'
}

function ci(s) {
  return String(s ?? '').trim().toLowerCase()
}

// Grade any format. Returns true/false, or null when the format needs a
// human/self review (essay, MEQ, viva, OSCE checklist).
// selected shape per type:
// sba/tf/image/assertion: option key · multi: string[] · fib/saq: string ·
// match: { [stemIdx]: optionKey } · mtf: { [optionKey]: 'true'|'false' } ·
// case: { [subIdx]: key } · spotter: { [subIdx]: string } ·
// audio: key|string · meq: { [stageIdx]: string } · essay/viva/osce: any
export function gradeAnswer(q, selected) {
  const t = typeOf(q)
  if (t === 'fib' || t === 'saq') {
    const accept = q.blankAnswers || q.blank_answers || q.modelAnswers || []
    return closeMatch(selected, accept)
  }
  if (t === 'essay' || t === 'meq' || t === 'viva' || t === 'osce') return null
  if (t === 'assertion' || t === 'audio-sba') {
    const correct = q.correctAnswer ?? q.correct_answer
    if (selected == null || correct == null) return false
    return ci(selected) === ci(correct)
  }
  if (t === 'case') {
    const subs = q.subQuestions || q.subs || []
    if (!subs.length) return false
    return subs.every((s, i) => ci(selected?.[i]) === ci(s.correctAnswer ?? s.correct_answer))
  }
  if (t === 'spotter') {
    const subs = q.subQuestions || q.subs || []
    if (!subs.length) return false
    return subs.every((s, i) => closeMatch(selected?.[i], s.answers || s.blankAnswers || []))
  }
  if (t === 'audio') {
    if (q.followupKind === 'fib' || (!q.options || !Object.keys(q.options).length)) {
      return closeMatch(selected, q.blankAnswers || q.blank_answers || [])
    }
    const correct = q.correctAnswer ?? q.correct_answer
    if (selected == null || correct == null) return false
    return ci(selected) === ci(correct)
  }
  if (t === 'mtf') {
    const correct = q.correctAnswer ?? q.correct_answer ?? {}
    const keys = Object.keys(q.options || {})
    if (!keys.length) return false
    const asBool = v => /^(true|t)$/i.test(String(v ?? '').trim())
    return keys.every(k => asBool(correct[k]) === asBool(selected?.[k]) && String(selected?.[k] ?? '') !== '')
  }
  if (t === 'multi') {
    const correct = q.correctAnswer ?? q.correct_answer ?? []
    const a = (Array.isArray(selected) ? selected : []).map(ci).sort().join('|')
    const b = (Array.isArray(correct) ? correct : [correct]).map(ci).sort().join('|')
    return !!a && a === b
  }
  if (t === 'match') {
    const pairs = q.pairs || []
    if (!pairs.length) return false
    for (let i = 0; i < pairs.length; i++) {
      const want = ci(pairs[i].answerKey ?? pairs[i].answer)
      const got = ci(selected?.[i])
      if (!want || want !== got) return false
    }
    return true
  }
  const correct = q.correctAnswer ?? q.correct_answer
  if (selected == null || correct == null) return false
  if (Array.isArray(correct)) return correct.map(ci).includes(ci(selected))
  return ci(selected) === ci(correct)
}

// Can this answer be submitted yet?
export function canSubmitAnswer(q, selected) {
  const t = typeOf(q)
  if (t === 'multi') return Array.isArray(selected) && selected.length > 0
  if (t === 'fib' || t === 'saq') return String(selected || '').trim().length > 0
  if (t === 'match') return (q.pairs || []).every((_, i) => selected?.[i])
  if (t === 'mtf') return Object.keys(q.options || {}).every(k => selected?.[k])
  if (t === 'case') return (q.subQuestions || q.subs || []).every((_, i) => selected?.[i])
  if (t === 'spotter') return (q.subQuestions || q.subs || []).every((_, i) => String(selected?.[i] || '').trim().length > 0)
  if (t === 'meq') return (q.stages || []).every((_, i) => String(selected?.[i] || '').trim().length > 0)
  if (t === 'essay' || t === 'viva') return String(selected || '').trim().length >= 10
  if (t === 'osce') return true
  if (t === 'audio') {
    if (q.followupKind === 'fib' || (!q.options || !Object.keys(q.options).length)) return String(selected || '').trim().length > 0
    return selected != null
  }
  return selected != null
}

// Reference value used when the answer is revealed without answering.
export function correctValueFor(q) {
  const t = typeOf(q)
  if (t === 'fib' || t === 'saq') return (q.blankAnswers || q.blank_answers || [''])[0]
  if (t === 'match') {
    const out = {}
    ;(q.pairs || []).forEach((p, i) => { out[i] = p.answer })
    return out
  }
  if (t === 'mtf') return { ...(q.correctAnswer ?? q.correct_answer ?? {}) }
  if (t === 'case') {
    const out = {}
    ;(q.subQuestions || q.subs || []).forEach((s, i) => { out[i] = s.correctAnswer ?? s.correct_answer })
    return out
  }
  if (t === 'spotter') {
    const out = {}
    ;(q.subQuestions || q.subs || []).forEach((s, i) => { out[i] = (s.answers || s.blankAnswers || [''])[0] })
    return out
  }
  return q?.correctAnswer ?? q?.correct_answer
}

// ─── Bulk file format ───
// Blocks separated by a line with ---. One question per block:
//
//   Q: Which chamber pumps to the body?      (or SBA:)
//   A) Right atrium
//   B) Left ventricle
//   Answer: B
//   Explanation: ...
//
//   MTF: The human head:
//   A) Is part of the body -> True
//   B) Is an organ -> False
//
//   TF: The aorta is an artery.
//   Answer: True
//
//   MULTI: Select all antibiotics:
//   A) Amoxicillin
//   B) Paracetamol
//   Answer: A
//   (Answer: A, C for several)
//
//   FIB: The powerhouse of the cell is ___.
//   Answer: mitochondria | powerhouse
//
//   MATCH: Match vitamin to deficiency:
//   1) B12 -> Pernicious anaemia
//   2) C -> Scurvy
//   Options: Pernicious anaemia; Scurvy; Rickets
//
//   IMG: https://.../xray.jpg
//   Q: What does this show?
//   A) Fracture
//   Answer: A
//
//   ASSERT: Insulin drives glucose into cells. Secreted by beta cells.
//   Answer: A            (standard A–E logic options auto-filled when omitted)
//
//   SAQ: List five complications of hypertension. (Marks: 5)
//   Answer: stroke | MI | renal failure
//
//   ESSAY: Discuss heart failure. (Marks: 20)
//   Rubric: definition; pathophysiology; management
//
//   MEQ: Breathless 60-year-old.
//   Stage 1: Progressive dyspnoea.
//   Q: What history?
//   Stage 2: Orthopnoea noted.
//   Q: Likely diagnosis?
//
//   SPOT: https://.../slide.jpg
//   1) Identify the tissue.
//   Answer: Compact bone
//
//   OSCE: Cardiovascular examination
//   Task: Perform a CV exam.
//   Time: 8
//   Checklist: Introduction (2); Consent (1); Inspection (2)
//
//   AUDIO: https://.../murmur.mp3
//   Q: What murmur is this?
//   A) Aortic stenosis
//   Answer: A
//
//   VIVA: Pathophysiology of heart failure.
//   Model: ...
//   Followup: causes?; management?
//
//   CASE: 25F fever, pelvic pain, discharge.
//   Q: Best investigation?
//   A) USS
//   Answer: A
//
// Lines starting with # are comments. Explanation: is optional everywhere.
export function parseQuizFile(text) {
  const items = []
  const errors = []
  const blocks = String(text || '').replace(/\r\n?/g, '\n').split(/\n\s*---\s*\n/).map(b => b.trim()).filter(Boolean)
  blocks.forEach((block, bi) => {
    try {
      const item = parseBlock(block)
      if (item) items.push(item)
    } catch (e) {
      errors.push({ block: bi + 1, error: e.message })
    }
  })
  return { items, errors }
}

function linesOf(block) {
  return block.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
}

function parseOptions(lines) {
  const options = {}
  for (const l of lines) {
    const m = l.match(/^([A-E])[\).:]\s*(.+)$/i)
    if (m) options[m[1].toUpperCase()] = m[2].trim()
  }
  return options
}

function getField(lines, name) {
  const re = new RegExp(`^${name}\\s*:\\s*(.+)$`, 'i')
  for (const l of lines) {
    const m = l.match(re)
    if (m) return m[1].trim()
  }
  return ''
}

function need(cond, msg) {
  if (!cond) throw new Error(msg)
}

  function parseBlock(block) {
  const lines = linesOf(block)
  if (!lines.length) return null
  const first = lines[0]
  const head = first.match(/^(Q|SBA|MTF|TF|MULTI|FIB|MATCH|IMG|ASSERT|CASE|SAQ|ESSAY|MEQ|SPOT|OSCE|AUDIO|VIVA)\s*:\s*(.*)$/i)
  need(head, 'Start with Q:, MTF:, TF:, MULTI:, FIB:, MATCH:, IMG:, ASSERT:, CASE:, SAQ:, ESSAY:, MEQ:, SPOT:, OSCE:, AUDIO: or VIVA:')
  const kind = head[1].toUpperCase()
  const rest = lines.slice(1)

  if (kind === 'MTF') {
    const stem = head[2] || lines.find(l => /^Q\s*:/i.test(l))?.replace(/^Q\s*:\s*/i, '') || ''
    need(stem.length >= 3, 'MTF needs a stem')
    const options = {}
    const correct = {}
    for (const l of lines) {
      const m = l.match(/^([A-E])[\).:]\s*(.+?)\s*->\s*(true|false|t|f)\s*$/i)
      if (m) {
        options[m[1].toUpperCase()] = m[2].trim()
        correct[m[1].toUpperCase()] = /^(true|t)$/i.test(m[3]) ? 'true' : 'false'
      }
    }
    need(Object.keys(options).length >= 2, 'MTF needs at least 2 options like "A) text -> True"')
    return { questionType: 'mtf', question: stem, options, correctAnswer: correct, explanation: getField(lines, 'Explanation') }
  }

  if (kind === 'TF') {
    const ans = getField([first, ...rest], 'Answer').toLowerCase()
    need(/^(true|false|t|f)$/.test(ans), 'TF needs "Answer: True/False"')
    const truthy = /^(true|t)$/.test(ans)
    return {
      questionType: 'tf', question: head[2] || first.replace(/^TF\s*:\s*/i, ''),
      options: { A: 'True', B: 'False' }, correctAnswer: truthy ? 'A' : 'B',
      explanation: getField(rest, 'Explanation'),
    }
  }

  if (kind === 'FIB') {
    const q = head[2]
    need(q && q.length >= 3, 'FIB needs a question with ___')
    const ans = getField(rest, 'Answer')
    need(ans, 'FIB needs "Answer: word" (| separates alternates)')
    return {
      questionType: 'fib', question: q,
      blankAnswers: ans.split(/[|;]/).map(s => s.trim()).filter(Boolean),
      explanation: getField(rest, 'Explanation'),
    }
  }

  if (kind === 'MATCH') {
    const theme = head[2]
    const stems = []
    for (const l of rest) {
      const m = l.match(/^(?:\d+[\).:])\s*(.+?)\s*->\s*(.+)$/)
      if (m) stems.push({ stem: m[1].trim(), answerText: m[2].trim() })
    }
    need(stems.length >= 2, 'MATCH needs at least 2 numbered stems like "1) B12 -> Pernicious anaemia"')
    const optLine = getField(rest, 'Options')
    need(optLine, 'MATCH needs "Options: a; b; c"')
    const optTexts = optLine.split(';').map(s => s.trim()).filter(Boolean)
    need(optTexts.length >= stems.length, 'MATCH needs at least as many options as stems')
    const options = {}
    optTexts.forEach((t, i) => { options[String.fromCharCode(65 + i)] = t })
    const pairs = stems.map(s => {
      const key = Object.keys(options).find(k => options[k].toLowerCase() === s.answerText.toLowerCase())
        || Object.keys(options).find(k => k.toLowerCase() === s.answerText.toLowerCase())
      if (!key) throw new Error(`No option matches "${s.answerText}"`)
      return { stem: s.stem, answer: key }
    })
    return {
      questionType: 'match', question: theme || 'Match each stem to one option',
      options, pairs, explanation: getField(rest, 'Explanation'),
    }
  }

  if (kind === 'IMG') {
    const url = head[2]
    need(/^https?:\/\//.test(url), 'IMG needs "IMG: https://..." image URL')
    const qLine = rest.find(l => /^Q\s*:/i.test(l)) || ''
    const options = parseOptions(rest)
    need(Object.keys(options).length >= 2, 'IMG needs at least A) B) options')
    const ans = getField(rest, 'Answer').toUpperCase()
    need(options[ans], 'IMG needs "Answer: <letter>" matching an option')
    return {
      questionType: 'image', imageUrl: url,
      question: qLine.replace(/^Q\s*:\s*/i, '') || 'What does this image show?',
      options, correctAnswer: ans, explanation: getField(rest, 'Explanation'),
    }
  }

  if (kind === 'ASSERT') {
    const text = [head[2], ...rest.filter(l => !/^(Answer|Explanation)\s*:/i.test(l) && !/^[A-E][\).:]/i.test(l))].filter(Boolean).join(' ')
    const options = {}
    for (const l of lines) {
      const m = l.match(/^([A-E])[\).:]\s*(.+)$/i)
      if (m) options[m[1].toUpperCase()] = m[2].trim()
    }
    const useStandard = Object.keys(options).length === 0
    const finalOptions = useStandard
      ? { A: 'Both are true, and the reason correctly explains the assertion.', B: 'Both are true, but the reason does not correctly explain the assertion.', C: 'Assertion is true, but reason is false.', D: 'Assertion is false, but reason is true.', E: 'Both are false.' }
      : options
    need(text.length >= 10, 'ASSERT: needs assertion + reason text')
    const ans = getField(lines, 'Answer').toUpperCase()
    need(finalOptions[ans], 'ASSERT: needs "Answer: <letter A–E>"')
    return { questionType: 'assertion', question: text, options: finalOptions, correctAnswer: ans, explanation: getField(lines, 'Explanation') }
  }

  if (kind === 'SAQ') {
    const marks = parseInt(getField(rest, 'Marks') || '5', 10) || 5
    const q = [head[2], ...rest.filter(l => !/^(Answer|Marks|Explanation)\s*:/i.test(l))].filter(Boolean).join(' ')
    need(q.length >= 10, 'SAQ: needs a question')
    const ans = getField(rest, 'Answer')
    need(ans, 'SAQ: needs "Answer: ..." (model answer, | separates alternates)')
    return { questionType: 'saq', question: q, blankAnswers: ans.split(/[|;]/).map(s => s.trim()).filter(Boolean), marks, explanation: getField(rest, 'Explanation') }
  }

  if (kind === 'ESSAY') {
    const marks = parseInt(getField(rest, 'Marks') || '20', 10) || 20
    const q = [head[2], ...rest.filter(l => !/^(Marks|Rubric|Explanation)\s*:/i.test(l))].filter(Boolean).join(' ')
    need(q.length >= 10, 'ESSAY: needs a question')
    return { questionType: 'essay', question: q, marks, rubric: getField(rest, 'Rubric'), explanation: getField(rest, 'Explanation') }
  }

  if (kind === 'MEQ') {
    const stages = []
    let cur = null
    for (const l of rest) {
      const sm = l.match(/^Stage\s*(\d+)\s*:\s*(.*)$/i)
      if (sm) { if (cur) stages.push(cur); cur = { info: sm[2], question: '' }; continue }
      const qm = l.match(/^Q\s*:\s*(.*)$/i)
      if (qm && cur) { cur.question = qm[1]; continue }
      if (cur) cur.info = (cur.info ? cur.info + ' ' : '') + l
    }
    if (cur) stages.push(cur)
    need(stages.length >= 2, 'MEQ: needs at least "Stage 1: ... / Q: ..." x2')
    need(stages.every(s => s.question), 'MEQ: every stage needs a Q:')
    return { questionType: 'meq', question: head[2] || stages[0].info.slice(0, 120), stages, explanation: getField(rest, 'Explanation') }
  }

  if (kind === 'SPOT') {
    const url = head[2]
    need(/^https?:\/\//.test(url), 'SPOT: needs "SPOT: https://..." image URL')
    const subs = []
    let cur = null
    for (const l of rest) {
      const qm = l.match(/^(?:\d+[\).:])?\s*(?:Q\s*:\s*)?(.+?)\s*$/i)
      const am = l.match(/^Answer\s*:\s*(.+)$/i)
      if (am && cur) { cur.answers = am[1].split(/[|;]/).map(s => s.trim()).filter(Boolean); subs.push(cur); cur = null; continue }
      if (/^Answer\s*:/i.test(l)) continue
      if (l && !cur) cur = { q: qm ? qm[1] : l, answers: [] }
      else if (l && cur) cur.q += ' ' + l
    }
    need(subs.length >= 1, 'SPOT: needs at least "1) ... / Answer: ..."')
    need(subs.every(s => s.answers.length), 'SPOT: every sub-question needs an Answer:')
    return { questionType: 'spotter', imageUrl: url, question: `Spotter: ${subs.length} station question${subs.length === 1 ? '' : 's'}`, subQuestions: subs, explanation: getField(rest, 'Explanation') }
  }

  if (kind === 'OSCE') {
    const title = head[2] || 'OSCE station'
    const time = parseInt(getField(rest, 'Time') || '8', 10) || 8
    const checklist = []
    const checkLine = getField(rest, 'Checklist')
    if (checkLine) {
      for (const part of checkLine.split(';')) {
        const m = part.trim().match(/^(.+?)\s*\((\d+)\)\s*$/)
        if (m) checklist.push({ text: m[1].trim(), marks: Number(m[2]) })
        else if (part.trim()) checklist.push({ text: part.trim(), marks: 1 })
      }
    }
    need(checklist.length >= 2, 'OSCE: needs "Checklist: step (2); step (1); ..."')
    return {
      questionType: 'osce', question: title,
      station: { instructions: getField(rest, 'Instructions'), scenario: getField(rest, 'Scenario'), task: getField(rest, 'Task'), minutes: time },
      checklist, explanation: getField(rest, 'Explanation'),
    }
  }

  if (kind === 'AUDIO') {
    const url = head[2]
    need(/^https?:\/\//.test(url), 'AUDIO: needs "AUDIO: https://..." clip URL')
    const options = parseOptions(rest)
    if (Object.keys(options).length >= 2) {
      const qLine = rest.find(l => /^Q\s*:/i.test(l)) || ''
      const ans = getField(rest, 'Answer').toUpperCase()
      need(options[ans], 'AUDIO: needs "Answer: <letter>"')
      return { questionType: 'audio', audioUrl: url, followupKind: 'sba', question: qLine.replace(/^Q\s*:\s*/i, '') || 'What does this sound show?', options, correctAnswer: ans, explanation: getField(rest, 'Explanation') }
    }
    const qLine = rest.find(l => /^Q\s*:/i.test(l)) || head[2]
    const ans = getField(rest, 'Answer')
    need(ans, 'AUDIO: needs options + Answer, or a Q: + Answer: for typed answers')
    return { questionType: 'audio', audioUrl: url, followupKind: 'fib', question: qLine.replace(/^Q\s*:\s*/i, ''), blankAnswers: ans.split(/[|;]/).map(s => s.trim()).filter(Boolean), explanation: getField(rest, 'Explanation') }
  }

  if (kind === 'VIVA') {
    const q = [head[2], ...rest.filter(l => !/^(Model|Followup|Marks)\s*:/i.test(l))].filter(Boolean).join(' ')
    need(q.length >= 10, 'VIVA: needs a question')
    return { questionType: 'viva', question: q, modelAnswer: getField(rest, 'Model'), followups: getField(rest, 'Followup').split(';').map(s => s.trim()).filter(Boolean), marks: parseInt(getField(rest, 'Marks') || '10', 10) || 10 }
  }

  if (kind === 'CASE') {
    const caseLines = []
    const subs = []
    let cur = null
    const flushSub = () => {
      if (!cur) return
      const opts = parseOptions(cur.lines)
      const ans = getField(cur.lines, 'Answer').toUpperCase()
      if (cur.q.length >= 3 && Object.keys(opts).length >= 2 && opts[ans]) {
        subs.push({ question: cur.q, options: opts, correctAnswer: ans, explanation: getField(cur.lines, 'Explanation') })
      }
      cur = null
    }
    for (const l of rest) {
      if (/^Q\s*:/i.test(l)) { flushSub(); cur = { q: l.replace(/^Q\s*:\s*/i, ''), lines: [] }; continue }
      if (cur) { if (!/^Q\s*:/i.test(l)) cur.lines.push(l) }
      else caseLines.push(l)
    }
    flushSub()
    const vignette = [head[2], ...caseLines.filter(l => !/^(Answer|Explanation)\s*:/i.test(l))].filter(Boolean).join('\n')
    need(vignette.length >= 10, 'CASE: needs a vignette')
    need(subs.length >= 1, 'CASE: needs at least one Q: with options + Answer:')
    return { questionType: 'case', question: vignette.split('\n')[0].slice(0, 140), vignette, subQuestions: subs, explanation: getField(rest, 'Explanation') }
  }

  // Q / SBA (A–E, one correct)
  const qLine = kind === 'Q' ? head[2] : [head[2], ...rest].find(l => /^Q\s*:/i.test(l)) || ''
  const question = (qLine || '').replace(/^Q\s*:\s*/i, '')
  const options = parseOptions(lines)
  need(question.length >= 3, 'Q: needs question text')
  need(Object.keys(options).length >= 2, 'Q: needs at least A) B) options')
  const ans = getField(lines, 'Answer').toUpperCase().replace(/[^A-E]/g, '')
  need(options[ans], 'Q: needs "Answer: <letter>" matching an option')
  return {
    questionType: kind === 'MULTI' ? 'multi' : 'sba',
    question, options,
    correctAnswer: kind === 'MULTI'
      ? ans.split('').filter(a => options[a])
      : ans,
    explanation: getField(lines, 'Explanation'),
  }
}
