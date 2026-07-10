import jwt from 'jsonwebtoken'
import { getCollection } from '@/lib/db'

const SECRET = process.env.JWT_API_KEY || 'dev-secret'

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
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
    return await users.findOne({ email: decoded.email })
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
