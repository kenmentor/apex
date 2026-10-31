import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { toId, serializeNode, cleanName, normEmail, loadChain } from '@/lib/library'

function escRx(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function GET(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const email = normEmail(user.email)
    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId') || searchParams.get('id') || null
    const q = (searchParams.get('q') || '').trim()

    const nodesCol = await getCollection('library_nodes')
    const membersCol = await getCollection('library_members')

    // Specific folder view.
    if (parentId) {
      const oid = toId(parentId)
      if (!oid) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
      const node = await nodesCol.findOne({ _id: oid })
      if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      const { chain, role } = await loadChain(nodesCol, membersCol, oid, email)
      if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      const filter = { parentId: oid }
      if (q) filter.name = { $regex: escRx(q), $options: 'i' }
      const kids = await nodesCol.find(filter).sort({ kind: 1, name: 1 }).limit(200).toArray()
      return NextResponse.json({
        node: serializeNode(node),
        breadcrumb: chain,
        role,
        children: kids.map(serializeNode),
      })
    }

    // Root view: owned roots + shared-with-me roots.
    const nameFilter = q ? { name: { $regex: escRx(q), $options: 'i' } } : {}
    const owned = await nodesCol
      .find({ ownerEmail: email, parentId: null, ...nameFilter })
      .sort({ kind: 1, name: 1 })
      .limit(200)
      .toArray()

    const memberships = await membersCol.find({ email }).limit(100).toArray().catch(() => [])
    const sharedIds = [...new Set(memberships.map(m => String(m.nodeId)).filter(Boolean))]
    let shared = []
    if (sharedIds.length) {
      const { ObjectId } = await import('mongodb')
      const oids = sharedIds.map(id => { try { return new ObjectId(id) } catch { return null } }).filter(Boolean)
      if (oids.length) {
        shared = await nodesCol.find({ _id: { $in: oids }, ...nameFilter }).limit(100).toArray().catch(() => [])
      }
    }

    return NextResponse.json({
      node: null,
      breadcrumb: [],
      role: 'owner',
      children: owned.map(serializeNode),
      shared: shared.map(n => ({ ...serializeNode(n), sharedRole: memberships.find(m => String(m.nodeId) === String(n._id))?.role || 'viewer' })),
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const email = normEmail(user.email)
    const body = await request.json()
    const { kind, name, parentId, itemKind, refId, href, url, courseCode, subtitle, color, size, mime, isPublic, materialId } = body || {}

    if (!['folder', 'ref'].includes(kind)) return NextResponse.json({ error: 'kind must be folder|ref' }, { status: 400 })
    const clean = cleanName(name, kind === 'folder' ? 'New folder' : 'Untitled')
    if (kind === 'ref' && !href && !url && !refId) {
      return NextResponse.json({ error: 'ref needs href, url, or refId' }, { status: 400 })
    }

    const nodesCol = await getCollection('library_nodes')
    const membersCol = await getCollection('library_members')

    let parentOid = null
    if (parentId) {
      parentOid = toId(parentId)
      if (!parentOid) return NextResponse.json({ error: 'Invalid parentId' }, { status: 400 })
      const parent = await nodesCol.findOne({ _id: parentOid })
      if (!parent) return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
      if (parent.kind !== 'folder') return NextResponse.json({ error: 'Parent is not a folder' }, { status: 400 })
      const { role } = await loadChain(nodesCol, membersCol, parentOid, email)
      if (role !== 'owner' && role !== 'editor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date().toISOString()
    const doc = {
      ownerEmail: email,
      kind,
      name: clean,
      parentId: parentOid,
      itemKind: kind === 'folder' ? 'folder' : String(itemKind || 'link').slice(0, 24),
      refId: refId ? String(refId).slice(0, 120) : null,
      href: href ? String(href).slice(0, 500) : null,
      url: url ? String(url).slice(0, 1000) : null,
      courseCode: courseCode ? String(courseCode).slice(0, 32) : null,
      subtitle: subtitle ? String(subtitle).slice(0, 200) : null,
      color: color ? String(color).slice(0, 24) : null,
      size: Number.isFinite(Number(size)) ? Number(size) : null,
      mime: mime ? String(mime).slice(0, 100) : null,
      isPublic: isPublic === false ? false : true,
      materialId: materialId ? String(materialId).slice(0, 64) : (refId ? String(refId).slice(0, 64) : null),
      createdAt: now,
      updatedAt: now,
    }
    const result = await nodesCol.insertOne(doc)
    return NextResponse.json({ success: true, node: serializeNode({ ...doc, _id: result.insertedId }) }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
