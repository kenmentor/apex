const STORAGE_KEY = 'gss_quiz_auth'
export const ROLE_BACKUP_KEY = 'gss_role_backup'

export function getUser() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function setUser(user) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

export function clearUser() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(ROLE_BACKUP_KEY)
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

export function isAdmin() {
  const user = getUser()
  return !!user?.admin
}
