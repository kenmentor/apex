import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { ObjectId } from 'mongodb'

// Group meetings. Times auto-flip client-side (upcoming → live → ended),
// so no cron is needed: a meeting is live while now is inside [startsAt, endsAt].
// GET — members list meetings (live first).
// POST { title, startsAt, durationMin } — admins schedule (notifies members).
// PATCH { meetingId, action: 'end' | 'cancel' } — admins close early / remove.
function isAdmin(space, email) {
  return !!email && (space.creatorEmail === email || (space.admins || []).includes(email))
}

async function loadSpace(id) {
  try {
    return await (await getCollection('spaces')).findOne({ _id: new ObjectId(id) })
  } catch {
    return null
  }
}

function statusOf(m, now) {
  if (m.status === 'cancelled') return 'cancelled'
  if (m.status === 'ended') return 'ended'
  const start = new Date(m.startsAt).getTime()
  const end = start + (Number(m.durationMin) || 60) * 60000
  if (now < start) return 'upcoming'
  if (now <= end) return 'live'
  return 'ended'
}

export async function GET(request, { params }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const space = await loadSpace(id)
    if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!(space.members || []).includes(user.email)) return NextResponse.json({ error: 'Members only' }, { status: 403 })

    const col = await getCollection('group_meetings')
    const list = await col.find({ groupId: id, status: { $ne: 'cancelled' } }).sort({ startsAt: 1 }).limit(50).toArray()
    const now = Date.now()
    const withStatus = list.map(m => ({ ...m, _id: m._id.toString(), liveStatus: statusOf(m, now) }))
    withStatus.sort((a, b) => (a.liveStatus === 'live' ? -1 : 0) - (b.liveStatus === 'live' ? -1 : 0))
    return NextResponse.json(withStatus)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const space = await loadSpace(id)
    if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!isAdmin(space, user.email)) return NextResponse.json({ error: 'Admins only' }, { status: 403 })

    const { title, startsAt, durationMin } = await request.json()
    const start = startsAt ? new Date(startsAt).getTime() : NaN
    if (!start || Number.isNaN(start)) return NextResponse.json({ error: 'Valid start time required' }, { status: 400 })
    if (start < Date.now() - 60000) return NextResponse.json({ error: 'Start time is in the past' }, { status: 400 })
    const dur = Math.min(480, Math.max(15, Number(durationMin) || 60))

    const col = await getCollection('group_meetings')
    const doc = {
      groupId: id,
      title: String(title || 'Study session').trim().slice(0, 120) || 'Study session',
      startsAt: new Date(start).toISOString(),
      durationMin: dur,
      status: 'upcoming',
      by: user.email,
      createdAt: new Date().toISOString(),
    }
    const result = await col.insertOne(doc)

    const notifCol = await getCollection('notifications')
    const when = new Date(start).toLocaleString()
    await Promise.all((space.members || []).filter(e => e !== user.email).map(e =>
      notifCol.insertOne({
        userEmail: e, type: 'group_meeting', title: 'Session scheduled 📅',
        message: `${doc.title} in ${space.name} — ${when}.`,
        link: `/groups/${id}`, read: false, createdAt: new Date().toISOString(),
      })
    ))

    return NextResponse.json({ success: true, id: result.insertedId.toString() }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const space = await loadSpace(id)
    if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!isAdmin(space, user.email)) return NextResponse.json({ error: 'Admins only' }, { status: 403 })

    const { meetingId, action } = await request.json()
    if (!meetingId || !['end', 'cancel'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    const col = await getCollection('group_meetings')
    let m = null
    try { m = await col.findOne({ _id: new ObjectId(meetingId), groupId: id }) } catch {}
    if (!m) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (action === 'cancel') await col.deleteOne({ _id: m._id })
    else await col.updateOne({ _id: m._id }, { $set: { status: 'ended' } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
