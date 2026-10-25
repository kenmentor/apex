import 'dotenv/config'
import { MongoClient } from 'mongodb'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz'

async function main() {
  const plan = JSON.parse(readFileSync(join(__dirname, '..', 'data', 'plans', 'cos-200L.json'), 'utf-8'))
  const c = new MongoClient(URI, { connectTimeoutMS: 10000, serverSelectionTimeoutMS: 10000 })
  await c.connect()
  const db = c.db()

  await db.collection('plans').updateOne(
    { cohort: plan.cohort },
    { $set: { ...plan, updatedAt: new Date().toISOString() } },
    { upsert: true }
  )

  const topicDocs = []
  for (const course of plan.courses) {
    for (const topic of course.topics) {
      topicDocs.push({
        topicId: topic.id,
        courseCode: course.code,
        title: topic.title,
        ccmasRef: topic.ccmasRef || '',
        difficulty: topic.difficulty || 1,
        items: topic.items || [],
        updatedAt: new Date().toISOString(),
      })
    }
  }
  for (const t of topicDocs) {
    await db.collection('topics').updateOne({ topicId: t.topicId }, { $set: t }, { upsert: true })
  }

  console.log(`Plan seeded: ${plan.courses.length} courses, ${topicDocs.length} topics.`)
  await c.close()
}

main().catch(e => { console.error('seed-plan failed:', e.message); process.exit(1) })
