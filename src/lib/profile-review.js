// Profile re-validation: decides whether an EXISTING user must (re)fill
// school / department / level / avatar.
//
// Background: profiles created under the old app carry department values
// that no longer match the current lists (and many have no avatar). A mere
// presence check (`if (user.department)`) lets stale values sail through,
// so personalization silently runs on garbage. This module validates against
// the canonical lists and is shared by:
//   - /api/auth/firebase (server, fresh logins)
//   - /auth page (client, step routing + ?review=1 banner flow)
//   - home page review banner (already-signed-in sessions)
import { DEPARTMENTS, LEVELS } from '@/lib/departments'
import NIGERIAN_UNIVERSITIES from '@/lib/universities'

function norm(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

const SCHOOLS = new Set(NIGERIAN_UNIVERSITIES.map(norm))
const DEPTS = new Set(DEPARTMENTS.map(norm))
const LEVEL_SET = new Set(LEVELS.map(norm))

// Old apps stored levels loosely ("100", "100L", "Year 1"...). Map the
// obvious ones so real students aren't nagged over formatting.
function normLevel(s) {
  const n = norm(s).replace(/^year\s+/, '')
  if (LEVEL_SET.has(n)) return n
  const m = n.match(/^(\d)00\s*l?$/)
  if (m) {
    const canon = `${m[1]}00 level`
    if (LEVEL_SET.has(canon)) return canon
  }
  return n
}

export function isValidSchool(school) {
  const n = norm(school)
  if (!n || n === 'unknown') return false
  return SCHOOLS.has(n)
}

export function isValidDepartment(dept) {
  const n = norm(dept)
  if (!n || n === 'unknown') return false
  return DEPTS.has(n)
}

export function isValidLevel(level) {
  const n = normLevel(level)
  if (!n || n === 'unknown') return false
  return LEVEL_SET.has(n)
}

export function needsAvatar(p) {
  return !(p?.avatar || p?.avatarConfig)
}

// Returns { needsSchool, needsDept, needsLevel, needsAvatar, needsReview,
// reasons[] }. "needs" is true when the value is missing OR not on the
// current canonical list — that second half is what catches stale profiles.
export function reviewProfile(p) {
  const r = {
    needsSchool: !isValidSchool(p?.school),
    needsDept: !isValidDepartment(p?.department),
    needsLevel: !isValidLevel(p?.level),
    needsAvatar: needsAvatar(p),
    needsReview: false,
    reasons: [],
  }
  if (r.needsSchool) r.reasons.push(p?.school ? 'school not recognised' : 'school missing')
  if (r.needsDept) r.reasons.push(p?.department ? 'department not recognised' : 'department missing')
  if (r.needsLevel) r.reasons.push(p?.level ? 'level not recognised' : 'level missing')
  if (r.needsAvatar) r.reasons.push('avatar missing')
  r.needsReview = r.needsSchool || r.needsDept || r.needsLevel || r.needsAvatar
  return r
}
