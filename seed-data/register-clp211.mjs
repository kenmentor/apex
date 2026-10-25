import 'dotenv/config'
import { MongoClient } from 'mongodb'

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI, { connectTimeoutMS: 30000, serverSelectionTimeoutMS: 30000 })
  await client.connect()
  const db = client.db()

  await db.collection('departments').updateOne(
    { code: 'MED' },
    { $set: { code: 'MED', title: 'Medicine', color: '#F43F5E' } },
    { upsert: true }
  )
  console.log('Department MED upserted')

  await db.collection('courses').updateOne(
    { code: 'CLP 211' },
    { $set: { code: 'CLP 211', title: 'Chemical Pathology', description: 'Chemical Pathology assessment for medical students: glucose & diabetes, lipids, electrolytes, acid-base, bilirubin and laboratory quality.', icon: 'C', color: '#F43F5E' } },
    { upsert: true }
  )
  console.log('Course CLP 211 upserted')

  await db.collection('curriculum').updateOne(
    { department_code: 'MED', level: '200 Level' },
    { $addToSet: { course_codes: 'CLP 211' }, $setOnInsert: { department_code: 'MED', level: '200 Level' } },
    { upsert: true }
  )
  console.log('Curriculum MED 200 Level merged CLP 211')

  await db.collection('categories').updateOne(
    { code: 'MED' },
    { $set: { code: 'MED', title: 'Medicine', color: '#F43F5E' } },
    { upsert: true }
  )
  console.log('Category MED upserted')

  await client.close()
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1) })