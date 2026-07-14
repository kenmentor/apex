let cachedSessionId = null

export function getOrCreateSessionId() {
  if (cachedSessionId) return cachedSessionId
  try {
    let id = sessionStorage.getItem('apex_session_id')
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)
      sessionStorage.setItem('apex_session_id', id)
    }
    cachedSessionId = id
    return id
  } catch {
    return 'fallback'
  }
}

export function getPwaStatus() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export function trackEvent(event, data = {}) {
  try {
    const sessionId = getOrCreateSessionId()
    const payload = {
      event,
      data: { ...data, sessionId, isPwa: getPwaStatus(), path: window.location.pathname },
    }
    const body = JSON.stringify(payload)
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', new Blob([body], { type: 'application/json' }))
    } else {
      fetch('/api/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
    }
  } catch {}
}
