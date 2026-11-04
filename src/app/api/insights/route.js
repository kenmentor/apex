import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-server'

// GET /api/insights?range=24h|7d|30d — decision-grade aggregates for the
// Insights dashboard. Every block fails soft so one bad collection never
// blanks the whole page.
export async function GET(request) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Admins only' }, { status: 403 })
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '30d'
    const days = range === '24h' ? 1 : range === '7d' ? 7 : 30
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const sinceIso = since.toISOString()

    const usersCol = await getCollection('users').catch(() => null)
    const analyticsCol = await getCollection('analytics').catch(() => null)
    const telemetryCol = await getCollection('telemetry').catch(() => null)

    // ---- Users base ----
    let users = []
    try {
      users = usersCol ? await usersCol.find({}, { projection: { email: 1, name: 1, level: 1, createdAt: 1 } }).limit(5000).toArray() : []
    } catch { users = [] }
    const emailLevel = new Map()
    const emailJoined = new Map()
    for (const u of users) {
      const e = String(u.email || '').toLowerCase()
      if (!e) continue
      emailLevel.set(e, u.level || null)
      const t = u.createdAt instanceof Date ? u.createdAt.getTime() : Date.parse(u.createdAt)
      if (!Number.isNaN(t)) emailJoined.set(e, t)
    }
    const totalUsers = emailLevel.size

    // ---- Quiz completions (analytics store) ----
    let completions = []
    try {
      completions = analyticsCol
        ? await analyticsCol.find({ event: 'quiz_completed', createdAt: { $gte: sinceIso } }).limit(5000).toArray()
        : []
    } catch { completions = [] }
    const byEmail = new Map()
    for (const c of completions) {
      const e = String(c.data?.email || '').toLowerCase()
      if (!e) continue
      const pct = c.data?.total ? Math.round((Number(c.data.score) || 0) / Number(c.data.total) * 100) : null
      if (!byEmail.has(e)) byEmail.set(e, { scores: [], courses: new Set(), count: 0 })
      const r = byEmail.get(e)
      r.count += 1
      if (pct != null) r.scores.push(pct)
      if (c.data?.course) r.courses.add(String(c.data.course))
    }

    let starts = []
    try {
      starts = analyticsCol
        ? await analyticsCol.find({ event: 'quiz_started', createdAt: { $gte: sinceIso } }).limit(5000).toArray()
        : []
    } catch { starts = [] }
    const starters = new Set(starts.map(s => String(s.data?.email || '').toLowerCase()).filter(Boolean))

    const activeQuizCount = starters.size
    const repeaters = [...byEmail.values()].filter(r => r.count > 1).length
    const multiCourse = [...byEmail.values()].filter(r => r.courses.size > 1).length
    const everActive = new Set([...byEmail.keys(), ...starters])
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000
    let churned = 0
    for (const [e, joined] of emailJoined) {
      if (joined && joined < cutoff && !everActive.has(e)) churned += 1
    }
    const engagementFunnel = {
      totalUsers,
      activeQuizCount,
      churnedUsers: churned,
      churnRate: totalUsers ? Math.round((churned / totalUsers) * 100) : 0,
      repeatQuizRate: byEmail.size ? Math.round((repeaters / byEmail.size) * 100) : 0,
      multiCourseRate: byEmail.size ? Math.round((multiCourse / byEmail.size) * 100) : 0,
    }

    // ---- Daily quiz trend ----
    const dayMap = new Map()
    for (const s of starts) {
      const d = String(s.createdAt || '').slice(0, 10)
      if (!d || d.length < 10) continue
      if (!dayMap.has(d)) dayMap.set(d, { quizzes: 0, users: new Set() })
      const r = dayMap.get(d)
      r.quizzes += 1
      const e = String(s.data?.email || '').toLowerCase()
      if (e) r.users.add(e)
    }
    const dailyQuizTrend = [...dayMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, r]) => ({ date, quizzes: r.quizzes, users: r.users.size }))

    // ---- Score distribution (10pt buckets) ----
    const buckets = Array.from({ length: 10 }, (_, i) => ({ range: `${i * 10}-${i * 10 + 9}`, count: 0 }))
    for (const [, r] of byEmail) {
      for (const s of r.scores) {
        buckets[Math.min(9, Math.floor(s / 10))].count += 1
      }
    }
    const scoreDistribution = buckets.filter(b => b.count > 0)

    // ---- Per-course difficulty (telemetry answers) ----
    let hardestCourses = []
    let easiestCourses = []
    let timeEfficiency = []
    try {
      const rows = telemetryCol
        ? await telemetryCol.aggregate([
            { $match: { event: 'quiz_answer_submitted' } },
            { $group: { _id: '$payload.course_code', n: { $sum: 1 }, correct: { $sum: { $cond: ['$payload.is_correct', 1, 0] } }, avgTime: { $avg: '$payload.time_spent_sec' } } },
            { $sort: { n: -1 } },
            { $limit: 40 },
          ]).toArray()
        : []
      const scored = rows
        .filter(r => r._id && r.n >= 5)
        .map(r => ({ course: r._id, avgPct: Math.round((r.correct / r.n) * 100), totalAttempts: r.n, avgTimeSec: Math.round(r.avgTime || 0) }))
        .sort((a, b) => a.avgPct - b.avgPct)
      hardestCourses = scored.slice(0, 5)
      easiestCourses = [...scored].reverse().slice(0, 5)
      timeEfficiency = scored
        .map(c => ({ ...c, efficiency: Math.round(c.avgPct / Math.max(1, c.avgTimeSec / 60)) }))
        .sort((a, b) => b.efficiency - a.efficiency)
        .slice(0, 8)
    } catch {}

    // ---- Level performance ----
    const byLevel = new Map()
    for (const [e, r] of byEmail) {
      const lv = emailLevel.get(e) || 'Unknown'
      if (!r.scores.length) continue
      if (!byLevel.has(lv)) byLevel.set(lv, { scores: [], quizzes: 0, users: new Set() })
      const L = byLevel.get(lv)
      L.scores.push(...r.scores)
      L.quizzes += r.count
      L.users.add(e)
    }
    const levelPerformance = [...byLevel.entries()].map(([level, L]) => ({
      level,
      avgPct: Math.round(L.scores.reduce((a, b) => a + b, 0) / Math.max(1, L.scores.length)),
      totalQuizzes: L.quizzes,
      userCount: L.users.size,
    })).sort((a, b) => b.avgPct - a.avgPct)

    // ---- People: top + struggling ----
    const ranked = [...byEmail.entries()]
      .map(([email, r]) => ({
        email,
        avgPct: r.scores.length ? Math.round(r.scores.reduce((a, b) => a + b, 0) / r.scores.length) : 0,
        totalQuizzes: r.count,
      }))
      .filter(u => u.totalQuizzes >= 2)
      .sort((a, b) => b.avgPct - a.avgPct)
    const topPerformers = ranked.slice(0, 5)
    const strugglingUsers = [...ranked].reverse().slice(0, 5)

    // ---- Signup trend ----
    const signupDays = new Map()
    for (const [, t] of emailJoined) {
      if (t < since.getTime()) continue
      const d = new Date(t).toISOString().slice(0, 10)
      signupDays.set(d, (signupDays.get(d) || 0) + 1)
    }
    const signupTrend = [...signupDays.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, users]) => ({ date, users }))

    // ---- Content coverage ----
    let totalCourses = 0
    let coursesWithContent = 0
    try {
      const coursesCol = await getCollection('courses')
      const all = coursesCol ? await coursesCol.find({}).project({ code: 1 }).limit(500).toArray() : []
      totalCourses = all.length
      const codes = new Set(all.map(c => String(c.code || '').toUpperCase()))
      const norm = (s) => String(s || '').toUpperCase().replace(/\s+/g, '')
      const covered = new Set()
      const [vDocs, rDocs, mDocs] = await Promise.all([
        getCollection('videos').then(c => c.distinct('courseCode')).catch(() => []),
        getCollection('readings').then(c => c.distinct('courseCode')).catch(() => []),
        getCollection('user_materials').then(c => c.distinct('courseCode')).catch(() => []),
      ])
      for (const list of [vDocs, rDocs, mDocs]) {
        for (const cc of list || []) {
          const n = norm(cc)
          for (const code of codes) {
            if (norm(code) === n || norm(code).replace(/\s+/g, '') === n) covered.add(code)
          }
        }
      }
      coursesWithContent = covered.size
    } catch {}
    const contentCoverage = {
      coveragePct: totalCourses ? Math.round((coursesWithContent / totalCourses) * 100) : 0,
      coursesWithContent,
      totalCourses,
    }

    return NextResponse.json({
      range,
      engagementFunnel,
      contentCoverage,
      dailyQuizTrend,
      scoreDistribution,
      hardestCourses,
      easiestCourses,
      levelPerformance,
      timeEfficiency,
      topPerformers,
      strugglingUsers,
      signupTrend,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
