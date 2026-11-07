import jwt from 'jsonwebtoken'
import { getCollection } from '@/lib/db'

const SECRET = process.env.JWT_API_KEY || 'dev-secret'

export function signToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, SECRET, { expiresIn })
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET)
}

export function getTokenFromRequest(request) {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7)
}

export async function getUserFromToken(request) {
  const token = getTokenFromRequest(request)
  if (!token) return null
  try {
    const decoded = verifyToken(token)
    const users = await getCollection('users')
    const email = String(decoded.email || '').toLowerCase().trim()
    if (!email) return null
    let user = await users.findOne({ email })
    if (!user) {
      // Old docs may carry original casing ("User@X.com") while tokens carry
      // lowercase — match once case-insensitively, then heal the stored value
      // so every later lookup hits the index. Without this, old users 401 on
      // EVERY authenticated call with no way forward.
      const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      user = await users.findOne({ email: { $regex: `^${escaped}$`, $options: 'i' } })
      if (user && user.email !== email) {
        try { await users.updateOne({ _id: user._id }, { $set: { email } }) } catch {}
        user = { ...user, email }
      }
    }
    return user
  } catch {
    return null
  }
}

export async function requireAdmin(request) {
  const user = await getUserFromToken(request)
  if (!user || !user.admin) {
    return null
  }
  return user
}
