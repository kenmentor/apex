const CACHE = 'apex-cache-v1'
const ASSETS = ['/', '/courses', '/leaderboard', '/profile', '/auth', '/manifest.json']

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
  return hit || fetch(req)
}

async function networkFirst(req) {
  try {
    const res = await fetch(req)
    const cache = await caches.open(CACHE)
    cache.put(req, res.clone())
    return res
  } catch {
    return caches.match(req)
  }
}
