import 'dotenv/config'
import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz'
const COURSE_CODE = 'CLP 211'
const SECTION = 'CHEMPATH Assessment 2023/2024'

async function main() {
  const data = JSON.parse(readFileSync(join(__dirname, 'clp211-drtims-2024.json'), 'utf-8'))
  const client = new MongoClient(URI, { connectTimeoutMS: 30000, serverSelectionTimeoutMS: 30000 })
  await client.connect()
  const db = client.db()
  console.log('Connected to MongoDB.')

  const col = db.collection('questions')

  const existing = await col.countDocuments({ courseCode: COURSE_CODE, section: SECTION })
  if (existing > 0) {
    console.log(`${existing} existing ${SECTION} questions found. Deleting...`)
    await col.deleteMany({ courseCode: COURSE_CODE, section: SECTION })
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
        ...(q.year ? { year: q.year } : {}),
        ...(section.year ? { year: section.year } : {}),
      })
    }
  }

  await col.insertMany(docs)
  console.log(`${docs.length} ${COURSE_CODE} (${SECTION}) MCQs inserted across ${data.sections.length} sections.`)

  await client.close()
  console.log('Done!')
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1) })