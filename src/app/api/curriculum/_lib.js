import { getCollection } from '@/lib/db'
import { assertWritable } from '@/lib/curriculum'

export async function revision(db, { action, collection, docId, before, after, by, university }) {
  await db.collection('curriculum_revisions').insertOne({
    action, collection, docId: String(docId), before: before || null, after: after || null,
    by: by || null, university: university || null, createdAt: new Date().toISOString(),
  })
}

export async function requireWriter(request, university) {
  const { getUserFromToken } = await import('@/lib/auth-server')
  const user = await getUserFromToken(request).catch(() => null)
  const usersCol = await getCollection('users')
  const full = user?.email ? (await usersCol.findOne({ email: user.email })) || user : null
  const check = assertWritable(full, university)
  if (!check.ok) return { error: check.error }
  return { user: full }
}
