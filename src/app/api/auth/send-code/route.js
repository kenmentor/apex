import { NextResponse } from 'next/server'
import { createHash, randomInt } from 'crypto'
import { getCollection } from '@/lib/db'
import { sendLoginCodeEmail } from '@/lib/email'

const CODE_TTL_MS = 10 * 60 * 1000
const RESEND_WAIT_MS = 60 * 1000

// POST /api/auth/send-code { email } — passwordless sign-in.
// One box: user gives an email, gets a 6-digit code. No passwords, no Google.
export async function POST(request) {
  try {
    const { email } = await request.json().catch(() => ({}))
    const cleanEmail = String(email || '').toLowerCase().trim()
    if (!cleanEmail.includes('@')) {
      return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 })
    }

    const now = new Date()
    const codes = await getCollection('email_codes')

    const recent = await codes.find({ email: cleanEmail, createdAt: { $gte: new Date(now.getTime() - 60 * 60 * 1000) } })
      .sort({ createdAt: -1 }).toArray().catch(() => [])
    // No hourly cap — codes always send. The 60s resend wait is the only
    // throttle, so normal use never hits a wall.
    if (recent[0] && now.getTime() - new Date(recent[0].createdAt).getTime() < RESEND_WAIT_MS) {
      return NextResponse.json({ error: 'Code already sent. Wait a minute before retrying.', sent: true })
    }

    // Ensure an account shell exists so verify can sign straight in.
    const users = await getCollection('users')
    const existing = await users.findOne({ email: cleanEmail })
    if (!existing) {
      await users.insertOne({
        email: cleanEmail,
        name: '',
        school: '',
        department: '',
        level: '',
        role: 'student',
        university: '',
        createdAt: now,
        admin: false,
        verified: false,
        avatar: '',
        avatarConfig: null,
        authProvider: 'email-code',
      })
    }

    const code = String(randomInt(100000, 1000000))
    const codeHash = createHash('sha256').update(code).digest('hex')
    await codes.insertOne({
      email: cleanEmail,
      codeHash,
      createdAt: now,
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
      attempts: 0,
      usedAt: null,
    })

    try {
      await sendLoginCodeEmail(cleanEmail, code)
    } catch (e) {
      return NextResponse.json({ error: 'Email service: ' + (e.message || 'could not send. Try again.') }, { status: 502 })
    }
    return NextResponse.json({ sent: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send code: ' + error.message }, { status: 500 })
  }
}
