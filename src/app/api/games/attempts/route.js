import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { scoreOrder, scoreSprint, scorePairs, scoreCloze } from '@/lib/games'
import { checkTiming } from '@/lib/antifarm'

const FORMATS = ['chunk', 'sprint', 'pairs', 'cloze']

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, topicId, format = 'chunk', seconds } = body
    if (!email || !topicId) {
      return NextResponse.json({ error: 'email, topicId required' }, { status: 400 })
    }
    if (!FORMATS.includes(format)) {
      return NextResponse.json({ error: `format must be ${FORMATS.join('|')}` }, { status: 400 })
    }

    let accuracy, items
    if (format === 'chunk') {
      const { placedIds, correctIds } = body
      if (!Array.isArray(placedIds) || !Array.isArray(correctIds)) {
        return NextResponse.json({ error: 'chunk needs placedIds, correctIds' }, { status: 400 })
      }
      accuracy = scoreOrder(placedIds, correctIds)
      items = correctIds.length
    } else if (format === 'sprint') {
      const { correct = 0, total = 0 } = body
      if (!total) return NextResponse.json({ error: 'sprint needs correct, total' }, { status: 400 })
      accuracy = scoreSprint(correct, total)
      items = total
    } else if (format === 'pairs') {
      const { cleared = 0, total = 0, mistakes = 0 } = body
      if (!total) return NextResponse.json({ error: 'pairs needs cleared, total' }, { status: 400 })
      accuracy = scorePairs(cleared, total, mistakes)
      items = total
    } else {
      const { correct = 0, total = 0 } = body
      if (!total) return NextResponse.json({ error: 'cloze needs correct, total' }, { status: 400 })
      accuracy = scoreCloze(correct, total)
      items = total
    }

    const timing = checkTiming({ items, seconds: seconds || 0, format })
    if (!timing.ok) return NextResponse.json({ error: timing.reason }, { status: 400 })

    const userFromToken = await getUserFromToken(request).catch(() => null)
    const col = await getCollection('game_attempts')
    const doc = {
      email: email.toLowerCase().trim(),
      by: userFromToken?.email || email.toLowerCase().trim(),
      topicId,
      format,
      accuracy,
      seconds: seconds || 0,
      passed: accuracy >= 80,
      createdAt: new Date().toISOString(),
    }
    const result = await col.insertOne(doc)
    return NextResponse.json({ success: true, id: result.insertedId.toString(), accuracy, passed: doc.passed }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to record attempt: ' + error.message }, { status: 500 })
  }
}
