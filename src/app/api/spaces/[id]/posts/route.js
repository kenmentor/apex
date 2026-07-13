import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { ObjectId } from 'mongodb'
import cloudinary from 'cloudinary'

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

function extractPublicId(url) {
  if (!url) return null
  try {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/)
    return match ? match[1] : null
  } catch { return null }
}

export async function GET(request, { params }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100)

    const col = await getCollection('space_posts')
    const docs = await col
      .find({ spaceId: id })
      .sort({ createdAt: -1 })
      .limit(limit)
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
    const spacesCol = await getCollection('spaces')
    const space = await spacesCol.findOne({ _id: new ObjectId(id) })
    if (!space) return NextResponse.json({ error: 'Space not found' }, { status: 404 })
    if (!space.members?.includes(user.email)) {
      return NextResponse.json({ error: 'Must join space first' }, { status: 403 })
    }
    if (space.postingPermission === 'creator_only' && space.creatorEmail !== user.email) {
      return NextResponse.json({ error: 'Only the space creator can post' }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, media, label } = body

    if (!title?.trim() && !content?.trim() && (!media || media.length === 0)) {
      return NextResponse.json({ error: 'Post cannot be empty' }, { status: 400 })
    }

    const postsCol = await getCollection('space_posts')
    const doc = {
      spaceId: id,
      title: title?.trim() || null,
      content: content?.trim() || null,
      label: label || null,
      media: media || [],
      authorEmail: user.email,
      authorName: user.name || user.email,
      authorAvatar: user.avatar || null,
      likes: [],
      likeCount: 0,
      commentCount: 0,
      createdAt: new Date().toISOString(),
    }

    const result = await postsCol.insertOne(doc)
    await spacesCol.updateOne({ _id: new ObjectId(id) }, { $inc: { postCount: 1 } })

    return NextResponse.json({ success: true, id: result.insertedId.toString() }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { postId } = body
    if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 })

    const spacesCol = await getCollection('spaces')
    const space = await spacesCol.findOne({ _id: new ObjectId(id) })
    if (!space) return NextResponse.json({ error: 'Space not found' }, { status: 404 })

    const postsCol = await getCollection('space_posts')
    const post = await postsCol.findOne({ _id: new ObjectId(postId) })
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    if (post.spaceId !== id) return NextResponse.json({ error: 'Post does not belong to this space' }, { status: 400 })

    const isPostAuthor = post.authorEmail === user.email
    const isSpaceCreator = space.creatorEmail === user.email
    if (!isPostAuthor && !isSpaceCreator) {
      return NextResponse.json({ error: 'Not authorized to delete this post' }, { status: 403 })
    }

    await postsCol.deleteOne({ _id: new ObjectId(postId) })
    await spacesCol.updateOne({ _id: new ObjectId(id) }, { $inc: { postCount: -1 } })

    const commentsCol = await getCollection('space_comments')
    await commentsCol.deleteMany({ postId })

    if (post.media && post.media.length > 0) {
      for (const m of post.media) {
        const pid = m.publicId || extractPublicId(m.url)
        if (pid) {
          let resourceType = 'image'
          if (m.type === 'video') resourceType = 'video'
          else if (m.type === 'audio') resourceType = 'video'
          else if (m.type === 'pdf' || m.type === 'file') resourceType = 'raw'
          try { await cloudinary.v2.uploader.destroy(pid, { resource_type: resourceType }) } catch {}
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
