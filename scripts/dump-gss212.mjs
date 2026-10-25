import 'dotenv/config'
import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI, { connectTimeoutMS: 10000, serverSelectionTimeoutMS: 10000 })
await client.connect()
const db = client.db()

const docs = await db.collection('questions').find({ courseCode: 'GSS 212' }).toArray()
console.log('Total GSS 212 questions:', docs.length)
const bySection = {}
for (const d of docs) {
  bySection[d.section] = (bySection[d.section] || 0) + 1
}
console.log('Sections:', JSON.stringify(bySection, null, 2))
for (const d of docs) {
  console.log(`\n[${d.section}] id=${d.id}`)
  console.log('Q:', d.question)
  console.log('opts:', JSON.stringify(d.options))
  console.log('ans:', d.correctAnswer)
}
await client.close()
