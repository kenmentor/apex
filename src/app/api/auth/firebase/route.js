import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { getCollection } from '@/lib/db'
import { signToken } from '@/lib/auth-server'

const PROJECT_ID = 'apex-e9c78'
const CERT_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
let certCache = { at: 0, keys: null }

async function getCerts() {
  if (certCache.keys && Date.now() - certCache.at < 60 * 60 * 1000) return certCache.keys
  const res = await fetch(CERT_URL, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) throw new Error('Could not fetch signing keys.')
  certCache = { at: Date.now(), keys: await res.json() }
  return certCache.keys
}

// Verify a Firebase ID token without the Admin SDK: RS256 signature
// against Google's Secure Token certs + iss/aud/exp checks.
async function verifyFirebaseIdToken(idToken) {
  const decoded = jwt.decode(idToken, { complete: true })
  if (!decoded || typeof decoded === 'string' || decoded.header.alg !== 'RS256') {
    throw new Error('Bad token format.')
  }
  const certs = await getCerts()
  const cert = certs[decoded.header.kid]
  if (!cert) throw new Error('Unknown signing key.')
  const payload = jwt.verify(idToken, cert, { algorithms: ['RS256'] })
  if (payload.iss !== `https://securetoken.google.com/${PROJECT_ID}`) throw new Error('Wrong issuer.')
  if (payload.aud !== PROJECT_ID) throw new Error('Wrong audience.')
  if (!payload.sub) throw new Error('No subject.')
  return payload
}

// POST /api/auth/firebase { idToken } — bridge a Firebase Google session
// into an Apex app session. Users are matched by email (existing accounts
// keep everything); first-timers get a doc. Returns the standard session.
export async function POST(request) {
  try {
    const { idToken } = await request.json().catch(() => ({}))
    if (!idToken) return NextResponse.json({ error: 'ID token required' }, { status: 400 })
    const claims = await verifyFirebaseIdToken(String(idToken))

    const email = String(claims.email || '').toLowerCase().trim()
    if (!email) return NextResponse.json({ error: 'Google account has no email' }, { status: 400 })
    const name = String(claims.name || '').trim()
    const photo = String(claims.picture || '')
    const now = new Date()

    const users = await getCollection('users')
    let user = await users.findOne({ email })
    let isNewUser = false
    if (!user) {
      isNewUser = true
      const res = await users.insertOne({
        email,
        name,
        school: '',
        department: '',
        level: '',
        role: 'student',
        university: '',
        createdAt: now,
        admin: false,
        verified: true, // Google-verified email
        avatar: photo,
        avatarConfig: null,
        firebaseUid: claims.sub,
        authProvider: 'google',
      })
      user = await users.findOne({ _id: res.insertedId })
    } else {
      const heal = { verified: true, updatedAt: now }
      if (!user.firebaseUid) heal.firebaseUid = claims.sub
      if (!user.authProvider) heal.authProvider = user.passwordHash ? 'password+google' : 'google'
      if (!user.name && name) heal.name = name
      if (!user.avatar && photo) heal.avatar = photo
      await users.updateOne({ _id: user._id }, { $set: heal })
      user = await users.findOne({ _id: user._id })
    }

    const hasSchool = !!(user.school && String(user.school).trim())
    const hasDept = !!(user.department && String(user.department).trim())
    const hasLevel = !!(user.level && String(user.level).trim())
    const token = signToken({ email: user.email, admin: !!user.admin }, '90d')

    return NextResponse.json({
      id: user._id.toString(),
      email: user.email,
      school: user.school || '',
      department: user.department || '',
      level: user.level || '',
      admin: !!user.admin,
      role: user.role || 'student',
      verified: true,
      name: user.name || name || '',
      avatar: user.avatar || '',
      avatarConfig: user.avatarConfig || null,
      token,
      isNewUser,
      needsSchool: !hasSchool,
      needsDeptOrLevel: !hasDept || !hasLevel,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Sign-in failed: ' + error.message }, { status: 401 })
  }
}
