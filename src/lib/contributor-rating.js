// Contributor rating — grows from how useful your content proves to be:
// volume posted, approval rate (usefulness), course breadth, badges earned,
// contribution streak, and leaderboard standing. 0–100 score → level 1–5.
const LEVELS = ['Novice', 'Contributor', 'Rising Star', 'Pro', 'Legend']

export function contributorRating({
  approved = 0,
  total = 0,
  courses = 0,
  rank = null,
  totalContributors = 0,
  badgesWon = 0,
  badgesTotal = 0,
  streak = 0,
} = {}) {
  const rate = total > 0 ? approved / total : 0
  const parts = [
    Math.min(approved / 50, 1) * 40,
    rate * 20,
    Math.min(courses / 5, 1) * 10,
    (badgesTotal > 0 ? badgesWon / badgesTotal : 0) * 15,
    Math.min(streak / 30, 1) * 10,
    rank && totalContributors
      ? Math.max(0, 1 - (rank - 1) / totalContributors) * 5
      : 0,
  ]
  const score = Math.round(parts.reduce((a, b) => a + b, 0))
  const level = Math.min(5, Math.floor(score / 20) + 1)
  return {
    score,
    level,
    label: LEVELS[level - 1],
    progress: level >= 5 ? 1 : (score % 20) / 20,
  }
}
