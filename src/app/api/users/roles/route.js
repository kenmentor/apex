import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

// GET /api/users/roles?emails=a@x.com,b@y.com — public role badges so lists
// (leaderboard, feeds) can show ticks. Only privileged roles are exposed.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const emails = String(searchParams.get('emails') || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 50)
    if (!emails.length) return NextResponse.json({ roles: {} })
    const users = await getCollection('users')
    const docs = await users.find({ email: { $in: emails } }).project({ email: 1, role: 1, admin: 1 }).toArray()
    const roles = {}
    for (const u of docs) {
      const email = String(u.email || '').toLowerCase()
      if (u.admin || u.role === 'admin') roles[email] = 'admin'
      else if (u.role === 'editor') roles[email] = 'editor'
      else if (u.role === 'official') roles[email] = 'official'
    }
    return NextResponse.json({ roles })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
