'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, ChevronRight, ArrowRight, ClipboardList, Layers, Gamepad2, Trophy } from 'lucide-react';
import { getUser } from '@/lib/auth';
import { reviewProfile } from '@/lib/profile-review';
import { colorFor } from '@/lib/plan-colors';
import { topicDoneCount } from '@/lib/progress';
import QuizSetupModal from '@/components/game/QuizSetupModal';
import { Skeleton } from '@/components/ui/skeleton';

// Home: big search on top, 2x2 boxes (Quiz / Courses / Games / Rankings),
// then your top courses — each tap wires straight to its page.
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

const BOXES_TOP = [
  {
    id: 'quiz', title: 'QUIZ', blurb: 'Pick a course, pick topics, start answering',
    cta: 'Start', Icon: ClipboardList,
    bg: 'linear-gradient(135deg, #059669, #0d9488)',
  },
  {
    id: 'courses', title: 'COURSES', blurb: 'Your plan, progress and topics',
    cta: 'Open', Icon: Layers,
    bg: 'linear-gradient(135deg, #0284c7, #22d3ee)',
  },
  {
    id: 'games', title: 'GAMES', blurb: 'Mix courses, then choose a game',
    cta: 'Play', Icon: Gamepad2,
    bg: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
  },
  {
    id: 'rankings', title: 'RANKINGS', blurb: '60% quiz · 40% contributions',
    cta: 'View', Icon: Trophy,
    bg: 'linear-gradient(135deg, #b45309, #f59e0b)',
  },
]

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [planCourses, setPlanCourses] = useState([])
  const [completions, setCompletions] = useState([])
  const [loading, setLoading] = useState(true)
  const [bannerOff, setBannerOff] = useState(false)
  const [q, setQ] = useState('')
  const [quizOpen, setQuizOpen] = useState(false)

  useEffect(() => {
    const u = getUser()
    setUser(u)
    if (!u?.email) { setLoading(false); return }
    Promise.all([
      fetch('/api/plans?email=' + encodeURIComponent(u.email), { cache: 'no-store' }).then(r => r.json()).catch(() => null),
      fetch('/api/completions?email=' + encodeURIComponent(u.email), { cache: 'no-store' }).then(r => (Array.isArray(r) ? r : r.json()).catch(() => [])),
    ]).then(([plan, comps]) => {
      if (plan?.supported) setPlanCourses(plan.courses || [])
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

  // Warm the /search chunk early so tapping Go navigates instantly
  // instead of compiling/downloading the results page on demand.
  useEffect(() => {
    try { router.prefetch?.('/search') } catch {}
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center overflow-x-hidden bg-background pb-24">
        <div className="space-y-4 w-full max-w-lg px-5">
          <Skeleton className="h-12 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-32 w-full rounded-3xl" />
            <Skeleton className="h-32 w-full rounded-3xl" />
          </div>
          <Skeleton className="h-20 w-full rounded-3xl" />
        </div>
      </div>
    )
  }

  const doneIds = new Set((completions || []).map(c => `${c.topicId}:${c.itemId}`))
  const topCourses = [...(planCourses || [])]
    .sort((a, b) => ((b.topics || []).length - (a.topics || []).length))
    .slice(0, 4)

  function submitSearch(e) {
    e?.preventDefault?.()
    const needle = q.trim()
    router.push(needle ? `/search?q=${encodeURIComponent(needle)}` : '/search')
  }

  function handleBox(id) {
    if (id === 'quiz') setQuizOpen(true)
    else if (id === 'courses') router.push('/plan')
    else if (id === 'games') router.push('/games')
    else if (id === 'rankings') router.push('/leaderboard')
  }

  function startQuiz(sel) {
    setQuizOpen(false)
    const slug = sel.course.toLowerCase().replace(/\s+/g, '')
    if (sel.topics.length === 1) {
      router.push('/plan/' + slug + '/' + encodeURIComponent(sel.topics[0]))
    } else {
      router.push('/courses/' + slug + '/quiz')
    }
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-2xl space-y-4 px-5 pb-28 pt-4">
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

      {/* Big search on top — typing + enter jumps to results with the query prefilled */}
      {user && (
        <form onSubmit={submitSearch} className="flex items-center gap-2 rounded-full border bg-card px-4 py-1 shadow-sm focus-within:border-primary/60">
          <button type="submit" aria-label="Search" className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary">
            <Search className="size-[18px]" />
          </button>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search courses, topics, materials…"
            className="w-full bg-transparent py-2.5 text-sm font-medium outline-none placeholder:text-muted-foreground"
          />
          {!!q.trim() && (
            <button type="submit" aria-label="Go" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ArrowRight className="size-4" />
            </button>
          )}
        </form>
      )}

      {/* 2x2: Quiz / Courses / Games / Rankings */}
      {user && (
        <div className="grid grid-cols-2 gap-2.5">
          {BOXES_TOP.map(b => (
            <button
              key={b.id}
              onClick={() => handleBox(b.id)}
              className="relative flex min-h-36 flex-col items-start gap-1 overflow-hidden rounded-3xl p-4 text-left text-white shadow-lg transition-all active:scale-[0.97]"
              style={{ background: b.bg }}
            >
              <b.Icon className="pointer-events-none absolute -bottom-4 -right-4 size-24 text-white/10" strokeWidth={1.5} />
              <span className="relative flex size-11 items-center justify-center rounded-2xl bg-white/20">
                <b.Icon className="size-6" />
              </span>
              <span className="relative mt-auto block pt-3 text-xl font-black leading-none">{b.title}</span>
              <span className="relative block text-[11px] leading-snug text-white/75">{b.blurb}</span>
            </button>
          ))}
        </div>
      )}

      {/* Your courses — straight into each /plan course page */}
      {user && topCourses.length > 0 && (
        <section className="space-y-3 pt-1">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-muted-foreground">Your courses</h2>
            <Link href="/plan" className="flex items-center gap-1 text-xs font-bold text-primary">
              See all <ChevronRight className="size-3.5" />
            </Link>
          </div>
          {topCourses.map(c => <HomeCourseBlock key={c.code} course={c} doneIds={doneIds} />)}
        </section>
      )}

      {user && (planCourses || []).length === 0 && (
        <div className="rounded-2xl border border-dashed p-8 text-center">
          <p className="text-sm font-bold">No courses yet</p>
          <p className="mx-auto mt-1 max-w-[260px] text-xs text-muted-foreground">Set your department and level so your plan can load.</p>
          <Link href="/auth?review=1" className="mt-3 inline-block rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground">
            Set it up
          </Link>
        </div>
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

      <QuizSetupModal open={quizOpen} onClose={() => setQuizOpen(false)} onStart={startQuiz} />
    </div>
  )
}
