import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'

export async function POST(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { subscription } = body

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    const col = await getCollection('push_subscriptions')

    const existing = await col.findOne({
      userEmail: user.email,
      'subscription.endpoint': subscription.endpoint,
    })

    if (existing) {
      await col.updateOne(
        { _id: existing._id },
        { $set: { subscription, updatedAt: new Date().toISOString() } }
      )
      return NextResponse.json({ success: true })
    }

    await col.insertOne({
      userEmail: user.email,
      subscription,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('POST /api/push/subscribe error:', err)
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')

    const col = await getCollection('push_subscriptions')

    if (endpoint) {
      await col.deleteOne({ userEmail: user.email, 'subscription.endpoint': endpoint })
    } else {
      await col.deleteMany({ userEmail: user.email })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/push/subscribe error:', err)
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
  }
}
