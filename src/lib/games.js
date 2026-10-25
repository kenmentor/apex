// Shared helpers: chunk-reassembly authoring/scoring, ghost-race ranking,
// live-room pause rules, anti-farm guards, and the sprint/pairs/cloze
// generators + scorers (more-game-formats).

export function chunkText(explanation, maxChunks = 8) {
  const parts = String(explanation || '')
    .split(/(?<=[.!?;])\s+|\n+/)
    .map(s => s.trim())
    .filter(Boolean)
  if (parts.length <= maxChunks) return parts
  // Merge overflow sentences into the last chunk to keep games short.
  const head = parts.slice(0, maxChunks - 1)
  head.push(parts.slice(maxChunks - 1).join(' '))
  return head
}

// Deterministic shuffle from a seed string so ghosts share one layout.
export function seededShuffle(items, seed = 'default') {
  const arr = [...items]
  let h = 2166136261
  for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) }
  const rand = () => { h = (Math.imul(h ^ (h >>> 15), 2246822519) >>> 0); return h / 4294967296 }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Fraction of chunks in the exact correct position (0..100).
export function scoreOrder(placedIds, correctIds) {
  if (!correctIds.length) return 0
  let right = 0
  for (let i = 0; i < correctIds.length; i++) {
    if (placedIds[i] === correctIds[i]) right += 1
  }
  return Math.round((right / correctIds.length) * 100)
}

// Ranking matrix: accuracy primary, then speed, difficulty as multiplier.
export function rankEntries(entries) {
  const scored = entries.map(e => {
    const acc = e.accuracy || 0
    const speedBonus = Math.max(0, 100 - Math.min(100, (e.seconds || 0) / 3))
    const diffMult = 1 + ((e.difficulty || 1) - 1) * 0.1
    return { ...e, rankScore: Math.round((acc * 0.7 + speedBonus * 0.3) * diffMult) }
  })
  scored.sort((a, b) => b.rankScore - a.rankScore || a.seconds - b.seconds)
  return scored.map((s, i) => ({ ...s, rank: i + 1 }))
}

export const LIVE_PAUSE_SECONDS = 60

// ─── Speed Sprint ───
// Sample N questions from a bank's sections (optionally filtered by a
// section-title substring), shuffled deterministically per seed.
export function sampleSprint(sections, { n = 10, section = '', seed = 'sprint' } = {}) {
  const pool = []
  for (const s of sections || []) {
    if (section && !(s.section_title || '').toLowerCase().includes(section.toLowerCase())) continue
    for (const q of s.questions || []) pool.push({ ...q, _section: s.section_title })
  }
  const shuffled = seededShuffle(pool, seed)
  return shuffled.slice(0, Math.max(1, Math.min(n, shuffled.length || n)))
}

export function scoreSprint(correct, total) {
  if (!total) return 0
  return Math.round((correct / total) * 100)
}

// ─── Match Pairs ───
// Derive term↔definition rows from theory items ({keywords, mainConcepts}).
// Falls back to bank questions (question → 12-word explanation head).
export function derivePairs(theoryItems, bankQuestions, { count = 6, seed = 'pairs' } = {}) {
  const rows = []
  for (const t of theoryItems || []) {
    const kws = t.keywords || []
    const concepts = t.mainConcepts || []
    for (let i = 0; i < Math.min(kws.length, concepts.length); i++) {
      const term = String(kws[i] || '').trim()
      const def = String(concepts[i] || '').trim()
      if (term && def) rows.push({ term, def })
    }
  }
  for (const q of bankQuestions || []) {
    if (rows.length >= count * 3) break
    const expl = String(q.explanation || '').trim()
    if (!q.question || !expl) continue
    const head = expl.split(/\s+/).slice(0, 12).join(' ')
    rows.push({ term: String(q.question).trim().slice(0, 60), def: head })
  }
  const picked = seededShuffle(rows, seed).slice(0, count)
  return picked
}

// Accuracy with mistake penalty: each mismatch costs 5 points.
export function scorePairs(cleared, total, mistakes = 0) {
  if (!total) return 0
  return Math.max(0, Math.round((cleared / total) * 100 - mistakes * 5))
}

// ─── Cloze Blanks ───
// Blank one keyword-ish content word per sentence. A sentence qualifies
// when it contains exactly one candidate keyword from the accept pool.
const STOPWORDS = new Set('a,an,the,and,or,of,to,in,on,for,with,is,are,was,were,be,by,as,at,from,that,this,it,its,into,also,each,can,will,shall,may,not,no,so,such,than,then,there,their,they,them,he,she,we,you,i,his,her,our,your,my,me,us,do,does,did,has,have,had,but,if,when,which,who,what,how,all,any,both,few,more,most,other,some,only,own,same,over,under,between,through,during,before,after,above,below,up,down,out,off,about,again,once'.split(','))

function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

export function levenshtein(a, b) {
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    let cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[n]
}

// Exact or close match: normalized equality or edit distance ≤ 2.
export function closeMatch(answer, acceptList) {
  const a = norm(answer)
  for (const cand of acceptList || []) {
    const c = norm(cand)
    if (!c) continue
    if (a === c) return true
    if (Math.abs(a.length - c.length) <= 2 && levenshtein(a, c) <= 2) return true
  }
  return false
}

export function deriveCloze(texts, keywords, { max = 6, seed = 'cloze' } = {}) {
  const sentences = []
  for (const t of texts || []) {
    for (const s of String(t || '').split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean)) {
      sentences.push(s)
    }
  }
  const kws = (keywords || []).map(norm).filter(k => k && !STOPWORDS.has(k) && k.length > 3)
  const items = []
  for (const s of seededShuffle(sentences, seed)) {
    if (items.length >= max) break
    const hits = kws.filter(k => norm(s).includes(k))
    if (hits.length !== 1) continue
    const [hit] = hits
    // Blank the original-cased occurrence.
    const re = new RegExp(hit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const m = s.match(re)
    if (!m) continue
    items.push({ text: s.replace(re, '___'), answers: [m[0]] })
  }
  return items
}

export function scoreCloze(correct, total) {
  if (!total) return 0
  return Math.round((correct / total) * 100)
}

export function pauseState(session, now = Date.now()) {
  if (!session || session.mode !== 'live') return { paused: false }
  const since = session.pausedAt ? now - new Date(session.pausedAt).getTime() : 0
  const remaining = Math.max(0, LIVE_PAUSE_SECONDS * 1000 - since)
  return { paused: !!session.pausedAt && remaining > 0, remainingMs: remaining }
}
