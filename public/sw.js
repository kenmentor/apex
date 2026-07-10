const CACHE = 'apex-cache-v2'
const ASSETS = ['/', '/courses', '/leaderboard', '/profile', '/auth', '/manifest.json', '/just-logo.png']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return
  if (request.url.includes('/api/')) {
    e.respondWith(networkFirst(request))
  } else {
    e.respondWith(cacheFirst(request))
  }
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
