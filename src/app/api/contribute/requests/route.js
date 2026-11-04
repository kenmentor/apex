import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken, requireAdmin } from '@/lib/auth-server'
import { notifyAdmins, notifyUser } from '@/lib/notify'

function serialize(d) {
  if (!d) return null
  return {
    id: String(d._id),
    email: d.email,
    name: d.name || '',
    department: d.department || '',
    level: d.level || '',
    note: d.note || '',
    status: d.status,
    decidedBy: d.decidedBy || null,
    decidedAt: d.decidedAt || null,
    createdAt: d.createdAt,
  }
}

// POST — a signed-in normal user asks to become a contributor.
// Idempotent: a pending request just returns itself. Admins are pinged NOW.
export async function POST(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const email = String(user.email).toLowerCase()
    if (user.admin || ['editor', 'official', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Already a contributor' }, { status: 400 })
    }
    const col = await getCollection('contributor_requests')
    const existing = await col.findOne({ email, status: 'pending' })
    if (existing) return NextResponse.json({ success: true, status: 'pending', id: String(existing._id) })
    const body = await request.json().catch(() => ({}))
    const note = String(body?.note || '').trim().slice(0, 300)
    const now = new Date().toISOString()
    const res = await col.insertOne({
      email,
      name: user.name || '',
      department: user.department || '',
      level: user.level || '',
      note,
      status: 'pending',
      decidedBy: null,
      decidedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    await notifyAdmins({
      type: 'contribute-request',
      title: `${user.name || email} wants to contribute`,
      message: `${email} · ${user.department || 'no dept'} · ${user.level || 'no level'}${note ? ` — “${note}”` : ''}`,
      link: '/admin/requests',
    }, email).catch(() => {})
    return NextResponse.json({ success: true, status: 'pending', id: res.insertedId.toString() }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET ?mine=1 — your own latest request (any signed-in user).
// GET (no param) — admin triage list (?status=pending|approved|declined|all).
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const col = await getCollection('contributor_requests')
    if (searchParams.get('mine') === '1') {
      const user = await getUserFromToken(request)
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const docs = await col
        .find({ email: String(user.email).toLowerCase() })
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray()
      return NextResponse.json({
        request: serialize(docs[0]),
        role: user.role || 'student',
        admin: !!user.admin,
      })
    }
    const admin = await requireAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Admins only' }, { status: 403 })
    const status = (searchParams.get('status') || 'pending').toLowerCase()
    const filter = status === 'all' ? {} : { status }
    const docs = await col.find(filter).sort({ createdAt: -1 }).limit(100).toArray()
    const pendingCount = await col.countDocuments({ status: 'pending' }).catch(() => 0)
    return NextResponse.json({ requests: docs.map(serialize), pendingCount })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH { email, action: 'approve'|'decline' } — admin only.
// Approve flips the user to editor and tells them; decline just tells them.
export async function PATCH(request) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Admins only' }, { status: 403 })
    const body = await request.json().catch(() => ({}))
    const email = String(body?.email || '').toLowerCase().trim()
    const action = body?.action
    if (!email || !['approve', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'email + approve|decline required' }, { status: 400 })
    }
    const now = new Date().toISOString()
    const col = await getCollection('contributor_requests')
    await col.updateMany(
      { email, status: 'pending' },
      { $set: { status: action === 'approve' ? 'approved' : 'declined', decidedBy: String(admin.email).toLowerCase(), decidedAt: now, updatedAt: now } }
    )
    if (action === 'approve') {
      const users = await getCollection('users')
      await users.updateOne({ email }, { $set: { role: 'editor', updatedAt: now } })
      await notifyUser(email, {
        type: 'contribute-approved',
        title: 'You’re a contributor ✓',
        message: 'Your editor access is live — open Contribute to start.',
        link: '/contribute',
      }).catch(() => {})
    } else {
      await notifyUser(email, {
        type: 'contribute-declined',
        title: 'Contributor request declined',
        message: 'An admin reviewed your request. You can ask again later.',
      }).catch(() => {})
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
