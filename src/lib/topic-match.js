// Shared topic matcher: links a plan topic ("The concept of
// entrepreneurship…") to question-bank sections ("1.1 Concept of
// Entrepreneurship"). Used by the quiz machine's topic mode so a topic quiz
// draws genuinely topical questions — and by anything else that needs the
// same section<->topic mapping. One implementation, every scenario.
const STOP = new Set('the and for with from that this these those are was were has have had not but you your can all any per via into over under about its out who whom which what when where will would there their them they then than that these also such into onto upon de la en el y der die das und the'.split(/\s+/))

export function tokens(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w))
}

// Returns the matching section titles, best match first. Two shared tokens
// is a confident match; falls back to one strong (6+ char) token so single
// distinctive words ("photosynthesis") still hit. Empty = no quiz available.
export function sectionsForTopic(sectionTitles, topicTitle) {
  const tt = tokens(topicTitle)
  if (!tt.length || !sectionTitles.length) return []
  const tset = new Set(tt)
  const scored = sectionTitles.map(title => {
    const st = tokens(title)
    let overlap = 0
    let strong = false
    for (const w of st) {
      if (tset.has(w)) {
        overlap++
        if (w.length >= 6) strong = true
      }
    }
    return { title, overlap, strong }
  })
  let hits = scored.filter(s => s.overlap >= 2)
  if (!hits.length) hits = scored.filter(s => s.overlap >= 1 && s.strong)
  return hits.sort((a, b) => b.overlap - a.overlap).map(s => s.title)
}

// Standard gate: score this % or more to earn the check-off.
export const TOPIC_PASS_PCT = 50
// Topic quizzes stay short and sharp.
export const TOPIC_QUIZ_LENGTH = 10
// Fewer real questions than this = "no quiz available", tick works directly.
export const TOPIC_MIN_QUESTIONS = 3
// Prove-by-writing: explanations shorter than this don't earn the tick.
export const EXPLAIN_MIN_WORDS = 200

// Word count for HTML or plain text (shared by the editor counter and the
// server gate so both enforce exactly the same bar).
export function countWords(html) {
  const text = String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim()
  if (!text) return 0
  return text.split(' ').length
}
