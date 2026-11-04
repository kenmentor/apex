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
// Batch: ?emails=a,b,c (max 30) — per-email { approved, courses,
// streak, rank, medals } for ranking boards. Approved-only, no strangers'
// pending, no item lists.
function streakOf(byDay) {
  const today = new Date()
  const keyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  let streak = 0
  const probe = new Date(today)
  if (!byDay[keyOf(probe)]) probe.setDate(probe.getDate() - 1)
  while (byDay[keyOf(probe)]) { streak += 1; probe.setDate(probe.getDate() - 1) }
  return streak
}

function medalsFor({ total, approved, courseCount, streak, bestDayCount }) {
  const has = (cond, id, label, icon) => (cond ? { id, label, icon } : null)
  return [
    has(total >= 1, 'first', 'First Contribution', '🌱'),
    has(approved >= 1, 'approved-1', 'Approved', '✅'),
    has(approved >= 10, 'ten', 'Ten Club', '🔟'),
    has(approved >= 25, 'scholar', 'Scholar', '🎓'),
    has(courseCount >= 3, 'polyglot', 'Multi-course', '🗺️'),
    has(streak >= 7, 'streak-7', 'Week Streak', '🔥'),
    has(streak >= 30, 'streak-30', 'Month Streak', '⚡'),
    has(bestDayCount >= 5, 'prolific', 'Busiest Day', '🚀'),
  ].filter(Boolean)
}
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = (searchParams.get('email') || '').toLowerCase().trim()
    const batch = (searchParams.get('emails') || '').split(',')
      .map(e => e.toLowerCase().trim()).filter(Boolean).slice(0, 30)
    if (!email && !batch.length) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    // Own full portfolio (incl. pending) when the viewer asks for self.
    const viewer = await getUserFromToken(request).catch(() => null)
    const isSelf = viewer && String(viewer.email || '').toLowerCase() === email

    const [qCol, rCol, mCol] = await Promise.all([
      getCollection('questions').catch(() => null),
      getCollection('readings').catch(() => null),
      getCollection('user_materials').catch(() => null),
    ])

    const approvedMatch = { status: { $nin: ['pending', 'rejected', 'revoked'] } }

    // ---- Batch board mode: one query per store, grouped in JS ----
    if (batch.length) {
      const [qs, rs, ms] = await Promise.all([
        qCol ? qCol.find({ authorEmail: { $in: batch } }).project({ authorEmail: 1, courseCode: 1, status: 1, createdAt: 1 }).limit(3000).toArray().catch(() => []) : [],
        rCol ? rCol.find({ authorEmail: { $in: batch } }).project({ authorEmail: 1, courseCode: 1, status: 1, createdAt: 1 }).limit(3000).toArray().catch(() => []) : [],
        mCol ? mCol.find({ ownerEmail: { $in: batch } }).project({ ownerEmail: 1, courseCode: 1, status: 1, createdAt: 1 }).limit(3000).toArray().catch(() => []) : [],
      ])
      const per = new Map(batch.map(e => [e, { approved: 0, courses: new Set(), byDay: {} }]))
      const feed = (list, key) => {
        for (const d of list) {
          const e = String(d[key] || '').toLowerCase()
          const slot = per.get(e)
          if (!slot) continue
          if (['pending', 'rejected', 'revoked'].includes(d.status)) continue
          slot.approved += 1
          if (d.courseCode) slot.courses.add(d.courseCode)
          const k = dayKey(d.createdAt)
          if (k) slot.byDay[k] = (slot.byDay[k] || 0) + 1
        }
      }
      feed(qs, 'authorEmail')
      feed(rs, 'authorEmail')
      feed(ms, 'ownerEmail')

      // Contributor rank ladder (approved counts) for rank context.
      let order = []
      try {
        const counts = new Map()
        const add = (e, n) => { const k = String(e || '').toLowerCase(); if (k) counts.set(k, (counts.get(k) || 0) + n) }
        if (qCol) (await qCol.aggregate([{ $match: approvedMatch }, { $group: { _id: '$authorEmail', n: { $sum: 1 } } }]).toArray().catch(() => [])).forEach(r => add(r._id, r.n))
        if (rCol) (await rCol.aggregate([{ $match: approvedMatch }, { $group: { _id: '$authorEmail', n: { $sum: 1 } } }]).toArray().catch(() => [])).forEach(r => add(r._id, r.n))
        if (mCol) (await mCol.aggregate([{ $match: approvedMatch }, { $group: { _id: '$ownerEmail', n: { $sum: 1 } } }]).toArray().catch(() => [])).forEach(r => add(r._id, r.n))
        order = [...counts.entries()].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([e]) => e)
      } catch {}

      const users = {}
      for (const [e, s] of per) {
        const streak = streakOf(s.byDay)
        const bestDayCount = Object.values(s.byDay).reduce((a, b) => Math.max(a, b), 0)
        const courseCount = s.courses.size
        users[e] = {
          approved: s.approved,
          courses: courseCount,
          streak,
          rank: order.length ? (order.indexOf(e) >= 0 ? order.indexOf(e) + 1 : null) : null,
          medals: medalsFor({ total: s.approved, approved: s.approved, courseCount, streak, bestDayCount }),
        }
      }
      return NextResponse.json({ users })
    }

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
