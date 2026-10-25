// Curriculum core: CCMAS-shaped model with core-vs-university origin.
//
// discipline -> programme -> level -> semester -> course {units, status,
// LH/PH, semester, core, outcomes, sections} -> topic -> activities
// (single store, origin-tagged: 'core' or a university code).

export const MASTERY_BAR = 80

export function normalizeCourse(code) {
  return (code || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/^([A-Z]+)(\d+)$/, '$1 $2')
}

export function originOf(activity) {
  return activity.origin || 'core'
}

// Core first, then the university's approved additions, stable by order.
export function mergeActivities(coreActs, uniActs) {
  const core = (coreActs || []).filter(a => originOf(a) === 'core')
  const uni = (uniActs || []).filter(a => originOf(a) !== 'core' && a.status !== 'pending')
  const byOrder = (a, b) => (a.order || 0) - (b.order || 0)
  return [...core.sort(byOrder), ...uni.sort(byOrder)]
}

export function topicMastery(completions, topicId, bar = MASTERY_BAR) {
  const rows = (completions || []).filter(c => c.topicId === topicId && c.kind === 'prove')
  if (!rows.length) return { pct: 0, passed: false, attempts: 0 }
  const best = Math.max(...rows.map(r => r.percentage || 0))
  return { pct: best, passed: best >= bar, attempts: rows.length }
}

export function courseProgress(topics, completions, bar = MASTERY_BAR) {
  let passed = 0
  for (const t of topics || []) {
    if (topicMastery(completions, t.id, bar).passed) passed += 1
  }
  const total = (topics || []).length
  return { topics: total, passed, pct: total ? Math.round((passed / total) * 100) : 0 }
}

// Only these roles may write, and officials only inside their university.
export function canWrite(user, university) {
  if (!user) return false
  if (user.admin || user.role === 'admin') return true
  if (user.role !== 'official') return false
  if (!university) return true // platform-level official
  return (user.university || '').toUpperCase() === String(university).toUpperCase()
}

export function assertWritable(user, university) {
  if (user && (user.admin || user.role === 'admin')) return { ok: true, scope: 'admin' }
  if (!user || user.role !== 'official') {
    return { ok: false, error: 'Requires official or admin role.' }
  }
  if (university && (user.university || '').toUpperCase() !== String(university).toUpperCase()) {
    return { ok: false, error: 'Officials can only edit their own university.' }
  }
  return { ok: true, scope: 'official', university: user.university || null }
}
