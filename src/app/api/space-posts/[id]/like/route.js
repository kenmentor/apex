import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { ObjectId } from 'mongodb'

export async function POST(request, { params }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const col = await getCollection('space_posts')
    const post = await col.findOne({ _id: new ObjectId(id) })
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const hasLiked = post.likes?.includes(user.email)

    if (hasLiked) {
      await col.updateOne({ _id: new ObjectId(id) }, { $pull: { likes: user.email }, $inc: { likeCount: -1 } })
      return NextResponse.json({ liked: false, likeCount: (post.likeCount || 1) - 1 })
    } else {
      await col.updateOne({ _id: new ObjectId(id) }, { $addToSet: { likes: user.email }, $inc: { likeCount: 1 } })
      return NextResponse.json({ liked: true, likeCount: (post.likeCount || 0) + 1 })
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
