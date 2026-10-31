import { NextResponse } from 'next/server'
import dns from 'node:dns/promises'

const MAX_BYTES = 30 * 1024 * 1024

function isBlockedIp(ip) {
  return (
    ip.startsWith('127.') || ip.startsWith('10.') || ip.startsWith('192.168.') ||
    ip.startsWith('169.254.') || ip === '::1' || ip === '::ffff:127.0.0.1' ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) || /^::ffff:(10|127)\./.test(ip)
  )
}

// GET /api/pdf-proxy?url=https://…
// Same-origin pipe for PDF first-page covers: browsers block pdf.js from
// fetching cross-origin PDFs without CORS headers, so we fetch server-side
// (no CORS restriction) and re-serve with ACAO:*.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const raw = (searchParams.get('url') || '').trim()
    let target
    try {
      target = new URL(raw)
    } catch {
      return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
    }
    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      return NextResponse.json({ error: 'Only http(s) allowed' }, { status: 400 })
    }
    try {
      const addrs = await dns.lookup(target.hostname, { all: true })
      if (addrs.some(a => isBlockedIp(a.address))) {
        return NextResponse.json({ error: 'Blocked host' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'DNS failed' }, { status: 400 })
    }

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 20000)
    const upstream = await fetch(target.toString(), {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'GSS-Banger/1.0 (+study-app)' },
    }).catch(() => null)
    clearTimeout(timer)
    if (!upstream || !upstream.ok) {
      return NextResponse.json({ error: `Upstream ${upstream?.status || 'unreachable'}` }, { status: 502 })
    }
    const buf = Buffer.from(await upstream.arrayBuffer())
    if (buf.length > MAX_BYTES) return NextResponse.json({ error: 'File too large' }, { status: 413 })
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(buf.length),
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Proxy failed' }, { status: 500 })
  }
}
