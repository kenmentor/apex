'use client'

import { getUser } from '@/lib/auth'

// ONE rule for "done", used by every progress surface (Plan list, home
// cards, course page, topic rows). An item counts when it has ANY completion
// (viewed, quizzed, or manual) — and a manual/view flag on the topic covers
// its READ step. Previously manual check-offs never moved item counts, so a
// fully checked course sat at 0%.
function isReadRow(item) {
  if (!item) return false
  if (String(item.kind || '').toLowerCase() === 'read') return true
  return String(item.title || '').trim().toLowerCase().startsWith('read')
}

function topicFlagged(topicId, doneIds) {
  return !!doneIds && (doneIds.has(`${topicId}:manual`) || doneIds.has(`${topicId}:read`))
}

export function topicItemDone(topicId, item, doneIds) {
  if (!doneIds || !item) return false
  if (doneIds.has(`${topicId}:${item.id}`)) return true
  if (isReadRow(item) && topicFlagged(topicId, doneIds)) return true
  return false
}

export function topicDoneCount(rows, topicId, doneIds) {
  return (rows || []).filter(i => topicItemDone(topicId, i, doneIds)).length
}

export function topicIsComplete(rows, topicId, doneIds) {
  const list = rows || []
  if (doneIds?.has(`${topicId}:manual`)) return true
  return list.length > 0 && topicDoneCount(list, topicId, doneIds) === list.length
}

// Fire-and-forget: opening content marks the topic's READ step viewed, so
// progress follows actual consumption. Dedupes via doneIds — no write spam.
// onDone (e.g. refresh completions) runs only when something was recorded.
export async function markTopicViewed(topicId, doneIds, onDone) {
  try {
    const u = getUser()
    if (!u?.email || !topicId) return
    if (doneIds?.has(`${topicId}:read`) || doneIds?.has(`${topicId}:manual`)) return
    await fetch('/api/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: u.email, topicId, itemId: 'read', kind: 'view' }),
    }).catch(() => null)
    try { await onDone?.() } catch {}
  } catch {}
}
