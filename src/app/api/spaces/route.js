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

const VISIBILITIES = ['open', 'approval', 'invite']
const INVITE_POLICIES = ['admins', 'members']

function cleanSurvey(survey) {
  if (!Array.isArray(survey)) return []
  return survey
    .map(q => String(q || '').trim().slice(0, 140))
    .filter(Boolean)
    .slice(0, 5)
}

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

    // Invite-only groups stay hidden unless the requester is a member.
    // Groups without a visibility field (created before this shipped) stay listed.
    let email = null
    try { email = (await getUserFromToken(request))?.email || null } catch {}
    const filter = email
      ? { $or: [{ visibility: { $ne: 'invite' } }, { members: email }] }
      : { visibility: { $ne: 'invite' } }

    const docs = await col.find(filter).sort(sortObj).limit(limit).toArray()
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
    const { name, description, cover, color, postingPermission, intent, availability, maxSeats, department, level, visibility, rules, whoCanInvite, survey } = body
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    const col = await getCollection('spaces')
    const doc = {
      name: name.trim(),
      description: description?.trim() || '',
      cover: cover || null,
      color: color || '#130f40',
      postingPermission: postingPermission || 'everyone',
      intent: ['exam-cram', 'steady-a', 'casual'].includes(intent) ? intent : 'steady-a',
      availability: Array.isArray(availability) ? availability.filter(a => ['morning', 'night', 'weekend'].includes(a)) : [],
      maxSeats: Math.min(50, Math.max(2, Number(maxSeats) || 8)),
      maxSeatsEnforced: true,
      department: department?.trim() || user.department || '',
      level: level?.trim() || user.level || '',
      visibility: VISIBILITIES.includes(visibility) ? visibility : 'open',
      rules: String(rules || '').trim().slice(0, 500),
      whoCanInvite: INVITE_POLICIES.includes(whoCanInvite) ? whoCanInvite : 'members',
      survey: cleanSurvey(survey),
      admins: [user.email],
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
    const { id, name, description, cover, coverPublicId, color, postingPermission, intent, availability, maxSeats, visibility, rules, whoCanInvite, survey, admins } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const col = await getCollection('spaces')
    const space = await col.findOne({ _id: new ObjectId(id) })
    if (!space) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const isCreator = space.creatorEmail === user.email
    const isAdmin = isCreator || (space.admins || []).includes(user.email)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can edit' }, { status: 403 })
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
    if (intent !== undefined && ['exam-cram', 'steady-a', 'casual'].includes(intent)) update.intent = intent
    if (availability !== undefined && Array.isArray(availability)) update.availability = availability.filter(a => ['morning', 'night', 'weekend'].includes(a))
    if (maxSeats !== undefined) update.maxSeats = Math.min(50, Math.max(2, Number(maxSeats) || 8))
    if (maxSeats !== undefined || visibility !== undefined) update.maxSeatsEnforced = true
    if (visibility !== undefined && VISIBILITIES.includes(visibility)) update.visibility = visibility
    if (rules !== undefined) update.rules = String(rules || '').trim().slice(0, 500)
    if (whoCanInvite !== undefined && INVITE_POLICIES.includes(whoCanInvite)) update.whoCanInvite = whoCanInvite
    if (survey !== undefined) update.survey = cleanSurvey(survey)
    if (admins !== undefined) {
      if (!isCreator) return NextResponse.json({ error: 'Only the creator can change admins' }, { status: 403 })
      if (!Array.isArray(admins)) return NextResponse.json({ error: 'Invalid admins' }, { status: 400 })
      const members = space.members || []
      const list = [...new Set(admins.map(e => String(e || '').toLowerCase().trim()).filter(e => e && members.includes(e)))]
      if (!list.includes(space.creatorEmail)) list.push(space.creatorEmail)
      update.admins = list
    }

    await col.updateOne({ _id: new ObjectId(id) }, { $set: update })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
