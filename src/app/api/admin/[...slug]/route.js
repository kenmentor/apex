import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-server'
import { ObjectId } from 'mongodb'

const ALLOWED = ['categories', 'courses', 'questions', 'videos', 'readings']

function getId(params) {
  const slug = params.slug || []
  if (slug.length < 2) return null
  const id = slug[1]
  if (!ObjectId.isValid(id)) return null
  return new ObjectId(id)
}

function getCollectionName(params) {
  const slug = params.slug || []
  return slug[0]
}

export async function GET(request, { params }) {
  const user = await requireAdmin(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const colName = getCollectionName(params)
  if (!ALLOWED.includes(colName)) return NextResponse.json({ error: 'Invalid collection' }, { status: 400 })

  const col = await getCollection(colName)
  const docs = await col.find({}).sort({ createdAt: -1 }).toArray()
  return NextResponse.json({ docs: docs.map(d => ({ ...d, _id: d._id.toString(), id: d._id.toString() })) })
}

export async function POST(request, { params }) {
  const user = await requireAdmin(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const colName = getCollectionName(params)
  if (!ALLOWED.includes(colName)) return NextResponse.json({ error: 'Invalid collection' }, { status: 400 })

  const body = await request.json()
  const id = getId(params)

  const col = await getCollection(colName)

  if (id) {
    const { _id, id: _, ...update } = body
    await col.updateOne({ _id: id }, { $set: { ...update, updatedAt: new Date() } })
    const doc = await col.findOne({ _id: id })
    return NextResponse.json({ ...doc, _id: doc._id.toString(), id: doc._id.toString() })
  }

  const result = await col.insertOne({ ...body, createdAt: new Date(), updatedAt: new Date() })
  const doc = await col.findOne({ _id: result.insertedId })
  return NextResponse.json({ ...doc, _id: doc._id.toString(), id: doc._id.toString() })
}

export async function DELETE(request, { params }) {
  const user = await requireAdmin(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const colName = getCollectionName(params)
  if (!ALLOWED.includes(colName)) return NextResponse.json({ error: 'Invalid collection' }, { status: 400 })

  const id = getId(params)
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const col = await getCollection(colName)
  await col.deleteOne({ _id: id })
  return NextResponse.json({ success: true })
}
