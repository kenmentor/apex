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
  {
    col: 'library_nodes',
    key: { parentId: 1, ownerEmail: 1 },
    name: 'library_parent_owner',
  },
  {
    col: 'library_nodes',
    key: { name: 'text' },
    name: 'library_name_text',
  },
  {
    col: 'library_members',
    key: { nodeId: 1, email: 1 },
    name: 'library_member_lookup',
  },
  {
    col: 'user_materials',
    key: { title: 'text', fileName: 'text', description: 'text' },
    name: 'study_materials_text',
  },
  {
    col: 'user_materials',
    key: { sha256: 1 },
    name: 'materials_hash',
  },
  {
    col: 'user_materials',
    key: { ownerEmail: 1, sha256: 1 },
    name: 'materials_owner_hash',
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
