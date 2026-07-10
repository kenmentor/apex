import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'

function normalizeCourse(code) {
  return (code || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/^([A-Z]+)(\d+)$/, '$1 $2')
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
    return NextResponse.json({ success: true, id: result.insertedId.toString(), percentage }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save score: ' + error.message }, { status: 500 })
  }
}
