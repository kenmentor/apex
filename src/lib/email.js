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

// Passwordless sign-in code: huge bold code + one-tap link.
// Tries Brevo first, falls back to Gmail SMTP (works for every recipient
// with no dashboard setup). Returns which pipe delivered.
export async function sendLoginCodeEmail(email, code) {
  const base = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '')
  const magicUrl = `${base}/auth?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`
  const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;text-align:center">
        <h2 style="color:#130f40;margin-bottom:8px">Apex</h2>
        <p style="color:#333;line-height:1.6">Enter this code to sign in. It expires in 10 minutes.</p>
        <div style="font-size:44px;font-weight:900;letter-spacing:10px;color:#130f40;background:#f4f4f8;border-radius:12px;padding:20px 8px 20px 18px;margin:20px 0;white-space:nowrap">${code}</div>
        <a href="${magicUrl}" style="display:inline-block;background:#ff9f43;color:#130f40;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:800;font-size:16px;margin:8px 0 16px">Sign me in automatically →</a>
        <p style="color:#999;font-size:13px">Tip: tap and hold the code to copy it.<br>Didn't ask for this? Ignore the email.</p>
      </div>`
  const subject = `${code} is your Apex sign-in code`
  const errors = []

  // 1. Brevo (best deliverability once the key is valid).
  if (process.env.BREVO_API_KEY) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { name: process.env.SENDER_NAME || 'Apex', email: process.env.SENDER_EMAIL || 'agentwithme@gmail.com' },
          to: [{ email }],
          subject,
          htmlContent: html,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) return data?.messageId || 'brevo'
      errors.push('Brevo: ' + (data?.message || res.status))
    } catch (e) {
      errors.push('Brevo: ' + e.message)
    }
  }

  // 2. Resend (delivers to verified account address without a domain).
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Apex <onboarding@resend.dev>',
          to: [email],
          subject,
          html,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) return data?.id || 'resend'
      errors.push('Resend: ' + (data?.message || res.status))
    } catch (e) {
      errors.push('Resend: ' + e.message)
    }
  }

  // 3. Gmail SMTP (app password, no dashboard needed, all recipients).
  if (process.env.EMAIL && process.env.EMAIL_PASS) {
    try {
      const nodemailer = (await import('nodemailer')).default
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASS },
      })
      const info = await transporter.sendMail({
        from: `"${process.env.SENDER_NAME || 'Apex'}" <${process.env.EMAIL}>`,
        to: email,
        subject,
        html,
      })
      return info?.messageId || 'gmail'
    } catch (e) {
      errors.push('Gmail: ' + e.message)
    }
  }

  throw new Error(errors.length ? errors.join(' · ') : 'Email service not configured.')
}
