require('dotenv/config');
const { MongoClient } = require('mongodb');

(async () => {
  const c = new MongoClient(process.env.MONGODB_URI, { connectTimeoutMS: 15000, serverSelectionTimeoutMS: 15000 });
  await c.connect();
  const db = c.db();

  await db.collection('courses').updateOne(
    { code: 'IFT 212' },
    {
      $set: {
        description: 'Computer Architecture and Organization - CPU Design, Data Representation, Digital Logic, ISA, Pipelining',
        icon: 'A',
        color: '#3498db'
      }
    }
  );
  console.log('IFT 212 course updated.');

  const x = await db.collection('courses').findOne({ code: 'IFT 212' });
  console.log(JSON.stringify(x));

  await c.close();
})();
