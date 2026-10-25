import { NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { getUserFromToken } from '@/lib/auth-server'

// Per-media stats, keyed by URL.
// GET ?u=<url> → { views, upvotes, upvoted } (no counting).
// POST { url, action: 'view' | 'upvote' } → { views, upvotes, upvoted }
// - view: counted once per caller (client dedupes per session), no auth needed.
// - upvote: toggles the caller's vote, requires auth.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const cleanUrl = String(searchParams.get('u') || '').trim().slice(0, 1000)
    if (!cleanUrl) return NextResponse.json({ error: 'u required' }, { status: 400 })
    let email = null
    try { email = (await getUserFromToken(request))?.email || null } catch {}
    const col = await getCollection('media_stats')
    const doc = await col.findOne({ url: cleanUrl })
    return NextResponse.json({
      views: doc?.views || 0,
      upvotes: (doc?.upvotes || []).length,
      upvoted: email ? (doc?.upvotes || []).includes(email) : false,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { url, action } = await request.json()
    const cleanUrl = String(url || '').trim().slice(0, 1000)
    if (!cleanUrl || !['view', 'upvote'].includes(action)) {
      return NextResponse.json({ error: 'url + valid action required' }, { status: 400 })
    }

    let email = null
    try { email = (await getUserFromToken(request))?.email || null } catch {}

    const col = await getCollection('media_stats')

    if (action === 'view') {
      await col.updateOne(
        { url: cleanUrl },
        { $inc: { views: 1 }, $setOnInsert: { upvotes: [], createdAt: new Date().toISOString() } },
        { upsert: true }
      )
    }

    if (action === 'upvote') {
      if (!email) return NextResponse.json({ error: 'Sign in to upvote' }, { status: 401 })
      const doc = await col.findOne({ url: cleanUrl })
      const has = (doc?.upvotes || []).includes(email)
      if (has) {
        await col.updateOne({ url: cleanUrl }, { $pull: { upvotes: email } })
      } else {
        await col.updateOne(
          { url: cleanUrl },
          { $addToSet: { upvotes: email }, $setOnInsert: { views: 0, createdAt: new Date().toISOString() } },
          { upsert: true }
        )
      }
    }

    const doc = await col.findOne({ url: cleanUrl })
    return NextResponse.json({
      views: doc?.views || 0,
      upvotes: (doc?.upvotes || []).length,
      upvoted: email ? (doc?.upvotes || []).includes(email) : false,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
