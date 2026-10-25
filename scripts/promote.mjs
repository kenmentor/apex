import { MongoClient } from 'mongodb';
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz';
const c = new MongoClient(uri);
await c.connect();
const db = c.db();

// Find the user
const user = await db.collection('users').findOne({ email: 'davidnwachukwum@gmail.com' });
if (user) {
  await db.collection('users').updateOne({ _id: user._id }, { $set: { admin: true } });
  console.log('Promoted:', user.email, 'to admin');
} else {
  console.log('User not found. Creating...');
  await db.collection('users').insertOne({
    email: 'davidnwachukwum@gmail.com',
    school: '',
    admin: true,
    verified: false,
    name: '',
    avatar: '',
    createdAt: new Date(),
  });
  console.log('Created + promoted');
}

await c.close();
