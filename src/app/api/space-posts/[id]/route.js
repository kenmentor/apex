import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { ObjectId } from 'mongodb'

// GET one post. Each fetch counts as a view.
export async function GET(request, { params }) {
  try {
    const { id } = await params
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const col = await getCollection('space_posts')
    const post = await col.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $inc: { viewCount: 1 } },
      { returnDocument: 'after' }
    )
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const spaces = await getCollection('spaces')
    let space = null
    try { space = await spaces.findOne({ _id: new ObjectId(post.spaceId) }, { projection: { name: 1, color: 1 } }) } catch {}
    return NextResponse.json({
      ...post,
      _id: post._id.toString(),
      spaceName: space?.name || '',
      spaceColor: space?.color || '#130f40',
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 })
  }
}
