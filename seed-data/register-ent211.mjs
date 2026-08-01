import 'dotenv/config'
import { MongoClient } from 'mongodb'

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI, { connectTimeoutMS: 10000, serverSelectionTimeoutMS: 10000 })
  await client.connect()
  const db = client.db()

  await db.collection('departments').updateOne(
    { code: 'ENT' },
    { $set: { code: 'ENT', title: 'Entrepreneurship', color: '#16a34a' } },
    { upsert: true }
  )
  console.log('Department ENT upserted')

  await db.collection('courses').updateOne(
    { code: 'ENT 211' },
    { $set: { code: 'ENT 211', title: 'Entrepreneurship and Innovation', description: 'Concepts and principles of entrepreneurship, characteristics and functions of entrepreneurs, types, mindset, constraints, and the role of entrepreneurship in economic development.', icon: 'E', color: '#16a34a' } },
    { upsert: true }
  )
  console.log('Course ENT 211 upserted')

  await db.collection('curriculum').updateOne(
    { department_code: 'ENT', level: '200 Level' },
    { $set: { department_code: 'ENT', level: '200 Level', course_codes: ['ENT 211'] } },
    { upsert: true }
  )
  console.log('Curriculum ENT 200 Level upserted')

  await db.collection('categories').updateOne(
    { code: 'ENT' },
    { $set: { code: 'ENT', title: 'Entrepreneurship', color: '#16a34a', courseCount: 1 } },
    { upsert: true }
  )
  console.log('Category ENT upserted')

  await client.close()
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1) })
