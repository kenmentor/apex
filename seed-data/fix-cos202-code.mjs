import 'dotenv/config'
import { MongoClient } from 'mongodb'

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI, { connectTimeoutMS: 10000, serverSelectionTimeoutMS: 10000 })
  await client.connect()
  const db = client.db()

  const r = await db.collection('theory_references').updateMany(
    { courseCode: 'CSC 202' },
    { $set: { courseCode: 'COS 202' } }
  )
  console.log(`Updated ${r.modifiedCount} theory refs from CSC 202 to COS 202`)

  const r2 = await db.collection('questions').updateMany(
    { courseCode: 'COS 202' },
    { $set: { courseCode: 'COS 202' } }
  )
  console.log(`Questions already use COS 202 (${r2.modifiedCount} unchanged)`)

  const refs = await db.collection('theory_references').distinct('courseCode')
  console.log('Theory ref courseCodes now:', refs)

  await client.close()
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1) })
