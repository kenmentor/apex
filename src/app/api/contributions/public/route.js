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

    // ---- Batch board mode: aggregates per store (no doc cap) ----
    if (batch.length) {
      const per = new Map(batch.map(e => [e, { approved: 0, courses: new Set(), byDay: {} }]))
      const feedAgg = async (col, field) => {
        if (!col) return
        const rows = await col.aggregate([
          { $match: { [field]: { $in: batch }, ...approvedMatch } },
          {
            $group: {
              _id: {
                email: `$${field}`,
                day: { $substr: [{ $toString: '$createdAt' }, 0, 10] },
                course: { $ifNull: ['$courseCode', 'General'] },
              },
              n: { $sum: 1 },
            },
          },
        ]).toArray().catch(() => [])
        for (const r of rows) {
          const e = String(r._id?.email || '').toLowerCase()
          const slot = per.get(e)
          if (!slot) continue
          slot.approved += r.n
          if (r._id?.course) slot.courses.add(r._id.course)
          const k = r._id?.day
          if (k && /^\d{4}-\d{2}-\d{2}$/.test(k)) slot.byDay[k] = (slot.byDay[k] || 0) + r.n
        }
      }
      await Promise.all([
        feedAgg(qCol, 'authorEmail'),
        feedAgg(rCol, 'authorEmail'),
        feedAgg(mCol, 'ownerEmail'),
      ])

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

    // ---- Single profile mode: aggregates for math (no doc cap) ----
    const approvedOf = (col, field, email) =>
      col ? col.countDocuments({ [field]: email, ...approvedMatch }).catch(() => 0) : Promise.resolve(0)
    const [qTotal, rTotal, mTotal, qAppr, rAppr, mAppr] = await Promise.all([
      qCol ? qCol.countDocuments({ authorEmail: email }).catch(() => 0) : Promise.resolve(0),
      rCol ? rCol.countDocuments({ authorEmail: email }).catch(() => 0) : Promise.resolve(0),
      mCol ? mCol.countDocuments({ ownerEmail: email }).catch(() => 0) : Promise.resolve(0),
      approvedOf(qCol, 'authorEmail', email),
      approvedOf(rCol, 'authorEmail', email),
      approvedOf(mCol, 'ownerEmail', email),
    ])
    // Exact totals from counts (no doc cap); days + courses from aggregates.
    const approved = qAppr + rAppr + mAppr
    let pending = 0
    if (isSelf) {
      const [qp, rp, mp] = await Promise.all([
        qCol ? qCol.countDocuments({ authorEmail: email, status: 'pending' }).catch(() => 0) : Promise.resolve(0),
        rCol ? rCol.countDocuments({ authorEmail: email, status: 'pending' }).catch(() => 0) : Promise.resolve(0),
        mCol ? mCol.countDocuments({ ownerEmail: email, status: 'pending' }).catch(() => 0) : Promise.resolve(0),
      ])
      pending = qp + rp + mp
    }
    const byDay = {}
    const courses = new Set()
    for (const [col, field] of [[qCol, 'authorEmail'], [rCol, 'authorEmail'], [mCol, 'ownerEmail']]) {
      if (!col) continue
      const rows = await col.aggregate([
        { $match: { [field]: email, ...approvedMatch } },
        {
          $group: {
            _id: {
              day: { $substr: [{ $toString: '$createdAt' }, 0, 10] },
              course: { $ifNull: ['$courseCode', 'General'] },
            },
            n: { $sum: 1 },
          },
        },
      ]).toArray().catch(() => [])
      for (const r of rows) {
        if (r._id?.course) courses.add(r._id.course)
        const k = r._id?.day
        if (k && /^\d{4}-\d{2}-\d{2}$/.test(k)) byDay[k] = (byDay[k] || 0) + r.n
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
