import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const school = searchParams.get('school')
    const statsOnly = searchParams.get('stats') === 'true'
    // Bound aggregation cost: top-N board (default 100). statsOnly still
    // uses the capped set; raise limit explicitly if full stats are needed.
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

    const [scoresCol, qCol, rCol, mCol, vCol] = await Promise.all([
      getCollection('scores'),
      getCollection('questions').catch(() => null),
      getCollection('readings').catch(() => null),
      getCollection('user_materials').catch(() => null),
      getCollection('videos').catch(() => null),
    ])

    const match = {}
    if (email) match.email = email.toLowerCase()
    if (school) match.school = school

    // Approved contribution counts per email across all four stores.
    // Videos have no status field — the $nin match includes them as live.
    const contribMatch = { status: { $nin: ['pending', 'rejected', 'revoked'] } }
    const contribCounts = new Map()
    const addContrib = (e, n) => { const k = String(e || '').toLowerCase(); if (k) contribCounts.set(k, (contribCounts.get(k) || 0) + n) }
    const contribAggs = [
      qCol ? qCol.aggregate([{ $match: contribMatch }, { $group: { _id: '$authorEmail', n: { $sum: 1 } } }]).toArray().catch(() => []) : Promise.resolve([]),
      rCol ? rCol.aggregate([{ $match: contribMatch }, { $group: { _id: '$authorEmail', n: { $sum: 1 } } }]).toArray().catch(() => []) : Promise.resolve([]),
      mCol ? mCol.aggregate([{ $match: contribMatch }, { $group: { _id: '$ownerEmail', n: { $sum: 1 } } }]).toArray().catch(() => []) : Promise.resolve([]),
      vCol ? vCol.aggregate([{ $match: contribMatch }, { $group: { _id: '$ownerEmail', n: { $sum: 1 } } }]).toArray().catch(() => []) : Promise.resolve([]),
    ]
    for (const rows of await Promise.all(contribAggs)) {
      for (const r of rows || []) addContrib(r._id, r.n)
    }
    const maxContrib = Math.max(0, ...[...contribCounts.values()])

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: { email: '$email', name: '$name' },
          name: { $first: '$name' },
          school: { $first: '$school' },
          email: { $first: '$email' },
          totalScore: { $sum: '$score' },
          totalQuestions: { $sum: '$total' },
          totalTimeSpent: { $sum: '$timeSpent' },
          quizCount: { $sum: 1 },
          lastQuiz: { $last: '$createdAt' },
          courses: { $addToSet: '$course' },
        },
      },
      { $addFields: { avgPct: { $cond: [{ $gt: ['$totalQuestions', 0] }, { $round: [{ $multiply: [{ $divide: ['$totalScore', '$totalQuestions'] }, 100] }] }, 0] } } },
      { $sort: { totalScore: -1, totalTimeSpent: 1 } },
      { $limit: limit },
    ]

    const aggregated = await scoresCol.aggregate(pipeline).toArray()

    // Blend: 60% academics (quiz average) + 40% contributions (approved
    // uploads, normalized against the top contributor). Sort by blend.
    const withScores = aggregated.map((s) => {
      const em = String(s.email || '').toLowerCase()
      const contribCount = contribCounts.get(em) || 0
      const contribScore = maxContrib > 0 ? Math.round((contribCount / maxContrib) * 100) : 0
      const academicScore = s.avgPct || 0
      return {
        ...s,
        contribCount,
        contribScore,
        academicScore,
        finalScore: Math.round(academicScore * 0.6 + contribScore * 0.4),
      }
    })
    withScores.sort((a, b) => b.finalScore - a.finalScore || b.totalScore - a.totalScore || (a.totalTimeSpent || 0) - (b.totalTimeSpent || 0))

    const ranked = withScores.map((s, i) => ({
      _id: s._id,
      name: s.name,
      school: s.school || '',
      email: s.email || '',
      totalScore: s.totalScore,
      totalQuestions: s.totalQuestions,
      avgPct: s.avgPct,
      academicScore: s.academicScore,
      contribCount: s.contribCount,
      contribScore: s.contribScore,
      finalScore: s.finalScore,
      totalTimeSpent: s.totalTimeSpent || 0,
      quizCount: s.quizCount,
      courses: s.courses || [],
      lastQuiz: s.lastQuiz,
      rank: i + 1,
    }))

    const emails = ranked.map(e => e.email).filter(Boolean)
    if (emails.length > 0) {
      const usersCol = await getCollection('users')
      const users = await usersCol.find({ email: { $in: emails } }, { projection: { email: 1, avatar: 1, avatarConfig: 1, role: 1, admin: 1 } }).toArray()
      const userMap = Object.fromEntries(users.map(u => [u.email.toLowerCase(), u]))
      for (const entry of ranked) {
        const u = userMap[entry.email.toLowerCase()] || {}
        entry.avatar = u.avatar || ''
        entry.avatarConfig = u.avatarConfig || null
        entry.role = u.admin || u.role === 'admin' ? 'admin' : (u.role || null)
      }
    }

    if (statsOnly) {
      const total = ranked.length
      const avgPct = total > 0 ? Math.round(ranked.reduce((sum, s) => sum + s.avgPct, 0) / total) : 0
      const maxPct = total > 0 ? Math.max(...ranked.map(s => s.avgPct)) : 0
      const topScore = total > 0 ? Math.max(...ranked.map(s => s.totalScore)) : 0
      const schools = [...new Set(aggregated.map(s => s.school).filter(Boolean))].sort()

      return NextResponse.json({
        totalPlayers: total,
        totalQuizzes: aggregated.reduce((sum, s) => sum + s.quizCount, 0),
        avgPercentage: avgPct,
        highestPercentage: maxPct,
        topScore,
        schools,
      })
    }

    return NextResponse.json(ranked)
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
