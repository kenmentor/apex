import 'dotenv/config'
import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz'
const COURSE_CODE = 'GSS 212'

async function main() {
  const data = JSON.parse(readFileSync(join(__dirname, 'gss212-add.json'), 'utf-8'))
  const client = new MongoClient(URI, { connectTimeoutMS: 10000, serverSelectionTimeoutMS: 60000 })
  await client.connect()
  const db = client.db()
  console.log('Connected to MongoDB.')

  const col = db.collection('questions')

  let added = 0
  let updated = 0
  for (const section of data.sections) {
    for (const q of section.questions) {
      const filter = { courseCode: COURSE_CODE, section: section.section_title, id: q.id }
      const update = {
        $set: {
          question: q.question,
          options: q.options,
          correctAnswer: q.correct_answer,
          explanation: q.explanation || '',
        },
      }
      const res = await col.updateOne(filter, update, { upsert: true })
      if (res.upsertedCount) added++
      else if (res.modifiedCount) updated++
    }
  }

  console.log(`${added} new, ${updated} updated, for ${COURSE_CODE}.`)
  await client.close()
  console.log('Done!')
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1) })
