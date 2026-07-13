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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const col = await getCollection('spaces')

    if (id) {
      const space = await col.findOne({ _id: new ObjectId(id) })
      if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(space)
    }

    const sort = searchParams.get('sort')
    const limit = parseInt(searchParams.get('limit') || '50')
    let sortObj = { createdAt: -1 }
    if (sort === 'popular') sortObj = { memberCount: -1 }

    const docs = await col.find({}).sort(sortObj).limit(limit).toArray()
    return NextResponse.json(docs)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { name, description, cover, color, postingPermission } = body
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    const col = await getCollection('spaces')
    const doc = {
      name: name.trim(),
      description: description?.trim() || '',
      cover: cover || null,
      color: color || '#130f40',
      postingPermission: postingPermission || 'everyone',
      creatorEmail: user.email,
      creatorName: user.name || user.email,
      members: [user.email],
      memberCount: 1,
      postCount: 0,
      createdAt: new Date().toISOString(),
    }

    const result = await col.insertOne(doc)
    return NextResponse.json({ success: true, id: result.insertedId.toString() }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { id, name, description, cover, coverPublicId, color, postingPermission } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const col = await getCollection('spaces')
    const space = await col.findOne({ _id: new ObjectId(id) })
    if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (space.creatorEmail !== user.email) {
      return NextResponse.json({ error: 'Only creator can edit' }, { status: 403 })
    }

    const update = {}
    if (name !== undefined) update.name = name.trim()
    if (description !== undefined) update.description = description?.trim() || ''
    if (cover !== undefined) {
      if (space.cover && space.cover !== cover && space.coverPublicId) {
        try { await cloudinary.v2.uploader.destroy(space.coverPublicId) } catch {}
      }
      update.cover = cover || null
      update.coverPublicId = coverPublicId || null
    }
    if (color !== undefined) update.color = color
    if (postingPermission !== undefined) update.postingPermission = postingPermission

    await col.updateOne({ _id: new ObjectId(id) }, { $set: update })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
