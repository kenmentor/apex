import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { toId, serializeNode, normEmail, loadChain, canRead, canWrite, collectDescendants } from '@/lib/library'

const COPY_CAP = 200

export async function POST(request, { params }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const email = normEmail(user.email)
    const id = toId(params?.id)
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const nodesCol = await getCollection('library_nodes')
    const membersCol = await getCollection('library_members')
    const src = await nodesCol.findOne({ _id: id })
    if (!src) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const srcAccess = await loadChain(nodesCol, membersCol, id, email)
    if (!canRead(srcAccess.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json().catch(() => ({}))
    let destOid = null
    if (body.parentId) {
      destOid = toId(body.parentId)
      if (!destOid) return NextResponse.json({ error: 'Invalid parentId' }, { status: 400 })
      const dest = await nodesCol.findOne({ _id: destOid })
      if (!dest) return NextResponse.json({ error: 'Destination not found' }, { status: 404 })
      if (dest.kind !== 'folder') return NextResponse.json({ error: 'Destination is not a folder' }, { status: 400 })
      const destAccess = await loadChain(nodesCol, membersCol, destOid, email)
      if (!canWrite(destAccess.role)) return NextResponse.json({ error: 'No write access to destination' }, { status: 403 })
    } else if (src.parentId) {
      const parentOid = src.parentId instanceof ObjectId ? src.parentId : toId(src.parentId)
      const parentAccess = await loadChain(nodesCol, membersCol, parentOid, email)
      if (!canWrite(parentAccess.role)) return NextResponse.json({ error: 'No write access to destination' }, { status: 403 })
      destOid = parentOid
    }
    // destOid null = copy to root (always allowed for authenticated user).

    const descIds = src.kind === 'folder' ? await collectDescendants(nodesCol, id, COPY_CAP + 1) : []
    if (descIds.length + 1 > COPY_CAP) {
      return NextResponse.json({ error: `Copy too large (>${COPY_CAP} items)` }, { status: 413 })
    }
    const allSrc = [src, ...(descIds.length ? await nodesCol.find({ _id: { $in: descIds } }).toArray() : [])]
    const byId = new Map(allSrc.map(n => [String(n._id), n]))

    // Collision suffix for top-level copy.
    let topName = body.name ? String(body.name).slice(0, 120) : src.name
    const siblingFilter = destOid ? { parentId: destOid } : { parentId: null, ownerEmail: email }
    const clash = await nodesCol.findOne({ ...siblingFilter, name: topName }, { projection: { _id: 1 } })
    if (clash) topName = `${topName} (copy)`.slice(0, 120)

    const now = new Date().toISOString()
    const idMap = new Map()
    // Order: parents before children (BFS from source).
    const ordered = []
    const queue = [String(src._id)]
    while (queue.length) {
      const cur = queue.shift()
      const n = byId.get(cur)
      if (!n || ordered.includes(cur)) continue
      ordered.push(cur)
      for (const [k, v] of byId) {
        const p = v.parentId ? String(v.parentId) : null
        if (p === cur && !ordered.includes(k)) queue.push(k)
      }
    }

    let newRootId = null
    for (const cur of ordered) {
      const n = byId.get(cur)
      const isRoot = cur === String(src._id)
      const newParent = isRoot ? destOid : (idMap.get(String(n.parentId)) || destOid)
      const doc = {
        ownerEmail: email,
        kind: n.kind,
        name: isRoot ? topName : n.name,
        parentId: newParent,
        itemKind: n.itemKind || (n.kind === 'folder' ? 'folder' : 'link'),
        refId: n.refId || null,
        href: n.href || null,
        url: n.url || null,
        courseCode: n.courseCode || null,
        subtitle: n.subtitle || null,
        color: n.color || null,
        createdAt: now,
        updatedAt: now,
      }
      const res = await nodesCol.insertOne(doc)
      idMap.set(cur, res.insertedId)
      if (isRoot) newRootId = res.insertedId
    }

    const fresh = await nodesCol.findOne({ _id: newRootId })
    return NextResponse.json({ success: true, node: serializeNode(fresh), copied: ordered.length }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
