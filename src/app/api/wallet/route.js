import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { balances, ensureWelcomeGrant, spend } from '@/lib/ledger'

const SINKS = ['premium_unlock', 'staked_entry', 'live_class_seat', 'tip']

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })
    await ensureWelcomeGrant(email)
    const bal = await balances(email)
    const col = await getCollection('transactions')
    const history = await col
      .find({ $or: [{ to: email.toLowerCase().trim() }, { from: email.toLowerCase().trim() }] })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()
    return NextResponse.json({ ...bal, history: history.map(h => ({ ...h, _id: h._id.toString() })) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, sink, amount } = body
    if (!email || !SINKS.includes(sink) || !amount || amount <= 0) {
      return NextResponse.json({ error: `email, sink (${SINKS.join('|')}), positive amount required` }, { status: 400 })
    }
    await getUserFromToken(request).catch(() => null)
    const tx = await spend(email, amount, sink, `${sink} (${amount} coins)`)
    const bal = await balances(email)
    return NextResponse.json({ success: true, tx, balances: bal }, { status: 201 })
  } catch (error) {
    if (error.code === 'INSUFFICIENT') return NextResponse.json({ error: error.message }, { status: 402 })
    return NextResponse.json({ error: 'Spend failed: ' + error.message }, { status: 500 })
  }
}
