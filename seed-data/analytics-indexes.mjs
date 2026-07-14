import 'dotenv/config'
import { MongoClient } from 'mongodb'

const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz'
const client = new MongoClient(URI)

async function run() {
  await client.connect()
  const db = client.db()

  console.log('Creating indexes on analytics collection...')

  await db.collection('analytics').createIndex({ createdAt: -1 })
  console.log('  ✓ { createdAt: -1 }')

  await db.collection('analytics').createIndex({ event: 1 })
  console.log('  ✓ { event: 1 }')

  await db.collection('analytics').createIndex({ 'data.email': 1 })
  console.log('  ✓ { "data.email": 1 }')

  await db.collection('analytics').createIndex({ 'data.sessionId': 1 })
  console.log('  ✓ { "data.sessionId": 1 }')

  await db.collection('analytics').createIndex({ event: 1, createdAt: -1 })
  console.log('  ✓ { event: 1, createdAt: -1 } (compound)')

  console.log('\nDone.')
  await client.close()
}

run().catch(console.error)
