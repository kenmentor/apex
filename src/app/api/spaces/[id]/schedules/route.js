import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { ObjectId } from 'mongodb'

// Per-person reading schedules.
// GET — members list schedules (mine first).
// POST { title, detail, assignee, dueAt } — admins assign reading.
// PATCH { scheduleId, action: 'done' | 'undone' | 'delete' } — assignee ticks off, admins delete.
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

export async function GET(request, { params }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const space = await loadSpace(id)
    if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!(space.members || []).includes(user.email)) return NextResponse.json({ error: 'Members only' }, { status: 403 })

    const col = await getCollection('group_schedules')
    const list = await col.find({ groupId: id }).sort({ dueAt: 1 }).limit(100).toArray()
    const mine = list.filter(s => s.assignee === user.email || s.assignee === 'all')
    const others = list.filter(s => !(s.assignee === user.email || s.assignee === 'all'))
    return NextResponse.json([...mine, ...others])
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

    const { title, detail, assignee, dueAt } = await request.json()
    if (!String(title || '').trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })
    const who = String(assignee || 'all').toLowerCase().trim()
    if (who !== 'all' && !(space.members || []).includes(who)) {
      return NextResponse.json({ error: 'Assignee must be a member' }, { status: 400 })
    }
    const due = dueAt ? new Date(dueAt).toISOString() : null
    if (dueAt && !due) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })

    const col = await getCollection('group_schedules')
    const doc = {
      groupId: id,
      title: String(title).trim().slice(0, 120),
      detail: String(detail || '').trim().slice(0, 300),
      assignee: who,
      dueAt: due,
      doneBy: [],
      by: user.email,
      createdAt: new Date().toISOString(),
    }
    const result = await col.insertOne(doc)

    if (who !== 'all') {
      const notifCol = await getCollection('notifications')
      await notifCol.insertOne({
        userEmail: who, type: 'group_schedule', title: 'New reading task 📖',
        message: `${user.name || user.email} assigned you “${doc.title}” in ${space.name}.`,
        link: `/groups/${id}`, read: false, createdAt: new Date().toISOString(),
      })
    }
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
    if (!(space.members || []).includes(user.email)) return NextResponse.json({ error: 'Members only' }, { status: 403 })

    const { scheduleId, action } = await request.json()
    if (!scheduleId || !['done', 'undone', 'delete'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    const col = await getCollection('group_schedules')
    let sched = null
    try { sched = await col.findOne({ _id: new ObjectId(scheduleId), groupId: id }) } catch {}
    if (!sched) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (action === 'delete') {
      if (!isAdmin(space, user.email)) return NextResponse.json({ error: 'Admins only' }, { status: 403 })
      await col.deleteOne({ _id: sched._id })
      return NextResponse.json({ success: true })
    }

    const mine = sched.assignee === 'all' || sched.assignee === user.email
    if (!mine && !isAdmin(space, user.email)) return NextResponse.json({ error: 'Not yours' }, { status: 403 })
    if (action === 'done') {
      await col.updateOne({ _id: sched._id }, { $addToSet: { doneBy: user.email } })
    } else {
      await col.updateOne({ _id: sched._id }, { $pull: { doneBy: user.email } })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
