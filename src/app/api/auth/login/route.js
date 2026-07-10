import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { signToken } from '@/lib/auth-server'

export async function POST(request) {
  try {
    const { email, school, department, level } = await request.json()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const users = await getCollection('users')
    const normalizedEmail = email.toLowerCase().trim()
    const existing = await users.findOne({ email: normalizedEmail })

    if (existing) {
      const hasSchool = !!(existing.school && existing.school.trim())
      const hasDept = !!(existing.department && existing.department.trim())
      const hasLevel = !!(existing.level && existing.level.trim())
      const token = signToken({ email: existing.email, admin: !!existing.admin })

      const updates = {}
      if (school !== undefined && school !== existing.school) updates.school = school.trim()
      if (department !== undefined && department !== existing.department) updates.department = department.trim()
      if (level !== undefined && level !== existing.level) updates.level = level.trim()
      if (Object.keys(updates).length > 0) {
        await users.updateOne({ _id: existing._id }, { $set: updates })
      }

      const needsSchool = !hasSchool && !school
      const needsDeptOrLevel = (!hasDept && !department) || (!hasLevel && !level)

      return NextResponse.json({
        id: existing._id.toString(),
        email: existing.email,
        school: school?.trim() || existing.school || '',
        department: department?.trim() || existing.department || '',
        level: level?.trim() || existing.level || '',
        admin: !!existing.admin,
        verified: !!existing.verified,
        name: existing.name || '',
        avatar: existing.avatar || '',
        token,
        isNewUser: false,
        needsSchool,
        needsDeptOrLevel: needsSchool ? false : needsDeptOrLevel,
      })
    }

    const result = await users.insertOne({
      email: normalizedEmail,
      school: school?.trim() || '',
      department: department?.trim() || '',
      level: level?.trim() || '',
      createdAt: new Date(),
      admin: false,
      verified: false,
      name: '',
      avatar: '',
    })

    const token = signToken({ email: normalizedEmail, admin: false })
    return NextResponse.json({
      id: result.insertedId.toString(),
      email: normalizedEmail,
      school: school?.trim() || '',
      department: department?.trim() || '',
      level: level?.trim() || '',
      admin: false,
      verified: false,
      name: '',
      avatar: '',
      token,
      isNewUser: true,
      needsSchool: !school,
      needsDeptOrLevel: false,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
