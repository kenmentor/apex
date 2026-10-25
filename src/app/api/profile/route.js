import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const users = await getCollection('users')
    const user = await users.findOne({ email: email.toLowerCase().trim() })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    return NextResponse.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name || '',
      school: user.school || '',
      department: user.department || '',
      level: user.level || '',
      avatar: user.avatar || '',
      avatarConfig: user.avatarConfig || null,
      verified: !!user.verified,
      admin: !!user.admin,
      points: user.points || 0,
      streak: user.streak || 0,
      bestStreak: user.bestStreak || 0,
      createdAt: user.createdAt,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, school, avatar, avatarConfig, department, level } = await request.json()
    const update = {}
    if (name !== undefined) update.name = name.trim()
    if (school !== undefined) update.school = school.trim()
    if (department !== undefined) update.department = department.trim()
    if (level !== undefined) update.level = level.trim()
    if (avatar !== undefined) {
      const okHost = !avatar || avatar.startsWith('https://res.cloudinary.com/') || avatar.startsWith('https://api.dicebear.com/');
      if (!okHost) {
        return NextResponse.json({ error: 'Invalid avatar URL' }, { status: 400 });
      }
      update.avatar = avatar
    }
    if (avatarConfig !== undefined) {
      if (avatarConfig !== null && (typeof avatarConfig !== 'object' || Array.isArray(avatarConfig))) {
        return NextResponse.json({ error: 'Invalid avatar config' }, { status: 400 });
      }
      update.avatarConfig = avatarConfig
    }

    const users = await getCollection('users')
    await users.updateOne({ _id: user._id }, { $set: update })

    const updated = await users.findOne({ _id: user._id })
    return NextResponse.json({
      id: updated._id.toString(),
      email: updated.email,
      school: updated.school || '',
      department: updated.department || '',
      level: updated.level || '',
      admin: !!updated.admin,
      verified: !!updated.verified,
      name: updated.name || '',
      avatar: updated.avatar || '',
      avatarConfig: updated.avatarConfig || null,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
