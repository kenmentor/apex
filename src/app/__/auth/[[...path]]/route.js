// Same-domain Firebase auth-handler proxy — portable fallback for the
// next.config.mjs rewrite.
//
// Why this exists: Firebase redirect sign-in loads its helper iframe from
// `https://<authDomain>/__/auth/...`. When the app is NOT hosted on
// *.firebaseapp.com (Vercel, Cloudflare Workers, custom domain), browsers
// partition that third-party helper's storage and the redirect result comes
// back empty. Serving the helper same-domain via `<our-origin>/__/auth/*`
// (proxied to apex-e9c78.firebaseapp.com) keeps its storage first-party.
//
// The next.config.mjs rewrite already does this on Vercel, but external
// rewrites don't run everywhere (notably Cloudflare Workers via open-next
// and `next dev`). This route handler does the same proxy inside the app
// runtime so it works on every target. Either layer may answer first — both
// forward to the same upstream, so keeping both is safe and there is no
// self-loop (upstream is firebaseapp.com, never this origin).

const UPSTREAM = 'https://apex-e9c78.firebaseapp.com'

// Hop-by-hop headers must not be forwarded back to the client.
const HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'content-encoding',
  'content-length',
])

async function proxy(request, params) {
  const segs = (await params)?.path || []
  const incoming = new URL(request.url)
  const upstream = new URL(
    '/__/auth/' + segs.map(s => encodeURIComponent(s)).join('/') + incoming.search,
    UPSTREAM,
  )

  const headers = new Headers()
  // Forward enough client context for Firebase to serve the right helper.
  // Cookies are intentionally NOT forwarded (helper uses its own storage).
  for (const h of ['user-agent', 'accept', 'accept-language', 'accept-encoding']) {
    const v = request.headers.get(h)
    if (v) headers.set(h, v)
  }

  const init = { method: request.method, headers, redirect: 'manual' }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const ct = request.headers.get('content-type')
    if (ct) headers.set('content-type', ct)
    const buf = await request.arrayBuffer().catch(() => null)
    if (buf && buf.byteLength) init.body = Buffer.from(buf)
  }

  const upstreamRes = await fetch(upstream.toString(), init)
  const body = await upstreamRes.arrayBuffer()

  const out = new Headers()
  upstreamRes.headers.forEach((v, k) => {
    if (!HOP_HEADERS.has(k.toLowerCase())) {
      try { out.set(k, v) } catch {}
    }
  })
  // The helper must never be cached across deploys with stale config.
  if (!out.has('cache-control')) out.set('cache-control', 'public, max-age=3600')

  return new Response(body, { status: upstreamRes.status, headers: out })
}

export async function GET(request, { params }) {
  return proxy(request, params)
}

export async function POST(request, { params }) {
  return proxy(request, params)
}

export async function HEAD(request, { params }) {
  return proxy(request, params)
}
