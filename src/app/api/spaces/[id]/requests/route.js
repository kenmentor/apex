import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { ObjectId } from 'mongodb'

// Join requests for approval-visibility groups.
// GET — admins list pending requests.
// POST { email, action: 'approve' | 'decline' } — admins resolve one.
async function loadSpace(col, id) {
  try {
    return await col.findOne({ _id: new ObjectId(id) })
  } catch {
    return null
  }
}

function isAdmin(space, email) {
  return !!email && (space.creatorEmail === email || (space.admins || []).includes(email))
}

export async function GET(request, { params }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const col = await getCollection('spaces')
    const space = await loadSpace(col, id)
    if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!isAdmin(space, user.email)) return NextResponse.json({ error: 'Admins only' }, { status: 403 })

    const reqCol = await getCollection('group_requests')
    const list = await reqCol.find({ groupId: id, status: 'pending' }).sort({ createdAt: -1 }).toArray()
    return NextResponse.json(list)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const col = await getCollection('spaces')
    const space = await loadSpace(col, id)
    if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!isAdmin(space, user.email)) return NextResponse.json({ error: 'Admins only' }, { status: 403 })

    const { email, action } = await request.json()
    const cleanEmail = String(email || '').toLowerCase().trim()
    if (!cleanEmail || !cleanEmail.includes('@')) return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    if (!['approve', 'decline'].includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

    const reqCol = await getCollection('group_requests')
    const req = await reqCol.findOne({ groupId: id, email: cleanEmail, status: 'pending' })
    if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    const notifCol = await getCollection('notifications')

    if (action === 'decline') {
      await reqCol.updateOne({ _id: req._id }, { $set: { status: 'declined', resolvedAt: new Date().toISOString(), resolvedBy: user.email } })
      await notifCol.insertOne({
        userEmail: cleanEmail, type: 'group_request', title: 'Group request update',
        message: `Your request to join ${space.name} was declined.`,
        link: `/groups/${id}`, read: false, createdAt: new Date().toISOString(),
      })
      return NextResponse.json({ success: true, declined: true })
    }

    // approve
    if ((space.members || []).includes(cleanEmail)) {
      await reqCol.updateOne({ _id: req._id }, { $set: { status: 'approved', resolvedAt: new Date().toISOString(), resolvedBy: user.email } })
      return NextResponse.json({ success: true, joined: true })
    }
    const maxSeats = Math.min(50, Math.max(2, Number(space.maxSeats) || 50))
    if (space.maxSeatsEnforced && (space.memberCount || 0) >= maxSeats) {
      return NextResponse.json({ error: 'This group is full' }, { status: 403 })
    }
    await col.updateOne({ _id: new ObjectId(id) }, { $addToSet: { members: cleanEmail }, $inc: { memberCount: 1 } })
    await reqCol.updateOne({ _id: req._id }, { $set: { status: 'approved', resolvedAt: new Date().toISOString(), resolvedBy: user.email } })
    await notifCol.insertOne({
      userEmail: cleanEmail, type: 'group_request', title: 'You’re in! 🎉',
      message: `Your request to join ${space.name} was approved.`,
      link: `/groups/${id}`, read: false, createdAt: new Date().toISOString(),
    })
    return NextResponse.json({ success: true, joined: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
