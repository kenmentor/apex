import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { toId, normEmail, loadChain, canRead } from '@/lib/library'

export async function GET(request, { params }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const email = normEmail(user.email)
    const id = toId(params?.id)
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const nodesCol = await getCollection('library_nodes')
    const membersCol = await getCollection('library_members')
    const node = await nodesCol.findOne({ _id: id })
    if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { role } = await loadChain(nodesCol, membersCol, id, email)
    if (!canRead(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const rows = await membersCol.find({ $or: [{ nodeId: id }, { nodeId: String(id) }] }).limit(100).toArray().catch(() => [])
    return NextResponse.json({
      role,
      ownerEmail: node.ownerEmail,
      members: rows.map(r => ({ email: r.email, role: r.role, addedBy: r.addedBy || null, createdAt: r.createdAt || null })),
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const email = normEmail(user.email)
    const id = toId(params?.id)
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const nodesCol = await getCollection('library_nodes')
    const membersCol = await getCollection('library_members')
    const node = await nodesCol.findOne({ _id: id })
    if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (node.kind !== 'folder') return NextResponse.json({ error: 'Only folders can be shared' }, { status: 400 })
    const { role } = await loadChain(nodesCol, membersCol, id, email)
    if (role !== 'owner') return NextResponse.json({ error: 'Only the owner can share' }, { status: 403 })

    const body = await request.json()
    const targetEmail = normEmail(body?.email)
    const targetRole = body?.role === 'editor' ? 'editor' : 'viewer'
    if (!targetEmail || !targetEmail.includes('@')) return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    if (targetEmail === email) return NextResponse.json({ error: 'Cannot share with yourself' }, { status: 400 })
    if (targetEmail === normEmail(node.ownerEmail)) return NextResponse.json({ error: 'Already the owner' }, { status: 400 })

    const now = new Date().toISOString()
    await membersCol.updateOne(
      { nodeId: String(id), email: targetEmail },
      { $set: { nodeId: String(id), email: targetEmail, role: targetRole, addedBy: email, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true }
    )
    return NextResponse.json({ success: true, email: targetEmail, role: targetRole })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const email = normEmail(user.email)
    const id = toId(params?.id)
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    const { searchParams } = new URL(request.url)
    const targetEmail = normEmail(searchParams.get('email'))
    if (!targetEmail) return NextResponse.json({ error: 'email required' }, { status: 400 })

    const nodesCol = await getCollection('library_nodes')
    const membersCol = await getCollection('library_members')
    const node = await nodesCol.findOne({ _id: id })
    if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { role } = await loadChain(nodesCol, membersCol, id, email)

    // Leave flow: member removes self.
    if (targetEmail === email) {
      await membersCol.deleteMany({ $or: [{ nodeId: id }, { nodeId: String(id) }], email })
      return NextResponse.json({ success: true, left: true })
    }
    if (role !== 'owner') return NextResponse.json({ error: 'Only the owner can remove members' }, { status: 403 })
    await membersCol.deleteMany({ $or: [{ nodeId: id }, { nodeId: String(id) }], email: targetEmail })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
