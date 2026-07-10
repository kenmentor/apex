import { MongoClient } from 'mongodb';

const hosts = 'cluster0-shard-00-00.is1m0.mongodb.net:27017,cluster0-shard-00-01.is1m0.mongodb.net:27017,cluster0-shard-00-02.is1m0.mongodb.net:27017';
const uri = `mongodb://uninet:uninet@${hosts}/gss-quiz?retryWrites=true&w=majority&ssl=true&replicaSet=atlas-lrou0r-shard-0&authSource=admin`;

try {
  const c = new MongoClient(uri, { connectTimeoutMS: 10000, serverSelectionTimeoutMS: 15000 });
  console.log('Connecting...');
  await c.connect();
  console.log('Connected!');
  const db = c.db('gss-quiz');
  const cols = await db.listCollections().toArray();
  console.log('Collections:', cols.map(x => x.name).join(', ') || 'none');
  for (const col of cols) {
    const cnt = await db.collection(col.name).countDocuments();
    console.log(`  ${col.name}: ${cnt} docs`);
  }
  await c.close();
  console.log('Atlas is working!');
} catch (e) {
  console.error('FAILED:', e.message);
}
