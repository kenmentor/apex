import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

export async function GET() {
  try {
    const scoresCol = await getCollection('scores')

    // Peak hours (scores grouped by hour of day)
    const peakHours = await scoresCol.aggregate([
      { $match: { hourOfDay: { $gte: 0, $lte: 23 } } },
      { $group: { _id: '$hourOfDay', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 24 },
    ]).toArray()

    const hours = Array.from({ length: 24 }, (_, h) => {
      const found = peakHours.find(p => p._id === h)
      return { hour: h, count: found?.count || 0 }
    })

    // Department rankings
    const deptAgg = await scoresCol.aggregate([
      { $match: { department: { $ne: null, $ne: '' } } },
      {
        $group: {
          _id: '$department',
          totalScore: { $sum: '$score' },
          totalQuestions: { $sum: '$total' },
          quizCount: { $sum: 1 },
          users: { $addToSet: '$email' },
        },
      },
      {
        $addFields: {
          avgPct: {
            $round: [{
              $multiply: [{ $divide: ['$totalScore', '$totalQuestions'] }, 100]
            }, 0]
          },
          userCount: { $size: '$users' },
        },
      },
      { $sort: { avgPct: -1 } },
    ]).toArray()

    // Top user per department
    const topUsers = await scoresCol.aggregate([
      { $match: { department: { $ne: null, $ne: '' } } },
      {
        $group: {
          _id: { dept: '$department', email: '$email', name: '$name' },
          name: { $first: '$name' },
          email: { $first: '$email' },
          department: { $first: '$department' },
          totalScore: { $sum: '$score' },
          totalQuestions: { $sum: '$total' },
          quizCount: { $sum: 1 },
        },
      },
      {
        $addFields: {
          avgPct: {
            $round: [{
              $multiply: [{ $divide: ['$totalScore', '$totalQuestions'] }, 100]
            }, 0]
          },
        },
      },
      { $sort: { totalScore: -1 } },
      {
        $group: {
          _id: '$department',
          topUser: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$topUser' } },
      { $sort: { totalScore: -1 } },
    ]).toArray()

    return NextResponse.json({
      peakHours: hours,
      departments: deptAgg.map(d => ({
        name: d._id,
        avgPct: d.avgPct,
        totalScore: d.totalScore,
        quizCount: d.quizCount,
        userCount: d.userCount,
      })),
      topUsers: topUsers.map(u => ({
        name: u.name,
        email: u.email,
        department: u.department,
        totalScore: u.totalScore,
        avgPct: u.avgPct,
        quizCount: u.quizCount,
      })),
    })
  } catch (error) {
    console.error('Department analytics error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
