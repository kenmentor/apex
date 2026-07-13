const CACHE = 'apex-cache-v4'
const PRECACHE = [
  '/',
  '/courses',
  '/leaderboard',
  '/profile',
  '/auth',
  '/spaces',
  '/notifications',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/just-logo.png',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return

  // Skip chrome-extension and non-http
  if (!request.url.startsWith('http')) return

  // API: network first, fallback to cache
  if (request.url.includes('/api/')) {
    e.respondWith(networkFirst(request))
    return
  }

  // Navigation: network first, fallback to cached page, then offline fallback
  if (request.mode === 'navigate') {
    e.respondWith(navigationFirst(request))
    return
  }

  // Everything else: cache first
  e.respondWith(cacheFirst(request))
})

async function cacheFirst(req) {
  const hit = await caches.match(req)
  if (hit) return hit
  try {
    const res = await fetch(req)
    if (res.ok) {
      const cache = await caches.open(CACHE)
      cache.put(req, res.clone())
    }
    return res
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

async function networkFirst(req) {
  try {
    const res = await fetch(req)
    if (res.ok) {
      const cache = await caches.open(CACHE)
      cache.put(req, res.clone())
    }
    return res
  } catch {
    return caches.match(req)
  }
}

async function navigationFirst(req) {
  try {
    const res = await fetch(req)
    if (res.ok) {
      const cache = await caches.open(CACHE)
      cache.put(req, res.clone())
    }
    return res
  } catch {
    const cached = await caches.match(req)
    if (cached) return cached
    // Offline fallback: return cached shell
    const shell = await caches.match('/')
    if (shell) return shell
    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/html' } })
  }
}
