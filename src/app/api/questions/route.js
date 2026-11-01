import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

function normalizeCourse(code) {
  return (code || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/^([A-Z]+)(\d+)$/, '$1 $2')
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const courseCode = searchParams.get('course')
    const limit = searchParams.get('limit')

    const col = await getCollection('questions')

    if (limit === '0') {
      const filter = courseCode ? { courseCode: normalizeCourse(courseCode) } : {}
      const total = await col.countDocuments(filter)
      return NextResponse.json({ totalDocs: total })
    }

    // Pending / rejected / revoked contributions stay out until an admin approves them.
    const filter = courseCode ? { courseCode: normalizeCourse(courseCode) } : {}
    filter.status = { $nin: ['pending', 'rejected', 'revoked'] }
    const docs = await col.find(filter).toArray()

    const sections = {}
    for (const d of docs) {
      if (!sections[d.section]) sections[d.section] = []
      sections[d.section].push({
        id: d.id,
        question: d.question,
        options: d.options,
        correct_answer: d.correctAnswer,
        explanation: d.explanation || '',
        ...(d.questionType ? { questionType: d.questionType } : {}),
        ...(d.blankAnswers ? { blankAnswers: d.blankAnswers } : {}),
        ...(d.pairs ? { pairs: d.pairs } : {}),
        ...(d.imageUrl ? { imageUrl: d.imageUrl } : {}),
        ...(d.audioUrl ? { audioUrl: d.audioUrl } : {}),
        ...(d.followupKind ? { followupKind: d.followupKind } : {}),
        ...(d.subQuestions ? { subQuestions: d.subQuestions } : {}),
        ...(d.vignette ? { vignette: d.vignette } : {}),
        ...(d.station ? { station: d.station } : {}),
        ...(d.checklist ? { checklist: d.checklist } : {}),
        ...(d.stages ? { stages: d.stages } : {}),
        ...(d.modelAnswer ? { modelAnswer: d.modelAnswer } : {}),
        ...(d.followups ? { followups: d.followups } : {}),
        ...(d.rubric ? { rubric: d.rubric } : {}),
        ...(d.marks ? { marks: d.marks } : {}),
        ...(d.year ? { year: d.year } : {}),
        ...(d.code ? { code: d.code } : {}),
      })
    }

    const sectionsArr = Object.entries(sections).map(([title, questions]) => ({
      section_title: title,
      questions,
    }))

    const courseInfo = docs.length > 0 ? { course_code: docs[0].courseCode, course_title: '' } : {}
    const courseCol = await getCollection('courses')
    const course = await courseCol.findOne({ code: normalizeCourse(courseCode || '') })
    if (course) courseInfo.course_title = course.title

    return NextResponse.json({
      ...courseInfo,
      sections: sectionsArr,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
