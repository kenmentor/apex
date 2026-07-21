import 'dotenv/config'
import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz'

async function main() {
  const mcqs = JSON.parse(readFileSync(join(__dirname, 'csc282-mcq.json'), 'utf-8'))
  const client = new MongoClient(URI, { connectTimeoutMS: 10000, serverSelectionTimeoutMS: 10000 })
  await client.connect()
  const db = client.db()
  console.log('Connected to MongoDB.')

  const col = db.collection('questions')
  let upserted = 0

  for (const mcq of mcqs) {
    const { _id, ...doc } = mcq
    const result = await col.updateOne(
      { courseCode: doc.courseCode, id: doc.id },
      { $set: { ...doc, updatedAt: new Date().toISOString() }, $setOnInsert: { createdAt: new Date().toISOString() } },
      { upsert: true }
    )
    const action = result.upsertedCount > 0 ? 'inserted' : 'updated'
    console.log(`  [${action}] ${mcq.id} — "${mcq.question.slice(0, 60)}..."`)
    upserted++
  }

  await client.close()
  console.log(`\nDone! ${upserted} CSC 282 MCQs upserted.`)
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1) })
