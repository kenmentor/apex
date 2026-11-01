import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getCollection } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-server'
import { notifyUser } from '@/lib/notify'

// GET /api/admin/review — the moderation queue. Editor publishes land here
// as `pending` instead of going live. The general admin sees every pending
// question / note / file, with GitHub-style conflict groups when two or more
// items look like the same content, then approves, rejects, merges or revokes.
const COLLECTIONS = ['questions', 'readings', 'user_materials']
const STOP = new Set('the and for with from that this these those are were has have had not but you your can all any per via into over under about its our out who whom which what when where while would there their they them they then than that these those also such into onto upon de la y e der die das und the'.split(/\s+/))

function normTitle(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

function sigTokens(s) {
  return [...new Set(normTitle(s).split(' ').filter(w => w.length > 3 && !STOP.has(w)))]
}

function similarity(a, b) {
  if (!a.length || !b.length) return 0
  const setB = new Set(b)
  const overlap = a.filter(w => setB.has(w)).length
  return overlap / Math.max(a.length, b.length)
}

function titleOf(d) {
  return d.title || d.fileName || d.question || 'Untitled'
}

function toItem(collection, d) {
  const base = {
    collection,
    id: String(d._id),
    title: titleOf(d),
    kind: d.questionType || d.itemKind || (collection === 'readings' ? 'notes' : 'file'),
    courseCode: d.courseCode || null,
    topic: d.topic || d.section || null,
    author: d.authorEmail || d.ownerEmail || d.addedBy || null,
    createdAt: d.createdAt || null,
    status: d.status || 'approved',
    reviewedBy: d.reviewedBy || null,
    reviewedAt: d.reviewedAt || null,
  }
  if (collection === 'questions') {
    base.preview = {
      question: d.question, options: d.options || null,
      correctAnswer: d.correctAnswer ?? d.correct_answer ?? null,
      blankAnswers: d.blankAnswers || null, pairs: d.pairs || null,
      explanation: d.explanation || null,
    }
  } else if (collection === 'readings') {
    const plain = String(d.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    base.preview = { title: d.title, snippet: plain.slice(0, 400), content: d.content || '' }
  } else {
    base.preview = {
      fileName: d.fileName, url: d.url || null, mime: d.mime || null,
      size: d.size ?? null, itemKind: d.itemKind || null, description: d.description || null,
    }
  }
  return base
}

function conflictKey(items) {
  // Group by course + first significant token so the UI gets stable groups.
  const toks = items.map(i => sigTokens(i.title)[0] || normTitle(i.title).slice(0, 12)).sort()
  return `${items[0]?.courseCode || 'general'}::${toks[0] || 'misc'}`
}

export async function GET(request) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

    const [qCol, rCol, mCol] = await Promise.all([
      getCollection('questions').catch(() => null),
      getCollection('readings').catch(() => null),
      getCollection('user_materials').catch(() => null),
    ])

    const [qPend, rPend, mPend, qRecent, rRecent, mRecent] = await Promise.all([
      qCol ? qCol.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(100).toArray().catch(() => []) : [],
      rCol ? rCol.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(100).toArray().catch(() => []) : [],
      mCol ? mCol.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(100).toArray().catch(() => []) : [],
      qCol ? qCol.find({ status: { $in: ['approved', 'rejected', 'revoked'] } }).sort({ reviewedAt: -1, createdAt: -1 }).limit(30).toArray().catch(() => []) : [],
      rCol ? rCol.find({ status: { $in: ['approved', 'rejected', 'revoked'] } }).sort({ reviewedAt: -1, createdAt: -1 }).limit(30).toArray().catch(() => []) : [],
      mCol ? mCol.find({ status: { $in: ['approved', 'rejected', 'revoked'] } }).sort({ reviewedAt: -1, createdAt: -1 }).limit(30).toArray().catch(() => []) : [],
    ])

    const pending = [
      ...qPend.map(d => toItem('questions', d)),
      ...rPend.map(d => toItem('readings', d)),
      ...mPend.map(d => toItem('user_materials', d)),
    ].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))

    const recent = [
      ...qRecent.map(d => toItem('questions', d)),
      ...rRecent.map(d => toItem('readings', d)),
      ...mRecent.map(d => toItem('user_materials', d)),
    ].sort((a, b) => String(b.reviewedAt || b.createdAt || '').localeCompare(String(a.reviewedAt || a.createdAt || ''))).slice(0, 60)

    // Conflict detection (GitHub-style): same course + same file URL, or
    // same course + titles that match / heavily overlap. Compares each
    // pending item against other pending items AND live items.
    const [qLive, rLive, mLive] = await Promise.all([
      qCol ? qCol.find({ status: { $nin: ['pending', 'rejected', 'revoked'] } }).limit(2000).toArray().catch(() => []) : [],
      rCol ? rCol.find({ status: { $nin: ['pending', 'rejected', 'revoked'] } }).limit(2000).toArray().catch(() => []) : [],
      mCol ? mCol.find({ status: { $nin: ['pending', 'rejected', 'revoked'] }, isPublic: { $ne: false } }).limit(2000).toArray().catch(() => []) : [],
    ])
    const live = [
      ...qLive.map(d => ({ ...toItem('questions', d), live: true })),
      ...rLive.map(d => ({ ...toItem('readings', d), live: true })),
      ...mLive.map(d => ({ ...toItem('user_materials', d), live: true })),
    ]

    const groups = new Map()
    const seenPairs = new Set()
    const consider = (item, other) => {
      if (item.id === other.id && item.collection === other.collection) return false
      if ((item.courseCode || '') !== (other.courseCode || '')) return false
      const urlA = item.preview?.url
      const urlB = other.preview?.url
      if (urlA && urlB && urlA === urlB) return true
      const ta = normTitle(item.title)
      const tb = normTitle(other.title)
      if (!ta || !tb) return false
      if (ta === tb) return true
      const sim = similarity(sigTokens(item.title), sigTokens(other.title))
      return sim >= 0.6
    }
    for (const p of pending) {
      const matches = [p]
      for (const o of [...pending, ...live]) {
        if (o === p) continue
        const pairKey = [p.collection + p.id, o.collection + o.id].sort().join('|')
        if (seenPairs.has(pairKey)) continue
        if (consider(p, o)) {
          matches.push(o)
          seenPairs.add(pairKey)
        }
      }
      if (matches.length > 1) {
        const key = conflictKey(matches)
        if (!groups.has(key)) groups.set(key, [])
        const g = groups.get(key)
        for (const m of matches) {
          if (!g.some(x => x.collection === m.collection && x.id === m.id)) g.push(m)
        }
      }
    }
    // Only groups with at least 2 pending, or pending-vs-live, matter.
    const conflicts = [...groups.values()]
      .filter(g => g.filter(i => !i.live).length >= 1 && g.length > 1)
      .sort((a, b) => b.length - a.length)

    return NextResponse.json({
      counts: { pending: pending.length, conflicts: conflicts.length },
      pending, recent, conflicts,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/admin/review — approve | reject | revoke | merge.
export async function POST(request) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    const body = await request.json()
    const { collection, id, action, keepId, dropIds } = body || {}
    if (!COLLECTIONS.includes(collection)) return NextResponse.json({ error: 'Bad collection' }, { status: 400 })
    const col = await getCollection(collection)
    const me = String(admin.email).toLowerCase()
    const now = new Date().toISOString()
    const oid = (() => { try { return new ObjectId(String(id)) } catch { return null } })()
    if (!oid) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const target = await col.findOne({ _id: oid })
    const contributorOf = (d) => d ? String(d.authorEmail || d.ownerEmail || d.addedBy || '') : ''
    const titleOf = (d) => String(d?.title || d?.fileName || d?.question || 'Your submission').slice(0, 100)
    const linkFor = (d, collectionName) => {
      const slug = String(d?.courseCode || '').toLowerCase().replace(/\s+/g, '')
      if (collectionName === 'questions' && slug) return `/courses/${slug}/quiz`
      if (collectionName === 'readings' && slug) return `/courses/${slug}/theory`
      if (collectionName === 'user_materials') return '/folders'
      return '/contribute'
    }

    if (action === 'merge') {
      const keepOid = (() => { try { return new ObjectId(String(keepId)) } catch { return null } })()
      if (!keepOid || !Array.isArray(dropIds) || !dropIds.length) {
        return NextResponse.json({ error: 'merge needs keepId + dropIds' }, { status: 400 })
      }
      const dropOids = dropIds.map(x => { try { return new ObjectId(String(x)) } catch { return null } }).filter(Boolean)
      await col.updateOne({ _id: keepOid }, { $set: { status: 'approved', isPublic: true, reviewedBy: me, reviewedAt: now, updatedAt: now } })
      await col.updateMany({ _id: { $in: dropOids } }, { $set: { status: 'rejected', isPublic: false, reviewedBy: me, reviewedAt: now, updatedAt: now } })
      const keep = await col.findOne({ _id: keepOid })
      const drops = await col.find({ _id: { $in: dropOids } }).toArray().catch(() => [])
      if (keep) {
        notifyUser(contributorOf(keep), {
          type: 'contribute', title: 'Approved ✓ — now live',
          message: `${titleOf(keep)} · merged as the kept copy`,
          link: linkFor(keep, collection),
        }).catch(() => {})
      }
      for (const d of drops) {
        notifyUser(contributorOf(d), {
          type: 'contribute', title: 'Merged into another copy',
          message: `${titleOf(d)} · a duplicate was kept instead`,
          link: '/contribute',
        }).catch(() => {})
      }
      return NextResponse.json({ success: true, merged: true, kept: String(keepId), dropped: dropIds.length })
    }

    if (!['approve', 'reject', 'revoke'].includes(action)) {
      return NextResponse.json({ error: 'Bad action' }, { status: 400 })
    }
    const patch = action === 'approve'
      ? { status: 'approved', isPublic: true }
      : action === 'reject'
        ? { status: 'rejected', isPublic: false }
        : { status: 'revoked', isPublic: false }
    const res = await col.updateOne({ _id: oid }, { $set: { ...patch, reviewedBy: me, reviewedAt: now, updatedAt: now } })
    if (!res.matchedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (target) {
      const msg = action === 'approve'
        ? { title: 'Approved ✓ — now live', message: `${titleOf(target)} · visible to everyone` }
        : action === 'reject'
          ? { title: 'Not approved', message: `${titleOf(target)} · tweak it and resubmit` }
          : { title: 'Taken down', message: `${titleOf(target)} · removed from public views` }
      notifyUser(contributorOf(target), { type: 'contribute', ...msg, link: linkFor(target, collection) }).catch(() => {})
    }
    return NextResponse.json({ success: true, action })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
