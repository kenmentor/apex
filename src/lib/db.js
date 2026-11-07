import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gss-quiz'
// Bounded timeouts: the driver default waits 30s for server selection, so
// one Atlas wobble hangs EVERY api route (auth included) until Vercel kills
// the function. Fail fast instead so callers return a clean error.
const options = {
  serverSelectionTimeoutMS: 8000,
  connectTimeoutMS: 8000,
  socketTimeoutMS: 30000,
  maxPoolSize: 10,
}

let client
let clientPromise

function newClientPromise() {
  client = new MongoClient(uri, options)
  return client.connect()
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = newClientPromise()
  }
  clientPromise = global._mongoClientPromise
} else {
  clientPromise = newClientPromise()
}

export async function getDB() {
  try {
    const c = await clientPromise
    return c.db()
  } catch (e) {
    // Don't let one failed connect poison the instance forever: reset so
    // the next request retries instead of crashing every call after.
    try { await client?.close().catch(() => {}) } catch {}
    clientPromise = newClientPromise()
    if (process.env.NODE_ENV === 'development') global._mongoClientPromise = clientPromise
    const c = await clientPromise
    return c.db()
  }
}

export async function getCollection(name) {
  const db = await getDB()
  return db.collection(name)
}
