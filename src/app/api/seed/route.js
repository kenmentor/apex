import { NextResponse } from 'next/server'
import { getDB, getCollection } from '@/lib/db'
import { sendToAll } from '@/lib/push'
import fs from 'fs'
import path from 'path'

const CATEGORIES = [
  { title: 'General Studies', code: 'GSS', color: '#130f40', courseCount: 1 },
  { title: 'Computer Science', code: 'COS', color: '#1a5276', courseCount: 0 },
  { title: 'Mathematics', code: 'MTH', color: '#7d3c98', courseCount: 0 },
  { title: 'Physics', code: 'PHY', color: '#c0392b', courseCount: 0 },
]

export async function POST() {
  try {
    const db = await getDB()

    await db.collection('courses').deleteMany({})
    await db.collection('categories').deleteMany({})
    await db.collection('questions').deleteMany({})
    await db.collection('videos').deleteMany({})
    await db.collection('readings').deleteMany({})

    await db.collection('courses').insertOne({
      code: 'GSS 212',
      title: 'Philosophy & Logic',
      description: 'Comprehensive study of Western philosophy from ancient Greece to contemporary thought, plus formal logic.',
      icon: 'Φ',
      color: '#130f40',
    })

    await db.collection('categories').insertMany(CATEGORIES)

    const jsonPath = path.join(process.cwd(), '..', 'gss212.json')
    const raw = fs.readFileSync(jsonPath, 'utf-8')
    const data = JSON.parse(raw)

    const questionDocs = []
    for (const section of data.sections) {
      for (const q of section.questions) {
        questionDocs.push({
          courseCode: data.course_code,
          section: section.section_title,
          id: q.id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correct_answer,
          explanation: q.explanation || '',
        })
      }
    }
    await db.collection('questions').insertMany(questionDocs)

    const videos = [
      { courseCode: 'GSS 212', title: 'Introduction to Philosophy', url: 'https://youtu.be/1A_CAkYt3GY', order: 1, description: 'Overview of Western philosophy from ancient to modern.' },
      { courseCode: 'GSS 212', title: 'Socrates, Plato & Aristotle', url: 'https://youtu.be/_mclDkOVS6Q', order: 2, description: 'The three great philosophers of ancient Greece.' },
      { courseCode: 'GSS 212', title: 'Medieval Philosophy & St. Augustine', url: 'https://youtu.be/VPz2JMEwG_8', order: 3, description: 'Faith and reason in the medieval period.' },
      { courseCode: 'GSS 212', title: 'Descartes & Modern Philosophy', url: 'https://youtu.be/CAjWUrWvXj4', order: 4, description: 'The father of modern philosophy and his method of doubt.' },
      { courseCode: 'GSS 212', title: 'Introduction to Logic', url: 'https://youtu.be/VzK5vLpN0OY', order: 5, description: 'Basic concepts of formal logic and argument structure.' },
      { courseCode: 'GSS 212', title: 'Critical Thinking & Fallacies', url: 'https://youtu.be/AMDJT1RN6cE', order: 6, description: 'Common logical fallacies and how to spot them.' },
    ]
    await db.collection('videos').insertMany(videos)

    const storyPath = path.join(process.cwd(), '..', 'read.html')
    const storyHtml = fs.readFileSync(storyPath, 'utf-8')
    const bodyMatch = storyHtml.match(/<body>([\s\S]*)<\/body>/i)
    if (bodyMatch) {
      const sections = bodyMatch[1].split(/(?=<h[12]>Chapter\s+\w+)/).filter(s => s.trim())
      const readings = []
      for (const section of sections) {
        const chapterMatch = section.match(/<h[12]>(Chapter\s+\w+[^<]*)<\/h[12]>/i)
        if (chapterMatch) {
          readings.push({
            courseCode: 'GSS 212',
            title: chapterMatch[1].trim(),
            order: readings.length + 1,
            content: section.trim(),
          })
        }
      }
      await db.collection('readings').insertMany(readings)
    }

    // Push notification about new course
    try {
      const notifCol = await getCollection('notifications')
      const subsCol = await getCollection('push_subscriptions')
      const subs = await subsCol.find({}).project({ userEmail: 1 }).toArray()
      for (const sub of subs) {
        if (sub.userEmail) {
          await notifCol.insertOne({
            userEmail: sub.userEmail,
            type: 'new_course',
            title: '📚 New Course Available!',
            message: `${data.course_code} — ${data.course_title || 'A new course'} has been added. Start practicing now!`,
            link: `/courses/${data.course_code.toLowerCase().replace(/\s+/g, '')}`,
            read: false,
            createdAt: new Date().toISOString(),
          })
        }
      }
      sendToAll(
        '📚 New Course Available!',
        `${data.course_code} — ${data.course_title || 'A new course'} has been added. Start practicing now!`,
        `/courses/${data.course_code.toLowerCase().replace(/\s+/g, '')}`,
        getCollection
      )
    } catch {}

    return NextResponse.json({
      success: true,
      course: data.course_code,
      categories: CATEGORIES.length,
      questions: questionDocs.length,
      videos: videos.length,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to seed: ' + error.message }, { status: 500 })
  }
}
