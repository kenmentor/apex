// Display identity for users who never set a profile name:
// use their email handle (before the @) instead of "Anonymous".
// Avatar colors are deterministic per email so every nameless
// user still gets their own recognizable color.

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #7c3aed, #4f46e5)',
  'linear-gradient(135deg, #0284c7, #22d3ee)',
  'linear-gradient(135deg, #059669, #34d399)',
  'linear-gradient(135deg, #d97706, #fbbf24)',
  'linear-gradient(135deg, #dc2626, #fb7185)',
  'linear-gradient(135deg, #db2777, #f0abfc)',
  'linear-gradient(135deg, #475569, #94a3b8)',
  'linear-gradient(135deg, #65a30d, #a3e635)',
]

export function emailHandle(email) {
  const h = String(email || '').split('@')[0].trim()
  return h || ''
}

function prettyHandle(handle) {
  const h = String(handle || '').trim()
  if (!h) return ''
  return h.length <= 2 ? h.toUpperCase() : h.charAt(0).toUpperCase() + h.slice(1)
}

export function displayNameOf(user) {
  const name = String(user?.name || '').trim()
  if (name) return name
  const handle = emailHandle(user?.email)
  if (handle) return prettyHandle(handle)
  return 'Apex Learner'
}

export function avatarGradientFor(user) {
  const seed = String(user?.email || user?.name || '?')
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length]
}

export function initialsOf(name, fallbackSeed) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  if (parts.length === 1 && parts[0].length > 1) return parts[0].slice(0, 2).toUpperCase()
  const f = String(fallbackSeed || '?')[0] || '?'
  return f.toUpperCase()
}
