import { NextResponse } from 'next/server'
import { WITHDRAWALS_ENABLED } from '@/lib/ledger'

// V1: withdrawals disabled. Flags are retained in the ledger for future use.
export async function POST() {
  if (!WITHDRAWALS_ENABLED) {
    return NextResponse.json(
      { error: 'Withdrawals are unavailable in V1. Coins are spendable in-app only (courses, stakes, seats, tips).' },
      { status: 501 }
    )
  }
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

export async function GET() {
  return NextResponse.json({ enabled: WITHDRAWALS_ENABLED, message: 'Withdrawals are unavailable in V1.' })
}
