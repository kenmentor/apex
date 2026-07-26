import 'dotenv/config'
import { MongoClient } from 'mongodb'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz'
const COURSE_CODE = 'MLS 161'

async function main() {
  const data = JSON.parse(readFileSync(join(__dirname, 'mls161-theory.json'), 'utf-8'))
  const client = new MongoClient(URI, { connectTimeoutMS: 10000, serverSelectionTimeoutMS: 10000 })
  await client.connect()
  const db = client.db()
  console.log('Connected to MongoDB.')

  const col = db.collection('theory_references')

  const existing = await col.countDocuments({ courseCode: COURSE_CODE })
  if (existing > 0) {
    console.log(`${existing} existing ${COURSE_CODE} theory cards found. Deleting...`)
    await col.deleteMany({ courseCode: COURSE_CODE })
  }

  await col.insertMany(data)
  console.log(`${data.length} ${COURSE_CODE} theory cards inserted.`)

  await client.close()
  console.log('Done!')
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1) })