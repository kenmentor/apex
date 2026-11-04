import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-server'

const ROLES = ['student', 'editor', 'official']

function escRx(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function serialize(u) {
  return {
    email: u.email,
    name: u.name || '',
    department: u.department || '',
    level: u.level || '',
    role: u.role || 'student',
    admin: !!u.admin,
    createdAt: u.createdAt || null,
  }
}

// GET ?q= — find users by email. No query → 30 most recent.
// Admin only. Everyone else is just a normal user and never sees this.
export async function GET(request) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Admins only' }, { status: 403 })
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const users = await getCollection('users')
    const filter = q ? { email: { $regex: escRx(q), $options: 'i' } } : {}
    const docs = await users
      .find(filter)
      .project({ email: 1, name: 1, department: 1, level: 1, role: 1, admin: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(30)
      .toArray()
    return NextResponse.json({ users: docs.map(serialize) })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH { email, role?, admin? } — admin only.
// role ∈ student|editor|official. admin flips the admin flag (but never your
// own — no self lockouts). Role and flag are independent: editors contribute,
// only admins open the admin section.
export async function PATCH(request) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Admins only' }, { status: 403 })
    const body = await request.json().catch(() => ({}))
    const email = String(body?.email || '').toLowerCase().trim()
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })
    const self = email === String(admin.email).toLowerCase()
    const update = { updatedAt: new Date().toISOString() }
    if (body.role !== undefined) {
      if (!ROLES.includes(body.role)) return NextResponse.json({ error: 'role must be student|editor|official' }, { status: 400 })
      update.role = body.role
    }
    if (body.admin !== undefined) {
      if (self && body.admin === false) {
        return NextResponse.json({ error: 'You cannot remove your own admin' }, { status: 400 })
      }
      update.admin = body.admin === true
    }
    if (Object.keys(update).length <= 1) return NextResponse.json({ error: 'nothing to change' }, { status: 400 })
    const users = await getCollection('users')
    const res = await users.updateOne({ email }, { $set: update })
    if (!res.matchedCount) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    const fresh = await users.findOne({ email })
    return NextResponse.json({ success: true, user: serialize(fresh) })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
