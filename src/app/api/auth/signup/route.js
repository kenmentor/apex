import { NextResponse } from 'next/server'

// Retired: sign-up is Google-only via Clerk (/auth). Kept as a stub so old
// clients get a clear message instead of a 404.
export async function POST() {
  return NextResponse.json(
    { error: 'Email sign-up is retired. Please sign up with Google.' },
    { status: 410 }
  )
}
