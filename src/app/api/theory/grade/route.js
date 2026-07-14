import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { gradeTheoryExam } from '@/lib/theory-grading'

function normalizeCourse(code) {
  return (code || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/^([A-Z]+)(\d+)$/, '$1 $2')
}

export async function POST(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { courseCode, answers } = body

    if (!courseCode || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: 'courseCode and answers array required' }, { status: 400 })
    }

    const refsCol = await getCollection('theory_references')
    const refs = await refsCol
      .find({ courseCode: normalizeCourse(courseCode) })
      .toArray()

    const refMap = {}
    for (const r of refs) refMap[r.id] = r

    const references = []
    const answerData = []
    for (const ans of answers) {
      const ref = refMap[ans.referenceId]
      if (ref) {
        references.push(ref)
        answerData.push({
          referenceId: ans.referenceId,
          answerText: ans.text || '',
          answerType: ans.answerType || 'text',
        })
      }
    }

    if (references.length === 0) {
      return NextResponse.json({ error: 'No valid references found' }, { status: 400 })
    }

    const grades = await gradeTheoryExam(answerData, references)

    const submissionsCol = await getCollection('theory_submissions')
    const scoresCol = await getCollection('scores')

    const totalPoints = grades.reduce((s, g) => s + g.points, 0)
    const maxPoints = grades.length * 6
    const overallPct = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0

    const submissionDocs = grades.map((g, i) => ({
      userEmail: user.email,
      courseCode: normalizeCourse(courseCode),
      referenceId: answerData[i].referenceId,
      answerType: answerData[i].answerType,
      answerText: answerData[i].answerText,
      points: g.points,
      remark: g.remark,
      matchedConcepts: g.matchedConcepts,
      missingConcepts: g.missingConcepts,
      suggestion: g.suggestion,
      createdAt: new Date().toISOString(),
    }))

    await submissionsCol.insertMany(submissionDocs)

    await scoresCol.insertOne({
      name: user.name || user.email,
      school: user.school || 'Unknown',
      email: user.email,
      course: normalizeCourse(courseCode),
      score: totalPoints,
      total: maxPoints,
      percentage: overallPct,
      timeSpent: 0,
      questionLimit: grades.length,
      timePerQuestion: 600,
      type: 'theory',
      createdAt: new Date().toISOString(),
    })

    try {
      const notifCol = await getCollection('notifications')
      const emoji = overallPct >= 80 ? '🏆' : overallPct >= 60 ? '💪' : overallPct >= 40 ? '👍' : '📚'
      await notifCol.insertOne({
        userEmail: user.email,
        type: 'theory_complete',
        title: `${emoji} Examination Complete`,
        message: `You scored ${totalPoints}/${maxPoints} (${overallPct}%) on ${normalizeCourse(courseCode)} theory examination`,
        link: `/courses/${normalizeCourse(courseCode).toLowerCase().replace(/\s+/g, '')}/theory/results`,
        read: false,
        createdAt: new Date().toISOString(),
      })
    } catch {}

    return NextResponse.json({
      success: true,
      results: grades.map((g, i) => ({
        referenceId: answerData[i].referenceId,
        points: g.points,
        remark: g.remark,
        matchedConcepts: g.matchedConcepts,
        missingConcepts: g.missingConcepts,
        suggestion: g.suggestion,
      })),
      totalPoints,
      maxPoints,
      percentage: overallPct,
    }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Examination grading failed: ' + error.message }, { status: 500 })
  }
}
