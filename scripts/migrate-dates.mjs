import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz'
const client = new MongoClient(uri)

async function migrate() {
  await client.connect()
  const db = client.db()
  const analytics = db.collection('analytics')
  const events = db.collection('events')

  // Convert string createdAt → Date in analytics
  const aResult = await analytics.updateMany(
    { createdAt: { $type: 'string' } },
    [{ $set: { createdAt: { $dateFromString: { dateString: '$createdAt' } } } }]
  )
  console.log(`analytics: ${aResult.modifiedCount} docs converted`)

  // Same for events collection
  const eResult = await events.updateMany(
    { createdAt: { $type: 'string' } },
    [{ $set: { createdAt: { $dateFromString: { dateString: '$createdAt' } } } }]
  )
  console.log(`events: ${eResult.modifiedCount} docs converted`)

  await client.close()
}

migrate().catch(console.error)
