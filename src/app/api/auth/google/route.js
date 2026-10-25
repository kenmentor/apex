import { NextResponse } from 'next/server'
import { OAuth2Client } from 'google-auth-library'
import { getCollection } from '@/lib/db'
import { signToken } from '@/lib/auth-server'

// POST /api/auth/google { idToken } — requires GOOGLE_CLIENT_ID in env.
export async function POST(request) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) return NextResponse.json({ error: 'Google sign-in is not configured yet.' }, { status: 501 })

    const { idToken } = await request.json()
    if (!idToken) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

    const client = new OAuth2Client(clientId)
    const ticket = await client.verifyIdToken({ idToken, audience: clientId })
    const payload = ticket.getPayload()
    if (!payload?.email || !payload.email_verified) {
      return NextResponse.json({ error: 'Google could not verify that email.' }, { status: 401 })
    }

    const email = payload.email.toLowerCase().trim()
    const users = await getCollection('users')
    let user = await users.findOne({ email })
    if (!user) {
      const result = await users.insertOne({
        email,
        name: payload.name || '',
        avatar: payload.picture || '',
        school: '',
        department: '',
        level: '',
        role: 'student',
        university: '',
        createdAt: new Date(),
        admin: false,
        verified: true,
        googleId: payload.sub || '',
      })
      user = { _id: result.insertedId, email, name: payload.name || '', avatar: payload.picture || '', avatarConfig: null, school: '', department: '', level: '', admin: false, verified: true }
    } else if (!user.verified || !user.avatar) {
      await users.updateOne({ _id: user._id }, { $set: { verified: true, avatar: user.avatar || payload.picture || '' } })
      user = { ...user, verified: true, avatar: user.avatar || payload.picture || '' }
    }

    const token = signToken({ email: user.email, admin: !!user.admin })
    const needsSchool = !(user.school && user.school.trim())
    const needsDeptOrLevel = !(user.department && user.department.trim()) || !(user.level && user.level.trim())
    return NextResponse.json({
      id: user._id.toString(),
      email: user.email,
      school: user.school || '',
      department: user.department || '',
      level: user.level || '',
      admin: !!user.admin,
      verified: !!user.verified,
      name: user.name || '',
      avatar: user.avatar || '',
      avatarConfig: user.avatarConfig || null,
      token,
      isNewUser: false,
      needsSchool,
      needsDeptOrLevel: needsSchool ? false : needsDeptOrLevel,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Google sign-in failed: ' + error.message }, { status: 401 })
  }
}
