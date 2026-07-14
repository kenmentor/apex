import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { gradeTheoryAnswer } from '@/lib/theory-grading'
import cloudinary from 'cloudinary'

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

function normalizeCourse(code) {
  return (code || '').trim().toUpperCase().replace(/\s+/g, ' ').replace(/^([A-Z]+)(\d+)$/, '$1 $2')
}

export async function POST(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let courseCode, referenceId, answerType, text
    let imageData = null

    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      courseCode = form.get('courseCode')
      referenceId = form.get('referenceId')
      answerType = form.get('answerType') || 'text'
      text = form.get('text') || ''
      const imageFile = form.get('image')
      if (imageFile && imageFile.size > 0) {
        imageData = imageFile
      }
    } else {
      const body = await request.json()
      courseCode = body.courseCode
      referenceId = body.referenceId
      answerType = body.answerType || 'text'
      text = body.text || ''
    }

    if (!courseCode || !referenceId) {
      return NextResponse.json({ error: 'courseCode and referenceId required' }, { status: 400 })
    }

    if (answerType === 'text' && (!text || text.trim().length < 10)) {
      return NextResponse.json({ error: 'Answer too short (minimum 10 characters)' }, { status: 400 })
    }

    if (answerType === 'image' && !imageData) {
      return NextResponse.json({ error: 'Image required for snap answer' }, { status: 400 })
    }

    const refsCol = await getCollection('theory_references')
    const reference = await refsCol.findOne({
      courseCode: normalizeCourse(courseCode),
      id: referenceId,
    })

    if (!reference) {
      return NextResponse.json({ error: 'Theory question not found' }, { status: 404 })
    }

    let answerForGrading = text || ''
    let imagePublicId = null
    let imageUrls = null

    if (answerType === 'image' && imageData) {
      const bytes = await imageData.arrayBuffer()
      const buffer = Buffer.from(bytes)

      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.v2.uploader.upload_stream(
          { folder: 'gss-quiz/theory-answers', resource_type: 'image', transformation: [{ width: 1200, height: 1600, crop: 'limit' }] },
          (err, res) => err ? reject(err) : resolve(res)
        )
        stream.end(buffer)
      })

      imagePublicId = uploadResult.public_id
      imageUrls = {
        full: uploadResult.secure_url,
        thumbnail: uploadResult.secure_url.replace('/upload/', '/upload/w_400/'),
      }

      const base64 = buffer.toString('base64')
      answerForGrading = base64
    }

    const gradingResult = await gradeTheoryAnswer(
      answerForGrading,
      reference,
      answerType
    )

    const submissionsCol = await getCollection('theory_submissions')
    const submission = {
      userEmail: user.email,
      courseCode: normalizeCourse(courseCode),
      referenceId,
      answerType,
      answerText: answerType === 'text' ? text.trim() : '(image submission)',
      imagePublicId,
      imageUrls,
      keywordScore: gradingResult.keywordScore,
      llmScore: gradingResult.llmScore,
      totalPoints: gradingResult.totalPoints,
      percentage: gradingResult.percentage,
      evaluation: gradingResult.llmFeedback,
      keywordMatched: gradingResult.keywordMatched,
      createdAt: new Date().toISOString(),
    }

    const insertResult = await submissionsCol.insertOne(submission)

    const scoresCol = await getCollection('scores')
    await scoresCol.insertOne({
      name: user.name || user.email,
      school: user.school || 'Unknown',
      email: user.email,
      course: normalizeCourse(courseCode),
      score: gradingResult.totalPoints,
      total: 10,
      percentage: gradingResult.percentage,
      timeSpent: 0,
      questionLimit: 1,
      timePerQuestion: 600,
      type: 'theory',
      referenceId,
      createdAt: new Date().toISOString(),
    })

    try {
      const notifCol = await getCollection('notifications')
      const emoji = gradingResult.percentage >= 90 ? '🏆' : gradingResult.percentage >= 70 ? '💪' : gradingResult.percentage >= 50 ? '👍' : '📚'
      await notifCol.insertOne({
        userEmail: user.email,
        type: 'theory_complete',
        title: `${emoji} Theory Graded!`,
        message: `You scored ${gradingResult.totalPoints}/10 (${gradingResult.percentage}%) on ${normalizeCourse(courseCode)} theory`,
        link: `/courses/${normalizeCourse(courseCode).toLowerCase().replace(/\s+/g, '')}/theory/results`,
        read: false,
        createdAt: new Date().toISOString(),
      })
    } catch {}

    return NextResponse.json({
      success: true,
      submissionId: insertResult.insertedId.toString(),
      keywordScore: gradingResult.keywordScore,
      llmScore: gradingResult.llmScore,
      totalPoints: gradingResult.totalPoints,
      percentage: gradingResult.percentage,
      feedback: gradingResult.llmFeedback,
      keywordMatched: gradingResult.keywordMatched,
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to grade answer: ' + error.message }, { status: 500 })
  }
}
