'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { getUser } from '@/lib/auth'
import { Skeleton } from '@/components/ui/skeleton'
import SnapRow from '@/components/SnapRow'
import TikTokTabs from '@/components/TikTokTabs'
import { mockPlan } from '@/lib/demo-content'

export default function PlanPage() {
  const [user, setUser] = useState(null)
  const [plan, setPlan] = useState(null)
  const [completions, setCompletions] = useState([])
  const [loading, setLoading] = useState(true)
  const [waitlist, setWaitlist] = useState(false)
  const [openIdx, setOpenIdx] = useState(0)
  const [openWeekIdx, setOpenWeekIdx] = useState(0)
  const pagerRef = useRef(null)

  function goCourse(i) {
    setOpenIdx(i)
    setOpenWeekIdx(0)
    pagerRef.current?.scrollTo(i)
  }

  function onCourseSnap(i) {
    setOpenIdx(i)
    setOpenWeekIdx(0)
  }

  useEffect(() => {
    const u = getUser()
    setUser(u)
    if (!u) { setLoading(false); return }
    const inPilot = (u.department || '').toUpperCase().includes('COMPUTER') || (u.department || '').toUpperCase().startsWith('COS')
    if (!inPilot && u.department) { setWaitlist(true); setLoading(false); return }
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
  // Group a course's topics into weeks (3 topics per week).
  const toWeeks = (topics) => {
    const out = []
    for (let i = 0; i < (topics || []).length; i += 3) out.push(topics.slice(i, i + 3))
    return out
  }

  function Ring({ pct, size = 40 }) {
    const r = (size - 6) / 2
    const c = 2 * Math.PI * r
    const done = pct >= 100
    return (
      <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="4" className="stroke-muted" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth="4" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c - (Math.min(100, pct) / 100) * c}
            className={done ? 'stroke-green-500' : 'stroke-primary'} style={{ transition: 'stroke-dashoffset 0.4s' }} />
        </svg>
        <span className="absolute text-[10px] font-bold">{Math.round(pct)}%</span>
      </span>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pb-24 pt-4">
      {/* Course switch — TikTok text tabs, underline follows the snap */}
      {(P.courses || []).length > 0 && (
        <div className="mt-1 shrink-0 border-b">
          <TikTokTabs
            tabs={(P.courses || []).map((course, ci) => ({ id: ci, label: course.code }))}
            active={openIdx}
            onChange={goCourse}
          />
        </div>
      )}

      {/* Course pager — swipe left/right like the home feed */}
      {(P.courses || []).length > 0 && (
        <SnapRow
          align="start"
          slideClass="basis-full"
          onSelect={onCourseSnap}
          apiRef={pagerRef}
          items={(P.courses || []).map((course, ci) => {
            const topics = course.topics || []
            const totalItems = topics.reduce((n, t) => n + (t.items || []).length, 0)
            const doneItems = topics.reduce((n, t) => n + (t.items || []).filter(i => doneIds.has(`${t.id}:${i.id}`)).length, 0)
            const coursePct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0
            return { ...course, key: course.code, ci, topics, coursePct, totalItems, doneItems }
          })}
          renderItem={(course) => {
            const topics = course.topics || []
            const weeks = toWeeks(topics)
            const courseKey = course.code.toLowerCase().replace(/\s+/g, '')
            return (
              <div className="pr-1">
                <div className="flex items-center gap-3 pt-1">
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-extrabold">{course.code}</span>
                    <span className="block truncate text-xs text-muted-foreground">{course.title}</span>
                  </span>
                  <Ring pct={course.coursePct} />
                </div>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  {weeks.length} weeks · {topics.length} topics · {course.doneItems}/{course.totalItems} done
                </span>
                {weeks.length === 0 && (
                  <p className="mt-4 text-sm text-muted-foreground">No topics in this course yet.</p>
                )}
                {weeks.map((wtopics, wi) => {
                  const wTotal = wtopics.reduce((n, t) => n + (t.items || []).length, 0)
                  const wDone = wtopics.reduce((n, t) => n + (t.items || []).filter(i => doneIds.has(`${t.id}:${i.id}`)).length, 0)
                  const wPct = wTotal ? Math.round((wDone / wTotal) * 100) : 0
                  return (
                    <section key={wi} className="mt-5">
                      <button onClick={() => setOpenWeekIdx(openWeekIdx === wi ? -1 : wi)} className="flex w-full items-center gap-3 text-left">
                        <Ring pct={wPct} size={44} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-extrabold">Week {wi + 1}</span>
                          <span className="text-[11px] text-muted-foreground">{wDone}/{wTotal} done · {wtopics.length} topics</span>
                        </span>
                        <span className={`shrink-0 text-muted-foreground transition-transform ${openWeekIdx === wi ? 'rotate-180' : ''}`}>▾</span>
                      </button>
                      {openWeekIdx === wi && (
                      <>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${wPct}%` }} />
                      </div>
                      <div className="mt-1 divide-y divide-border border-y">
                        {wtopics.map(topic => {
                          const rows = topic.items || []
                          const tDone = rows.filter(i => doneIds.has(`${topic.id}:${i.id}`)).length
                          const tAll = rows.length > 0 && tDone === rows.length
                          return (
                            <Link key={topic.id} href={`/plan/${courseKey}/${topic.id}?t=${encodeURIComponent(topic.title)}`} className="flex items-center gap-3 bg-background py-3.5 transition-colors hover:bg-muted/50">
                              {tAll ? (
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-500">
                                  <Check className="size-4 text-white" strokeWidth={3} />
                                </span>
                              ) : (
                                <span className="size-6 shrink-0 rounded-full border-2 border-muted-foreground/40" />
                              )}
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{topic.title}</span>
                                <span className="text-[11px] text-muted-foreground">{tDone}/{rows.length} tasks · tap for media</span>
                              </span>
                            </Link>
                          )
                        })}
                      </div>
                      </>
                      )}
                    </section>
                  )
                })}
              </div>
            )
          }}
        />
      )}
      {P.courses.length === 0 && !loading && <p className="text-sm text-muted-foreground">No courses yet.</p>}
    </div>
  )
}
