// Every PDF in the app opens in our own ReadEra-style reader.
export function isPdfUrl(url) {
  return /\.pdf(\?|#|$)/i.test(String(url || ''))
}

export function readHref(url, title) {
  return `/read?url=${encodeURIComponent(url || '')}&title=${encodeURIComponent(title || 'Reading')}`
}

// Absolute http(s) PDF URL → in-app reader link, else null (leave as-is).
export function pdfReadHref(item) {
  const url = item?.url || item?.href || ''
  if (!/^https?:\/\//.test(url) || !isPdfUrl(url)) return null
  return readHref(url, item?.title || item?.name || item?.label)
}
