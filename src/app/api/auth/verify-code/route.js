import { NextResponse } from 'next/server'

// Retired: email verification codes are gone with password auth (Google
// emails arrive pre-verified via Clerk).
export async function POST() {
  return NextResponse.json(
    { error: 'Email verification is retired. Google accounts are verified automatically.' },
    { status: 410 }
  )
}
