'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { getUser } from '@/lib/auth'
import { Skeleton } from '@/components/ui/skeleton'
import { mockPlan } from '@/lib/demo-content'
import { colorFor } from '@/lib/plan-colors'
import { topicDoneCount } from '@/lib/progress'
import { splitBySemester } from '@/lib/semesters'
import SemesterDivider from '@/components/SemesterDivider'

export default function PlanPage() {
  const [user, setUser] = useState(null)
  const [plan, setPlan] = useState(null)
  const [completions, setCompletions] = useState([])
  const [loading, setLoading] = useState(true)
  const [waitlist, setWaitlist] = useState(false)

  useEffect(() => {
    const u = getUser()
    setUser(u)
    if (!u) { setLoading(false); return }
    // Plans now resolve for every CCMAS programme server-side —
    // no pilot gate here; waitlist only if the API has nothing.
    Promise.all([
      fetch('/api/plans?email=' + encodeURIComponent(u.email), { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/completions?email=' + encodeURIComponent(u.email), { cache: 'no-store' }).then(r => (Array.isArray(r) ? r : r.json()).catch(() => [])),
    ]).then(([p, c]) => {
      if (p && p.supported) { setPlan(p); setCompletions(Array.isArray(c) ? c : []) }
      else setWaitlist(true)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])
  if (loading) return <div className="flex min-h-dvh items-center justify-center pb-24"><Skeleton className="h-64 w-full max-w-md rounded-xl" /></div>

  // Demo fallback: when there is no real plan (waitlist included),
  // show realistic mock data so the whole flow can be demoed.
  const demo = !plan
  const P = plan || mockPlan()

  const doneIds = new Set((completions || []).map(c => `${c.topicId}:${c.itemId}`))

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

  const doneIds = new Set((completions || []).map(c => `${c.topicId}:${c.itemId}`));

  function CourseBlock({ course }) {
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

  // First vs Second Semester, split by course number (odd = first).
  const { first, second } = splitBySemester(P.courses || [])
  const both = first.length > 0 && second.length > 0

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-5 pb-24 pt-6">
      <h1 className="text-2xl font-bold">My Plan</h1>

      {(P.courses || []).length === 0 && !loading && <p className="text-sm text-muted-foreground">No courses yet.</p>}

      {/* Colored course blocks — tap to open the course page */}
      {both && <SemesterDivider label="First Semester" />}
      {first.map((course) => <CourseBlock key={course.code} course={course} />)}
      {both && (
        <>
          <SemesterDivider label="Second Semester" />
          {second.map((course) => <CourseBlock key={course.code} course={course} />)}
        </>
      )}
      {!both && second.map((course) => <CourseBlock key={course.code} course={course} />)}
    </div>
  )
}
