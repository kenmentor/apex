const CACHE = 'apex-cache-v7'
const FILES = 'apex-files-v1'
const PRECACHE = [
  '/',
  '/plan',
  '/spaces',
  '/search',
  '/messages',
  '/courses',
  '/folders',
  '/read',
  '/leaderboard',
  '/auth',
  '/notifications',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/just-logo.png',
  '/pdf.worker.min.mjs',
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
      Promise.all(keys.filter((k) => k !== CACHE && k !== FILES).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('push', (e) => {
  let data = { title: 'Apex', body: '', url: '/' }
  try {
    data = e.data?.json() || data
  } catch {}
  const { title, body, url } = data
  const options = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url },
  }
  e.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = e.notification.data?.url || '/'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const matching = windowClients.find((c) => {
        try { return new URL(c.url).origin === location.origin } catch { return false }
      })
      if (matching) {
        matching.focus()
        matching.navigate(url)
        return
      }
      clients.openWindow(url)
    })
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return

  // Skip chrome-extension and non-http
  if (!request.url.startsWith('http')) return

  // Pinned uploads (Cloudinary) + PDF proxy + thumbs: cache-first so a
  // file opened once still loads on flaky network. Pinned bytes also live
  // in IndexedDB (see lib/offline-files) which is the true offline source.
  try {
    const u = new URL(request.url)
    const isFileHost = u.hostname.includes('res.cloudinary.com')
      || u.hostname.includes('img.youtube.com')
      || (u.pathname === '/api/pdf-proxy')
    if (isFileHost) {
      e.respondWith(fileCacheFirst(request))
      return
    }
  } catch {}

  // API: network first, fallback to cache
  if (request.url.includes('/api/')) {
    e.respondWith(networkFirst(request))
    return
  }

  // Dev/HMR + versioned build assets: always network first.
  // Dev chunk URLs have no content hash, so cache-first would pin stale code.
  if (request.url.includes('/_next/')) {
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

async function fileCacheFirst(req) {
  try {
    const hit = await caches.match(req)
    if (hit) return hit
  } catch {}
  try {
    const res = await fetch(req)
    if (res.ok) {
      const cache = await caches.open(FILES)
      cache.put(req, res.clone()).catch(() => {})
    }
    return res
  } catch {
    try {
      const hit = await caches.match(req)
      if (hit) return hit
    } catch {}
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
