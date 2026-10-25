import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { ObjectId } from 'mongodb'

// Email + link invites for groups.
// GET — members who may invite list pending invites.
// POST { email } — create an invite (notifies the invitee with a join link).
// DELETE { code } — revoke (admin or the inviter).
function isAdmin(space, email) {
  return !!email && (space.creatorEmail === email || (space.admins || []).includes(email))
}

function canInvite(space, email) {
  if (!email || !(space.members || []).includes(email)) return false
  if (isAdmin(space, email)) return true
  return (space.whoCanInvite || 'members') === 'members'
}

function makeCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase()
}

export async function GET(request, { params }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const col = await getCollection('spaces')
    let space = null
    try { space = await col.findOne({ _id: new ObjectId(id) }) } catch {}
    if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!canInvite(space, user.email)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

    const invCol = await getCollection('group_invites')
    const list = await invCol.find({ groupId: id, status: 'pending' }).sort({ createdAt: -1 }).toArray()
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
    let space = null
    try { space = await col.findOne({ _id: new ObjectId(id) }) } catch {}
    if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!canInvite(space, user.email)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

    const { email } = await request.json()
    const cleanEmail = String(email || '').toLowerCase().trim()
    if (!cleanEmail || !cleanEmail.includes('@')) return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    if ((space.members || []).includes(cleanEmail)) return NextResponse.json({ error: 'Already a member' }, { status: 400 })

    const invCol = await getCollection('group_invites')
    const existing = await invCol.findOne({ groupId: id, email: cleanEmail, status: 'pending' })
    if (existing) return NextResponse.json({ success: true, code: existing.code, reused: true })

    let code = makeCode()
    for (let i = 0; i < 3; i++) {
      const clash = await invCol.findOne({ groupId: id, code })
      if (!clash) break
      code = makeCode()
    }
    await invCol.insertOne({
      groupId: id, email: cleanEmail, code, by: user.email,
      status: 'pending', createdAt: new Date().toISOString(),
    })

    const notifCol = await getCollection('notifications')
    await notifCol.insertOne({
      userEmail: cleanEmail, type: 'group_invite', title: 'Group invite 📩',
      message: `${user.name || user.email} invited you to join ${space.name}.`,
      link: `/groups/${id}?invite=${code}`, read: false, createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, code }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const col = await getCollection('spaces')
    let space = null
    try { space = await col.findOne({ _id: new ObjectId(id) }) } catch {}
    if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { code } = await request.json()
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })
    const invCol = await getCollection('group_invites')
    const inv = await invCol.findOne({ groupId: id, code: String(code).toUpperCase().trim(), status: 'pending' })
    if (!inv) return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    if (!isAdmin(space, user.email) && inv.by !== user.email) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
    }
    await invCol.updateOne({ _id: inv._id }, { $set: { status: 'revoked', resolvedAt: new Date().toISOString() } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
