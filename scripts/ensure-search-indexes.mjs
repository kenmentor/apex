// Idempotent $text indexes for study-content search (see openspec universal-study-search).
// Usage: npm run db:indexes (needs MONGODB_URI). Safe to re-run: only creates missing indexes.
import { MongoClient } from 'mongodb'

const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz'

const INDEXES = [
  {
    col: 'questions',
    key: { question: 'text', explanation: 'text', section: 'text' },
    name: 'study_questions_text',
  },
  {
    col: 'theory_references',
    key: { question: 'text', keywords: 'text', mainConcepts: 'text' },
    name: 'study_theory_text',
  },
  {
    col: 'readings',
    key: { title: 'text', content: 'text' },
    name: 'study_readings_text',
  },
  {
    col: 'videos',
    key: { title: 'text', description: 'text' },
    name: 'study_videos_text',
  },
]

async function main() {
  const client = new MongoClient(URI, { connectTimeoutMS: 15000, serverSelectionTimeoutMS: 15000 })
  await client.connect()
  const db = client.db()
  console.log('DB:', db.databaseName)
  for (const { col, key, name } of INDEXES) {
    const collection = db.collection(col)
    const existing = await collection.listIndexes().toArray().catch(() => [])
    if (existing.some((ix) => ix.name === name)) {
      console.log(`  ${col}: index ${name} exists, skipping`)
      continue
    }
    await collection.createIndex(key, { name })
    console.log(`  ${col}: created index ${name}`)
  }
  await client.close()
  console.log('Done.')
}

main().catch((e) => { console.error('Failed:', e.message); process.exit(1) })
