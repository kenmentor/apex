// Tiny stale-while-revalidate store so profile sub-pages render instantly
// from data the profile home already fetched — feels like a new page, no loader flash.
const mem = {}

export function setCached(key, data) {
  mem[key] = data
  try { sessionStorage.setItem('pcache:' + key, JSON.stringify(data)) } catch {}
}

export function getCached(key) {
  if (mem[key] !== undefined) return mem[key]
  try {
    const raw = sessionStorage.getItem('pcache:' + key)
    if (raw != null) {
      mem[key] = JSON.parse(raw)
      return mem[key]
    }
  } catch {}
  return null
}
