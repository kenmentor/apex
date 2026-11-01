import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'

// GET /api/contribute/my-files?q= — flat list of the contributor's own files
// (library refs with a URL) for the "add from my folder" picker.
export async function GET(request) {
  try {
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const me = String(user.email).toLowerCase()
    const q = (new URL(request.url).searchParams.get('q') || '').trim().toLowerCase()
    const col = await getCollection('library_nodes')
    const docs = await col.find({ ownerEmail: me, kind: 'ref' }).sort({ updatedAt: -1 }).limit(200).toArray().catch(() => [])
    const items = docs
      .filter(d => d.url || d.href)
      .filter(d => !q || String(d.name || '').toLowerCase().includes(q))
      .map(d => ({
        id: String(d._id),
        name: d.name,
        kind: d.itemKind || 'file',
        url: d.url || d.href,
        courseCode: d.courseCode || null,
        materialId: d.materialId || null,
        updatedAt: d.updatedAt || null,
      }))
    return NextResponse.json({ items })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
