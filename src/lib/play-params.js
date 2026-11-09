// Shared game-launch params: ?courses=ANA 201,BCH 202&topics=<ids>&mode=mix|all
// Every game page reads these the same way, so the hub wizard works for all
// games without touching any game API (each round still requests ONE course —
// mixes rotate round-robin client-side).

export function playMixParams(params) {
  if (!params || typeof params.get !== 'function') return null
  const raw = (params.get('courses') || params.get('course') || '').trim()
  const courses = raw.split(',').map(s => s.trim()).filter(Boolean)
  if (!courses.length) return null
  const topics = String(params.get('topics') || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  const mode = params.get('mode') || (courses.length > 1 ? 'mix' : 'all')
  return { courses, topics, mode, i: 0 }
}

// Next course in the rotation (round-robin). Single course returns as-is.
// Falls back to the page's picked course when there is no mix.
export function nextCourse(mix, fallback) {
  if (!mix || !Array.isArray(mix.courses) || mix.courses.length === 0) {
    return String(fallback || '').trim()
  }
  const c = mix.courses[mix.i % mix.courses.length]
  mix.i += 1
  return String(c || '').trim()
}

// Compact query string the hub wizard appends when launching a game.
export function playQuery({ courses = [], topics = [], mode }) {
  const p = new URLSearchParams()
  if (courses.length) p.set('courses', courses.join(','))
  if (topics.length) p.set('topics', topics.join(','))
  p.set('mode', mode || (courses.length > 1 ? 'mix' : 'all'))
  return p.toString()
}
