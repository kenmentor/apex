import 'dotenv/config'
import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz'
const COURSE_CODE = 'CLP 211'

async function main() {
  const refs = JSON.parse(readFileSync(join(__dirname, 'clp211-unical-theory.json'), 'utf-8'))
  const client = new MongoClient(URI, { connectTimeoutMS: 30000, serverSelectionTimeoutMS: 30000 })
  await client.connect()
  const db = client.db()
  console.log('Connected to MongoDB.')

  const col = db.collection('theory_references')

  let inserted = 0
  let updated = 0
  for (const r of refs) {
    const doc = {
      courseCode: COURSE_CODE,
      section: r.section,
      id: r.id,
      question: r.question,
      keywords: r.keywords || [],
      mainConcepts: r.mainConcepts || [],
      referenceAnswer: r.referenceAnswer,
      difficulty: r.difficulty || 'medium',
      maxPoints: r.maxPoints || 10,
      updatedAt: new Date().toISOString(),
    }
    const existing = await col.findOne({ courseCode: COURSE_CODE, id: r.id })
    if (existing) {
      await col.updateOne({ _id: existing._id }, { $set: doc })
      updated++
    } else {
      doc.createdAt = new Date().toISOString()
      await col.insertOne(doc)
      inserted++
    }
  }

  console.log(`${inserted} inserted, ${updated} updated theory references for ${COURSE_CODE}.`)

  await client.close()
  console.log('Done!')
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1) })