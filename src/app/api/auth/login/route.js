import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { signToken } from '@/lib/auth-server'

export async function POST(request) {
  try {
    const { email, school } = await request.json()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const users = await getCollection('users')
    const normalizedEmail = email.toLowerCase().trim()
    const existing = await users.findOne({ email: normalizedEmail })

    if (existing) {
      if (school !== undefined) {
        await users.updateOne({ _id: existing._id }, { $set: { school: school.trim() } })
      }
      const token = signToken({ email: existing.email, admin: !!existing.admin })
      return NextResponse.json({
        id: existing._id.toString(),
        email: existing.email,
        school: school?.trim() || existing.school || '',
        admin: !!existing.admin,
        verified: !!existing.verified,
        name: existing.name || '',
        avatar: existing.avatar || '',
        token,
      })
    }

    const result = await users.insertOne({
      email: normalizedEmail,
      school: school?.trim() || '',
      createdAt: new Date(),
      admin: false,
      verified: false,
      name: '',
      avatar: '',
    })

    const token = signToken({ email: normalizedEmail, admin: false })
    return NextResponse.json({
      id: result.insertedId.toString(),
      email: normalizedEmail,
      school: school?.trim() || '',
      admin: false,
      verified: false,
      name: '',
      avatar: '',
      token,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
