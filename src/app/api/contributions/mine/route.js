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

function courseSlug(code) {
  return String(code || '').toLowerCase().replace(/\s+/g, '')
}

// GET /api/contributions/mine — the contributor's academic portfolio:
// per-course counts, approvals, streak + daily heatmap, rank vs everyone,
// earned medals, and a clickable list of every contribution.
export async function GET(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    const me = String(user.email).toLowerCase()

    const [qCol, rCol, mCol] = await Promise.all([
      getCollection('questions').catch(() => null),
      getCollection('readings').catch(() => null),
      getCollection('user_materials').catch(() => null),
    ])

    const [qs, rs, ms] = await Promise.all([
      qCol ? qCol.find({ authorEmail: me }).project({ question: 1, courseCode: 1, status: 1, createdAt: 1, questionType: 1 }).sort({ createdAt: -1 }).limit(500).toArray().catch(() => []) : [],
      rCol ? rCol.find({ authorEmail: me }).project({ title: 1, courseCode: 1, topic: 1, status: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(500).toArray().catch(() => []) : [],
      mCol ? mCol.find({ ownerEmail: me }).project({ title: 1, fileName: 1, courseCode: 1, topic: 1, itemKind: 1, url: 1, status: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(500).toArray().catch(() => []) : [],
    ])

    const items = [
      ...qs.map(d => ({ collection: 'questions', id: String(d._id), title: String(d.question || '').slice(0, 120) || 'Untitled question', courseCode: d.courseCode || null, topic: null, kind: d.questionType || 'quiz', status: d.status || 'approved', createdAt: d.createdAt || null, link: d.courseCode ? `/courses/${courseSlug(d.courseCode)}/quiz` : '/contribute' })),
      ...rs.map(d => ({ collection: 'readings', id: String(d._id), title: d.title || 'Untitled note', courseCode: d.courseCode || null, topic: d.topic || null, kind: 'notes', status: d.status || 'approved', createdAt: d.createdAt || null, link: d.courseCode ? `/courses/${courseSlug(d.courseCode)}/theory` : '/contribute' })),
      ...ms.map(d => ({ collection: 'user_materials', id: String(d._id), title: d.title || d.fileName || 'Untitled file', courseCode: d.courseCode || null, topic: d.topic || null, kind: d.itemKind || 'file', status: d.status || 'approved', createdAt: d.createdAt || null, link: d.url || '/folders' })),
    ].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))

    const byStatus = { pending: 0, approved: 0, rejected: 0, revoked: 0 }
    const byCourse = {}
    const byDay = {}
    for (const it of items) {
      const st = ['pending', 'approved', 'rejected', 'revoked'].includes(it.status) ? it.status : 'approved'
      it.status = st
      byStatus[st] = (byStatus[st] || 0) + 1
      const c = it.courseCode || 'General'
      byCourse[c] = byCourse[c] || { courseCode: c, total: 0, approved: 0 }
      byCourse[c].total += 1
      if (st === 'approved') byCourse[c].approved += 1
      const k = dayKey(it.createdAt)
      if (k) byDay[k] = (byDay[k] || 0) + 1
    }
    const courses = Object.values(byCourse).sort((a, b) => b.total - a.total)

    // Streak: consecutive active days ending today or yesterday.
    const today = new Date()
    const keyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    let streak = 0
    const probe = new Date(today)
    if (!byDay[keyOf(probe)]) probe.setDate(probe.getDate() - 1)
    while (byDay[keyOf(probe)]) { streak += 1; probe.setDate(probe.getDate() - 1) }

    // Heatmap: last 18 weeks (Mon-first columns), counts per day.
    const weeks = []
    const cursor = new Date(today)
    cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7) - 7 * 17)
    for (let w = 0; w < 18; w++) {
      const days = []
      for (let i = 0; i < 7; i++) {
        const k = keyOf(cursor)
        days.push({ date: k, count: byDay[k] || 0 })
        cursor.setDate(cursor.getDate() + 1)
      }
      weeks.push(days)
    }

    // Rank: approved contributions per author across all three stores.
    let rank = null
    let totalContributors = 0
    try {
      const counts = new Map()
      const add = (email, n) => { const k = String(email || '').toLowerCase(); if (k) counts.set(k, (counts.get(k) || 0) + n) }
      if (qCol) {
        const rows = await qCol.aggregate([{ $match: { status: { $nin: ['pending', 'rejected', 'revoked'] } } }, { $group: { _id: '$authorEmail', n: { $sum: 1 } } }]).toArray().catch(() => [])
        rows.forEach(r => add(r._id, r.n))
      }
      if (rCol) {
        const rows = await rCol.aggregate([{ $match: { status: { $nin: ['pending', 'rejected', 'revoked'] } } }, { $group: { _id: '$authorEmail', n: { $sum: 1 } } }]).toArray().catch(() => [])
        rows.forEach(r => add(r._id, r.n))
      }
      if (mCol) {
        const rows = await mCol.aggregate([{ $match: { status: { $nin: ['pending', 'rejected', 'revoked'] } } }, { $group: { _id: '$ownerEmail', n: { $sum: 1 } } }]).toArray().catch(() => [])
        rows.forEach(r => add(r._id, r.n))
      }
      const ordered = [...counts.entries()].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])
      totalContributors = ordered.length
      const idx = ordered.findIndex(([e]) => e === me)
      if (idx >= 0) rank = idx + 1
    } catch {}

    const approved = byStatus.approved || 0
    const total = items.length
    const courseCount = courses.length
    const bestDay = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0]
    const medals = [
      { id: 'first', label: 'First Contribution', icon: '🌱', earned: total >= 1, desc: 'Submit your first item' },
      { id: 'approved-1', label: 'Approved', icon: '✅', earned: approved >= 1, desc: 'Get one item approved' },
      { id: 'ten', label: 'Ten Club', icon: '🔟', earned: approved >= 10, desc: '10 approved contributions' },
      { id: 'scholar', label: 'Scholar', icon: '🎓', earned: approved >= 25, desc: '25 approved contributions' },
      { id: 'polyglot', label: 'Multi-course', icon: '🗺️', earned: courseCount >= 3, desc: 'Contribute to 3+ courses' },
      { id: 'streak-7', label: 'Week Streak', icon: '🔥', earned: streak >= 7, desc: 'Contribute 7 days in a row' },
      { id: 'streak-30', label: 'Month Streak', icon: '⚡', earned: streak >= 30, desc: 'Contribute 30 days in a row' },
      { id: 'prolific', label: 'Busiest Day', icon: '🚀', earned: bestDay ? bestDay[1] >= 5 : false, desc: '5+ items in one day' },
    ]

    return NextResponse.json({
      totals: { total, approved, pending: byStatus.pending || 0, rejected: byStatus.rejected || 0, courses: courseCount },
      streak,
      weeks,
      rank,
      totalContributors,
      medals,
      courses,
      items: items.slice(0, 60),
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
