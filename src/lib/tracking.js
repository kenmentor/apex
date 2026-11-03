let cachedSessionId = null
let muted = false
let failures = 0

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

function sendBlind(body) {
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', new Blob([body], { type: 'application/json' }))
      return
    }
  } catch {}
  try {
    fetch('/api/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
  } catch {}
}

export function trackEvent(event, data = {}) {
  // Session circuit breaker: a failing endpoint must not loop forever —
  // console spam and battery drain, especially mid-lecture.
  if (muted) return
  try {
    const sessionId = getOrCreateSessionId()
    const payload = {
      event,
      data: { ...data, sessionId, isPwa: getPwaStatus(), path: window.location.pathname },
    }
    const body = JSON.stringify(payload)
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).then(
      (res) => {
        if (res.ok) failures = 0
        else if (++failures >= 3) muted = true
      },
      () => {
        // Offline / unreachable: fall back to blind beacon, don't count it.
        sendBlind(body)
      }
    ).catch(() => {})
  } catch {}
}
