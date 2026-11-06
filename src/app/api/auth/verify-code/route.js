import { NextResponse } from 'next/server'

// Retired: sign-in is Google-only via Firebase (/auth). Kept as a stub so
// old clients get a clear message instead of a 404.
export async function POST() {
  return NextResponse.json(
    { error: 'Email codes are retired. Please sign in with Google.' },
    { status: 410 }
  )
}
