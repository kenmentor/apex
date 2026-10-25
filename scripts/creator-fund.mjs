import 'dotenv/config'
import { MongoClient } from 'mongodb'

// V1 creator fund: platform-minted bootstrap pool, MANUAL monthly payout.
// score(content) = completions x difficulty x mastery-lift x decay
// Output is a review list — a human approves before any payout is recorded.
const FUND_POOL = Number(process.env.CREATOR_FUND_POOL || 1000)
const DECAY_DAYS = 90

async function main() {
  const period = new Date().toISOString().slice(0, 7)
  const c = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz')
  await c.connect()
  const db = c.db()

  const completions = await db.collection('completions').find({}).toArray()
  const topics = await db.collection('topics').find({}).toArray()
  const diff = Object.fromEntries(topics.map(t => [t.topicId, t.difficulty || 1]))

  const byTopic = {}
  for (const row of completions) {
    const t = (byTopic[row.topicId] = byTopic[row.topicId] || { completions: 0, passes: 0, sum: 0 })
    t.completions += 1
    if ((row.percentage || 0) >= 80) t.passes += 1
    t.sum += row.percentage || 0
  }

  const now = Date.now()
  const scored = Object.entries(byTopic).map(([topicId, t]) => {
    const lift = t.completions ? t.passes / t.completions : 0
    const ageDays = 30 // V1: flat recency; per-topic first-seen tracked in a later change
    const decay = Math.max(0.25, 1 - ageDays / DECAY_DAYS)
    const score = t.completions * (diff[topicId] || 1) * (0.5 + lift) * decay
    return { topicId, ...t, lift: Math.round(lift * 100) / 100, decay: Math.round(decay * 100) / 100, score: Math.round(score * 100) / 100 }
  }).sort((a, b) => b.score - a.score)

  const total = scored.reduce((s, r) => s + r.score, 0) || 1
  const payouts = scored.map(r => ({ topicId: r.topicId, score: r.score, coins: Math.floor((r.score / total) * FUND_POOL) }))

  console.log(`Creator fund ${period}: pool=${FUND_POOL} coins across ${scored.length} topics.`)
  for (const p of payouts.slice(0, 20)) console.log(`  ${p.topicId}: score=${p.score} -> ${p.coins} coins (pending human approval)`)
  console.log('\nNo payouts recorded. To pay: review above, then insert creator_payout transactions via the ledger.')

  await c.close()
}

main().catch(e => { console.error('creator-fund failed:', e.message); process.exit(1) })
