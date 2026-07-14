import 'dotenv/config'
import { MongoClient } from 'mongodb'

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI, { connectTimeoutMS: 10000, serverSelectionTimeoutMS: 10000 })
  await client.connect()
  const db = client.db()

  await db.collection('departments').updateOne(
    { code: 'INS' },
    { $set: { code: 'INS', title: 'Information Science', color: '#0ea5e9' } },
    { upsert: true }
  )
  console.log('Department INS upserted')

  await db.collection('courses').updateOne(
    { code: 'INS 202' },
    { $set: { code: 'INS 202', title: 'Human-Computer Interaction', description: 'Study of the design, evaluation, and implementation of interactive computing systems for human use.', icon: 'H', color: '#0ea5e9' } },
    { upsert: true }
  )
  console.log('Course INS 202 upserted')

  await db.collection('curriculum').updateOne(
    { department_code: 'INS', level: '200 Level' },
    { $set: { department_code: 'INS', level: '200 Level', course_codes: ['INS 202'] } },
    { upsert: true }
  )
  console.log('Curriculum INS 200 Level upserted')

  await db.collection('categories').updateOne(
    { code: 'INS' },
    { $set: { code: 'INS', title: 'Information Science', color: '#0ea5e9', courseCount: 1 } },
    { upsert: true }
  )
  console.log('Category INS upserted')

  await client.close()
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1) })
