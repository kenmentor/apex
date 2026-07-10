import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'

export async function PUT(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, school, avatar } = await request.json()
    const update = {}
    if (name !== undefined) update.name = name.trim()
    if (school !== undefined) update.school = school.trim()
    if (avatar !== undefined) {
      if (avatar && !avatar.startsWith('https://res.cloudinary.com/')) {
        return NextResponse.json({ error: 'Invalid avatar URL' }, { status: 400 })
      }
      update.avatar = avatar
    }

    const users = await getCollection('users')
    await users.updateOne({ _id: user._id }, { $set: update })

    const updated = await users.findOne({ _id: user._id })
    return NextResponse.json({
      id: updated._id.toString(),
      email: updated.email,
      school: updated.school || '',
      admin: !!updated.admin,
      verified: !!updated.verified,
      name: updated.name || '',
      avatar: updated.avatar || '',
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
