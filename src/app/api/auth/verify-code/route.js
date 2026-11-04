import { NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { getCollection } from '@/lib/db'
import { signToken } from '@/lib/auth-server'

const MAX_ATTEMPTS = 5
// Passwordless sessions last a very long time (stays signed in unless logout).
const SESSION_TTL = '90d'

// POST /api/auth/verify-code { email, code } — checks the real code and
// returns the standard app session + long-lived JWT.
export async function POST(request) {
  try {
    const { email, code } = await request.json().catch(() => ({}))
    const cleanEmail = String(email || '').toLowerCase().trim()
    const cleanCode = String(code || '').trim()
    if (!cleanEmail.includes('@')) return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    if (cleanCode.length < 4) return NextResponse.json({ error: 'Enter the code we sent you.' }, { status: 400 })

    const codes = await getCollection('email_codes')
    const row = await codes.find({ email: cleanEmail, usedAt: null }).sort({ createdAt: -1 }).limit(1).toArray()
    const entry = row[0]
    if (!entry) return NextResponse.json({ error: 'No code requested. Send one first.' }, { status: 400 })

    const hash = (s) => createHash('sha256').update(s).digest()
    const ok = (() => {
      try {
        const a = hash(cleanCode)
        const b = Buffer.from(entry.codeHash, 'hex')
        return a.length === b.length && timingSafeEqual(a, b)
      } catch { return false }
    })()
    if (new Date(entry.expiresAt).getTime() < Date.now() || (entry.attempts || 0) >= MAX_ATTEMPTS || !ok) {
      await codes.updateOne({ _id: entry._id }, { $inc: { attempts: 1 } })
      const reason = new Date(entry.expiresAt).getTime() < Date.now() ? 'Code expired. Send a new one.' : 'That code did not work.'
      return NextResponse.json({ error: reason }, { status: 401 })
    }
    await codes.updateOne({ _id: entry._id }, { $set: { usedAt: new Date() } })

    const users = await getCollection('users')
    let user = await users.findOne({ email: cleanEmail })
    if (!user) {
      const res = await users.insertOne({
        email: cleanEmail, name: '', school: '', department: '', level: '',
        role: 'student', university: '', createdAt: new Date(), admin: false,
        verified: true, avatar: '', avatarConfig: null, authProvider: 'email-code',
      })
      user = await users.findOne({ _id: res.insertedId })
    } else if (!user.verified) {
      await users.updateOne({ _id: user._id }, { $set: { verified: true } })
      user = await users.findOne({ _id: user._id })
    }

    const hasSchool = !!(user.school && String(user.school).trim())
    const hasDept = !!(user.department && String(user.department).trim())
    const hasLevel = !!(user.level && String(user.level).trim())
    const token = signToken({ email: user.email, admin: !!user.admin }, SESSION_TTL)

    return NextResponse.json({
      id: user._id.toString(),
      email: user.email,
      school: user.school || '',
      department: user.department || '',
      level: user.level || '',
      admin: !!user.admin,
      role: user.role || 'student',
      verified: true,
      name: user.name || '',
      avatar: user.avatar || '',
      avatarConfig: user.avatarConfig || null,
      token,
      isNewUser: !user.name && !hasSchool,
      needsSchool: !hasSchool,
      needsDeptOrLevel: !hasDept || !hasLevel,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Verification failed: ' + error.message }, { status: 500 })
  }
}
