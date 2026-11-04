import { NextResponse } from 'next/server'

// Retired: Google sign-in now goes through Clerk (/auth). The old direct
// ID-token route is closed so there is exactly one front door.
export async function POST() {
  return NextResponse.json(
    { error: 'Direct Google sign-in is retired. Please sign in with Google on the sign-in page.' },
    { status: 410 }
  )
}
