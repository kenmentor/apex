import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const school = searchParams.get('school')
    const statsOnly = searchParams.get('stats') === 'true'

    const scoresCol = await getCollection('scores')

    const match = {}
    if (email) match.email = email.toLowerCase()
    if (school) match.school = school

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
    ]

    const aggregated = await scoresCol.aggregate(pipeline).toArray()

    const ranked = aggregated.map((s, i) => ({
      _id: s._id,
      name: s.name,
      school: s.school || '',
      email: s.email || '',
      totalScore: s.totalScore,
      totalQuestions: s.totalQuestions,
      avgPct: s.avgPct,
      totalTimeSpent: s.totalTimeSpent || 0,
      quizCount: s.quizCount,
      courses: s.courses || [],
      lastQuiz: s.lastQuiz,
      rank: i + 1,
    }))

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
