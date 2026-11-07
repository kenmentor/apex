'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Flame, ChevronRight, ChevronLeft, ChevronDown, X, Check, Lock, Sprout, BadgeCheck, Medal, Trophy, GraduationCap, Globe, Zap, Rocket, FileText, BookOpen, GitPullRequest, Gauge, History, Settings } from 'lucide-react'
import { getToken } from '@/lib/auth'
import { Skeleton } from '@/components/ui/skeleton'

// Solid badge library — fully opaque so stacked colors never bleed.
const BADGES = {
  first: { Icon: Sprout, solid: 'bg-green-500 text-white', emoji: '🌱' },
  'approved-1': { Icon: BadgeCheck, solid: 'bg-blue-500 text-white', emoji: '✅' },
  approved: { Icon: BadgeCheck, solid: 'bg-blue-500 text-white', emoji: '✅' },
  ten: { Icon: Medal, solid: 'bg-amber-500 text-white', emoji: '🔟' },
  scholar: { Icon: GraduationCap, solid: 'bg-violet-600 text-white', emoji: '🎓' },
  polyglot: { Icon: Globe, solid: 'bg-sky-500 text-white', emoji: '🗺️' },
  'streak-7': { Icon: Flame, solid: 'bg-orange-500 text-white', emoji: '🔥' },
  'streak-30': { Icon: Zap, solid: 'bg-yellow-500 text-white', emoji: '⚡' },
  prolific: { Icon: Rocket, solid: 'bg-pink-500 text-white', emoji: '🚀' },
}

function badgeMeta(id) {
  return BADGES[id] || { Icon: Trophy, solid: 'bg-primary text-primary-foreground', emoji: '🏅' }
}

function intensity(count) {
  if (!count) return 'bg-muted'
  if (count === 1) return 'bg-green-500/30'
  if (count <= 3) return 'bg-green-500/55'
  if (count <= 6) return 'bg-green-500/80'
  return 'bg-green-500'
}

function groupByMonth(weeks) {
  const groups = []
  for (const days of weeks || []) {
    const first = (days || [])[0]
    if (!first?.date) continue
    const key = String(first.date).slice(0, 7)
    let g = groups.find(x => x.key === key)
    if (!g) {
      const dt = new Date(first.date + 'T00:00:00')
      const ok = !isNaN(dt)
      g = {
        key,
        label: ok ? dt.toLocaleString(undefined, { month: 'long' }) : key,
        short: ok ? dt.toLocaleString(undefined, { month: 'short' }) : key,
        weeks: [],
      }
      groups.push(g)
    }
    g.weeks.push(days)
  }
  return groups
}

// 3-month window (~13 week columns) closing on the selected month.
function windowForMonth(weeks, monthKey, numWeeks = 13) {
  const all = (weeks || []).flatMap(w => w || []).filter(x => x?.date).sort((a, b) => String(a.date).localeCompare(String(b.date)))
  const past = monthKey ? all.filter(x => String(x.date).slice(0, 7) <= monthKey) : all
  return chunkDays(past.slice(-(numWeeks * 7)), numWeeks)
}

function chunkDays(days, maxCols) {
  const cols = []
  let cur = []
  for (const day of days || []) {
    const dt = new Date(day.date + 'T00:00:00')
    if (cur.length && dt.getDay() === 1) { cols.push(cur); cur = [] }
    cur.push(day)
  }
  if (cur.length) cols.push(cur)
  return cols.slice(-maxCols)
}

export default function Contributions({ data, loading: externalLoading, historyCount = 0, bestPct = null, showGraph = true }) {
  const [internal, setInternal] = useState(null)
  const [internalLoading, setInternalLoading] = useState(!data)
  const [error, setError] = useState('')
  const [viewer, setViewer] = useState(-1)
  const [month, setMonth] = useState('3m')
  const [monthOpen, setMonthOpen] = useState(false)

  useEffect(() => {
    if (data !== undefined) return
    const t = getToken()
    if (!t) { setInternalLoading(false); return }
    setInternalLoading(true)
    fetch('/api/contributions/mine', { headers: { Authorization: `Bearer ${t}` }, cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setInternal(d) })
      .catch(e => setError(e.message))
      .finally(() => setInternalLoading(false))
  }, [data])

  const resolved = data !== undefined ? data : internal
  const loading = data !== undefined ? !!externalLoading : internalLoading

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    )
  }

  if (error || !resolved) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {error || 'Sign in to see your contributions.'}
      </div>
    )
  }

  const d = resolved
  const totals = d.totals || { total: 0, approved: 0, pending: 0, courses: 0 }
  const courses = d.courses || []
  const medals = d.medals || []
  const ordered = (medals || []).map((m, i) => ({ ...m, i }))
  const won = ordered.filter(m => m.earned)
  const current = viewer >= 0 && ordered.length ? ordered[((viewer % ordered.length) + ordered.length) % ordered.length] : null

  const groups = groupByMonth(d.weeks || [])
  const monthKeys = groups.map(g => g.key)
  const latestKey = monthKeys[monthKeys.length - 1] || null
  const sel = month || '3m'
  const isPreset = sel === '3m' || sel === '4m' || sel === '1y'
  const selectedGroup = groups.find(g => g.key === sel)
  const selLabel = sel === '3m' ? 'Last 3 months' : sel === '4m' ? 'Last 4 months' : sel === '1y' ? 'Whole year' : (selectedGroup ? selectedGroup.label : 'Month')
  let windowWeeks
  if (sel === '4m') {
    windowWeeks = windowForMonth(d.weeks || [], latestKey, 17)
  } else if (sel === '1y') {
    const y = String(new Date().getFullYear())
    const days = (d.weeks || []).flatMap(w => w || []).filter(x => x?.date && String(x.date).startsWith(y)).sort((a, b) => String(a.date).localeCompare(String(b.date)))
    windowWeeks = chunkDays(days, 53)
  } else if (isPreset) {
    windowWeeks = windowForMonth(d.weeks || [], latestKey, 13)
  } else {
    windowWeeks = windowForMonth(d.weeks || [], sel, 13)
  }
  const menuMonths = groups.slice(-6).reverse()

  const rows = [
    { icon: FileText, tint: 'bg-blue-500 text-white', title: 'Resources submitted', value: totals.total, href: '/profile/contributions' },
    { icon: BookOpen, tint: 'bg-violet-600 text-white', title: 'Courses maintained', value: courses.length, href: '/profile/courses' },
    { icon: GitPullRequest, tint: 'bg-amber-500 text-white', title: 'Awaiting review', value: totals.pending, href: '/profile/review' },
    { icon: Gauge, tint: 'bg-green-600 text-white', title: 'Performance', value: bestPct != null ? `${bestPct}%` : null, href: '/profile/stats' },
    { icon: History, tint: 'bg-muted text-muted-foreground', title: 'Quiz history', value: historyCount, href: '/profile/history' },
    { icon: Settings, tint: 'bg-muted text-muted-foreground', title: 'Profile settings', value: null, href: '/profile/settings' },
  ]

  return (
    <div className="space-y-5" id="contributions">
      {/* Badges — horizontal stacked */}
      <div>
        <div className="mb-2 flex items-center px-1">
          <p className="flex-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Badges</p>
          <p className="text-[11px] font-bold text-muted-foreground">{won.length}/{medals.length}</p>
        </div>
        <div className="flex items-center px-1">
          {ordered.map((m, idx) => {
            const { Icon, solid } = badgeMeta(m.id)
            const earned = !!m.earned
            return (
              <button
                key={m.id}
                onClick={() => setViewer(idx)}
                title={m.label}
                aria-label={m.label}
                style={{ zIndex: ordered.length - idx }}
                className={`relative flex size-12 items-center justify-center rounded-full shadow-sm transition hover:scale-110 hover:z-50 ${idx > 0 ? '-ml-3.5' : ''} ${earned ? solid : 'bg-muted text-muted-foreground/60'} ring-2 ring-background`}
              >
                <Icon className="size-5" strokeWidth={2.2} />
                {earned
                  ? <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-green-600 text-white ring-2 ring-background"><Check className="size-2.5" strokeWidth={4} /></span>
                  : <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-muted-foreground/50 text-white ring-2 ring-background"><Lock className="size-2.5" /></span>}
              </button>
            )
          })}
        </div>
      </div>

      {current && (() => {
        const { Icon, solid } = badgeMeta(current.id)
        return (
          <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/85 p-6 backdrop-blur-sm" onClick={() => setViewer(-1)}>
            <button aria-label="Close" className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-white/10 text-white" onClick={() => setViewer(-1)}>
              <X className="size-5" />
            </button>
            <button aria-label="Previous" className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white" onClick={e => { e.stopPropagation(); setViewer(v => v - 1) }}>
              <ChevronLeft className="size-5" />
            </button>
            <button aria-label="Next" className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white" onClick={e => { e.stopPropagation(); setViewer(v => v + 1) }}>
              <ChevronRight className="size-5" />
            </button>
            <div className={`flex size-32 items-center justify-center rounded-full ${current.earned ? solid : 'bg-white/10 text-white/40'} shadow-2xl`} onClick={e => e.stopPropagation()}>
              <Icon className="size-14" />
            </div>
            <p className="mt-4 text-lg font-extrabold text-white">{current.label}</p>
            <p className="mt-1 max-w-[260px] text-center text-xs text-white/70">{current.desc}</p>
            {current.earned
              ? <p className="mt-3 rounded-full bg-green-500/20 px-3 py-1 text-[11px] font-bold text-green-400">Earned ✓</p>
              : <p className="mt-3 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-white/60">Locked</p>}
          </div>
        )
      })()}

      {/* Contribution streak graph — hidden in study-only mode */}
      {showGraph && (
      <div className="px-1">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setMonthOpen(v => !v)}
              className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-bold"
            >
              {selLabel}
              <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${monthOpen ? 'rotate-180' : ''}`} />
            </button>
            {monthOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMonthOpen(false)} />
                <div className="absolute left-0 top-9 z-50 w-44 overflow-hidden rounded-xl border border-border/50 bg-card py-1 shadow-lg">
                  {[
                    { v: '3m', label: 'Last 3 months' },
                    { v: '4m', label: 'Last 4 months' },
                    { v: '1y', label: 'Whole year' },
                  ].map(o => (
                    <button
                      key={o.v}
                      onClick={() => { setMonth(o.v); setMonthOpen(false) }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold hover:bg-muted"
                    >
                      <span className="flex-1">{o.label}</span>
                      {sel === o.v && <Check className="size-3.5 text-green-500" strokeWidth={3} />}
                    </button>
                  ))}
                  {menuMonths.length > 0 && <div className="mx-3 my-1 h-px bg-border/60" />}
                  {menuMonths.map(g => (
                    <button
                      key={g.key}
                      onClick={() => { setMonth(g.key); setMonthOpen(false) }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold hover:bg-muted"
                    >
                      <span className="flex-1">{g.label}</span>
                      {sel === g.key && <Check className="size-3.5 text-green-500" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <span className="flex-1" />
          {typeof d.rank === 'number' && (
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">#{d.rank}</span>
          )}
        </div>
        {windowWeeks.length > 0 && (
          <div className="mt-2 grid w-full gap-1.5" style={{ gridTemplateColumns: `repeat(${windowWeeks.length}, minmax(0, 1fr))` }}>
            {windowWeeks.map((days, wi) => (
              <div key={wi} className="flex flex-col gap-1.5">
                {(days || []).map((day, di) => (
                  <span key={di} title={`${day.date}: ${day.count}`} className={`aspect-square w-full rounded-[7px] ${intensity(day.count)}`} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Sections — each opens its own full-screen page */}
      <div className="divide-y divide-border/60 px-1">
        {rows.map(r => (
          <Link key={r.title} href={r.href} className="flex w-full items-center gap-3 py-3 text-left">
            <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${r.tint}`}><r.icon className="size-4" /></span>
            <span className="min-w-0 flex-1 truncate text-sm font-bold">{r.title}</span>
            {r.value != null && <span className="shrink-0 text-sm font-bold">{r.value}</span>}
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  )
}
