import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getCollection } from '@/lib/db'
import { requireAdmin } from '@/lib/auth-server'
import { notifyAdmins, notifyUser } from '@/lib/notify'

// GET /api/admin/review — the moderation queue. Editor publishes land here
// as `pending` instead of going live. The general admin sees every pending
// question / note / file plus community edit suggestions, with GitHub-style
// conflict groups when two or more items look like the same content, then
// approves, rejects, merges, reverts or applies suggestions.
const COLLECTIONS = ['questions', 'readings', 'user_materials']
const STOP = new Set('the and for with from that this these those are were has have had not but you your can all any per via into over under about its our out who whom which what when where while would there their they them they then than that these those also such into onto upon de la y e der die das und the'.split(/\s+/))

// Fields snapshotted per version (enough to restore a bad merge / bad edit).
const SNAP_FIELDS = {
  questions: ['question', 'questionType', 'options', 'correctAnswer', 'blankAnswers', 'pairs', 'explanation', 'imageUrl', 'audioUrl', 'followupKind', 'subQuestions', 'vignette', 'station', 'checklist', 'stages', 'modelAnswer', 'followups', 'rubric', 'marks', 'section'],
  readings: ['title', 'content'],
  user_materials: ['title', 'fileName', 'url', 'itemKind', 'description', 'mime', 'size', 'courseCode', 'topic', 'isPublic'],
}

function snapshotOf(collection, d) {
  const snap = { status: d.status || 'approved' }
  for (const k of SNAP_FIELDS[collection] || []) {
    if (d[k] !== undefined) {
      try {
        const v = JSON.parse(JSON.stringify(d[k]))
        snap[k] = typeof v === 'string' && v.length > 50000 ? v.slice(0, 50000) : v
      } catch { snap[k] = null }
    }
  }
  return snap
}

async function pushVersion(col, doc, { by, note }) {
  const versions = Array.isArray(doc.versions) ? doc.versions : []
  const entry = { v: versions.length + 1, at: new Date().toISOString(), by, note }
  try {
    entry.snapshot = snapshotOf(doc.__collection, doc)
  } catch { entry.snapshot = null }
  await col.updateOne({ _id: doc._id }, { $set: { versions: [...versions, entry], updatedAt: new Date().toISOString() } })
  return entry
}

function withCollection(d, collection) {
  if (!d || typeof d !== 'object') return d
  try { Object.defineProperty(d, '__collection', { value: collection, enumerable: false }) } catch {}
  d.__collection = collection
  return d
}

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

function shortVal(v, n = 140) {
  try {
    const s = typeof v === 'string' ? v : JSON.stringify(v)
    const clean = String(s ?? '').replace(/\s+/g, ' ').trim()
    return clean.length > n ? clean.slice(0, n - 1).trimEnd() + '…' : clean
  } catch { return '—' }
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
    reviewNote: d.reviewNote || null,
    changeNote: d.changeNote || null,
    references: Array.isArray(d.references) ? d.references : [],
    attachments: Array.isArray(d.attachments) ? d.attachments : [],
    versions: (Array.isArray(d.versions) ? d.versions : []).map((v, i) => ({
      v: v.v, at: v.at, by: v.by, note: v.note, idx: i,
      hasSnapshot: !!v.snapshot,
    })),
    hasHistory: Array.isArray(d.versions) && d.versions.length > 0,
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

function toSuggestion(s, target) {
  const diffs = []
  const patch = s.patch || {}
  for (const [k, v] of Object.entries(patch)) {
    diffs.push({ key: k, from: shortVal(target ? target[k] : undefined, 200), to: shortVal(v, 200) })
  }
  return {
    collection: 'suggestions',
    id: String(s._id),
    title: `Edit: ${s.targetTitle || titleOf(target || {})}`,
    kind: 'suggestion',
    courseCode: s.targetCourse || target?.courseCode || null,
    topic: s.targetTopic || target?.topic || target?.section || null,
    author: s.suggestedBy || null,
    createdAt: s.createdAt || null,
    status: s.status || 'pending',
    reviewedBy: s.reviewedBy || null,
    reviewedAt: s.reviewedAt || null,
    reviewNote: s.reviewNote || null,
    targetRef: { collection: s.collection, id: String(s.targetId) },
    preview: {
      note: s.note || '', references: Array.isArray(s.references) ? s.references : [],
      diffs, targetTitle: s.targetTitle || titleOf(target || {}),
    },
  }
}

export async function GET(request) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

    const [qCol, rCol, mCol, sCol] = await Promise.all([
      getCollection('questions').catch(() => null),
      getCollection('readings').catch(() => null),
      getCollection('user_materials').catch(() => null),
      getCollection('suggestions').catch(() => null),
    ])

    const [qPend, rPend, mPend, qRecent, rRecent, mRecent, sPend, sRecent] = await Promise.all([
      qCol ? qCol.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(100).toArray().catch(() => []) : [],
      rCol ? rCol.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(100).toArray().catch(() => []) : [],
      mCol ? mCol.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(100).toArray().catch(() => []) : [],
      qCol ? qCol.find({ status: { $in: ['approved', 'rejected', 'revoked'] } }).sort({ reviewedAt: -1, createdAt: -1 }).limit(30).toArray().catch(() => []) : [],
      rCol ? rCol.find({ status: { $in: ['approved', 'rejected', 'revoked'] } }).sort({ reviewedAt: -1, createdAt: -1 }).limit(30).toArray().catch(() => []) : [],
      mCol ? mCol.find({ status: { $in: ['approved', 'rejected', 'revoked'] } }).sort({ reviewedAt: -1, createdAt: -1 }).limit(30).toArray().catch(() => []) : [],
      sCol ? sCol.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(100).toArray().catch(() => []) : [],
      sCol ? sCol.find({ status: { $in: ['approved', 'rejected'] } }).sort({ reviewedAt: -1, createdAt: -1 }).limit(30).toArray().catch(() => []) : [],
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

    // Resolve suggestion targets for diffs + titles.
    const targetCols = { questions: qCol, readings: rCol, user_materials: mCol }
    async function resolveTarget(s) {
      const col = targetCols[s.collection]
      if (!col || !s.targetId) return null
      try { return await col.findOne({ _id: new ObjectId(String(s.targetId)) }) } catch { return null }
    }
    const suggestions = []
    for (const s of sPend) suggestions.push(toSuggestion(s, await resolveTarget(s)))
    const recentSuggestions = []
    for (const s of sRecent) recentSuggestions.push(toSuggestion(s, await resolveTarget(s)))

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
      counts: { pending: pending.length, conflicts: conflicts.length, suggestions: suggestions.length },
      pending, recent, conflicts, suggestions, recentSuggestions,
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

const SUGGEST_WHITELIST = {
  questions: ['question', 'options', 'correctAnswer', 'correctAnswers', 'blankAnswers', 'explanation'],
  readings: ['title', 'content'],
  user_materials: ['title', 'description', 'url'],
}

// POST /api/admin/review — approve | reject | revoke | merge | revert |
// suggest-approve | suggest-reject.
export async function POST(request) {
  try {
    const admin = await requireAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    const body = await request.json()
    const { collection, id, action, keepId, dropIds, note, suggestionId } = body || {}
    const me = String(admin.email).toLowerCase()
    const now = new Date().toISOString()
    const toOid = (x) => { try { return new ObjectId(String(x)) } catch { return null } }

    const contributorOf = (d) => d ? String(d.authorEmail || d.ownerEmail || d.addedBy || '') : ''
    const titleOf = (d) => String(d?.title || d?.fileName || d?.question || 'Your submission').slice(0, 100)
    const linkFor = (d, collectionName) => {
      const slug = String(d?.courseCode || '').toLowerCase().replace(/\s+/g, '')
      if (collectionName === 'questions' && slug) return `/courses/${slug}/quiz`
      if (collectionName === 'readings' && slug) return `/courses/${slug}/theory`
      if (collectionName === 'user_materials') return '/folders'
      return '/contribute'
    }
    const sCol = await getCollection('suggestions').catch(() => null)

    // --- suggestion verdicts ---
    if (action === 'suggest-approve' || action === 'suggest-reject') {
      if (!sCol) return NextResponse.json({ error: 'No suggestions store' }, { status: 500 })
      const sOid = toOid(suggestionId)
      if (!sOid) return NextResponse.json({ error: 'Bad suggestion id' }, { status: 400 })
      const s = await sCol.findOne({ _id: sOid })
      if (!s) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      if (action === 'suggest-reject') {
        await sCol.updateOne({ _id: sOid }, { $set: { status: 'rejected', reviewedBy: me, reviewedAt: now, reviewNote: String(note || '').slice(0, 500) || null } })
        notifyUser(s.suggestedBy, { type: 'contribute', title: 'Suggestion not taken up', message: `${String(s.targetTitle || '').slice(0, 100)} · thanks anyway`, link: '/groups?tab=contribute' }).catch(() => {})
        return NextResponse.json({ success: true, action })
      }
      // apply whitelisted patch to the target, snapshotting first
      const targetCol = await getCollection(s.collection)
      const tOid = toOid(s.targetId)
      const target = tOid ? await targetCol.findOne({ _id: tOid }) : null
      if (!target) return NextResponse.json({ error: 'Target gone' }, { status: 404 })
      const allowed = SUGGEST_WHITELIST[s.collection] || []
      const clean = {}
      for (const k of allowed) {
        if (s.patch && s.patch[k] !== undefined) clean[k] = typeof s.patch[k] === 'string' ? s.patch[k].slice(0, 20000) : s.patch[k]
      }
      if (!Object.keys(clean).length) return NextResponse.json({ error: 'Nothing applicable' }, { status: 400 })
      withCollection(target, s.collection)
      await pushVersion(targetCol, target, { by: me, note: `Applied suggestion by ${s.suggestedBy || 'a learner'}${note ? `: ${String(note).slice(0, 200)}` : ''}` })
      await targetCol.updateOne({ _id: target._id }, { $set: { ...clean, updatedAt: now } })
      await sCol.updateOne({ _id: sOid }, { $set: { status: 'approved', reviewedBy: me, reviewedAt: now, reviewNote: String(note || '').slice(0, 500) || null } })
      notifyUser(s.suggestedBy, { type: 'contribute', title: 'Edit applied ✓', message: `${String(s.targetTitle || '').slice(0, 100)} · your fix is live`, link: linkFor(target, s.collection) }).catch(() => {})
      if (contributorOf(target) && contributorOf(target) !== s.suggestedBy) {
        notifyUser(contributorOf(target), { type: 'contribute', title: 'Your item was improved', message: `${titleOf(target)} · a suggested fix was applied`, link: linkFor(target, s.collection) }).catch(() => {})
      }
      return NextResponse.json({ success: true, action })
    }

    if (!COLLECTIONS.includes(collection)) return NextResponse.json({ error: 'Bad collection' }, { status: 400 })
    const col = await getCollection(collection)
    const oid = toOid(id)
    if (!oid) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const target = await col.findOne({ _id: oid })
    withCollection(target, collection)

    if (action === 'merge') {
      const keepOid = toOid(keepId)
      if (!keepOid || !Array.isArray(dropIds) || !dropIds.length) {
        return NextResponse.json({ error: 'merge needs keepId + dropIds' }, { status: 400 })
      }
      const dropOids = dropIds.map(toOid).filter(Boolean)
      const keep = await col.findOne({ _id: keepOid })
      if (keep) {
        withCollection(keep, collection)
        await pushVersion(col, keep, { by: me, note: 'Approved via merge (kept copy)' })
      }
      await col.updateOne({ _id: keepOid }, { $set: { status: 'approved', isPublic: true, reviewedBy: me, reviewedAt: now, updatedAt: now } })
      await col.updateMany({ _id: { $in: dropOids } }, { $set: { status: 'rejected', isPublic: false, reviewedBy: me, reviewedAt: now, reviewNote: 'Duplicate — merged into kept copy', updatedAt: now } })
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

    if (action === 'revert') {
      const idx = Number(body.versionIndex)
      const versions = Array.isArray(target?.versions) ? target.versions : []
      const v = versions[idx]
      if (!target || !v?.snapshot) return NextResponse.json({ error: 'Nothing to revert to' }, { status: 400 })
      const snap = v.snapshot
      const restore = { updatedAt: now }
      for (const k of [...(SNAP_FIELDS[collection] || []), 'status']) {
        if (snap[k] !== undefined) restore[k] = snap[k]
      }
      withCollection(target, collection)
      await pushVersion(col, target, { by: me, note: `Reverted to v${v.v}${note ? `: ${String(note).slice(0, 200)}` : ''}` })
      await col.updateOne({ _id: oid }, { $set: { ...restore, reviewedBy: me, reviewedAt: now, updatedAt: now } })
      notifyUser(contributorOf(target), {
        type: 'contribute', title: 'Change reverted',
        message: `${titleOf(target)} · restored to an earlier version`,
        link: linkFor(target, collection),
      }).catch(() => {})
      return NextResponse.json({ success: true, action: 'revert' })
    }

    if (!['approve', 'reject', 'revoke'].includes(action)) {
      return NextResponse.json({ error: 'Bad action' }, { status: 400 })
    }
    const reviewNote = String(note || '').slice(0, 500) || null
    const patch = action === 'approve'
      ? { status: 'approved', isPublic: true, reviewNote: null }
      : action === 'reject'
        ? { status: 'rejected', isPublic: false, reviewNote }
        : { status: 'revoked', isPublic: false, reviewNote }
    if (target) withCollection(target, collection)
    if (target) await pushVersion(col, target, { by: me, note: `${action[0].toUpperCase() + action.slice(1)}${reviewNote ? `: ${reviewNote}` : ''}` })
    const res = await col.updateOne({ _id: oid }, { $set: { ...patch, reviewedBy: me, reviewedAt: now, updatedAt: now } })
    if (!res.matchedCount) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (target) {
      const msg = action === 'approve'
        ? { title: 'Approved ✓ — now live', message: `${titleOf(target)} · visible to everyone` }
        : action === 'reject'
          ? { title: 'Not approved', message: `${titleOf(target)}${reviewNote ? ` · ${reviewNote}` : ' · tweak it and resubmit'}` }
          : { title: 'Taken down', message: `${titleOf(target)} · removed from public views` }
      notifyUser(contributorOf(target), { type: 'contribute', ...msg, link: linkFor(target, collection) }).catch(() => {})
    }
    return NextResponse.json({ success: true, action })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
