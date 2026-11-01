import { getCollection } from '@/lib/db'

async function insert(email, { type, title, message, link }) {
  try {
    if (!email) return null
    const col = await getCollection('notifications')
    const res = await col.insertOne({
      userEmail: String(email).toLowerCase(),
      type, title, message, link: link || null,
      read: false,
      createdAt: new Date().toISOString(),
    })
    return res.insertedId
  } catch {
    return null
  }
}

export async function notifyUser(email, payload) {
  return insert(email, payload)
}

// Ping every general admin (used when editors publish for review).
export async function notifyAdmins(payload, excludeEmail = null) {
  try {
    const users = await getCollection('users')
    const admins = await users.find({ admin: true }).project({ email: 1 }).toArray().catch(() => [])
    const done = []
    for (const a of admins) {
      const email = String(a.email || '').toLowerCase()
      if (!email || (excludeEmail && email === String(excludeEmail).toLowerCase())) continue
      const id = await insert(email, payload)
      if (id) done.push(email)
    }
    return done
  } catch {
    return []
  }
}
