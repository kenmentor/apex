import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken, signToken } from '@/lib/auth-server'
import nodemailer from 'nodemailer'

export async function POST(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.verified) return NextResponse.json({ message: 'Already verified' })

    const verifyToken = signToken({ email: user.email, purpose: 'verify' })
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const verifyUrl = `${frontendUrl}/auth/verify?token=${verifyToken}`

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASS },
    })

    await transporter.sendMail({
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: 'Verify your email - GSS Quiz',
      html: `<p>Click the link below to verify your email:</p><a href="${verifyUrl}">${verifyUrl}</a>`,
    })

    return NextResponse.json({ message: 'Verification email sent' })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
