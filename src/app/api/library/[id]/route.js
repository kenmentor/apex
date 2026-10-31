import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'
import { toId, serializeNode, cleanName, normEmail, loadChain, isDescendant, collectDescendants, canWrite } from '@/lib/library'

export async function PATCH(request, { params }) {
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
    if (!canWrite(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const update = { updatedAt: new Date().toISOString() }

    if (body.name !== undefined) {
      update.name = cleanName(body.name, node.name)
    }
    if (body.isPublic !== undefined) {
      update.isPublic = body.isPublic !== false
    }

    if (Object.prototype.hasOwnProperty.call(body, 'parentId')) {
      const rawDest = body.parentId
      let destOid = null
      if (rawDest) {
        destOid = toId(rawDest)
        if (!destOid) return NextResponse.json({ error: 'Invalid parentId' }, { status: 400 })
        if (String(destOid) === String(id)) return NextResponse.json({ error: 'Cannot move into itself' }, { status: 400 })
        const dest = await nodesCol.findOne({ _id: destOid })
        if (!dest) return NextResponse.json({ error: 'Destination not found' }, { status: 404 })
        if (dest.kind !== 'folder') return NextResponse.json({ error: 'Destination is not a folder' }, { status: 400 })
        const destAccess = await loadChain(nodesCol, membersCol, destOid, email)
        if (!canWrite(destAccess.role)) return NextResponse.json({ error: 'No write access to destination' }, { status: 403 })
        if (node.kind === 'folder' && await isDescendant(nodesCol, id, destOid)) {
          return NextResponse.json({ error: 'Cannot move folder into itself or descendant' }, { status: 400 })
        }
      } else {
        // Move to root: allowed (ownership stays with creator).
      }
      update.parentId = destOid
    }

    await nodesCol.updateOne({ _id: id }, { $set: update })
    const fresh = await nodesCol.findOne({ _id: id })
    return NextResponse.json({ success: true, node: serializeNode(fresh) })
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

    const nodesCol = await getCollection('library_nodes')
    const membersCol = await getCollection('library_members')
    const node = await nodesCol.findOne({ _id: id })
    if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { role } = await loadChain(nodesCol, membersCol, id, email)
    if (!canWrite(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // Editors cannot delete a shared root they don't own.
    if (!node.parentId && normEmail(node.ownerEmail) !== email) {
      return NextResponse.json({ error: 'Only the owner can delete a shared root' }, { status: 403 })
    }

    const desc = await collectDescendants(nodesCol, id, 500)
    const allIds = [id, ...desc]
    await nodesCol.deleteMany({ _id: { $in: allIds } })
    try {
      await membersCol.deleteMany({ nodeId: { $in: allIds.map(String) } })
      await membersCol.deleteMany({ nodeId: { $in: allIds } })
    } catch {}
    return NextResponse.json({ success: true, deleted: allIds.length })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
