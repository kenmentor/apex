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

// Passwordless sign-in code via Brevo: big readable digits, plain text.
// Uses BREVO_API_KEY (server-only, never exposed to the client).
export async function sendLoginCodeEmail(email, code) {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) throw new Error('Email service not configured.')
  const senderEmail = process.env.SENDER_EMAIL || 'agentwithme@gmail.com'
  const senderName = process.env.SENDER_NAME || 'Apex'
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email }],
      subject: `${code} is your Apex sign-in code`,
      htmlContent: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;text-align:center">
        <h2 style="color:#130f40;margin-bottom:8px">Apex</h2>
        <p style="color:#333;line-height:1.6">Enter this code to sign in. It expires in 10 minutes.</p>
        <div style="font-size:42px;font-weight:900;letter-spacing:12px;color:#130f40;background:#f4f4f8;border-radius:12px;padding:16px;margin:20px 0">${code}</div>
        <p style="color:#999;font-size:13px">Didn't ask for this? Ignore the email.</p>
      </div>`,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.message || `Brevo send failed (${res.status})`)
  return data?.messageId || 'sent'
}
