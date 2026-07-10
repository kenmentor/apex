const STORAGE_KEY = 'gss_quiz_auth'

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
}

export function getToken() {
  const user = getUser()
  return user?.token || null
}

export function isAdmin() {
  const user = getUser()
  return !!user?.admin
}
