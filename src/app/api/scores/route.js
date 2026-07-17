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
    const maxPossible = qLimit * tpQ * 3
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

    return NextResponse.json({ success: true, id: result.insertedId.toString(), percentage }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save score: ' + error.message }, { status: 500 })
  }
}
