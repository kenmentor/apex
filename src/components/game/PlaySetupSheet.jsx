'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'motion/react'
import { X, Search, Check, Shuffle, Layers, ListVideo, Gamepad2, ClipboardList, ChevronRight } from 'lucide-react'
import { getUser } from '@/lib/auth'
import { colorFor } from '@/lib/plan-colors'

function topicCourse(topicId, planCourses) {
  for (const c of planCourses || []) {
    if ((c.topics || []).some(t => t.id === topicId)) return c.code
  }
  return null
}

export default function PlaySetupSheet(props) {
  const open = props.open
  const onClose = props.onClose
  const initialActivity = props.initialActivity || 'game'
  const initialGame = props.initialGame || null
  const games = props.games || []
  const onStart = props.onStart
  const title = props.title || 'Set up your run'

  const [activity, setActivity] = useState(initialActivity)
  const [planCourses, setPlanCourses] = useState([])
  const [picked, setPicked] = useState([])
  const [topicMode, setTopicMode] = useState('all')
  const [pickedTopics, setPickedTopics] = useState([])
  const [gameHref, setGameHref] = useState(initialGame)
  const [q, setQ] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!open) return
    setActivity(initialActivity)
    setGameHref(initialGame)
    setPicked([])
    setPickedTopics([])
    setTopicMode('all')
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
  }, [open, initialActivity, initialGame])

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape' && onClose) onClose()
    }
    window.addEventListener('keydown', onKey)
    return function () { window.removeEventListener('keydown', onKey) }
  }, [open, onClose])

  const filtered = useMemo(function () {
    const needle = q.trim().toLowerCase()
    if (!needle) return planCourses
    return (planCourses || []).filter(function (c) {
      return (c.code || '').toLowerCase().indexOf(needle) >= 0 || (c.title || '').toLowerCase().indexOf(needle) >= 0
    })
  }, [planCourses, q])

  function toggleCourse(code) {
    const next = picked.indexOf(code) >= 0 ? picked.filter(function (c) { return c !== code }) : picked.concat([code])
    setPicked(next)
    setPickedTopics(function (prev) {
      return prev.filter(function (tid) { return next.indexOf(topicCourse(tid, planCourses)) >= 0 })
    })
  }

  function toggleTopic(id) {
    setPickedTopics(function (prev) {
      return prev.indexOf(id) >= 0 ? prev.filter(function (t) { return t !== id }) : prev.concat([id])
    })
  }

  const pickedCourses = useMemo(function () {
    return picked.map(function (code) { return planCourses.find(function (c) { return c.code === code }) }).filter(Boolean)
  }, [picked, planCourses])

  const topicCount = pickedCourses.reduce(function (n, c) { return n + ((c.topics || []).length) }, 0)
  const isQuiz = activity === 'quiz'
  const quizReady = !isQuiz || picked.length === 1
  const gameReady = isQuiz ? true : !!gameHref
  const topicsReady = topicMode === 'all' || pickedTopics.length > 0
  const canStart = loaded && picked.length > 0 && quizReady && gameReady && topicsReady

  function ctaLabel() {
    if (!loaded) return 'Loading'
    if (picked.length === 0) return 'Pick at least one course'
    if (!quizReady) return 'Quiz needs exactly one course'
    if (!topicsReady) return 'Pick at least one topic'
    if (!isQuiz && !gameHref) return 'Pick a game'
    return isQuiz ? 'Start Quiz' : 'Start Game'
  }

  function start() {
    if (!canStart || !onStart) return
    onStart({
      activity: activity,
      courses: picked,
      topics: topicMode === 'all' ? [] : pickedTopics,
      mode: picked.length > 1 ? 'mix' : 'all',
      game: gameHref,
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 32 }}
        transition={{ type: 'spring', stiffness: 340, damping: 32 }}
        className="relative flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border bg-card shadow-2xl sm:rounded-3xl"
      >
        <div className="border-b px-4 pb-3 pt-4">
          <div className="flex items-center gap-2">
            <h2 className="flex-1 text-base font-extrabold">{title}</h2>
            <button onClick={onClose} aria-label="Close" className="flex size-9 items-center justify-center rounded-full hover:bg-muted">
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
            <TabButton active={activity === 'game'} onClick={() => setActivity('game')} Icon={Gamepad2} label="Games" />
            <TabButton active={activity === 'quiz'} onClick={() => setActivity('quiz')} Icon={ClipboardList} label="Quiz" />
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <section className="space-y-2">
            <StepHead n="1" text="Courses" />
            {picked.length > 0 && (
              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">{picked.length} picked</span>
            )}
            {picked.length > 1 && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-primary"><Shuffle className="size-3" /> Mix mode</span>
            )}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={function (e) { setQ(e.target.value) }}
                placeholder="Search your courses"
                className="w-full rounded-xl border bg-background py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary"
              />
            </div>
            {!loaded && <p className="px-1 py-3 text-xs text-muted-foreground">Loading your courses</p>}
            {loaded && filtered.length === 0 && (
              <p className="px-1 py-3 text-xs text-muted-foreground">No courses yet. Set your department and level in Settings.</p>
            )}
            {loaded && filtered.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {filtered.map(function (c) {
                  const on = picked.indexOf(c.code) >= 0
                  const color = colorFor(c.code)
                  return (
                    <button
                      key={c.code}
                      onClick={function () { toggleCourse(c.code) }}
                      className={'relative overflow-hidden rounded-2xl p-3 text-left text-white transition-all active:scale-[0.97] ' + (on ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : 'opacity-85')}
                      style={{ background: 'linear-gradient(135deg, ' + color + ', ' + color + 'CC)' }}
                    >
                      {on && (
                        <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-white text-black">
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                      )}
                      <span className="block pr-5 text-[15px] font-black leading-tight">{c.code}</span>
                      <span className="mt-0.5 line-clamp-1 block text-[11px] text-white/80">{c.title || ''}</span>
                      <span className="mt-1 block text-[10px] font-semibold text-white/70">{(c.topics || []).length} topics</span>
                    </button>
                  )
                })}
              </div>
            )}
            {isQuiz && picked.length > 1 && (
              <p className="px-1 text-[11px] font-semibold text-amber-600">Quiz takes one course at a time. Keep one picked or switch to Games for a mix.</p>
            )}
          </section>

          {picked.length > 0 && (
            <section className="space-y-2">
              <StepHead n="2" text={'Topics' + (topicCount > 0 ? ' (' + topicCount + ')' : '')} />
              <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
                <button
                  onClick={function () { setTopicMode('all') }}
                  className={'flex items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-bold ' + (topicMode === 'all' ? 'bg-card shadow' : 'text-muted-foreground')}
                >
                  <Layers className="size-4" /> All topics
                </button>
                <button
                  onClick={function () { setTopicMode('pick') }}
                  className={'flex items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-bold ' + (topicMode === 'pick' ? 'bg-card shadow' : 'text-muted-foreground')}
                >
                  <ListVideo className="size-4" /> Pick topics{pickedTopics.length > 0 ? ' (' + pickedTopics.length + ')' : ''}
                </button>
              </div>
              {topicMode === 'pick' && (
                <div className="space-y-3">
                  {pickedCourses.map(function (c) {
                    return (
                      <div key={c.code}>
                        <p className="mb-1.5 px-1 text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">{c.code}</p>
                        {(c.topics || []).length === 0 && (
                          <p className="px-1 text-[11px] text-muted-foreground">No topic breakdown. Use All topics.</p>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                          {(c.topics || []).map(function (t) {
                            const on = pickedTopics.indexOf(t.id) >= 0
                            return (
                              <button
                                key={t.id}
                                onClick={function () { toggleTopic(t.id) }}
                                className={'max-w-full truncate rounded-full border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ' + (on ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:border-primary/50')}
                              >
                                {t.title}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <p className="px-1 text-[11px] leading-snug text-muted-foreground">
                {isQuiz ? 'Quiz follows your topics exactly.' : 'Quiz follows topics exactly. Games shuffle the full course bank.'}
              </p>
            </section>
          )}

          {!isQuiz && games.length > 0 && (
            <section className="space-y-2">
              <StepHead n="3" text="Game" />
              <div className="space-y-1.5">
                {games.map(function (g) {
                  const on = gameHref === g.href
                  const Icon = g.Icon || Gamepad2
                  return (
                    <button
                      key={g.href}
                      onClick={function () { setGameHref(g.href) }}
                      className={'flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition-all ' + (on ? 'border-primary bg-primary/5 ring-1 ring-primary/40' : 'hover:bg-muted/60')}
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: g.bg || '#6366f1' }}>
                        <Icon className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{g.name}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">{g.blurb || ''}</span>
                      </span>
                      {on
                        ? <Check className="size-4 shrink-0 text-primary" />
                        : <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />}
                    </button>
                  )
                })}
              </div>
            </section>
          )}
        </div>

        <div className="border-t bg-card px-4 py-3">
          <button
            onClick={start}
            disabled={!canStart}
            className="w-full rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground transition-all active:scale-[0.99] disabled:opacity-40"
          >
            {ctaLabel()}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function StepHead(props) {
  return (
    <h3 className="flex items-center gap-1.5 px-1 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">{props.n}</span>
      {props.text}
    </h3>
  )
}

function TabButton(props) {
  const Icon = props.Icon
  return (
    <button
      onClick={props.onClick}
      className={'flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-bold transition-all ' + (props.active ? 'bg-card text-foreground shadow' : 'text-muted-foreground')}
    >
      <Icon className="size-4" /> {props.label}
    </button>
  )
}
