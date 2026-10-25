import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { spend, balances } from '@/lib/ledger'

// POST /api/spaces/nudge {spaceId, to} — free encouragement (notification).
// POST with {tip: coins} — tip-a-coin sink via the ledger.
export async function POST(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const { spaceId, to, tip } = body
    if (!spaceId || !to) return NextResponse.json({ error: 'spaceId, to required' }, { status: 400 })

    const notifCol = await getCollection('notifications')
    await notifCol.insertOne({
      userEmail: to.toLowerCase().trim(),
      type: 'nudge',
      title: '👋 Study nudge',
      message: `${user.name || user.email} nudged you to keep going in your study group!`,
      link: `/groups/${spaceId}`,
      read: false,
      createdAt: new Date().toISOString(),
    })

    if (tip && Number(tip) > 0) {
      try {
        await spend(user.email, Number(tip), 'tip', `Tip to ${to} in space ${spaceId}`)
        const { appendTx } = await import('@/lib/ledger')
        await appendTx({ type: 'tip_received', from: 'tip', to, amount: Number(tip), withdrawable: false, reason: `Tip from ${user.email}` })
      } catch (e) {
        if (e.code === 'INSUFFICIENT') return NextResponse.json({ error: e.message }, { status: 402 })
        throw e
      }
    }

    const bal = await balances(user.email).catch(() => null)
    return NextResponse.json({ success: true, balances: bal })
  } catch (error) {
    return NextResponse.json({ error: 'Nudge failed: ' + error.message }, { status: 500 })
  }
}
