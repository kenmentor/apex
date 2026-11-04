import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { getCollection } from '@/lib/db'
import { signToken } from '@/lib/auth-server'

// POST /api/auth/clerk — bridge a Clerk session into an Apex app session.
// Verifies the Clerk session server-side (cookie), matches the app user by
// email (existing accounts keep everything: role, admin, content), creates
// the doc for first-timers, and returns the standard app session + JWT so
// every existing getUser()/getToken() call site keeps working unchanged.
export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Not signed in with Clerk' }, { status: 401 })
    const cu = await currentUser()
    const email = String(cu?.primaryEmailAddress?.emailAddress || '').toLowerCase().trim()
    if (!email) return NextResponse.json({ error: 'Clerk account has no email' }, { status: 400 })

    const name = [cu?.firstName, cu?.lastName].filter(Boolean).join(' ').trim()
      || cu?.username || String(cu?.fullName || '').trim()
    const photo = cu?.imageUrl || ''
    const now = new Date()

    const users = await getCollection('users')
    let user = await users.findOne({ email })
    let isNewUser = false
    if (!user) {
      isNewUser = true
      const res = await users.insertOne({
        email,
        name,
        school: '',
        department: '',
        level: '',
        role: 'student',
        university: '',
        createdAt: now,
        admin: false,
        verified: true, // Google-verified email
        avatar: photo,
        avatarConfig: null,
        clerkId: userId,
        authProvider: 'google',
      })
      user = await users.findOne({ _id: res.insertedId })
    } else {
      // Returning Google user: heal linkage + backfill missing bits.
      const heal = { verified: true, updatedAt: now }
      if (!user.clerkId) heal.clerkId = userId
      if (!user.authProvider) heal.authProvider = user.passwordHash ? 'password+google' : 'google'
      if (!user.name && name) heal.name = name
      if (!user.avatar && photo) heal.avatar = photo
      await users.updateOne({ _id: user._id }, { $set: heal })
      user = await users.findOne({ _id: user._id })
    }

    const hasSchool = !!(user.school && String(user.school).trim())
    const hasDept = !!(user.department && String(user.department).trim())
    const hasLevel = !!(user.level && String(user.level).trim())
    const token = signToken({ email: user.email, admin: !!user.admin })

    return NextResponse.json({
      id: user._id.toString(),
      email: user.email,
      school: user.school || '',
      department: user.department || '',
      level: user.level || '',
      admin: !!user.admin,
      role: user.role || 'student',
      verified: true,
      name: user.name || name || '',
      avatar: user.avatar || '',
      avatarConfig: user.avatarConfig || null,
      token,
      isNewUser,
      needsSchool: !hasSchool,
      needsDeptOrLevel: !hasDept || !hasLevel,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Bridge failed: ' + error.message }, { status: 500 })
  }
}
