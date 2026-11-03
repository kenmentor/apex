// Per-file offline for My Files: folder snapshots + pinned blobs + offline outbox.
// IndexedDB (blobs don't fit in localStorage). All functions are client-only
// and fail soft (return null/false) when IDB is unavailable (SSR/private mode).
//
// Stores:
//   snapshots: { key, data, savedAt }  — last good /api/library responses
//   files:     { key, url, name, mime, itemKind, size, blob, savedAt } — pinned
//   outbox:    { qid (auto), type: 'folder'|'link'|'upload', payload, fileName, blob, createdAt }
const DB_NAME = 'apex-offline'
const DB_VERSION = 1

let dbPromise = null
const urlCache = new Map() // key -> objectURL (revoked on unpin/re-pin)

function idbAvailable() {
  try {
    return typeof indexedDB !== 'undefined'
  } catch {
    return false
  }
}

function openDb() {
  if (!idbAvailable()) return Promise.resolve(null)
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = () => {
          const db = req.result
          if (!db.objectStoreNames.contains('snapshots')) db.createObjectStore('snapshots', { keyPath: 'key' })
          if (!db.objectStoreNames.contains('files')) {
            const s = db.createObjectStore('files', { keyPath: 'key' })
            try { s.createIndex('url', 'url', { unique: false }) } catch {}
          }
          if (!db.objectStoreNames.contains('outbox')) {
            db.createObjectStore('outbox', { keyPath: 'qid', autoIncrement: true })
          }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => resolve(null)
        req.onblocked = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
  }
  return dbPromise
}

function tx(store, mode, fn) {
  return openDb().then((db) => {
    if (!db) return null
    return new Promise((resolve) => {
      try {
        const t = db.transaction(store, mode)
        const os = t.objectStore(store)
        const out = fn(os)
        if (out && typeof out.then === 'function') {
          out.then((v) => resolve(v)).catch(() => resolve(null))
          return
        }
        const req = out
        if (req && typeof req === 'object' && 'onsuccess' in req) {
          req.onsuccess = () => resolve(req.result ?? null)
          req.onerror = () => resolve(null)
        } else {
          resolve(out ?? null)
        }
      } catch {
        resolve(null)
      }
    })
  })
}

function reqToPromise(request) {
  return new Promise((resolve) => {
    try {
      request.onsuccess = () => resolve(request.result ?? null)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

export function snapshotKey(parentId, q) {
  const p = parentId ? String(parentId) : 'root'
  const query = (q || '').trim().toLowerCase()
  return query ? `folder:${p}:q:${query}` : `folder:${p}`
}

export async function saveSnapshot(key, data) {
  try {
    await tx('snapshots', 'readwrite', (os) => os.put({ key, data, savedAt: Date.now() }))
  } catch {}
}

export async function getSnapshot(key) {
  try {
    const row = await tx('snapshots', 'readonly', (os) => os.get(key))
    return row?.data ?? null
  } catch {
    return null
  }
}

// Download `url` and pin it under node id. YouTube URLs are rejected —
// streams can't work offline, the UI explains that instead.
export async function pinFile({ id, url, name, mime, itemKind, size }) {
  const key = String(id)
  const src = String(url || '')
  if (!key || !src || /youtu(\.be|be\.com)/.test(src)) return { error: 'YouTube needs internet — only uploads can be saved offline.' }
  try {
    let res = null
    try {
      res = await fetch(src)
    } catch {}
    // Cloudinary without CORS or signed URLs → retry through our proxy.
    if (!res || !res.ok) {
      res = await fetch(`/api/pdf-proxy?url=${encodeURIComponent(src)}`)
    }
    if (!res || !res.ok) return { error: 'Could not download that file (still online-only).' }
    const blob = await res.blob()
    if (!blob || !blob.size) return { error: 'Download came back empty.' }
    await tx('files', 'readwrite', (os) =>
      os.put({ key, url: src, name: name || 'File', mime: mime || blob.type || null, itemKind: itemKind || null, size: size || blob.size || null, blob, savedAt: Date.now() })
    )
    try {
      const old = urlCache.get(key)
      if (old) URL.revokeObjectURL(old)
      urlCache.delete(key)
    } catch {}
    return { success: true, size: blob.size }
  } catch (e) {
    return { error: e?.message || 'Download failed.' }
  }
}

export async function getPinned(key) {
  try {
    return await tx('files', 'readonly', (os) => os.get(String(key)))
  } catch {
    return null
  }
}

// /read?url=… survives navigation while blob: URLs don't — so the reader
// resolves the pin by the original remote URL instead.
export async function getPinnedByUrl(url) {
  const src = String(url || '')
  if (!src || src.startsWith('blob:')) return null
  try {
    const db = await openDb()
    if (!db) return null
    const rows = await new Promise((resolve) => {
      try {
        const t = db.transaction('files', 'readonly')
        const r = t.objectStore('files').getAll()
        r.onsuccess = () => resolve(r.result || [])
        r.onerror = () => resolve([])
      } catch {
        resolve([])
      }
    })
    return rows.find((r) => r.url === src) || null
  } catch {
    return null
  }
}

export function objectUrlFor(record) {
  if (!record?.blob) return null
  const key = String(record.key)
  if (urlCache.has(key)) return urlCache.get(key)
  try {
    const u = URL.createObjectURL(record.blob)
    urlCache.set(key, u)
    return u
  } catch {
    return null
  }
}

export async function unpin(key) {
  try {
    await tx('files', 'readwrite', (os) => os.delete(String(key)))
    const old = urlCache.get(String(key))
    if (old) {
      try { URL.revokeObjectURL(old) } catch {}
      urlCache.delete(String(key))
    }
    return true
  } catch {
    return false
  }
}

export async function listPinnedKeys() {
  try {
    const db = await openDb()
    if (!db) return []
    const keys = await new Promise((resolve) => {
      try {
        const t = db.transaction('files', 'readonly')
        const r = t.objectStore('files').getAllKeys()
        r.onsuccess = () => resolve(r.result || [])
        r.onerror = () => resolve([])
      } catch {
        resolve([])
      }
    })
    return (keys || []).map(String)
  } catch {
    return []
  }
}

// ---- offline outbox: folder/link creates + file uploads queued with no net ----
export async function queueOp(op) {
  try {
    const qid = await tx('outbox', 'readwrite', (os) =>
      reqToPromise(os.add({ ...op, createdAt: Date.now() }))
    )
    // tx() unwraps single-request results; add() resolves to the new key.
    return qid
  } catch {
    return null
  }
}

export async function listOutbox() {
  try {
    const db = await openDb()
    if (!db) return []
    return await new Promise((resolve) => {
      try {
        const t = db.transaction('outbox', 'readonly')
        const r = t.objectStore('outbox').getAll()
        r.onsuccess = () => resolve(r.result || [])
        r.onerror = () => resolve([])
      } catch {
        resolve([])
      }
    })
  } catch {
    return []
  }
}

export async function removeOutbox(qid) {
  try {
    await tx('outbox', 'readwrite', (os) => os.delete(qid))
  } catch {}
}

export function isOnlineNow() {
  try {
    return navigator.onLine !== false
  } catch {
    return true
  }
}
