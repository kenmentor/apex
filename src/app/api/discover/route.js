import { NextResponse } from 'next/server'
import { searchArchiveBooks, searchCommons } from '@/lib/discover'

// GET /api/discover?q=photosynthesis&type=all|pdf|image|audio
// Keyless web discovery returning DIRECT file links only — every result
// drops straight into the native PDF reader / image view / audio player.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim().slice(0, 120)
    const type = (searchParams.get('type') || 'all').toLowerCase()
    if (q.length < 2) return NextResponse.json({ items: [] })

    const jobs = []
    if (type === 'all' || type === 'pdf') jobs.push(searchArchiveBooks(q, 6))
    if (type === 'all' || type === 'image') jobs.push(searchCommons(q, 'image', 6))
    if (type === 'all' || type === 'audio') jobs.push(searchCommons(q, 'audio', 6))
    const groups = await Promise.all(jobs)

    // Interleave kinds so mixed results feel balanced, cap total.
    const items = []
    const maxLen = Math.max(0, ...groups.map(g => g.length))
    for (let i = 0; i < maxLen && items.length < 18; i++) {
      for (const g of groups) {
        if (g[i]) items.push(g[i])
        if (items.length >= 18) break
      }
    }
    return NextResponse.json({ items })
  } catch (error) {
    return NextResponse.json({ items: [], error: error.message })
  }
}
