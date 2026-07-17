import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'

export async function GET(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const col = await getCollection('todos')
    const docs = await col.find({ userEmail: user.email }).sort({ createdAt: -1 }).toArray()
    return NextResponse.json({ docs: docs.map(d => ({ ...d, _id: d._id.toString() })) })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()

    if (body.action === 'add') {
      const col = await getCollection('todos')
      const doc = {
        userEmail: user.email,
        text: body.text,
        done: false,
        createdAt: new Date().toISOString(),
      }
      const result = await col.insertOne(doc)
      return NextResponse.json({ success: true, todo: { ...doc, _id: result.insertedId.toString() } }, { status: 201 })
    }

    if (body.action === 'toggle') {
      const col = await getCollection('todos')
      const existing = await col.findOne({ _id: new (await import('mongodb')).ObjectId(body.id), userEmail: user.email })
      if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      await col.updateOne({ _id: existing._id }, { $set: { done: !existing.done } })
      return NextResponse.json({ success: true, done: !existing.done })
    }

    if (body.action === 'delete') {
      const col = await getCollection('todos')
      await col.deleteOne({ _id: new (await import('mongodb')).ObjectId(body.id), userEmail: user.email })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
