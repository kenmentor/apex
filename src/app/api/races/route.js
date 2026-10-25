import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { rankEntries, LIVE_PAUSE_SECONDS } from '@/lib/games'
import { checkTiming, checkStake, hasCompletedToday } from '@/lib/antifarm'
import { recordRaceWinnings } from '@/lib/ledger'
import { getDB } from '@/lib/db'

// POST /api/races — create session {mode: ghost|live, topicIds, seed, stake}
// PATCH /api/races — actions: join, finish, pause, resume, vote-continue
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'open'
    const col = await getCollection('game_sessions')
    const docs = await col.find({ status }).sort({ createdAt: -1 }).limit(30).toArray()
    return NextResponse.json(docs.map(d => ({ ...d, _id: d._id.toString() })))
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch races' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { mode = 'ghost', courseCode, topicIds = [], seed, stake = 0, maxPlayers = 8 } = body
    if (!['ghost', 'live'].includes(mode)) return NextResponse.json({ error: 'mode must be ghost|live' }, { status: 400 })

    // Resolve topics from the pilot plan when a course is given
    // (so creation isn't hardcoded to two topics).
    let topics = topicIds
    let course = body.course || null
    if ((!topics || !topics.length) && courseCode) {
      const topicsCol = await getCollection('topics')
      const rows = await topicsCol.find({ courseCode: String(courseCode).toUpperCase().trim() }).toArray()
      topics = rows.map(t => t.topicId)
      course = String(courseCode).toUpperCase().trim()
    }
    if (!topics.length) return NextResponse.json({ error: 'topicIds or courseCode required' }, { status: 400 })
    const stakeCheck = checkStake(stake)
    if (!stakeCheck.ok) return NextResponse.json({ error: stakeCheck.reason }, { status: 400 })

    const user = await getUserFromToken(request).catch(() => null)
    const col = await getCollection('game_sessions')
    const doc = {
      mode,
      courseCode: course,
      topicIds: topics,
      seed: seed || `seed-${Date.now()}`,
      stake: stake || 0,
      maxPlayers,
      status: 'open',
      players: [],
      entries: [],
      pausedAt: null,
      pauseUsedBy: {},
      escrow: mode === 'live' && stake
        ? 'Staked live race: disconnect pauses the race up to 60s. After that the race resumes without you and your stake is forfeit to the pot.'
        : null,
      creatorEmail: user?.email || body.email || null,
      createdAt: new Date().toISOString(),
    }
    const result = await col.insertOne(doc)
    return NextResponse.json({ success: true, id: result.insertedId.toString(), escrow: doc.escrow }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create race: ' + error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json()
    const { id, action, email, accuracy, seconds, difficulty, format } = body
    if (!id || !action) return NextResponse.json({ error: 'id, action required' }, { status: 400 })
    const { ObjectId } = await import('mongodb')
    const db = await getDB()
    const col = db.collection('game_sessions')
    const session = await col.findOne({ _id: new ObjectId(id) })
    if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (action === 'join') {
      if ((session.players || []).length >= (session.maxPlayers || 8)) {
        return NextResponse.json({ error: 'Race is full' }, { status: 400 })
      }
      // Staked entry requires a completion-gated day (anti-farm).
      if (session.stake) {
        const ok = await hasCompletedToday(db, email)
        if (!ok) return NextResponse.json({ error: 'Staked races require completing today\u2019s plan item first.' }, { status: 403 })
      }
      await col.updateOne({ _id: session._id }, { $addToSet: { players: email.toLowerCase().trim() } })
      return NextResponse.json({ success: true, escrow: session.escrow || null })
    }

    if (action === 'finish') {
      // Format-aware entries: all formats normalize to 0–100 accuracy,
      // so the shared ranking matrix needs no changes.
      const fmt = ['chunk', 'sprint', 'pairs', 'cloze'].includes(format) ? format : 'chunk'
      const timing = checkTiming({ items: (session.topicIds || []).length * 5 || 5, seconds: seconds || 0, format: fmt })
      if (!timing.ok) return NextResponse.json({ error: timing.reason }, { status: 400 })
      const acc = Math.max(0, Math.min(100, accuracy || 0))
      const entry = { email: email.toLowerCase().trim(), format: fmt, accuracy: acc, seconds: seconds || 0, difficulty: difficulty || 1, at: new Date().toISOString() }
      await col.updateOne({ _id: session._id }, { $push: { entries: entry } })
      const updated = await col.findOne({ _id: session._id })
      const ranked = rankEntries(updated.entries || [])
      if ((updated.entries || []).length >= 2) {
        await col.updateOne({ _id: session._id }, { $set: { status: 'settled', ranked } })
        // Winner-takes-pot for staked ghosts (zero-sum sink).
        if (updated.stake && ranked.length) {
          await recordRaceWinnings(ranked[0].email, updated.stake * (ranked.length - 1))
        }
      }
      return NextResponse.json({ success: true, ranked })
    }

    if (action === 'pause') {
      if (session.mode !== 'live') return NextResponse.json({ error: 'Only live races pause' }, { status: 400 })
      const used = (session.pauseUsedBy || {})[email] || 0
      if (used >= 2) return NextResponse.json({ error: 'Pause budget used up (2 per player).' }, { status: 400 })
      await col.updateOne({ _id: session._id }, { $set: { pausedAt: new Date().toISOString(), [`pauseUsedBy.${email}`]: used + 1 } })
      return NextResponse.json({ success: true, pauseSeconds: LIVE_PAUSE_SECONDS })
    }

    if (action === 'resume' || action === 'vote-continue') {
      await col.updateOne({ _id: session._id }, { $set: { pausedAt: null } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed: ' + error.message }, { status: 500 })
  }
}
