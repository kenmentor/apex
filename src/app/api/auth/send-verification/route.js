import { NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/auth-server'
import { sendVerificationEmail } from '@/lib/email'

export async function POST(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.verified) return NextResponse.json({ message: 'Already verified' })

    const id = await sendVerificationEmail(user.email)
    return NextResponse.json({ message: 'Verification email sent', id })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
