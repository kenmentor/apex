'use client'

import { Sprout, BadgeCheck, Medal, GraduationCap, Globe, Flame, Zap, Rocket, Trophy } from 'lucide-react'

// Real achievement badges — Lucide icons on tiered gradients. Single source
// of truth for every surface that shows medals (leaderboard, contributions,
// profile). Never emoji.
const MEDALS = {
  first: { Icon: Sprout, bg: 'linear-gradient(135deg, #16a34a, #4ade80)', label: 'First contribution' },
  'approved-1': { Icon: BadgeCheck, bg: 'linear-gradient(135deg, #2563eb, #38bdf8)', label: 'Approved' },
  approved: { Icon: BadgeCheck, bg: 'linear-gradient(135deg, #2563eb, #38bdf8)', label: 'Approved' },
  ten: { Icon: Medal, bg: 'linear-gradient(135deg, #b45309, #fbbf24)', label: 'Ten club' },
  scholar: { Icon: GraduationCap, bg: 'linear-gradient(135deg, #6d28d9, #a78bfa)', label: 'Scholar' },
  polyglot: { Icon: Globe, bg: 'linear-gradient(135deg, #0284c7, #22d3ee)', label: 'Multi-course' },
  'streak-7': { Icon: Flame, bg: 'linear-gradient(135deg, #c2410c, #fb923c)', label: 'Week streak' },
  'streak-30': { Icon: Zap, bg: 'linear-gradient(135deg, #a16207, #fde047)', label: 'Month streak' },
  prolific: { Icon: Rocket, bg: 'linear-gradient(135deg, #be185d, #f472b6)', label: 'Busiest day' },
}

const FALLBACK = { Icon: Trophy, bg: 'linear-gradient(135deg, #475569, #94a3b8)', label: 'Badge' }

export function medalStyle(id) {
  return MEDALS[id] || FALLBACK
}

export default function MedalIcon({ id, className = 'size-5', iconClassName = 'size-3' }) {
  const { Icon, bg, label } = medalStyle(id)
  return (
    <span title={label} aria-label={label} className={`inline-flex shrink-0 items-center justify-center rounded-full text-white shadow-sm ${className}`} style={{ background: bg }}>
      <Icon className={iconClassName} strokeWidth={2.5} />
    </span>
  )
}
