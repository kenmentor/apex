import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

    const spacesCol = await getCollection('spaces')
    const userSpaces = await spacesCol.find({ members: email.toLowerCase().trim() }).toArray()
    const spaceMap = {}
    const spaceIds = []

    for (const s of userSpaces) {
      const id = s._id.toString()
      spaceMap[id] = { id, name: s.name, color: s.color }
      spaceIds.push(id)
    }

    if (spaceIds.length === 0) return NextResponse.json([])

    const postsCol = await getCollection('space_posts')
    const docs = await postsCol
      .find({ spaceId: { $in: spaceIds } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray()

    const items = docs.map(d => ({
      _id: d._id.toString(),
      space: spaceMap[d.spaceId] || { id: d.spaceId },
      title: d.title,
      content: d.content,
      label: d.label,
      media: d.media,
      authorName: d.authorName,
      authorAvatar: d.authorAvatar,
      likeCount: d.likeCount || 0,
      commentCount: d.commentCount || 0,
      shareCount: d.shareCount || 0,
      createdAt: d.createdAt,
    }))

    return NextResponse.json(items)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
