// Usage: node scripts/make-official.mjs <email> <UNIVERSITY_CODE> [admin]
import { MongoClient } from 'mongodb'

const [email, university, makeAdmin] = process.argv.slice(2)
if (!email || !university) {
  console.log('Usage: node scripts/make-official.mjs <email> <UNIVERSITY_CODE> [admin]')
  process.exit(1)
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz'
const c = new MongoClient(uri, { connectTimeoutMS: 10000, serverSelectionTimeoutMS: 10000 })
await c.connect()
const db = c.db()

const update = { role: makeAdmin ? 'admin' : 'official', university: university.toUpperCase().trim() }
if (makeAdmin) update.admin = true
const res = await db.collection('users').updateOne({ email: email.toLowerCase().trim() }, { $set: update })
if (res.matchedCount === 0) {
  await db.collection('users').insertOne({
    email: email.toLowerCase().trim(), school: '', department: '', level: '',
    ...update, admin: !!makeAdmin, verified: false, name: '', avatar: '', createdAt: new Date(),
  })
  console.log(`Created ${email} as ${update.role} of ${update.university}`)
} else {
  console.log(`Updated ${email} -> ${update.role} of ${update.university}`)
}
await c.close()
