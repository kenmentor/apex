import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
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

export async function POST(request) {  try {
    const body = await request.json()
    const { email, topicId, itemId, kind, percentage, items, courseCode } = body
    if (!email) {
      return NextResponse.json({ error: 'email required' }, { status: 400 })
    }
    const emailLc = email.toLowerCase().trim()
    const col = await getCollection('completions')

    // Bulk path: mark-whole-course check-off in ONE request instead of
    // fanning out dozens of POSTs (slow + half-applied on flaky networks).
    // Body: { email, items: [{topicId, itemId}], kind?, courseCode? }
    if (Array.isArray(items)) {
      const clean = items
        .filter(i => i && i.topicId && i.itemId)
        .slice(0, 500)
        .map(i => ({ topicId: String(i.topicId), itemId: String(i.itemId) }))
      if (!clean.length) {
        return NextResponse.json({ error: 'items required' }, { status: 400 })
      }
      const topicIds = [...new Set(clean.map(i => i.topicId))]
      const itemIds = [...new Set(clean.map(i => i.itemId))]
      const existing = await col
        .find({ email: emailLc, topicId: { $in: topicIds }, itemId: { $in: itemIds } })
        .project({ topicId: 1, itemId: 1 })
        .toArray()
      const have = new Set(existing.map(d => `${d.topicId}:${d.itemId}`))
      const fresh = clean.filter(i => !have.has(`${i.topicId}:${i.itemId}`))
      if (fresh.length) {
        const now = new Date().toISOString()
        await col.insertMany(fresh.map(i => ({
          email: emailLc,
          topicId: i.topicId,
          itemId: i.itemId,
          kind: kind || 'topic',
          ...(courseCode ? { courseCode: String(courseCode) } : {}),
          percentage: null,
          createdAt: now,
        })))
      }
      return NextResponse.json({ success: true, added: fresh.length }, { status: 201 })
    }

    if (!topicId || !itemId || !kind) {
      return NextResponse.json({ error: 'email, topicId, itemId, kind required' }, { status: 400 })
    }
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

// DELETE ?email=&topicId=&itemId= — undo a manual check-off.
// DELETE with JSON body { email, items: [{topicId, itemId}] } — undo a
// whole-course check-off in one call (only the given pairs are removed,
// e.g. the manual flags; quiz-earned item completions stay).
export async function DELETE(request) {
  try {
    let bodyItems = null
    try {
      const body = await request.json()
      if (Array.isArray(body?.items)) bodyItems = body
    } catch {}
    const col = await getCollection('completions')
    if (bodyItems) {
      const email = String(bodyItems.email || '').toLowerCase().trim()
      const pairs = bodyItems.items
        .filter(i => i && i.topicId && i.itemId)
        .slice(0, 500)
        .map(i => ({ topicId: String(i.topicId), itemId: String(i.itemId) }))
      if (!email || !pairs.length) {
        return NextResponse.json({ error: 'email, items required' }, { status: 400 })
      }
      await col.deleteMany({ email, $or: pairs })
      return NextResponse.json({ success: true })
    }
    const { searchParams } = new URL(request.url)
    const email = (searchParams.get('email') || '').toLowerCase().trim()
    const topicId = searchParams.get('topicId') || ''
    const itemId = searchParams.get('itemId') || ''
    if (!email || !topicId || !itemId) {
      return NextResponse.json({ error: 'email, topicId, itemId required' }, { status: 400 })
    }
    await col.deleteMany({ email, topicId, itemId })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to remove completion' }, { status: 500 })
  }
}
