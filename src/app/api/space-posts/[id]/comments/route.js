import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { ObjectId } from 'mongodb'

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const col = await getCollection('space_comments')
    const docs = await col
      .find({ postId: id })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray()
    return NextResponse.json(docs)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { content } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 })
    }

    const postsCol = await getCollection('space_posts')
    const post = await postsCol.findOne({ _id: new ObjectId(id) })
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    const commentsCol = await getCollection('space_comments')
    const doc = {
      postId: id,
      content: content.trim(),
      authorEmail: user.email,
      authorName: user.name || user.email,
      authorAvatar: user.avatar || null,
      createdAt: new Date().toISOString(),
    }

    const result = await commentsCol.insertOne(doc)
    await postsCol.updateOne({ _id: new ObjectId(id) }, { $inc: { commentCount: 1 } })

    return NextResponse.json({ success: true, id: result.insertedId.toString(), doc }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
