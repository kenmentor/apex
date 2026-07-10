import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { verifyToken } from '@/lib/auth-server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

    const decoded = verifyToken(token)
    if (decoded.purpose !== 'verify' || !decoded.email) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    const users = await getCollection('users')
    const user = await users.findOne({ email: decoded.email })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    await users.updateOne({ _id: user._id }, { $set: { verified: true } })
    return NextResponse.redirect(new URL('/profile?verified=true', request.url))
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
