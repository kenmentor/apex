import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken, signToken } from '@/lib/auth-server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.SENDER_EMAIL || 'onboarding@resend.dev'
const FROM_NAME = process.env.SENDER_NAME || 'GSS Quiz'

export async function POST(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.verified) return NextResponse.json({ message: 'Already verified' })

    const verifyToken = signToken({ email: user.email, purpose: 'verify' })
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const verifyUrl = `${frontendUrl}/api/auth/verify-email?token=${verifyToken}`

    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [user.email],
      subject: 'Verify your email - GSS Quiz',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#130f40">GSS Quiz</h2>
          <p style="color:#333;line-height:1.6">Click the button below to verify your email address:</p>
          <a href="${verifyUrl}"
             style="display:inline-block;background:#ff9f43;color:#130f40;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0">
            Verify Email
          </a>
          <p style="color:#999;font-size:13px">Or copy this link:<br><span style="color:#666;font-size:12px">${verifyUrl}</span></p>
        </div>
      `,
    })

    if (error) throw new Error(error.message)

    return NextResponse.json({ message: 'Verification email sent', id: data?.id })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
