import 'dotenv/config'
import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz'
const COURSE_CODE = 'GSS 101'

async function main() {
  const data = JSON.parse(readFileSync(join(__dirname, '..', 'gss101.json'), 'utf-8'))
  const client = new MongoClient(URI, { connectTimeoutMS: 10000, serverSelectionTimeoutMS: 10000 })
  await client.connect()
  const db = client.db()
  console.log('Connected to MongoDB.')

  // Register department if needed
  await db.collection('departments').updateOne(
    { code: 'GSS' },
    { $set: { code: 'GSS', title: 'General Studies', color: '#130f40' } },
    { upsert: true }
  )
  console.log('Department GSS upserted')

  // Register course
  await db.collection('courses').updateOne(
    { code: COURSE_CODE },
    {
      $set: {
        code: COURSE_CODE,
        title: data.course_title,
        description: data.study_guide_title || '',
        icon: 'E',
        color: '#130f40',
      },
    },
    { upsert: true }
  )
  console.log(`Course ${COURSE_CODE} upserted`)

  // Curriculum
  const curr = await db.collection('curriculum').findOne({ department_code: 'GSS', level: '100 Level' })
  if (curr) {
    if (!curr.course_codes.includes(COURSE_CODE)) {
      await db.collection('curriculum').updateOne(
        { _id: curr._id },
        { $push: { course_codes: COURSE_CODE } }
      )
      console.log(`  Added ${COURSE_CODE} to GSS 100 Level curriculum`)
    }
  } else {
    await db.collection('curriculum').insertOne({
      department_code: 'GSS', level: '100 Level',
      course_codes: [COURSE_CODE],
    })
    console.log('  Created GSS 100 Level curriculum')
  }

  // Category
  await db.collection('categories').updateOne(
    { code: 'GSS' },
    { $set: { code: 'GSS', title: 'General Studies', color: '#130f40' } },
    { upsert: true }
  )
  // Update course count
  const gssCount = await db.collection('courses').countDocuments({ code: /^GSS/ })
  await db.collection('categories').updateOne(
    { code: 'GSS' },
    { $set: { courseCount: gssCount } }
  )
  console.log('Category GSS updated')

  // Seed questions
  const existing = await db.collection('questions').countDocuments({ courseCode: COURSE_CODE })
  if (existing > 0) {
    console.log(`${existing} existing ${COURSE_CODE} questions found. Deleting...`)
    await db.collection('questions').deleteMany({ courseCode: COURSE_CODE })
  }

  const docs = []
  for (const section of data.sections) {
    for (const q of section.questions) {
      docs.push({
        courseCode: COURSE_CODE,
        section: section.section_title,
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correct_answer,
        explanation: q.explanation || '',
        ...(q.code ? { code: q.code } : {}),
      })
    }
  }

  await db.collection('questions').insertMany(docs)
  console.log(`${docs.length} GSS 101 MCQs inserted across ${data.sections.length} sections.`)

  await client.close()
  console.log('Done!')
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1) })
