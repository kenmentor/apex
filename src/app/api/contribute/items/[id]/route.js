import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'

function canContribute(user) {
  return !!user && (!!user.admin || ['editor', 'official', 'admin'].includes(user.role))
}

function toId(id) {
  try { return new ObjectId(String(id)) } catch { return null }
}

// DELETE /api/contribute/items/[id] — remove from MY scope view.
// Your own scope copy is deleted; anyone else's copy and the stored file
// itself are untouched — content never goes out because you removed yours.
export async function DELETE(request, { params }) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canContribute(user)) return NextResponse.json({ error: 'Contributor only' }, { status: 403 })
    const me = String(user.email).toLowerCase()
    const id = toId(params?.id)
    if (!id) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    const col = await getCollection('user_materials')
    const doc = await col.findOne({ _id: id })
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (String(doc.addedBy || doc.ownerEmail || '').toLowerCase() === me) {
      await col.deleteOne({ _id: id })
      return NextResponse.json({ success: true, removed: true })
    }
    await col.updateOne(
      { _id: id },
      { $addToSet: { hiddenBy: me }, $set: { updatedAt: new Date().toISOString() } }
    )
    return NextResponse.json({ success: true, hidden: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
