import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { sendToUser } from '@/lib/push'

function normalizeCourse(code) {
  return (code || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/^([A-Z]+)(\d+)$/, '$1 $2')
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    if (!email) {
      return NextResponse.json({ error: 'email required' }, { status: 400 })
    }

    const scoresCol = await getCollection('scores')
    const docs = await scoresCol
      .find({ email: email.toLowerCase().trim() })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()

    return NextResponse.json(docs.map(d => ({ ...d, _id: d._id.toString() })))
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, course: courseCode, score, total, timeSpent, questionLimit, timePerQuestion } = body

    if (!courseCode || score === undefined || !total) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const userFromToken = await getUserFromToken(request).catch(() => null)
    let userName = body.name
    let userSchool = body.school

    if (userFromToken) {
      userName = userName || userFromToken.name || userFromToken.email
      userSchool = userSchool || userFromToken.school || 'Unknown'
    } else if (email) {
      const users = await getCollection('users')
      const existing = await users.findOne({ email: email.toLowerCase().trim() })
      if (existing) {
        userName = userName || existing.name || existing.email
        userSchool = userSchool || existing.school || 'Unknown'
      }
    }

    if (!userName) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // ─── Server-side time validation ───
    const qLimit = questionLimit || total
    const tpQ = timePerQuestion || 30
    const maxPossible = qLimit * tpQ * 6
    if (timeSpent > maxPossible) {
      return NextResponse.json({ error: 'Invalid time' }, { status: 400 })
    }

    const scoresCol = await getCollection('scores')
    const percentage = Math.round((score / total) * 100)

    const doc = {
      name: userName.trim(),
      school: userSchool?.trim() || 'Unknown',
      email: email?.toLowerCase().trim() || null,
      course: normalizeCourse(courseCode),
      score,
      total,
      percentage,
      timeSpent: timeSpent || 0,
      questionLimit: qLimit,
      timePerQuestion: tpQ,
      createdAt: new Date().toISOString(),
    }

    const result = await scoresCol.insertOne(doc)

    // ─── Streak & points ───
    let streakInfo = { streak: 0, bestStreak: 0, points: 0, pointsEarned: 0, bonuses: [] }
    if (email) {
      try {
        const users = await getCollection('users')
        const userDoc = await users.findOne({ email: email.toLowerCase().trim() })
        if (userDoc) {
          const today = new Date().toISOString().slice(0, 10)
          const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
          const lastQuizDate = userDoc.lastQuizDate || ''
          const currentStreak = userDoc.streak || 0

          let streak
          if (lastQuizDate === today) {
            streak = currentStreak
          } else if (lastQuizDate === yesterday) {
            streak = currentStreak + 1
          } else {
            streak = 1
          }

          let pointsEarned = 0
          const bonuses = []

          if (streak >= 2 && !userDoc.streakBonusClaimed) {
            pointsEarned += 20
            bonuses.push({ type: 'first_streak', streak: 2, points: 20, message: 'First 2-day streak bonus!' })
          }
          if (streak >= 10 && streak % 10 === 0 && streak > (userDoc.lastMilestoneAwarded || 0)) {
            pointsEarned += 10
            bonuses.push({ type: 'streak_milestone', streak, points: 10, message: `${streak}-day streak!` })
          }

          const points = (userDoc.points || 0) + pointsEarned
          const bestStreak = Math.max(userDoc.bestStreak || 0, streak)

          await users.updateOne(
            { _id: userDoc._id },
            {
              $set: {
                streak,
                bestStreak,
                points,
                lastQuizDate: today,
                ...(streak >= 2 ? { streakBonusClaimed: true } : {}),
                ...(streak >= 10 && streak % 10 === 0 ? { lastMilestoneAwarded: streak } : {}),
              },
            }
          )

          streakInfo = { streak, bestStreak, points, pointsEarned, bonuses }
        }
      } catch (e) {
        console.error('Streak update error:', e)
      }
    }

    if (email) {
      try {
        const notifCol = await getCollection('notifications')
        const emoji = percentage >= 90 ? '🏆' : percentage >= 70 ? '💪' : percentage >= 50 ? '👍' : '📚'
        await notifCol.insertOne({
          userEmail: email.toLowerCase().trim(),
          type: 'quiz_complete',
          title: `${emoji} Quiz Complete!`,
          message: `You scored ${score}/${total} (${percentage}%) on ${normalizeCourse(courseCode)}`,
          link: `/courses/${normalizeCourse(courseCode).toLowerCase().replace(/\s+/g, '')}`,
          read: false,
          createdAt: new Date().toISOString(),
        })

        const scoresAll = await scoresCol.find({ email: email.toLowerCase().trim() }).sort({ percentage: -1 }).toArray()
        if (scoresAll.length > 0 && scoresAll[0]._id.toString() === result.insertedId.toString() && percentage >= 80) {
          await notifCol.insertOne({
            userEmail: email.toLowerCase().trim(),
            type: 'achievement',
            title: '🎯 New Best Score!',
            message: `Your ${percentage}% on ${normalizeCourse(courseCode)} is your best yet!`,
            link: `/courses/${normalizeCourse(courseCode).toLowerCase().replace(/\s+/g, '')}`,
            read: false,
            createdAt: new Date().toISOString(),
          })
        }

        // Push notification: notify previous high scorers on same course they've been beaten
        if (email && percentage >= 50) {
          try {
            const beatenBy = userName.trim()
            const courseNormal = normalizeCourse(courseCode)
            const topScores = await scoresCol
              .find({ course: courseNormal, email: { $ne: email.toLowerCase().trim() } })
              .sort({ percentage: -1 })
              .toArray()

            const alreadyNotified = new Set()
            for (const s of topScores) {
              if (s.percentage < percentage && s.email && !alreadyNotified.has(s.email)) {
                alreadyNotified.add(s.email)
                await notifCol.insertOne({
                  userEmail: s.email,
                  type: 'score_beaten',
                  title: '📊 Score Beaten!',
                  message: `${beatenBy} beat your ${s.percentage}% on ${courseNormal} with ${percentage}%!`,
                  link: `/courses/${courseNormal.toLowerCase().replace(/\s+/g, '')}`,
                  read: false,
                  createdAt: new Date().toISOString(),
                })
                sendToUser(s.email, '📊 Score Beaten!',
                  `${beatenBy} beat your ${s.percentage}% on ${courseNormal} with ${percentage}%!`,
                  `/courses/${courseNormal.toLowerCase().replace(/\s+/g, '')}`,
                  getCollection
                )
              }
            }
          } catch {}
        }
      } catch {}
    }

    return NextResponse.json({ success: true, id: result.insertedId.toString(), percentage, ...streakInfo }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save score: ' + error.message }, { status: 500 })
  }
}
