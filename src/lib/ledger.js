import { getCollection } from '@/lib/db'

export const WELCOME_GRANT = 30
export const STREAK_GIFT = 5
export const WITHDRAWALS_ENABLED = false

// All coin movement flows through here. Balances are derived by summing
// the ledger — never set directly.
export async function appendTx({ type, from = 'system', to, amount, withdrawable = false, reason = '', day = null, meta = {} }) {
  if (!to || !amount) throw new Error('to and amount required')
  const col = await getCollection('transactions')
  const doc = { type, from, to: to.toLowerCase().trim(), amount, withdrawable, reason, day, meta, createdAt: new Date().toISOString() }
  await col.insertOne(doc)
  return doc
}

export async function balances(email) {
  const col = await getCollection('transactions')
  const rows = await col.find({ to: email.toLowerCase().trim() }).toArray()
  const spends = await col.find({ from: email.toLowerCase().trim() }).toArray()
  let spendable = 0
  let withdrawableBal = 0
  for (const r of rows) {
    spendable += r.amount
    if (r.withdrawable) withdrawableBal += r.amount
  }
  for (const s of spends) {
    spendable -= s.amount
    if (s.withdrawable) withdrawableBal -= s.amount
  }
  return { spendable, withdrawable: withdrawableBal }
}

export async function ensureWelcomeGrant(email) {
  const col = await getCollection('transactions')
  const existing = await col.findOne({ to: email.toLowerCase().trim(), type: 'welcome_grant' })
  if (existing) return null
  return appendTx({ type: 'welcome_grant', to: email, amount: WELCOME_GRANT, withdrawable: false, reason: 'Welcome grant — spend-only, never withdrawable.' })
}

export async function recordCompletionGift(email, day) {
  return appendTx({ type: 'streak_gift', to: email, amount: STREAK_GIFT, withdrawable: false, reason: 'Completed the day\u2019s plan item at/above the bar.', day })
}

export async function recordRaceWinnings(email, amount) {
  return appendTx({ type: 'race_winnings', from: 'race_pot', to: email, amount, withdrawable: true, reason: 'Ghost race pot winnings.' })
}

export async function recordCreatorPayout(email, amount, period) {
  return appendTx({ type: 'creator_payout', from: 'creator_fund', to: email, amount, withdrawable: true, reason: `Creator fund payout (${period}).`, meta: { period } })
}

export async function spend(email, amount, sink, reason) {
  const bal = await balances(email)
  if (amount > bal.spendable) {
    const err = new Error(`Insufficient balance: ${bal.spendable} available.`)
    err.code = 'INSUFFICIENT'
    throw err
  }
  const col = await getCollection('transactions')
  const doc = { type: sink, from: email.toLowerCase().trim(), to: sink, amount, withdrawable: false, reason, createdAt: new Date().toISOString() }
  await col.insertOne(doc)
  return doc
}
