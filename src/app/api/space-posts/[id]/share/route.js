import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { ObjectId } from 'mongodb'

export async function POST(request, { params }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { platform } = body

    const postsCol = await getCollection('space_posts')
    const post = await postsCol.findOne({ _id: new ObjectId(id) })
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const sharesCol = await getCollection('space_shares')
    await sharesCol.insertOne({
      postId: id,
      spaceId: post.spaceId,
      authorEmail: user.email,
      platform: platform || 'link',
      createdAt: new Date().toISOString(),
    })

    await postsCol.updateOne({ _id: new ObjectId(id) }, { $inc: { shareCount: 1 } })

    return NextResponse.json({ success: true, shareCount: (post.shareCount || 0) + 1 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
