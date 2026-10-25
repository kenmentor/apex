// Cached JSON fetch: in-flight dedupe + short TTL.
// Same URL requested by 3 components = 1 network request.
// Repeat visits within TTL = 0 network requests.
const cache = new Map() // url -> { at, data }
const inflight = new Map() // url -> Promise

export const TTL = { shell: 60000, list: 30000, fresh: 0 }

function key(url, token) {
  return (token ? 't:' : '') + url
}

export async function fetchJson(url, { token, ttl = TTL.list, timeoutMs = 15000 } = {}) {
  const k = key(url, token)
  const now = Date.now()
  const hit = cache.get(k)
  if (hit && ttl > 0 && now - hit.at < ttl) return hit.data
  if (inflight.has(k)) return inflight.get(k)

  const p = (async () => {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
    const timer = ctrl && timeoutMs > 0 ? setTimeout(() => ctrl.abort(), timeoutMs) : null
    try {
      const res = await fetch(url, {
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
        ...(ctrl ? { signal: ctrl.signal } : {}),
      })
      const data = await res.json()
      if (ttl > 0) cache.set(k, { at: Date.now(), data })
      return data
    } catch (e) {
      // Timeouts/DB-outages degrade to caller fallbacks instead of hanging.
      if (e?.name === 'AbortError') throw new Error('Request timed out: ' + url)
      throw e
    } finally {
      if (timer) clearTimeout(timer)
      inflight.delete(k)
    }
  })()
  inflight.set(k, p)
  return p
}

export function bust(url, token) {
  cache.delete(key(url, token))
}
