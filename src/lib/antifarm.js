// Anti-farm guards shared by games and races.
export const STAKE_CAP = 50
export const MIN_SECONDS_PER_ITEM = 3
// Per-format floors (seconds per item): sprint is recognition-fast,
// pairs/cloze need reading + production time, chunk sits in the middle.
export const MIN_SECONDS_PER_FORMAT = { chunk: 3, sprint: 5, pairs: 4, cloze: 6, blitz: 5, odd: 4, boss: 5, typing: 6 }

export function timingFloor(format) {
  return MIN_SECONDS_PER_FORMAT[format] || MIN_SECONDS_PER_ITEM
}

export function checkTiming({ items, seconds, format }) {
  const perItem = format ? timingFloor(format) : MIN_SECONDS_PER_ITEM
  const min = (items || 1) * perItem
  if ((seconds || 0) < min) return { ok: false, reason: `Too fast: ${seconds}s for ${items} items (min ${min}s).` }
  return { ok: true }
}

export function checkStake(stake) {
  if (!stake) return { ok: true }
  if (stake > STAKE_CAP) return { ok: false, reason: `Stake capped at ${STAKE_CAP} coins in V1.` }
  return { ok: true }
}

export async function hasCompletedToday(db, email) {
  const today = new Date().toISOString().slice(0, 10)
  const hit = await db.collection('completions').findOne({
    email: email.toLowerCase().trim(),
    kind: 'prove',
    percentage: { $gte: 80 },
    createdAt: { $gte: today },
  })
  return !!hit
}
