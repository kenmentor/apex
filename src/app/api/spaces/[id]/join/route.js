import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { ObjectId } from 'mongodb'

export async function POST(request, { params }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const col = await getCollection('spaces')
    const space = await col.findOne({ _id: new ObjectId(id) })
    if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let body = {}
    try { body = await request.json() } catch {}
    const { code, answers } = body || {}

    const isMember = space.members?.includes(user.email)

    if (isMember) {
      await col.updateOne({ _id: new ObjectId(id) }, { $pull: { members: user.email }, $inc: { memberCount: -1 } })
      return NextResponse.json({ joined: false })
    } else {
      const maxSeats = Math.min(50, Math.max(2, Number(space.maxSeats) || 50))
      if (space.maxSeatsEnforced && (space.memberCount || 0) >= maxSeats) {
        return NextResponse.json({ error: 'This group is full' }, { status: 403 })
      }
      // Invite-code join works under any visibility (codes are email-bound).
      if (code) {
        const invCol = await getCollection('group_invites')
        const inv = await invCol.findOne({ groupId: id, code: String(code).toUpperCase().trim(), status: 'pending' })
        if (!inv) return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 403 })
        if (inv.email !== user.email) return NextResponse.json({ error: 'This invite was sent to another email' }, { status: 403 })
        await col.updateOne({ _id: new ObjectId(id) }, { $addToSet: { members: user.email }, $inc: { memberCount: 1 } })
        await invCol.updateOne({ _id: inv._id }, { $set: { status: 'used', resolvedAt: new Date().toISOString() } })
        return NextResponse.json({ joined: true })
      }
      const visibility = space.visibility || 'open'
      if (visibility === 'invite') {
        return NextResponse.json({ error: 'This group is invite-only' }, { status: 403 })
      }
      if (visibility === 'approval') {
        // Park a join request for admins to approve.
        const cleanAnswers = Array.isArray(answers)
          ? answers.map(a => String(a || '').trim().slice(0, 500)).slice(0, 5)
          : []
        const reqCol = await getCollection('group_requests')
        await reqCol.updateOne(
          { groupId: id, email: user.email },
          {
            $set: { answers: cleanAnswers, name: user.name || '', status: 'pending' },
            $setOnInsert: { groupId: id, email: user.email, createdAt: new Date().toISOString() },
          },
          { upsert: true }
        )
        return NextResponse.json({ joined: false, requested: true })
      }
      await col.updateOne({ _id: new ObjectId(id) }, { $addToSet: { members: user.email }, $inc: { memberCount: 1 } })
      return NextResponse.json({ joined: true })
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
