'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { Drawer } from 'vaul'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Mousewheel, FreeMode } from 'swiper/modules'
import { getUser } from '@/lib/auth'
import { fetchJson, TTL } from '@/lib/fetch-json'
import { Skeleton } from '@/components/ui/skeleton'

export default function TaskPage() {
  const [user, setUser] = useState(null)
  const [plan, setPlan] = useState(null)
  const [completions, setCompletions] = useState([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const u = getUser()
    setUser(u)
    if (!u) { setLoading(false); return }
    // Mock plan (UI review: used only when the real plan is unreachable).
    const MOCK_PLAN = {
      supported: true,
      masteryBar: 80,
      cohort: { department: 'COS', level: '200 Level' },
      courses: [
        { code: 'COS 202', title: 'Computer Programming II', topics: [
          { id: 'mock-arrays', title: 'Arrays and Strings', items: [
            { id: 'learn', kind: 'learn', title: 'Read: Arrays and Strings' },
            { id: 'drill', kind: 'drill', title: 'Drill: 10 array questions' },
            { id: 'prove', kind: 'prove', title: 'Prove: timed array quiz' },
          ] },
        ] },
        { code: 'CSC 282', title: 'Computer Lab 2B: Java OOP', topics: [
          { id: 'mock-classes', title: 'Classes and Constructors', items: [
            { id: 'learn', kind: 'learn', title: 'Read: Classes and constructors' },
            { id: 'drill', kind: 'drill', title: 'Drill: 10 class questions' },
          ] },
        ] },
        { code: 'CSC 203', title: 'Discrete Structure', topics: [
          { id: 'mock-logic', title: 'Propositional Logic', items: [
            { id: 'learn', kind: 'learn', title: 'Read: Propositions and truth tables' },
            { id: 'prove', kind: 'prove', title: 'Prove: timed logic quiz' },
          ] },
        ] },
      ],
    };
    Promise.all([
      fetchJson('/api/plans?email=' + encodeURIComponent(u.email), { ttl: TTL.list }).catch(() => null),
      fetchJson('/api/completions?email=' + encodeURIComponent(u.email), { ttl: TTL.list }).catch(() => []),
    ]).then(([p, c]) => {
      if (p && p.supported) { setPlan(p); setCompletions(Array.isArray(c) ? c : []) }
      else { setPlan(MOCK_PLAN); setCompletions([]) }
      setLoading(false)
    }).catch(() => { setPlan(MOCK_PLAN); setCompletions([]); setLoading(false) })
  }, [])

  function askDone(course, topic, item) {
    setPending({ course, topic, item })
    setSheetOpen(true)
  }

  async function confirmDone() {
    if (!pending || !user) return
    const { topic, item } = pending
    setSaving(true)
    const entry = { topicId: topic.id, itemId: item.id, kind: item.kind, percentage: item.kind === 'prove' ? 85 : null, createdAt: new Date().toISOString() }
    await fetch('/api/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, topicId: topic.id, itemId: item.id, kind: item.kind, percentage: entry.percentage }),
    }).then(r => r.json()).catch(() => null)
    // Optimistic: check the box immediately (mock-friendly when the DB is down).
    setCompletions(prev => [...prev, entry])
    setSaving(false)
    setSheetOpen(false)
    setPending(null)
  }

  if (loading) return <div className="flex min-h-dvh items-center justify-center pb-24"><Skeleton className="h-64 w-full max-w-md rounded-xl" /></div>
  if (!user) return <div className="mx-auto max-w-md px-4 pb-24 pt-6"><h1 className="text-xl font-bold">Today&apos;s Tasks</h1><p className="mt-2 text-sm text-muted-foreground">Sign in to see your tasks.</p><Link href="/auth" className="mt-4 block rounded-xl bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground">Sign In</Link></div>

  const today = new Date().toISOString().slice(0, 10)
  const doneToday = new Set()
  for (const c of completions) {
    if ((c.createdAt || '').slice(0, 10) === today) doneToday.add(`${c.topicId}:${c.itemId}`)
  }

  let total = 0
  let done = 0
  const groups = []
  for (const course of plan?.courses || []) {
    const rows = []
    for (const topic of course.topics || []) {
      for (const item of topic.items || []) {
        total += 1
        const isDone = doneToday.has(`${topic.id}:${item.id}`)
        if (isDone) done += 1
        rows.push({ topic, item, isDone })
      }
    }
    if (rows.length) groups.push({ course, rows })
  }

  const codeOf = (code) => (code || '').toLowerCase().replace(/\s+/g, '')
  const startHref = (code, item) => (item.kind === 'learn' || item.kind === 'watch') ? `/courses/${codeOf(code)}` : `/courses/${codeOf(code)}/quiz`

  return (
    <div className="mx-auto flex h-[calc(100dvh-122px)] max-w-2xl flex-col px-4 pt-6">
      <div>
        <h1 className="text-xl font-bold">Today&apos;s Tasks</h1>
        <p className="text-xs text-muted-foreground">{done} of {total} done today</p>
      </div>
      <div className="mt-2 h-2 shrink-0 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-green-500" style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }} />
      </div>
      {!groups.length && <p className="mt-4 text-sm text-muted-foreground">No curriculum tasks yet — check the plan once your department is supported.</p>}
      {groups.length > 0 && (
      <Swiper
        direction="vertical"
        slidesPerView={1.08}
        spaceBetween={12}
        mousewheel={{ forceToAxis: true, releaseOnEdges: true }}
        modules={[Mousewheel]}
        className="mt-4 min-h-0 flex-1"
        style={{ height: '100%' }}
      >
      {groups.map(({ course, rows }) => (
        <SwiperSlide key={course.code} style={{ height: '100%' }}>
        <section className="flex h-full flex-col rounded-2xl border bg-card p-4">
          <h2 className="text-sm font-bold">{course.code}</h2>
          <p className="mb-1 text-xs text-muted-foreground">{course.title}</p>
          <Swiper
            direction="vertical"
            slidesPerView="auto"
            freeMode
            nested
            mousewheel={{ releaseOnEdges: true }}
            modules={[FreeMode, Mousewheel]}
            style={{ flex: 1, minHeight: 0, width: '100%' }}
          >
          <SwiperSlide style={{ height: 'auto' }}>
          <div className="divide-y divide-border">
          {rows.map(({ topic, item, isDone }) => (
            <div key={`${topic.id}:${item.id}`} className="flex items-center gap-3 py-3">
              <Link href={startHref(course.code, item)} className="flex min-w-0 flex-1 items-center gap-3">
                {isDone ? (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-500">
                    <Check className="size-4 text-white" strokeWidth={3} />
                  </span>
                ) : (
                  <span className="size-6 shrink-0 rounded-full border-2 border-muted-foreground/40" />
                )}
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-medium ${isDone ? 'text-muted-foreground line-through' : ''}`}>{item.title}</span>
                  <span className="text-[11px] text-muted-foreground">{topic.title}</span>
                </span>
              </Link>
              {!isDone && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); askDone(course, topic, item) }}
                  className="shrink-0 rounded-lg border px-2 py-1 text-xs hover:bg-muted"
                >
                  Done
                </button>
              )}
            </div>
          ))}
          </div>
          </SwiperSlide>
          </Swiper>
        </section>
        </SwiperSlide>
      ))}
      </Swiper>
      )}

      <Drawer.Root open={sheetOpen} onOpenChange={setSheetOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[70] bg-black/50" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-md rounded-t-3xl bg-background p-5 pb-8 outline-none">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
            <h2 className="text-center text-base font-bold">Have you completed this task?</h2>
            <p className="mt-1 text-center text-xs text-muted-foreground">Say the truth, don&apos;t lie.</p>
            {pending && (
              <p className="mt-3 rounded-xl bg-muted p-3 text-center text-sm font-medium">{pending.item.title}</p>
            )}
            <div className="mt-4 space-y-2">
              <button
                onClick={confirmDone}
                disabled={saving}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Yes, I did it'}
              </button>
              <button
                onClick={() => { setSheetOpen(false); setPending(null) }}
                className="w-full rounded-xl border py-3 text-sm font-medium hover:bg-muted"
              >
                Not yet
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  )
}
