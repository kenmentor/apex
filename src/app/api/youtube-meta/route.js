import { NextResponse } from 'next/server'

// GET /api/youtube-meta?url=... — paste a YouTube link, get back the title,
// author and thumbnail so the add form auto-fills. Server-side so it works
// regardless of browser CORS. Also auto-handles playlists (?list=...):
// returns { playlist: true, videos: [{ id, url, title, author, thumb }] }.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const raw = (searchParams.get('url') || '').trim()
    if (!raw) return NextResponse.json({ error: 'url required' }, { status: 400 })

    const listMatch = raw.match(/[?&]list=([\w-]+)/)
    if (listMatch) {
      const videos = await playlistVideos(listMatch[1])
      if (videos.length > 0) {
        return NextResponse.json({ playlist: true, count: videos.length, videos })
      }
      // fall through to single-video handling if playlist parse failed
    }

    const m = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/)
    if (!m) return NextResponse.json({ error: 'Not a YouTube URL' }, { status: 400 })
    const meta = await videoMeta(m[1])
    if (!meta) return NextResponse.json({ error: 'Could not read that video', id: m[1] }, { status: 502 })
    return NextResponse.json(meta)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function videoMeta(id) {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
    }).catch(() => null)
    if (!res || !res.ok) {
      return { id, url: `https://www.youtube.com/watch?v=${id}`, title: 'YouTube video', author: null, thumb: `https://img.youtube.com/vi/${id}/hqdefault.jpg` }
    }
    const d = await res.json()
    return {
      id,
      url: `https://www.youtube.com/watch?v=${id}`,
      title: d.title || 'YouTube video',
      author: d.author_name || null,
      thumb: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    }
  } catch {
    return null
  }
}

async function playlistVideos(listId) {
  try {
    const res = await fetch(`https://www.youtube.com/playlist?list=${encodeURIComponent(listId)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(12000),
    }).catch(() => null)
    if (!res || !res.ok) return []
    const html = await res.text()
    // videoId appears many times in the page data — dedupe, keep order, cap 30.
    const ids = []
    const seen = new Set()
    const re = /"videoId":"([\w-]{11})"/g
    let m
    while ((m = re.exec(html)) && ids.length < 30) {
      if (!seen.has(m[1])) { seen.add(m[1]); ids.push(m[1]) }
    }
    const out = []
    for (const id of ids) {
      const meta = await videoMeta(id)
      if (meta) out.push(meta)
      if (out.length >= 30) break
    }
    return out
  } catch {
    return []
  }
}
