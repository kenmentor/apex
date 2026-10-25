import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

// POST /api/auth/verify-code { email, code }
// Mock-friendly: while ALLOW_ANY_CODE is not 'false', any 4+ char code verifies.
export async function POST(request) {
  try {
    const { email, code } = await request.json()
    const cleanEmail = (email || '').toLowerCase().trim()
    if (!cleanEmail.includes('@')) return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    if (!code || String(code).trim().length < 4) return NextResponse.json({ error: 'Enter the code we sent you.' }, { status: 400 })

    if (process.env.ALLOW_ANY_CODE === 'false') {
      return NextResponse.json({ error: 'Code verification is enforced. Use the email link instead.' }, { status: 403 })
    }

    const users = await getCollection('users')
    const user = await users.findOne({ email: cleanEmail })
    if (!user) return NextResponse.json({ error: 'Account not found.' }, { status: 404 })
    await users.updateOne({ _id: user._id }, { $set: { verified: true } })
    return NextResponse.json({ success: true, verified: true })
  } catch (error) {
    return NextResponse.json({ error: 'Verification failed: ' + error.message }, { status: 500 })
  }
}
