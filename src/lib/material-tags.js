// Rich material tags: [course:COS 202] [quiz:CSC 282] [material:<postId>]
// Rendered as embedded cards, not plain @mentions.

export const TAG_RE = /\[(course|quiz|material):([^\[\]]+)\]/g

export function parseContent(text) {
  if (!text) return []
  const segs = []
  let last = 0
  TAG_RE.lastIndex = 0
  let m
  while ((m = TAG_RE.exec(text)) !== null) {
    if (m.index > last) segs.push({ t: 'text', v: text.slice(last, m.index) })
    segs.push({ t: 'tag', kind: m[1], ref: m[2].trim() })
    last = m.index + m[0].length
  }
  if (last < text.length) segs.push({ t: 'text', v: text.slice(last) })
  return segs
}

export function hasTags(text) {
  TAG_RE.lastIndex = 0
  return TAG_RE.test(text || '')
}

export function makeTag(kind, ref) {
  return `[${kind}:${ref}]`
}
