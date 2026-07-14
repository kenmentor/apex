import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'

export async function GET(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseCode = searchParams.get('courseCode')
    const limit = parseInt(searchParams.get('limit') || '50')

    const submissionsCol = await getCollection('theory_submissions')
    const filter = { userEmail: user.email }
    if (courseCode) {
      filter.courseCode = (courseCode || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/^([A-Z]+)(\d+)$/, '$1 $2')
    }

    const docs = await submissionsCol
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 100))
      .toArray()

    const safe = docs.map(d => ({
      _id: d._id.toString(),
      courseCode: d.courseCode,
      referenceId: d.referenceId,
      answerType: d.answerType,
      keywordScore: d.keywordScore,
      llmScore: d.llmScore,
      totalPoints: d.totalPoints,
      percentage: d.percentage,
      evaluation: d.evaluation,
      createdAt: d.createdAt,
    }))

    const totalPoints = safe.reduce((sum, s) => sum + (s.totalPoints || 0), 0)
    const avgPercentage = safe.length > 0
      ? Math.round(safe.reduce((sum, s) => sum + (s.percentage || 0), 0) / safe.length)
      : 0

    return NextResponse.json({
      submissions: safe,
      stats: {
        totalAttempts: safe.length,
        totalPoints: Math.round(totalPoints * 100) / 100,
        avgPercentage,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
