import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-server'

export async function POST(request) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const users = await getCollection('users')
    const user = await users.findOne({ email: email.toLowerCase().trim() })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    await users.updateOne({ _id: user._id }, { $set: { admin: true } })
    return NextResponse.json({ success: true, email: user.email })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
