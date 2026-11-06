// Free, keyless discovery providers. Everything returned is a DIRECT file
// link (archive.org download, upload.wikimedia.org) so it renders in the
// native readers/players with nobody able to tell it isn't local.

const cache = new Map() // key -> { at, data }
const TTL = 12 * 60 * 60 * 1000

function cached(key, fn) {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL) return hit.data
  if (cache.size > 200) cache.clear()
  const p = fn().catch(() => [])
  cache.set(key, { at: Date.now(), data: p })
  // Cache the resolved value, not the promise wrapper, on success.
  p.then(d => cache.set(key, { at: Date.now(), data: d })).catch(() => cache.delete(key))
  return p
}

async function jget(url, timeoutMs = 12000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'ApexDiscovery/1.0 (course content discovery)' },
    })
    if (!r.ok) return null
    return await r.json().catch(() => null)
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

// ---- Internet Archive: books + PDFs (full texts, public domain / lending) ----
export function searchArchiveBooks(q, limit = 8) {
  const needle = String(q || '').trim()
  if (!needle) return Promise.resolve([])
  return cached(`ia:${needle}:${limit}`, async () => {
    const d = await jget(
      `https://archive.org/advancedsearch.php?q=${encodeURIComponent(needle)}+AND+mediatype%3Atexts&fl[]=identifier,title,creator,downloads&sort[]=downloads+desc&rows=${limit}&output=json`
    )
    const docs = d?.response?.docs || []
    const out = []
    for (const item of docs) {
      const id = item.identifier
      if (!id) continue
      // Direct PDF link: prefer the OCR text PDF.
      const meta = await jget(`https://archive.org/metadata/${encodeURIComponent(id)}`)
      const files = meta?.files || []
      const pdf = files.find(f => /_text\.pdf$/i.test(f.name || '')) || files.find(f => /\.pdf$/i.test(f.name || ''))
      if (!pdf) continue
      const dir = meta?.dir || ''
      out.push({
        id: `ia:${id}`,
        kind: 'pdf',
        title: item.title || id,
        author: Array.isArray(item.creator) ? item.creator.join(', ') : (item.creator || null),
        url: `https://archive.org/download/${id}/${encodeURIComponent(pdf.name)}`,
        thumb: `https://archive.org/services/img/${id}`,
        source: 'Internet Archive',
      })
      if (out.length >= limit) break
    }
    return out
  })
}

// ---- Wikimedia Commons: images + audio, direct upload.wikimedia.org links ----
export function searchCommons(q, want = 'image', limit = 8) {
  const needle = String(q || '').trim()
  if (!needle) return Promise.resolve([])
  return cached(`wc:${want}:${needle}:${limit}`, async () => {
    const d = await jget(
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search` +
      `&gsrsearch=${encodeURIComponent(needle)}&gsrnamespace=6&gsrlimit=30&prop=imageinfo&iiprop=url%7Cmime%7Csize`
    )
    const pages = Object.values(d?.query?.pages || {})
    const out = []
    for (const p of pages) {
      const info = (p.imageinfo || [])[0] || {}
      const mime = String(info.mime || '')
      const isImg = mime.startsWith('image/')
      const isAudio = mime.startsWith('audio/') || /\.(ogg|oga|mp3|wav|flac|opus)$/i.test(info.url || '')
      if (want === 'image' && !isImg) continue
      if (want === 'audio' && !isAudio && !isImg) continue
      if (want === 'audio' && isImg) continue
      if (!info.url) continue
      // Drop analytics query params — keep the canonical direct file link.
      const cleanUrl = String(info.url).split('?')[0]
      const cleanThumb = info.thumburl ? String(info.thumburl).split('?')[0] : (isImg ? cleanUrl : null)
      out.push({
        id: `wc:${p.pageid}`,
        kind: want === 'audio' ? 'audio' : 'image',
        title: String(p.title || '').replace(/^File:/, '').replace(/_/g, ' '),
        author: null,
        url: cleanUrl,
        thumb: cleanThumb,
        source: 'Wikimedia Commons',
      })
      if (out.length >= limit) break
    }
    return out
  })
}
