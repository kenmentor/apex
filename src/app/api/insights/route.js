import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '30d'

    const now = new Date()
    const daysBack = range === '24h' ? 1 : range === '7d' ? 7 : 30
    const since = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

    const scoresCol = await getCollection('scores')
    const usersCol = await getCollection('users')
    const coursesCol = await getCollection('courses')
    const questionsCol = await getCollection('questions')

    const match = { createdAt: { $gte: since } }

    // ── 1. Course Performance Ranking ──
    const coursePerf = await scoresCol.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$course',
          avgPct: { $avg: '$percentage' },
          totalAttempts: { $sum: 1 },
          uniqueUsers: { $addToSet: '$email' },
          avgTime: { $avg: '$timeSpent' },
          bestPct: { $max: '$percentage' },
          worstPct: { $min: '$percentage' },
        },
      },
      {
        $project: {
          course: '$_id',
          avgPct: { $round: ['$avgPct', 1] },
          totalAttempts: 1,
          userCount: { $size: '$uniqueUsers' },
          avgTimeSec: { $round: ['$avgTime', 0] },
          bestPct: 1,
          worstPct: 1,
          spread: { $subtract: ['$bestPct', '$worstPct'] },
        },
      },
      { $sort: { totalAttempts: -1 } },
      { $limit: 30 },
    ]).toArray()

    // ── 2. Score Distribution Histogram ──
    const scoreDist = await scoresCol.aggregate([
      { $match: match },
      {
        $bucket: {
          groupBy: '$percentage',
          boundaries: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
          default: '100',
          output: {
            count: { $sum: 1 },
            avgTime: { $avg: '$timeSpent' },
          },
        },
      },
      {
        $project: {
          range: {
            $concat: [
              { $toString: '$_id' }, '% - ',
              {
                $cond: [
                  { $eq: ['$_id', 100] },
                  '100%',
                  { $concat: [{ $toString: { $add: ['$_id', 9] } }, '%'] },
                ],
              },
            ],
          },
          count: 1,
          avgTimeSec: { $round: ['$avgTime', 0] },
        },
      },
    ]).toArray()

    // ── 3. User Engagement Funnel ──
    const totalUsers = await usersCol.countDocuments()
    const usersWithQuiz = await scoresCol.aggregate([
      { $group: { _id: '$email' } },
      { $count: 'total' },
    ]).toArray()
    const activeQuizCount = usersWithQuiz[0]?.total || 0

    const repeatUsers = await scoresCol.aggregate([
      { $group: { _id: '$email', attemptCount: { $sum: 1 } } },
      { $match: { attemptCount: { $gt: 1 } } },
      { $count: 'total' },
    ]).toArray()
    const repeatCount = repeatUsers[0]?.total || 0

    const multiCourseUsers = await scoresCol.aggregate([
      { $group: { _id: '$email', courses: { $addToSet: '$course' } } },
      { $project: { courseCount: { $size: '$courses' } } },
      { $match: { courseCount: { $gt: 1 } } },
      { $count: 'total' },
    ]).toArray()
    const multiCourseCount = multiCourseUsers[0]?.total || 0

    const funnel = {
      totalUsers,
      activeQuizCount,
      churnedUsers: totalUsers - activeQuizCount,
      churnRate: totalUsers > 0 ? Math.round(((totalUsers - activeQuizCount) / totalUsers) * 100) : 0,
      repeatQuizRate: activeQuizCount > 0 ? Math.round((repeatCount / activeQuizCount) * 100) : 0,
      multiCourseRate: activeQuizCount > 0 ? Math.round((multiCourseCount / activeQuizCount) * 100) : 0,
    }

    // ── 4. Level Performance Comparison ──
    const levelPerf = await scoresCol.aggregate([
      { $match: { ...match, level: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$level',
          avgPct: { $avg: '$percentage' },
          totalQuizzes: { $sum: 1 },
          userCount: { $addToSet: '$email' },
        },
      },
      {
        $project: {
          level: '$_id',
          avgPct: { $round: ['$avgPct', 1] },
          totalQuizzes: 1,
          userCount: { $size: '$userCount' },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray()

    // ── 5. Signup Growth Trend ──
    const signupTrend = await usersCol.aggregate([
      {
        $match: {
          createdAt: { $exists: true, $ne: null },
        },
      },
      {
        $addFields: {
          date: { $substr: ['$createdAt', 0, 10] },
        },
      },
      { $group: { _id: '$date', signups: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 60 },
    ]).toArray()

    // ── 6. Hardest & Easiest Courses ──
    const hardestCourses = coursePerf.filter(c => c.totalAttempts >= 3).sort((a, b) => a.avgPct - b.avgPct).slice(0, 10)
    const easiestCourses = coursePerf.filter(c => c.totalAttempts >= 3).sort((a, b) => b.avgPct - a.avgPct).slice(0, 10)

    // ── 7. Quiz Time Efficiency ──
    const timeEfficiency = await scoresCol.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$course',
          avgTime: { $avg: '$timeSpent' },
          avgScore: { $avg: '$percentage' },
          attempts: { $sum: 1 },
        },
      },
      {
        $project: {
          course: '$_id',
          avgTimeSec: { $round: ['$avgTime', 0] },
          avgScore: { $round: ['$avgScore', 1] },
          attempts: 1,
          efficiency: {
            $cond: [
              { $gt: ['$avgTime', 0] },
              { $round: [{ $divide: ['$avgScore', { $divide: ['$avgTime', 60] }] }, 2] },
              0,
            ],
          },
        },
      },
      { $match: { attempts: { $gte: 3 } } },
      { $sort: { efficiency: -1 } },
      { $limit: 15 },
    ]).toArray()

    // ── 8. Daily Active Quiz Takers (trend) ──
    const dailyQuizTakers = await scoresCol.aggregate([
      { $match: match },
      {
        $addFields: {
          day: { $substr: ['$createdAt', 0, 10] },
        },
      },
      {
        $group: {
          _id: '$day',
          uniqueUsers: { $addToSet: '$email' },
          totalQuizzes: { $sum: 1 },
          avgScore: { $avg: '$percentage' },
        },
      },
      {
        $project: {
          date: '$_id',
          users: { $size: '$uniqueUsers' },
          quizzes: '$totalQuizzes',
          avgScore: { $round: ['$avgScore', 1] },
        },
      },
      { $sort: { date: 1 } },
      { $limit: 60 },
    ]).toArray()

    // ── 9. Content Coverage (courses with content vs without) ──
    const courseCount = await coursesCol.countDocuments()
    const coursesWithQuizzes = await questionsCol.aggregate([
      { $group: { _id: '$courseCode' } },
      { $count: 'total' },
    ]).toArray()
    const contentCoverage = {
      totalCourses: courseCount,
      coursesWithContent: coursesWithQuizzes[0]?.total || 0,
      coveragePct: courseCount > 0 ? Math.round(((coursesWithQuizzes[0]?.total || 0) / courseCount) * 100) : 0,
    }

    // ── 10. Top Performers vs Struggling Users ──
    const userPerformance = await scoresCol.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$email',
          name: { $first: '$name' },
          avgPct: { $avg: '$percentage' },
          totalQuizzes: { $sum: 1 },
          totalTime: { $sum: '$timeSpent' },
        },
      },
      { $match: { totalQuizzes: { $gte: 2 } } },
      { $sort: { avgPct: -1 } },
      { $limit: 10 },
    ]).toArray()

    const strugglingUsers = [...userPerformance].sort((a, b) => a.avgPct - b.avgPct).slice(0, 10)
    const topPerformers = userPerformance.slice(0, 10)

    return NextResponse.json({
      coursePerformance: coursePerf,
      scoreDistribution: scoreDist,
      engagementFunnel: funnel,
      levelPerformance: levelPerf,
      signupTrend: signupTrend.map(s => ({ date: s._id, signups: s.signups })),
      hardestCourses,
      easiestCourses,
      timeEfficiency,
      dailyQuizTrend: dailyQuizTakers,
      contentCoverage,
      topPerformers: topPerformers.map(u => ({
        name: u.name,
        email: u._id,
        avgPct: Math.round(u.avgPct),
        totalQuizzes: u.totalQuizzes,
        totalTimeMin: Math.round(u.totalTime / 60),
      })),
      strugglingUsers: strugglingUsers.map(u => ({
        name: u.name,
        email: u._id,
        avgPct: Math.round(u.avgPct),
        totalQuizzes: u.totalQuizzes,
        totalTimeMin: Math.round(u.totalTime / 60),
      })),
    })
  } catch (error) {
    console.error('Insights GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
