const STORAGE_KEY = 'gss_quiz_auth'
export const ROLE_BACKUP_KEY = 'gss_role_backup'
// Presence flag the edge middleware reads to gate personal pages.
// (HttpOnly would be nicer, but the session itself lives in localStorage;
// the cookie is only a bouncer, APIs still enforce the real token.)
const COOKIE_FLAG = 'apex_auth=1'

function setFlag() {
  try { document.cookie = `${COOKIE_FLAG}; path=/; max-age=${90 * 24 * 60 * 60}; SameSite=Lax` } catch {}
}

function clearFlag() {
  try { document.cookie = 'apex_auth=; path=/; max-age=0; SameSite=Lax' } catch {}
}

export function getUser() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function setUser(user) {
  if (typeof window === 'undefined') return false
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } catch {
    return false
  }
  if (user?.token) setFlag()
  return true
}

export function clearUser() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(ROLE_BACKUP_KEY)
  clearFlag()
}

// Dev-only view switcher: lets a real admin browse the app as an editor
// (client-side only — the server still knows the true role). Toggle back
// restores the exact original session from backup.
export function viewAsEditor() {
  if (typeof window === 'undefined') return false
  const u = getUser()
  if (!u) return false
  try { localStorage.setItem(ROLE_BACKUP_KEY, JSON.stringify(u)) } catch {}
  setUser({ ...u, admin: false, role: 'editor' })
  return true
}

export function viewAsAdmin() {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(ROLE_BACKUP_KEY)
    if (raw) {
      setUser(JSON.parse(raw))
      localStorage.removeItem(ROLE_BACKUP_KEY)
      return true
    }
  } catch {}
  return false
}

export function isViewingAsEditor() {
  if (typeof window === 'undefined') return false
  try { return !!localStorage.getItem(ROLE_BACKUP_KEY) } catch { return false }
}

export function getToken() {
  const user = getUser()
  return user?.token || null
}

// Single choke point for profile saves. Previously every caller showed a
// generic "Save failed" on ANY non-OK — including expired sessions (401),
// which left old users retrying forever with no way forward. Now 401s carry
// a SESSION_EXPIRED code so callers can bounce to /auth instead.
export async function apiPutProfile(body) {
  const res = await fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify(body || {}),
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    try { clearUser() } catch {}
    const e = new Error(data.error || 'Session expired — please sign in again')
    e.code = 'SESSION_EXPIRED'
    throw e
  }
  if (!res.ok) throw new Error(data.error || 'Save failed')
  return data
}

export function isAdmin() {
  const user = getUser()
  return !!user?.admin
}
