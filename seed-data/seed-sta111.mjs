import 'dotenv/config'
import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz'
const COURSE_CODE = 'STA 111'

async function main() {
  const data = JSON.parse(readFileSync(join(__dirname, '..', 'sta111.json'), 'utf-8'))
  const theory = JSON.parse(readFileSync(join(__dirname, 'sta111-theory.json'), 'utf-8'))
  const client = new MongoClient(URI, { connectTimeoutMS: 10000, serverSelectionTimeoutMS: 10000 })
  await client.connect()
  const db = client.db()
  console.log('Connected to MongoDB.')

  await db.collection('departments').updateOne(
    { code: 'STA' },
    { $set: { code: 'STA', title: 'Statistics', color: '#27ae60' } },
    { upsert: true }
  )
  console.log('Department STA upserted')

  await db.collection('courses').updateOne(
    { code: COURSE_CODE },
    {
      $set: {
        code: COURSE_CODE,
        title: data.course_title,
        description: data.study_guide_title || '',
        icon: 'S',
        color: '#27ae60',
      },
    },
    { upsert: true }
  )
  console.log(`Course ${COURSE_CODE} upserted`)

  const curr = await db.collection('curriculum').findOne({ department_code: 'STA', level: '100 Level' })
  if (curr) {
    if (!curr.course_codes.includes(COURSE_CODE)) {
      await db.collection('curriculum').updateOne(
        { _id: curr._id },
        { $push: { course_codes: COURSE_CODE } }
      )
      console.log(`  Added ${COURSE_CODE} to STA 100 Level curriculum`)
    }
  } else {
    await db.collection('curriculum').insertOne({
      department_code: 'STA', level: '100 Level',
      course_codes: [COURSE_CODE],
    })
    console.log('  Created STA 100 Level curriculum')
  }

  await db.collection('categories').updateOne(
    { code: 'STA' },
    { $set: { code: 'STA', title: 'Statistics', color: '#27ae60' } },
    { upsert: true }
  )
  const staCount = await db.collection('courses').countDocuments({ code: /^STA/ })
  await db.collection('categories').updateOne(
    { code: 'STA' },
    { $set: { courseCount: staCount } }
  )
  console.log('Category STA updated')

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
  console.log(`${docs.length} STA 111 MCQs inserted across ${data.sections.length} sections.`)

  const theoryCol = db.collection('theory_references')
  await theoryCol.deleteMany({ courseCode: COURSE_CODE })
  let inserted = 0
  for (const ref of theory) {
    await theoryCol.insertOne({ ...ref, createdAt: new Date().toISOString() })
    console.log(`  ${ref.id} — "${ref.question.slice(0, 60)}..."`)
    inserted++
  }
  console.log(`${inserted} STA 111 theory references inserted for flashcards.`)

  await client.close()
  console.log('Done!')
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1) })
