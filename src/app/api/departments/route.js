import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

export async function GET() {
  try {
    const col = await getCollection('departments')
    const docs = await col.find({}).sort({ title: 1 }).toArray()
    return NextResponse.json({ docs: docs.map(d => ({ ...d, _id: d._id.toString(), id: d._id.toString() })) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
