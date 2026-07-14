import 'dotenv/config'
import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz'
const COURSE_CODE = 'INS 202'

async function main() {
  const data = JSON.parse(readFileSync(join(__dirname, '..', 'INS202.json'), 'utf-8'))
  const client = new MongoClient(URI, { connectTimeoutMS: 10000, serverSelectionTimeoutMS: 10000 })
  await client.connect()
  const db = client.db()
  console.log('Connected to MongoDB.')

  const col = db.collection('questions')

  const existing = await col.countDocuments({ courseCode: COURSE_CODE })
  if (existing > 0) {
    console.log(`${existing} existing ${COURSE_CODE} questions found. Deleting...`)
    await col.deleteMany({ courseCode: COURSE_CODE })
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

  await col.insertMany(docs)
  console.log(`${docs.length} INS 202 MCQs inserted across ${data.sections.length} sections.`)

  await client.close()
  console.log('Done!')
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1) })
