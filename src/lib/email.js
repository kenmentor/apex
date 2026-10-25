import { Resend } from 'resend'
import { signToken } from '@/lib/auth-server'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.SENDER_EMAIL || 'onboarding@resend.dev'
const FROM_NAME = process.env.SENDER_NAME || 'GSS Quiz'

export async function sendVerificationEmail(email) {
  const verifyToken = signToken({ email: email.toLowerCase().trim(), purpose: 'verify' })
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
  const verifyUrl = `${frontendUrl}/api/auth/verify-email?token=${verifyToken}`

  const { data, error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: [email],
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
  return data?.id
}
