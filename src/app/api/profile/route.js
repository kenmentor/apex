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
      bio: user.bio || '',
      school: user.school || '',
      department: user.department || '',
      level: user.level || '',
        avatar: user.avatar || '',
        cover: user.cover || '',
        avatarConfig: user.avatarConfig || null,
        role: user.role || 'student',
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
    if (!user) return NextResponse.json({ error: 'Session expired — please sign in again' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    // Safe coercion: old clients/docs can send non-strings (numbers, null).
    // Calling .trim() on those threw a 500 that surfaced as "Save failed".
    const str = v => (typeof v === 'string' ? v : v === undefined || v === null ? undefined : String(v))
    const { name, bio, school, avatar, cover, avatarConfig, department, level } = body || {}
    const update = {}
    const s = str(name); if (s !== undefined) update.name = s.trim()
    const b = str(bio); if (b !== undefined) update.bio = b.trim().slice(0, 160)
    const sc = str(school); if (sc !== undefined) update.school = sc.trim()
    const d = str(department); if (d !== undefined) update.department = d.trim()
    const l = str(level); if (l !== undefined) update.level = l.trim()
    if (cover !== undefined) {
      const c = str(cover) || ''
      const okCover = !c || c.startsWith('https://res.cloudinary.com/');
      if (!okCover) {
        return NextResponse.json({ error: 'Invalid cover URL' }, { status: 400 });
      }
      update.cover = c
    }
    if (avatar !== undefined) {
      const a = str(avatar) || ''
      // Google photos: the Firebase bridge itself stores lh3.googleusercontent
      // URLs as avatars — rejecting them here 400-blocked those users' saves.
      const okHost = !a || a.startsWith('https://res.cloudinary.com/') || a.startsWith('https://api.dicebear.com/') || /^https:\/\/lh\d\.googleusercontent\.com\//.test(a);
      if (!okHost) {
        return NextResponse.json({ error: 'Invalid avatar URL' }, { status: 400 });
      }
      update.avatar = a
    }
    if (avatarConfig !== undefined) {
      if (avatarConfig !== null && (typeof avatarConfig !== 'object' || Array.isArray(avatarConfig))) {
        return NextResponse.json({ error: 'Invalid avatar config' }, { status: 400 });
      }
      update.avatarConfig = avatarConfig
    }
    // Empty $set throws a Mongo 500 — return a clear 400 instead.
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
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
        role: updated.role || 'student',
        verified: !!updated.verified,
      name: updated.name || '',
      bio: updated.bio || '',
      avatar: updated.avatar || '',
      cover: updated.cover || '',
      avatarConfig: updated.avatarConfig || null,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
