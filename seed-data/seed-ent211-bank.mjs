import 'dotenv/config'
import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz'
const COURSE_CODE = 'ENT 211'

async function main() {
  const data = JSON.parse(readFileSync(join(__dirname, 'ent211-bank.json'), 'utf-8'))
  const client = new MongoClient(URI, { connectTimeoutMS: 15000, serverSelectionTimeoutMS: 15000 })
  await client.connect()
  const db = client.db()
  console.log('Connected to MongoDB.')

  const col = db.collection('questions')

  const existingQuestions = await col.distinct('question', { courseCode: COURSE_CODE })
  const existingIds = new Set(await col.distinct('id', { courseCode: COURSE_CODE }))
  const existingSet = new Set(existingQuestions)
  console.log(`${existingQuestions.length} existing ${COURSE_CODE} questions in DB.`)

  const docs = []
  let dupes = 0
  for (const section of data.sections) {
    for (const q of section.questions) {
      if (existingSet.has(q.question)) {
        dupes++
        continue
      }
      if (existingIds.has(q.id)) {
        dupes++
        continue
      }
      existingSet.add(q.question)
      docs.push({
        courseCode: COURSE_CODE,
        section: section.section_title,
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correct_answer,
        explanation: q.explanation || '',
      })
    }
  }

  if (docs.length === 0) {
    console.log('Nothing new to insert (all questions already exist).')
  } else {
    await col.insertMany(docs)
    console.log(`${docs.length} new ${COURSE_CODE} questions inserted. (${dupes} duplicates skipped)`)
  }

  const total = await col.countDocuments({ courseCode: COURSE_CODE })
  console.log(`Total ${COURSE_CODE} questions now in DB: ${total}`)

  await client.close()
  console.log('Done!')
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1) })
