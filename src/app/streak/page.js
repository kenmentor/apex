'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, Flame, Coins, Trophy, Target, BookOpen } from 'lucide-react'
import { getUser } from '@/lib/auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function monthGrid(year, month) {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = first.getDay()
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function formatKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function StreakContent() {
  const [user, setUser] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  useEffect(() => {
    const u = getUser()
    setUser(u)
    if (!u?.email) {
      setLoading(false)
      return
    }
    fetch(`/api/streak?email=${encodeURIComponent(u.email)}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const activeSet = useMemo(() => new Set((data?.days || [])), [data])

  const cells = monthGrid(view.year, view.month)
  const todayKey = data?.today || formatKey(new Date())
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  function changeMonth(delta) {
    setView(prev => {
      let m = prev.month + delta
      let y = prev.year
      if (m < 0) { m = 11; y -= 1 }
      if (m > 11) { m = 0; y += 1 }
      return { year: y, month: m }
    })
  }

  const canPrev = !(view.year === new Date().getFullYear() && view.month === new Date().getMonth())

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col bg-background pb-24">
        <div className="mx-auto w-full max-w-lg space-y-3 px-4 pt-3">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col bg-background pb-24">
        <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Link href="/" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="flex-1 text-base font-bold">My Streak</h1>
        </header>
        <div className="mx-auto w-full max-w-lg space-y-4 px-4 pt-8">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-pink-600 text-white shadow-lg shadow-orange-500/20">
                <Flame className="size-8" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Track your streak</h2>
                <p className="mt-1 text-sm text-muted-foreground">Sign in to see your quiz calendar and keep your flame alive.</p>
              </div>
              <Button asChild className="px-8 py-5 text-sm font-semibold">
                <Link href="/auth">Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-24">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link href="/" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="flex-1 text-base font-bold">My Streak</h1>
      </header>

      <div className="mx-auto w-full max-w-lg space-y-3 px-3 pt-3">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-500 to-pink-600 p-5 text-white shadow-lg shadow-orange-500/20">
          <div className="absolute -right-6 -top-6 size-28 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 right-8 size-24 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <Flame className="size-8" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-3xl font-extrabold leading-none">
                {data?.currentStreak || 0}
                <span className="ml-2 text-base font-bold text-white/80">day streak</span>
              </div>
              <p className="mt-1 text-xs text-white/80">
                {data?.currentStreak >= 10
                  ? `Unstoppable! You're on fire 🔥`
                  : data?.currentStreak > 0
                    ? 'Keep it going — every day counts!'
                    : 'Complete a plan item at 80%+ to start your streak!'}
              </p>
              {data && !data.gated && (
                <p className="mt-1 text-[11px] text-white/70">Legacy display: visit-based. Complete a plan prove-item to move to completion-gated streaks.</p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/15 px-2.5 py-1.5 text-sm font-bold">
              <Coins className="size-4" />
              {data?.points || 0}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="flex flex-col items-center py-3 text-center">
              <Flame className="mb-1 size-4 text-orange-500" />
              <div className="text-lg font-bold text-primary">{data?.currentStreak || 0}</div>
              <div className="text-[10px] text-muted-foreground">Current</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center py-3 text-center">
              <Trophy className="mb-1 size-4 text-yellow-500" />
              <div className="text-lg font-bold text-primary">{data?.bestStreak || 0}</div>
              <div className="text-[10px] text-muted-foreground">Best</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center py-3 text-center">
              <Target className="mb-1 size-4 text-blue-500" />
              <div className="text-lg font-bold text-primary">{data?.totalQuizzes || 0}</div>
              <div className="text-[10px] text-muted-foreground">Quizzes</div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeMonth(-1)}
                  disabled={!canPrev}
                  className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-muted disabled:opacity-30"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="min-w-[130px] text-center text-sm font-bold">{monthLabel}</span>
                <button
                  onClick={() => changeMonth(1)}
                  className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-muted"
                  aria-label="Next month"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
              <div className="text-[10px] text-muted-foreground">{daysInMonth} days</div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center">
              {WEEKDAYS.map((d, i) => (
                <div key={i} className="py-1 text-[10px] font-bold uppercase text-muted-foreground">{d}</div>
              ))}
              {cells.map((day, i) => {
                const key = day ? `${view.year}-${String(view.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null
                const active = key ? activeSet.has(key) : false
                const isToday = key === todayKey
                const isFuture = key ? key > todayKey : false
                return (
                  <div
                    key={i}
                    className={`flex aspect-square items-center justify-center rounded-lg text-sm font-semibold ${
                      active
                        ? 'bg-gradient-to-br from-orange-500 to-pink-600 text-white shadow-sm shadow-orange-500/30'
                        : isToday
                          ? 'border-2 border-orange-500 text-orange-500'
                          : isFuture
                            ? 'text-muted/40'
                            : 'text-muted-foreground'
                    }`}
                  >
                    {day || ''}
                  </div>
                )
              })}
            </div>

            <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-gradient-to-br from-orange-500 to-pink-600" /> Quiz day
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm border-2 border-orange-500" /> Today
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Rewards info */}
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-2 text-sm font-bold flex items-center gap-2">
              <BookOpen className="size-4 text-primary" />
              Rewards
            </h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <Flame className="size-3.5 text-orange-500" /> Reach a 2-day streak → +20 points bonus
              </li>
              <li className="flex items-center gap-2">
                <Flame className="size-3.5 text-orange-500" /> Every 10-day milestone (10, 20, 30…) → +10 points
              </li>
              <li className="flex items-center gap-2">
                <Flame className="size-3.5 text-orange-500" /> Miss a day? Your streak resets — but your best streak stays!
              </li>
            </ul>
          </CardContent>
        </Card>

        <Button asChild className="w-full py-5 text-base font-bold">
          <Link href="/courses">Take a Quiz</Link>
        </Button>
      </div>
    </div>
  )
}

export default function StreakPage() {
  return <StreakContent />
}
