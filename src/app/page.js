'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Flame, Search, ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import { getUser, getToken } from '@/lib/auth';
import { reviewProfile } from '@/lib/profile-review';
import { colorFor } from '@/lib/plan-colors';
import { topicDoneCount } from '@/lib/progress';
import { splitBySemester } from '@/lib/semesters';
import SemesterDivider from '@/components/SemesterDivider';
import { fetchJson, TTL } from '@/lib/fetch-json';
import { Skeleton } from '@/components/ui/skeleton';

// Home = your plan: search on top, slim streak strip, full course list.
// (Mirrors /plan — the old Curriculum tab is now Rankings.)

function StreakStrip({ streak }) {
  const set = new Set(streak?.days || []);
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const keys = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    keys.push(d.toISOString().slice(0, 10));
  }
  const todayKey = today.toISOString().slice(0, 10);
  return (
    <Link href="/streak" className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 transition-colors hover:bg-muted/60">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: 'linear-gradient(120deg, #FBBF24, #F97316 55%, #EF4444)' }}>
        <Flame className="size-5" fill="currentColor" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-extrabold tabular-nums">{streak?.currentStreak ?? 0} day streak</span>
        <span className="mt-1 flex items-center gap-1">
          {keys.map(k => (
            <span key={k} className={`size-1.5 rounded-full ${set.has(k) ? 'bg-orange-500' : 'bg-muted-foreground/25'} ${k === todayKey && !set.has(k) ? 'ring-1 ring-orange-400' : ''}`} />
          ))}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function Ring({ pct, size = 40 }) {
  const r = (size - 6) / 2
  const c = 2 * Math.PI * r
  const done = pct >= 100
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="4" className="stroke-white/30" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (Math.min(100, pct) / 100) * c}
          className={done ? 'stroke-green-300' : 'stroke-white'} style={{ transition: 'stroke-dashoffset 0.4s' }} />
      </svg>
      <span className="absolute text-[10px] font-bold text-white">{Math.round(pct)}%</span>
    </span>
  )
}

function HomeCourseBlock({ course, doneIds }) {
  const topics = course.topics || []
  const totalItems = topics.reduce((n, t) => n + (t.items || []).length, 0)
  const doneItems = topics.reduce((n, t) => n + topicDoneCount(t.items, t.id, doneIds), 0)
  const coursePct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0
  const color = colorFor(course.code)
  const slug = String(course.code).toLowerCase().replace(/\s+/g, '')
  return (
    <Link
      key={course.code}
      href={`/plan/${slug}`}
      className="flex w-full items-center gap-3 rounded-3xl p-4 text-left text-white transition-all active:scale-[0.99]"
      style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)` }}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-extrabold">{course.code}</span>
        <span className="block truncate text-xs text-white/75">{course.title}</span>
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white/25">
          <span className="block h-full rounded-full bg-white transition-all" style={{ width: `${coursePct}%` }} />
        </span>
        <span className="mt-1.5 block text-[11px] text-white/75">{topics.length} topics · {doneItems}/{totalItems} done</span>
      </span>
      <Ring pct={coursePct} />
      <ChevronRight className="size-5 shrink-0 text-white/70" />
    </Link>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [streakData, setStreakData] = useState(null)
  const [planCourses, setPlanCourses] = useState([])
  const [planLabel, setPlanLabel] = useState('')
  const [completions, setCompletions] = useState([])
  const [loading, setLoading] = useState(true)
  const [bannerOff, setBannerOff] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => {
    const u = getUser()
    setUser(u)
    if (!u?.email) { setLoading(false); return }
    Promise.all([
      fetchJson(`/api/streak?email=${encodeURIComponent(u.email)}`, { ttl: TTL.short }).catch(() => null),
      fetch('/api/plans?email=' + encodeURIComponent(u.email), { cache: 'no-store' }).then(r => r.json()).catch(() => null),
      fetch('/api/completions?email=' + encodeURIComponent(u.email), { cache: 'no-store' }).then(r => (Array.isArray(r) ? r : r.json()).catch(() => [])),
    ]).then(([streak, plan, comps]) => {
      if (streak?.email) setStreakData(streak)
      if (plan?.supported) {
        setPlanCourses(plan.courses || [])
        const dept = plan.cohort?.department || u.department || ''
        const lvl = plan.cohort?.level || u.level || ''
        setPlanLabel([dept, lvl].filter(Boolean).join(' · '))
      }
      setCompletions(Array.isArray(comps) ? comps : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Bottom-tab re-tap while on home: back to top.
  useEffect(() => {
    function onRetap(e) {
      if (e.detail !== '/') return
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('nav:retap', onRetap)
    return () => window.removeEventListener('nav:retap', onRetap)
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center overflow-x-hidden bg-background pb-24">
        <div className="space-y-4 w-full max-w-lg px-5">
          <Skeleton className="h-12 w-full rounded-full" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  const doneIds = new Set((completions || []).map(c => `${c.topicId}:${c.itemId}`))
  const sorted = [...(planCourses || [])].sort((a, b) => ((b.topics || []).length - (a.topics || []).length))
  const { first, second } = splitBySemester(sorted)
  const both = first.length > 0 && second.length > 0

  function submitSearch(e) {
    e?.preventDefault?.()
    const needle = q.trim()
    router.push(needle ? `/search?q=${encodeURIComponent(needle)}` : '/search')
  }

  return (
    <div className="mx-auto min-h-dvh max-w-2xl space-y-4 px-5 pb-28 pt-4">
      {!!user && !bannerOff && reviewProfile(user).needsReview && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <p className="flex-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
            Your school, department or avatar needs a quick confirm so your plan stays accurate.
          </p>
          <Link href="/auth?review=1" className="shrink-0 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
            Review
          </Link>
          <button onClick={() => setBannerOff(true)} aria-label="Dismiss" className="shrink-0 px-1 text-lg leading-none text-muted-foreground">×</button>
        </div>
      )}

      {!user && (
        <div className="flex items-center gap-4">
          <img src="/black-logo.png" alt="Apex" className="size-12 shrink-0 rounded-xl object-cover dark:hidden" />
          <img src="/white-logo.png" alt="Apex" className="hidden size-12 shrink-0 rounded-xl object-cover dark:block" />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">Apex</h1>
            <p className="text-xs text-muted-foreground">Master your exams with past questions</p>
          </div>
          <Link href="/auth" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shrink-0">
            Sign In
          </Link>
        </div>
      )}

      {/* Search on top */}
      {user && (
        <form onSubmit={submitSearch} className="flex items-center gap-2 rounded-full border bg-card px-5 py-1">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search courses, topics, materials…"
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          {!!q.trim() && (
            <button type="submit" aria-label="Search" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ArrowRight className="size-4" />
            </button>
          )}
        </form>
      )}

      {/* Slim streak */}
      {user && <StreakStrip streak={streakData} />}

      {/* My Plan */}
      {user && (
        <section className="space-y-3 pt-1">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-lg font-extrabold">My Plan</h2>
            {!!planLabel && <p className="max-w-[60%] truncate text-[11px] font-semibold text-muted-foreground">{planLabel}</p>}
          </div>
          {(planCourses || []).length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <p className="text-sm font-bold">No courses yet</p>
              <p className="mx-auto mt-1 max-w-[260px] text-xs text-muted-foreground">Set your department and level so your plan can load.</p>
              <Link href="/auth?review=1" className="mt-3 inline-block rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground">
                Set it up
              </Link>
            </div>
          ) : (
            <>
              {both && <SemesterDivider label="First Semester" />}
              {first.map(c => <HomeCourseBlock key={c.code} course={c} doneIds={doneIds} />)}
              {both && (
                <>
                  <SemesterDivider label="Second Semester" />
                  {second.map(c => <HomeCourseBlock key={c.code} course={c} doneIds={doneIds} />)}
                </>
              )}
              {!both && second.map(c => <HomeCourseBlock key={c.code} course={c} doneIds={doneIds} />)}
            </>
          )}
        </section>
      )}

      {/* Not logged in: the way in. */}
      {!user && (
        <section className="overflow-hidden rounded-3xl p-6 text-center text-white" style={{ background: 'linear-gradient(135deg, #130f40, #2c2c54)' }}>
          <h2 className="text-lg font-black">Your study plan lives here</h2>
          <p className="mx-auto mt-1 max-w-[260px] text-xs text-white/70">Sign in to unlock your courses, quizzes and progress.</p>
          <Link href="/auth" className="mt-4 inline-block rounded-full bg-white px-6 py-2.5 text-sm font-extrabold text-black">
            Sign in
          </Link>
        </section>
      )}
    </div>
  )
}
