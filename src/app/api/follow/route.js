import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'

export async function POST(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { targetEmail, action } = await request.json()
    if (!targetEmail || !['follow', 'unfollow'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    if (targetEmail === user.email) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }

    const users = await getCollection('users')
    const target = await users.findOne({ email: targetEmail.toLowerCase().trim() })
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const col = await getCollection('follows')

    if (action === 'follow') {
      await col.updateOne(
        { follower: user.email, following: target.email },
        { $setOnInsert: { follower: user.email, following: target.email, createdAt: new Date() } },
        { upsert: true },
      )
    } else {
      await col.deleteOne({ follower: user.email, following: target.email })
    }

    const followersCount = await col.countDocuments({ following: target.email })
    const followingCount = await col.countDocuments({ follower: target.email })
    const isFollowing = !!(await col.findOne({ follower: user.email, following: target.email }))

    return NextResponse.json({ followersCount, followingCount, isFollowing })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const col = await getCollection('follows')
    const followersCount = await col.countDocuments({ following: email.toLowerCase().trim() })
    const followingCount = await col.countDocuments({ follower: email.toLowerCase().trim() })

    let isFollowing = false
    const token = request.headers.get('authorization')
    if (token?.startsWith('Bearer ')) {
      try {
        const user = await getUserFromToken(request)
        if (user) {
          isFollowing = !!(await col.findOne({ follower: user.email, following: email.toLowerCase().trim() }))
        }
      } catch {}
    }

    return NextResponse.json({ followersCount, followingCount, isFollowing })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
