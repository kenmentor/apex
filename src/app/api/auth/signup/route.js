import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getCollection } from '@/lib/db'
import { signToken } from '@/lib/auth-server'
import { sendVerificationEmail } from '@/lib/email'

// POST /api/auth/signup { name, email, password }
export async function POST(request) {
  try {
    const { name, email, password } = await request.json()
    const cleanName = (name || '').trim()
    const cleanEmail = (email || '').toLowerCase().trim()
    if (!cleanName) return NextResponse.json({ error: 'Tell us your name.' }, { status: 400 })
    if (!cleanEmail || !cleanEmail.includes('@')) return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 })
    if (!password || password.length < 6) return NextResponse.json({ error: 'Password needs at least 6 characters.' }, { status: 400 })

    const users = await getCollection('users')
    const existing = await users.findOne({ email: cleanEmail })
    if (existing) return NextResponse.json({ error: 'That email is already registered. Try signing in.' }, { status: 409 })

    const passwordHash = await bcrypt.hash(password, 10)
    const result = await users.insertOne({
      email: cleanEmail,
      name: cleanName,
      passwordHash,
      school: '',
      department: '',
      level: '',
      role: 'student',
      university: '',
      createdAt: new Date(),
      admin: false,
      verified: false,
      avatar: '',
      avatarConfig: null,
    })

    try { await sendVerificationEmail(cleanEmail) } catch {}

    const token = signToken({ email: cleanEmail, admin: false })
    return NextResponse.json({
      id: result.insertedId.toString(),
      email: cleanEmail,
      name: cleanName,
      school: '',
      department: '',
      level: '',
      admin: false,
      verified: false,
      avatar: '',
      avatarConfig: null,
      token,
      isNewUser: true,
      needsSchool: true,
      needsDeptOrLevel: false,
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Signup failed: ' + error.message }, { status: 500 })
  }
}
