import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { recordCompletionGift } from '@/lib/ledger'

function dayKey(iso) {
  return (iso || '').slice(0, 10)
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })
    const col = await getCollection('completions')
    const docs = await col
      .find({ email: email.toLowerCase().trim() })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray()
    return NextResponse.json(docs.map(d => ({ ...d, _id: d._id.toString() })))
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch completions' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, topicId, itemId, kind, percentage } = body
    if (!email || !topicId || !itemId || !kind) {
      return NextResponse.json({ error: 'email, topicId, itemId, kind required' }, { status: 400 })
    }
    const userFromToken = await getUserFromToken(request).catch(() => null)
    const from = userFromToken?.email || email.toLowerCase().trim()

    const col = await getCollection('completions')
    const doc = {
      email: email.toLowerCase().trim(),
      topicId,
      itemId,
      kind,
      percentage: percentage ?? null,
      createdAt: new Date().toISOString(),
    }
    const result = await col.insertOne(doc)

    // Completion-gated coin gift: only prove items at/above bar earn the day gift.
    let gift = null
    if (kind === 'prove' && (percentage || 0) >= 80) {
      const today = dayKey(doc.createdAt)
      const alreadyGifted = await getCollection('transactions').then(col =>
        col.findOne({ to: doc.email, type: 'streak_gift', day: today })
      )
      if (!alreadyGifted) {
        gift = await recordCompletionGift(doc.email, today)
      }
    }

    return NextResponse.json({ success: true, id: result.insertedId.toString(), gift }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to record completion: ' + error.message }, { status: 500 })
  }
}
