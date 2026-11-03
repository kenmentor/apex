// Single source of truth for YouTube URLs: watch / youtu.be / embed / shorts / live.
export function ytId(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/)
  return m ? m[1] : null
}

export function isYouTubeUrl(url) {
  return !!ytId(url)
}

export function ytThumb(url) {
  const id = ytId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

export function ytEmbedUrl(url) {
  const id = ytId(url)
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null
}

// Stored thumb if it looks sane, else derive from the URL. Works for every
// video saved before thumbs were persisted — no migration needed.
export function thumbFor(node) {
  const stored = node?.thumb || node?.coverUrl || null
  if (stored && /^https:\/\//.test(stored)) return stored
  return ytThumb(node?.url || node?.href || '')
}
