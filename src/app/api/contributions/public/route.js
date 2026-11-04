import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'

function dayKey(d) {
  try {
    const t = new Date(d)
    if (isNaN(t)) return null
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  } catch { return null }
}

// GET /api/contributions/public?email= — safe public slice of a
// contributor's portfolio: APPROVED work only (no pending/rejected,
// no item list, no emails beyond the profile's own). Powers public
// profile stats + streak.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = (searchParams.get('email') || '').toLowerCase().trim()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    // Own full portfolio (incl. pending) when the viewer asks for self.
    const viewer = await getUserFromToken(request).catch(() => null)
    const isSelf = viewer && String(viewer.email || '').toLowerCase() === email

    const [qCol, rCol, mCol] = await Promise.all([
      getCollection('questions').catch(() => null),
      getCollection('readings').catch(() => null),
      getCollection('user_materials').catch(() => null),
    ])

    const approvedMatch = { status: { $nin: ['pending', 'rejected', 'revoked'] } }
    const [qs, rs, ms] = await Promise.all([
      qCol ? qCol.find({ authorEmail: email }).project({ courseCode: 1, status: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(500).toArray().catch(() => []) : [],
      rCol ? rCol.find({ authorEmail: email }).project({ courseCode: 1, status: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(500).toArray().catch(() => []) : [],
      mCol ? mCol.find({ ownerEmail: email }).project({ courseCode: 1, status: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(500).toArray().catch(() => []) : [],
    ])
    const all = [...qs, ...rs, ...ms]
    const visible = isSelf ? all : all.filter(d => !['pending', 'rejected', 'revoked'].includes(d.status))

    const byDay = {}
    const courses = new Set()
    let approved = 0
    let pending = 0
    for (const d of visible) {
      const st = d.status || 'approved'
      if (st === 'approved') {
        approved += 1
        if (d.courseCode) courses.add(d.courseCode)
        const k = dayKey(d.createdAt)
        if (k) byDay[k] = (byDay[k] || 0) + 1
      } else if (st === 'pending' && isSelf) {
        pending += 1
      }
    }

    // Streak: consecutive active days ending today or yesterday.
    const today = new Date()
    const keyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    let streak = 0
    const probe = new Date(today)
    if (!byDay[keyOf(probe)]) probe.setDate(probe.getDate() - 1)
    while (byDay[keyOf(probe)]) { streak += 1; probe.setDate(probe.getDate() - 1) }

    // Rank: approved contributions per author across all three stores.
    let rank = null
    let totalContributors = 0
    try {
      const counts = new Map()
      const add = (e, n) => { const k = String(e || '').toLowerCase(); if (k) counts.set(k, (counts.get(k) || 0) + n) }
      if (qCol) {
        const rows = await qCol.aggregate([{ $match: approvedMatch }, { $group: { _id: '$authorEmail', n: { $sum: 1 } } }]).toArray().catch(() => [])
        rows.forEach(r => add(r._id, r.n))
      }
      if (rCol) {
        const rows = await rCol.aggregate([{ $match: approvedMatch }, { $group: { _id: '$authorEmail', n: { $sum: 1 } } }]).toArray().catch(() => [])
        rows.forEach(r => add(r._id, r.n))
      }
      if (mCol) {
        const rows = await mCol.aggregate([{ $match: approvedMatch }, { $group: { _id: '$ownerEmail', n: { $sum: 1 } } }]).toArray().catch(() => [])
        rows.forEach(r => add(r._id, r.n))
      }
      const ordered = [...counts.entries()].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])
      totalContributors = ordered.length
      const idx = ordered.findIndex(([e]) => e === email)
      if (idx >= 0) rank = idx + 1
    } catch {}

    return NextResponse.json({
      totals: { total: approved + (isSelf ? pending : 0), approved, pending: isSelf ? pending : 0, courses: courses.size },
      streak,
      rank,
      totalContributors,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
