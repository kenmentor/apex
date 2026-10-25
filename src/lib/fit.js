// Best-fit scoring: hard mountain filter + weighted soft bands.
// pace 40 / rhythm 20 / intent 15 / availability 15 / size-fit 10.

function band(dist, full, partial) {
  if (dist <= full) return 'same'
  if (dist <= partial) return 'stretch'
  return 'far'
}

export function fitScore(space, me) {
  // Hard filter: same mountain.
  if (me.department && space.department && me.department !== space.department) return null
  if (me.level && space.level && me.level !== space.level) return null

  const paceDist = Math.abs((me.completionPct || 0) - (space.avgCompletionPct || 0))
  const paceBand = band(paceDist, 15, 30)
  const pacePts = paceBand === 'same' ? 40 : paceBand === 'stretch' ? 20 : 0

  const rhythmDist = Math.abs((me.streak || 0) - (space.avgStreak || 0))
  const rhythmBand = band(rhythmDist, 3, 7)
  const rhythmPts = rhythmBand === 'same' ? 20 : rhythmBand === 'stretch' ? 10 : 0

  const intentPts = me.intent && space.intent && me.intent === space.intent ? 15 : 0
  const overlap = (me.availability || []).filter(a => (space.availability || []).includes(a)).length
  const availPts = overlap > 0 ? 15 : (me.availability || []).length === 0 ? 8 : 0

  const seatsLeft = (space.maxSeats || 8) - (space.memberCount || 0)
  const sizeBand = seatsLeft <= 0 ? 'far' : seatsLeft <= 2 ? 'stretch' : 'same'
  const sizePts = sizeBand === 'same' ? 10 : sizeBand === 'stretch' ? 5 : 0

  return {
    total: pacePts + rhythmPts + intentPts + availPts + sizePts,
    bands: { pace: paceBand, rhythm: rhythmBand, size: sizeBand },
  }
}
