import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { ObjectId } from 'mongodb'

export async function POST(request, { params }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const col = await getCollection('spaces')
    const space = await col.findOne({ _id: new ObjectId(id) })
    if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isMember = space.members?.includes(user.email)

    if (isMember) {
      await col.updateOne({ _id: new ObjectId(id) }, { $pull: { members: user.email }, $inc: { memberCount: -1 } })
      return NextResponse.json({ joined: false })
    } else {
      await col.updateOne({ _id: new ObjectId(id) }, { $addToSet: { members: user.email }, $inc: { memberCount: 1 } })
      return NextResponse.json({ joined: true })
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
