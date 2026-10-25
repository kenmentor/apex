import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz';
const c = new MongoClient(uri);
await c.connect();
const db = c.db();

const cols = ['courses', 'categories', 'questions', 'videos', 'readings', 'users', 'scores'];
for (const name of cols) {
  const docs = await db.collection(name).find({}).limit(3).toArray();
  console.log(`\n=== ${name} (${docs.length} shown) ===`);
  for (const d of docs) {
    console.log(JSON.stringify({ _id: d._id.toString(), ...d }, null, 2).slice(0, 400));
  }
}

await c.close();
