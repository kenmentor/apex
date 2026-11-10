'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Flame, Trophy, Target, BookCheck, ChevronRight } from 'lucide-react'
import { getUser } from '@/lib/auth'
import { Skeleton } from '@/components/ui/skeleton'
import { topicIsComplete } from '@/lib/progress'

// Study graph for EVERYONE (normal users see this as their streak graph;
// contributors see it under their contribution graph). Orange GitHub-style
// heatmap of study days + headline stats, including topics completed.
function dayKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Last N Monday-first week columns ending today.
function lastWeeks(dayStrings, numWeeks = 13) {
  const set = new Set(dayStrings || [])
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const mondayOffset = (today.getDay() + 6) % 7
  const start = new Date(today)
  start.setDate(today.getDate() - mondayOffset - (numWeeks - 1) * 7)
  const cols = []
  const cur = new Date(start)
  while (cur <= today) {
    const col = []
    for (let i = 0; i < 7; i++) {
      if (cur > today) break
      const key = dayKey(cur)
      col.push({ date: key, count: set.has(key) ? 1 : 0 })
      cur.setDate(cur.getDate() + 1)
    }
    cols.push(col)
  }
  return cols
}

function intensity(count) {
  if (!count) return 'bg-muted'
  return 'bg-gradient-to-br from-orange-500 to-pink-600'
}

export default function StudyActivity({ email: emailProp, showFullCalendar = true }) {
  const [streak, setStreak] = useState(null)
  const [topicsDone, setTopicsDone] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSelf, setIsSelf] = useState(true)

  useEffect(() => {
    const u = getUser()
    const emailRaw = (emailProp || u?.email || '').trim()
    if (!emailRaw) { setLoading(false); return }
    setIsSelf(!emailProp || emailRaw.toLowerCase() === (u?.email || '').toLowerCase())
    const email = encodeURIComponent(emailRaw)
    Promise.all([
      fetch(`/api/streak?email=${email}`, { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/plans?email=' + email, { cache: 'no-store' }).then(r => r.json()).catch(() => null),
      fetch(`/api/completions?email=${email}`, { cache: 'no-store' }).then(r => r.json().catch(() => [])).catch(() => []),
    ]).then(([st, plan, comps]) => {
      setStreak(st)
      try {
        const doneIds = new Set((Array.isArray(comps) ? comps : []).map(c => `${c.topicId}:${c.itemId}`))
        let n = 0
        for (const c of plan?.courses || []) {
          for (const t of c.topics || []) {
            if (topicIsComplete(t.items, t.id, doneIds)) n++
          }
        }
        setTopicsDone(n)
      } catch {
        setTopicsDone(0)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailProp])

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    )
  }

  const weeks = lastWeeks(streak?.days)
  const stats = [
    { icon: Flame, tint: 'bg-orange-500 text-white', label: 'Day streak', value: streak?.currentStreak ?? 0 },
    { icon: Trophy, tint: 'bg-yellow-500 text-white', label: 'Best streak', value: streak?.bestStreak ?? 0 },
    { icon: Target, tint: 'bg-blue-500 text-white', label: 'Quizzes', value: streak?.totalQuizzes ?? 0 },
    { icon: BookCheck, tint: 'bg-green-600 text-white', label: 'Topics done', value: topicsDone ?? 0 },
  ]

  return (
    <div className="space-y-4" id="study-activity">
      {/* Headline stats */}
      <div className="grid grid-cols-4 gap-2">
        {stats.map(s => (
          <div key={s.label} className="flex flex-col items-center rounded-2xl border bg-card px-1 py-3 text-center">
            <span className={`mb-1 flex size-7 items-center justify-center rounded-full ${s.tint}`}><s.icon className="size-3.5" /></span>
            <span className="text-lg font-extrabold tabular-nums">{s.value}</span>
            <span className="text-[10px] leading-tight text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Study heatmap — last 13 weeks */}
      <div>
        <div className="mb-2 flex items-center px-1">
          <p className="flex-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Study activity</p>
          {showFullCalendar && isSelf && (
            <Link href="/streak" className="flex items-center gap-0.5 text-[11px] font-bold text-primary">
              Full calendar <ChevronRight className="size-3" />
            </Link>
          )}
        </div>
        {weeks.length > 0 ? (
          <div className="grid w-full gap-1.5" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
            {weeks.map((days, wi) => (
              <div key={wi} className="flex flex-col gap-1.5">
                {(days || []).map((day, di) => (
                  <span key={di} title={`${day.date}: ${day.count ? 'studied' : '—'}`} className={`aspect-square w-full rounded-[7px] ${intensity(day.count)}`} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
            {isSelf ? 'No study days yet — take a quiz or check off a topic to light up your graph.' : 'No study days yet.'}
          </p>
        )}
        <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-gradient-to-br from-orange-500 to-pink-600" /> Studied
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-muted" /> Missed
          </span>
        </div>
      </div>
    </div>
  )
}
