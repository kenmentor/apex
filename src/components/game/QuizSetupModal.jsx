'use client'

import { useState, useEffect } from 'react'
import { X, Search, Check, ChevronLeft, Layers, ListVideo, Play } from 'lucide-react'
import { getUser } from '@/lib/auth'
import { colorFor } from '@/lib/plan-colors'

// Quiz gets its own isolated flow: pick ONE course, then All topics or pick.
// Tapping a course moves straight to topics — a single decision per screen.
export default function QuizSetupModal(props) {
  const open = props.open
  const onClose = props.onClose
  const onStart = props.onStart

  const [view, setView] = useState('courses')
  const [planCourses, setPlanCourses] = useState([])
  const [course, setCourse] = useState(null)
  const [topicMode, setTopicMode] = useState('all')
  const [pickedTopics, setPickedTopics] = useState([])
  const [q, setQ] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!open) return
    setView('courses')
    setCourse(null)
    setTopicMode('all')
    setPickedTopics([])
    setQ('')
    setLoaded(false)
    let cancelled = false
    async function load() {
      try {
        const u = getUser()
        if (u && u.email) {
          const r = await fetch('/api/plans?email=' + encodeURIComponent(u.email), { cache: 'no-store' })
          const p = await r.json()
          if (!cancelled && p && p.supported && Array.isArray(p.courses) && p.courses.length) {
            setPlanCourses(p.courses)
            return
          }
        }
        if (!cancelled) {
          const r2 = await fetch('/api/courses')
          const d = await r2.json()
          const list = Array.isArray(d) ? d : (d.docs || d.courses || [])
          setPlanCourses(list.map(function (c) { return { code: c.code, title: c.title, topics: [] } }))
        }
      } catch (e) {
        // keep empty list; UI shows the empty state
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    return function () { cancelled = true }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape' && onClose) onClose() }
    window.addEventListener('keydown', onKey)
    return function () { window.removeEventListener('keydown', onKey) }
  }, [open, onClose])

  function pickCourse(c) {
    setCourse(c)
    setTopicMode('all')
    setPickedTopics([])
    setView('topics')
  }

  function toggleTopic(id) {
    setPickedTopics(function (prev) {
      return prev.indexOf(id) >= 0 ? prev.filter(function (t) { return t !== id }) : prev.concat([id])
    })
  }

  function start() {
    if (!onStart || !course) return
    if (topicMode !== 'all' && pickedTopics.length === 0) return
    onStart({
      course: course.code,
      topics: topicMode === 'all' ? [] : pickedTopics,
    })
  }

  if (!open) return null
  const needle = q.trim().toLowerCase()
  const filtered = needle
    ? planCourses.filter(function (c) {
      return (c.code || '').toLowerCase().indexOf(needle) >= 0 || (c.title || '').toLowerCase().indexOf(needle) >= 0
    })
    : planCourses
  const topics = (course && course.topics) || []
  const canStart = !!course && (topicMode === 'all' || pickedTopics.length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <div role="dialog" aria-modal="true" aria-label="Quiz setup" className="relative flex max-h-[85dvh] w-full max-w-sm flex-col overflow-hidden rounded-3xl border bg-card shadow-2xl">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          {view === 'topics' ? (
            <button onClick={function () { setView('courses') }} aria-label="Back to courses" className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-muted">
              <ChevronLeft className="size-5" />
            </button>
          ) : <span className="w-9 shrink-0" />}
          <span className="min-w-0 flex-1 text-center">
            <span className="block text-sm font-extrabold">{view === 'courses' ? 'Pick a course' : (course ? course.code : 'Pick topics')}</span>
            <span className="block text-[11px] text-muted-foreground">{view === 'courses' ? 'Step 1 of 2' : 'Step 2 of 2'}</span>
          </span>
          <button onClick={onClose} aria-label="Close" className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>

        {view === 'courses' && (
          <>
            <div className="border-b px-4 py-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={q}
                  onChange={function (e) { setQ(e.target.value) }}
                  placeholder="Search your courses"
                  className="w-full rounded-xl border bg-background py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary"
                />
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {!loaded && <p className="p-6 text-center text-sm text-muted-foreground">Loading your courses…</p>}
              {loaded && filtered.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">No courses yet — set your department and level in Settings.</p>
              )}
              {loaded && filtered.length > 0 && (
                <div className="space-y-1.5 p-1">
                  {filtered.map(function (c) {
                    const color = colorFor(c.code)
                    return (
                      <button
                        key={c.code}
                        onClick={function () { pickCourse(c) }}
                        className="flex w-full items-center gap-3 rounded-2xl p-3 text-left text-white transition-all active:scale-[0.99]"
                        style={{ background: 'linear-gradient(135deg, ' + color + ', ' + color + 'CC)' }}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-black leading-tight">{c.code}</span>
                          <span className="block truncate text-[11px] text-white/80">{c.title || ''} · {(c.topics || []).length} topics</span>
                        </span>
                        <ChevronLeft className="size-4 shrink-0 rotate-180 text-white/70" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {view === 'topics' && course && (
          <>
            <div className="grid grid-cols-2 gap-1 border-b bg-muted/40 p-2.5">
              <button
                onClick={function () { setTopicMode('all') }}
                className={'flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-extrabold ' + (topicMode === 'all' ? 'bg-card shadow' : 'text-muted-foreground')}
              >
                <Layers className="size-4" /> All topics
              </button>
              <button
                onClick={function () { setTopicMode('pick') }}
                className={'flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-extrabold ' + (topicMode === 'pick' ? 'bg-card shadow' : 'text-muted-foreground')}
              >
                <ListVideo className="size-4" /> Pick{pickedTopics.length > 0 ? ' (' + pickedTopics.length + ')' : ''}
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {topicMode === 'all' && (
                <div className="rounded-2xl border bg-muted/40 p-5 text-center">
                  <p className="text-sm font-bold">{course.code} — everything is in play</p>
                  <p className="mx-auto mt-1 max-w-[260px] text-xs text-muted-foreground">Your quiz will span all {(course.topics || []).length} topics.</p>
                </div>
              )}
              {topicMode === 'pick' && (
                topics.length === 0 ? (
                  <p className="p-6 text-center text-xs text-muted-foreground">No topic breakdown for this course — use All topics.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {topics.map(function (t) {
                      const on = pickedTopics.indexOf(t.id) >= 0
                      return (
                        <button
                          key={t.id}
                          onClick={function () { toggleTopic(t.id) }}
                          className={'max-w-full truncate rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-all active:scale-95 ' + (on ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:border-primary/50')}
                        >
                          {t.title}
                        </button>
                      )
                    })}
                  </div>
                )
              )}
            </div>
            <div className="border-t bg-card px-4 py-3">
              <button
                onClick={start}
                disabled={!canStart}
                className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground transition-all active:scale-[0.99] disabled:opacity-40"
              >
                <Play className="size-4" fill="currentColor" /> Start Quiz
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
