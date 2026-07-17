import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

function getDept(code) {
  if (!code) return null
  return code.trim().split(/\s+/)[0]
}

function scoreRecency(dateStr) {
  if (!dateStr) return 0
  const diff = Date.now() - new Date(dateStr).getTime()
  const hrs = diff / 3600000
  if (hrs < 1) return 100
  if (hrs < 24) return 80
  if (hrs < 72) return 60
  if (hrs < 168) return 40
  if (hrs < 720) return 20
  return 5
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

    const scoresCol = await getCollection('scores')
    const spacesCol = await getCollection('spaces')
    const coursesCol = await getCollection('courses')
    const postsCol = await getCollection('space_posts')
    const questionsCol = await getCollection('questions')

    const feedItems = []

    // --- 1. Build user profile from quiz history ---
    const scores = await scoresCol
      .find({ email: email.toLowerCase().trim() })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()

    const deptFrequency = {}
    const courseFrequency = {}
    const seenCourses = new Set()
    const recentCourseScores = []

    for (const s of scores) {
      const dept = getDept(s.course)
      if (dept) deptFrequency[dept] = (deptFrequency[dept] || 0) + 1
      courseFrequency[s.course] = (courseFrequency[s.course] || 0) + 1
      if (!seenCourses.has(s.course)) {
        seenCourses.add(s.course)
        recentCourseScores.push(s)
      }
    }

    const topDepts = Object.entries(deptFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([code]) => code)

    // --- 2. Continue Studying (courses the user has taken quizzes on) ---
    for (const s of recentCourseScores.slice(0, 5)) {
      const recency = scoreRecency(s.createdAt)
      const frequency = courseFrequency[s.course] || 1
      const priority = Math.round(recency * 0.6 + Math.min(frequency * 10, 40))
      feedItems.push({
        type: 'continue',
        priority,
        data: {
          courseCode: s.course,
          percentage: s.percentage,
          score: s.score,
          total: s.total,
          createdAt: s.createdAt,
        },
      })
    }

    // --- 3. Recommended Courses (new courses from departments user engages with) ---
    const allCourses = await coursesCol.find({}).toArray()
    const recommended = allCourses.filter(c => !seenCourses.has(c.code) && topDepts.includes(getDept(c.code)))
    for (const c of recommended.slice(0, 4)) {
      feedItems.push({
        type: 'recommended',
        priority: 50,
        data: {
          courseCode: c.code,
          courseTitle: c.title,
          color: c.color,
        },
      })
    }

    // --- 4. Space Posts (from spaces the user is a member of) ---
    const userSpaces = await spacesCol.find({ members: email.toLowerCase().trim() }).toArray()
    const spaceMap = {}
    const spaceIds = []
    for (const s of userSpaces) {
      const id = s._id.toString()
      spaceMap[id] = { id, name: s.name, color: s.color }
      spaceIds.push(id)
    }

    if (spaceIds.length > 0) {
      const posts = await postsCol
        .find({ spaceId: { $in: spaceIds } })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray()

      for (const p of posts) {
        const recency = scoreRecency(p.createdAt)
        const hasEngagement = (p.likeCount || 0) + (p.commentCount || 0) > 0
        const priority = Math.round(recency + (hasEngagement ? 15 : 0))
        feedItems.push({
          type: 'space_post',
          priority,
          data: {
            postId: p._id.toString(),
            space: spaceMap[p.spaceId] || { id: p.spaceId },
            title: p.title,
            content: p.content,
            authorName: p.authorName,
            authorAvatar: p.authorAvatar,
            likeCount: p.likeCount || 0,
            commentCount: p.commentCount || 0,
            createdAt: p.createdAt,
          },
        })
      }
    }

    // --- 5. Quick Challenge (random question from a course they've taken) ---
    if (recentCourseScores.length > 0) {
      const codes = recentCourseScores.map(s => s.course)
      const totalQ = await questionsCol.countDocuments({ courseCode: { $in: codes } })
      if (totalQ > 0) {
        const skip = Math.floor(Math.random() * totalQ)
        const qDocs = await questionsCol.find({ courseCode: { $in: codes } }).skip(skip).limit(1).toArray()
        if (qDocs.length > 0) {
          const d = qDocs[0]
          feedItems.push({
            type: 'challenge',
            priority: 70,
            data: {
              id: d.id,
              question: d.question,
              options: d.options,
              correctAnswer: d.correctAnswer,
              explanation: d.explanation,
              courseCode: d.courseCode,
            },
          })
        }
      }
    }

    // --- 6. Milestones & Achievements ---
    const quizCount = scores.length
    const bestPct = scores.length > 0 ? Math.max(...scores.map(s => s.percentage)) : 0
    if (quizCount >= 10 && quizCount < 15) {
      feedItems.push({
        type: 'milestone',
        priority: 85,
        data: {
          icon: '🎯',
          title: '10 Quizzes Done!',
          message: 'You\'ve completed 10 quizzes. Keep going!',
        },
      })
    }
    if (bestPct >= 90 && !recentCourseScores.some(s => s.percentage >= 90)) {
      // only show if not already obvious from continue items
    } else if (bestPct >= 90) {
      feedItems.push({
        type: 'milestone',
        priority: 80,
        data: {
          icon: '🏆',
          title: 'Best Score: ' + bestPct + '%',
          message: 'Your highest score yet! Can you beat it?',
        },
      })
    }

    // --- Sort by priority descending ---
    feedItems.sort((a, b) => b.priority - a.priority)

    return NextResponse.json({
      items: feedItems,
      profile: {
        topDepts,
        quizCount,
        bestPct,
        courseCount: seenCourses.size,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
