// "My courses" scope: what belongs to the user's level + department.
// Pure + client-safe (static curriculum map, no DB). Rule:
//   - dept + level known → that dept's course list for the level (service
//     courses like GSS are already inside each dept's list).
//   - level only → same-level courses by code digit.
//   - neither → everything (can't scope).
// Items with no courseCode ("General") and the user's own folders always pass.
import { DEPARTMENTS_DATA } from './curriculum-data'

let knownCache = null
// Every course code the static map knows about. Anything else is newer
// than the map — never hide what we can't scope.
function knownCourses() {
  if (!knownCache) {
    knownCache = new Set()
    for (const e of DEPARTMENTS_DATA || []) {
      for (const lvl of Object.values(e.levels || {})) {
        for (const c of lvl || []) knownCache.add(normCode(c))
      }
    }
  }
  return knownCache
}

export function normCode(c) {
  return String(c || '').toUpperCase().replace(/\s+/g, '')
}

export function levelDigit(level) {
  const m = String(level || '').match(/(\d)/)
  return m ? m[1] : null
}

export function myScope(department, level) {
  const deptName = String(department || '').trim()
  const list = DEPARTMENTS_DATA || []
  const entry =
    list.find(e => (e.title || '').toLowerCase() === deptName.toLowerCase()) ||
    list.find(e => {
      const t = (e.title || '').toLowerCase()
      const d = deptName.toLowerCase()
      return d && t && (t.includes(d) || d.includes(t))
    })
  const courses = entry && level ? entry.levels?.[level] : null
  if (entry && Array.isArray(courses) && courses.length) {
    return {
      mode: 'dept',
      label: `${entry.title} · ${level}`,
      short: entry.title,
      courses: new Set(courses.map(normCode)),
      digit: levelDigit(level),
    }
  }
  const digit = levelDigit(level)
  if (digit) return { mode: 'level', label: String(level), short: String(level), courses: null, digit }
  return { mode: 'all', label: '', short: '', courses: null, digit: null }
}

export function inScope(item, scope) {
  if (!scope || scope.mode === 'all') return true
  if (item?.kind === 'folder') return true // your own folders are always yours
  const code = item?.courseCode
  if (!code) return true // General items belong to everyone
  if (scope.mode === 'dept' && scope.courses) {
    // Unknown to the map (newer courses): show, don't hide.
    if (!knownCourses().has(normCode(code))) return true
    return scope.courses.has(normCode(code))
  }
  if (scope.mode === 'level' && scope.digit) {
    const m = String(code).match(/(\d)\d*\s*$/)
    const d = m ? m[1] : null
    return !d || d === scope.digit
  }
  return true
}

// Explicit course code in the query ("law 101") breaks scope — you asked
// for it by name. Returns normalized code or null.
export function queryCourseToken(q) {
  const m = String(q || '').match(/\b([A-Z]{2,4}\s?\d{3,4})\b/i)
  return m ? normCode(m[1]) : null
}

export function inScopeOrAsked(item, scope, token) {
  if (inScope(item, scope)) return true
  if (token && item?.courseCode && normCode(item.courseCode) === token) return true
  return false
}
