// Drive-style library helpers: single `library_nodes` tree + `library_members` sharing.
// Node: { _id, ownerEmail, kind: 'folder'|'ref', name, parentId: ObjectId|null,
//   itemKind, refId, href, url, courseCode, subtitle, color, order, createdAt, updatedAt }
import { ObjectId } from 'mongodb'

const MAX_DEPTH = 20

export function normEmail(email) {
  return String(email || '').toLowerCase().trim()
}

export function toId(id) {
  if (!id) return null
  try {
    return new ObjectId(String(id))
  } catch {
    return null
  }
}

export function serializeNode(doc) {
  if (!doc) return null
  return {
    ...doc,
    id: String(doc._id),
    parentId: doc.parentId ? String(doc.parentId) : null,
    _id: String(doc._id),
  }
}

export function cleanName(name, fallback = 'Untitled') {
  const v = String(name || '').trim().slice(0, 120)
  return v || fallback
}

// Walk ancestors root-first, cap depth. Returns { chain: [root..node], role }.
export async function loadChain(nodesCol, membersCol, nodeId, userEmail) {
  const email = normEmail(userEmail)
  const chain = []
  let cur = toId(nodeId)
  let guard = 0
  while (cur && guard++ < MAX_DEPTH) {
    const doc = await nodesCol.findOne({ _id: cur })
    if (!doc) break
    chain.unshift(doc)
    if (!doc.parentId) break
    cur = doc.parentId instanceof ObjectId ? doc.parentId : toId(doc.parentId)
  }
  const role = await roleForChain(membersCol, chain, email)
  return { chain: chain.map(serializeNode), role }
}

export async function roleForChain(membersCol, chain, userEmail) {
  const email = normEmail(userEmail)
  if (!email || !chain.length) return null
  const leaf = chain[chain.length - 1]
  if (normEmail(leaf.ownerEmail) === email) return 'owner'
  // Any ancestor (or leaf) shared to this email grants access; editor wins.
  const ids = chain.map(n => n._id instanceof ObjectId ? n._id : toId(n._id)).filter(Boolean)
  // Owner check across chain: if user owns an ancestor, treat as owner of subtree.
  for (const n of chain) {
    if (normEmail(n.ownerEmail) === email) return 'owner'
  }
  if (!membersCol || !ids.length) return null
  const strIds = ids.map(String)
  const rows = await membersCol.find({ email, $or: [{ nodeId: { $in: ids } }, { nodeId: { $in: strIds } }] }).toArray().catch(() => [])
  if (!rows.length) return null
  return rows.some(r => r.role === 'editor') ? 'editor' : 'viewer'
}

export function canRead(role) {
  return role === 'owner' || role === 'editor' || role === 'viewer'
}

export function canWrite(role) {
  return role === 'owner' || role === 'editor'
}

// True if `candidateId` is inside subtree of `ancestorId`.
export async function isDescendant(nodesCol, ancestorId, candidateId) {
  const anc = toId(ancestorId)
  let cur = toId(candidateId)
  if (!anc || !cur) return false
  let guard = 0
  while (cur && guard++ < MAX_DEPTH + 5) {
    if (String(cur) === String(anc)) return true
    const doc = await nodesCol.findOne({ _id: cur }, { projection: { parentId: 1 } })
    if (!doc || !doc.parentId) return false
    cur = doc.parentId instanceof ObjectId ? doc.parentId : toId(doc.parentId)
  }
  return false
}

// All descendant _ids (excluding root), BFS capped.
export async function collectDescendants(nodesCol, rootId, cap = 500) {
  const root = toId(rootId)
  if (!root) return []
  const out = []
  let frontier = [root]
  let guard = 0
  while (frontier.length && out.length < cap && guard++ < MAX_DEPTH + 5) {
    const kids = await nodesCol.find({ parentId: { $in: frontier } }, { projection: { _id: 1, parentId: 1 } }).toArray()
    if (!kids.length) break
    for (const k of kids) {
      out.push(k._id)
      if (out.length >= cap) break
    }
    frontier = kids.map(k => k._id)
  }
  return out
}
