'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Timer } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { getUser } from '@/lib/auth'
import { scoreOdd } from '@/lib/games'
import { fetchJson, TTL } from '@/lib/fetch-json'
import GameStars from '@/components/game/GameStars'
import SfxToggle from '@/components/game/SfxToggle'
import CoursePickerModal, { CoursePickerButton } from '@/components/game/CoursePickerModal'
import { playMixParams, nextCourse } from '@/lib/play-params'
import { sfx } from '@/lib/sfx'
import { celebrate } from '@/lib/celebrate'

function starsFor(accuracy) {
  if (accuracy >= 95) return 3
  if (accuracy >= 80) return 2
  return 1
}

export default function OddPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center pb-24"><p className="text-sm text-muted-foreground">Hiding intruders…</p></div>}>
      <OddInner />
    </Suspense>
  )
}

function OddInner() {
  const params = useSearchParams()
  const raceId = params.get('race')

  const [phase, setPhase] = useState('setup')
  const [courses, setCourses] = useState([])
  const [pickedCourse, setPickedCourse] = useState(params.get('course') || '')
  const [pickerOpen, setPickerOpen] = useState(false)
  const mixRef = useRef(null)
  if (mixRef.current === null) mixRef.current = playMixParams(params)
  const [sets, setSets] = useState(null)
  const [course, setCourse] = useState('')
  const [idx, setIdx] = useState(0)
  const [flash, setFlash] = useState(null) // { pick, right }
  const [correct, setCorrect] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [result, setResult] = useState(null)
  const [t0, setT0] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchJson('/api/courses', { ttl: TTL.list })
      .then(d => setCourses(Array.isArray(d) ? d : (d.docs || d.courses || [])))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const m0 = mixRef.current
    if (m0 && m0.courses.length) { const first = nextCourse(m0); setPickedCourse(first); load(first) }
    else if (params.get('course')) load(params.get('course'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (phase !== 'play' || result) return
    const id = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 500)
    return () => clearInterval(id)
  }, [phase, result, t0])

  useEffect(() => {
    if (!result) return
    if (result.passed) { celebrate(result.accuracy >= 95); sfx('win') } else { sfx('fail') }
  }, [result])

  async function load(courseOverride) {
    const c = (typeof courseOverride === 'string' ? courseOverride : pickedCourse).trim()
    if (!c) { setError('Pick a course first.'); return }
    setLoading(true)
    setError('')
    try {
      const d = await fetchJson(`/api/games/odd?course=${encodeURIComponent(c)}&rounds=8&seed=odd-${Date.now()}`, { ttl: TTL.fresh })
      if (!d.sets) throw new Error(d.error || 'No intruders for that course.')
      setSets(d.sets)
      setCourse(c)
      setIdx(0)
      setFlash(null)
      setCorrect(0)
      setMistakes(0)
      setResult(null)
      setElapsed(0)
      setT0(Date.now())
      setPhase('play')
    } catch (e) {
      setError(e.message || 'Could not load odd-one-out.')
    } finally {
      setLoading(false)
    }
  }

  function pick(i) {
    if (result || flash || !sets) return
    const right = i === sets[idx].answer
    setFlash({ pick: i, right })
    sfx(right ? 'correct' : 'wrong')
    const nc = correct + (right ? 1 : 0)
    const nm = mistakes + (right ? 0 : 1)
    setCorrect(nc)
    setMistakes(nm)
    setTimeout(() => {
      setFlash(null)
      if (idx + 1 >= sets.length) finish(nc, nm)
      else setIdx(x => x + 1)
    }, right ? 500 : 900)
  }

  async function finish(nc, nm) {
    const total = sets.length
    const secs = Math.round((Date.now() - t0) / 1000)
    const accuracy = scoreOdd(nc, total)
    const passed = accuracy >= 80
    let note = ''
    const u = getUser()
    if (u) {
      try {
        const res = await fetch('/api/games/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: u.email, topicId: `odd-${course}`, format: 'odd', correct: nc, total, seconds: secs }),
        })
        const data = await res.json()
        if (!res.ok) note = data.error || ''
      } catch { note = 'Could not log attempt (offline?).' }
      if (raceId) {
        try {
          await fetch('/api/races', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: raceId, action: 'finish', email: u.email, accuracy, seconds: secs, difficulty: 1, format: 'odd' }),
          })
          note = (note ? note + ' ' : '') + 'Race entry submitted.'
        } catch {}
      }
    } else {
      note = 'Sign in to log attempts and join races.'
    }
    setResult({ accuracy, correct: nc, total, seconds: secs, mistakes: nm, passed, note })
  }

  const set = sets?.[idx]
  const total = sets?.length || 0

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-3">
        <Link href={raceId ? '/races' : '/'} className="flex size-9 items-center justify-center rounded-lg hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <h1 className="text-xl font-bold">Odd One Out 🕵️</h1>
        <SfxToggle />
      </div>

      {phase === 'setup' && (
        <div className="space-y-3 rounded-2xl border p-5">
          <p className="text-sm font-semibold">Spot the intruder.</p>
          <p className="text-sm text-muted-foreground">Four terms, three from one topic and one smuggled in from another. You only catch it if you <span className="font-semibold text-foreground">know what belongs together</span>. One tap each — no second chances.</p>
          <CoursePickerButton courses={courses} value={pickedCourse} onOpen={() => setPickerOpen(true)} />
          <CoursePickerModal open={pickerOpen} courses={courses} value={pickedCourse} onPick={(c) => { mixRef.current = null; setPickedCourse(c) }} onClose={() => setPickerOpen(false)} />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button onClick={() => load()} disabled={loading} className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {loading ? 'Hiding…' : 'Start hunting'}
          </button>
          <p className="text-xs text-muted-foreground">80%+ to pass · logged · counts toward races</p>
        </div>
      )}

      {phase === 'play' && sets && !result && set && (
        <>
          <div className="flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-xs font-semibold">
            <span className="flex items-center gap-1"><Timer className="size-3.5" />{elapsed}s</span>
            <span className="ml-auto">Set {idx + 1}/{total} · ❌ {mistakes}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div className="h-full rounded-full bg-primary" initial={false} animate={{ width: `${(idx / total) * 100}%` }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              className="space-y-3"
            >
              <p className="rounded-2xl border p-4 text-center text-sm font-semibold">
                3 of these are <span className="text-primary">{set.host}</span> — tap the intruder 🕵️
              </p>
              <div className="grid grid-cols-1 gap-2">
                {set.options.map((term, i) => {
                  const isPick = flash?.pick === i
                  const isAnswer = flash && i === set.answer
                  return (
                    <motion.button
                      key={i}
                      onClick={() => pick(i)}
                      animate={isPick && !flash.right ? { x: [0, -8, 8, -5, 5, 0] } : isAnswer ? { scale: [1, 1.04, 1] } : {}}
                      transition={{ duration: 0.35 }}
                      className={'rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold ' +
                        (flash && isAnswer
                          ? 'border-emerald-500 bg-emerald-500/15'
                          : isPick
                            ? 'border-red-500 bg-red-500/10'
                            : 'border-muted hover:border-primary/50 hover:bg-muted/60')}
                    >
                      {term}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        </>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 rounded-2xl border p-5 text-center">
          <GameStars count={starsFor(result.accuracy)} />
          <p className={`text-2xl font-black ${result.passed ? 'text-emerald-600' : 'text-amber-600'}`}>{result.accuracy}%</p>
          <p className="text-sm text-muted-foreground">{result.correct}/{result.total} intruders in {result.seconds}s · {result.mistakes} missed</p>
          {result.note && <p className="text-xs text-muted-foreground">{result.note}</p>}
          <div className="flex gap-2">
            <button onClick={() => load()} disabled={loading} className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold hover:bg-muted disabled:opacity-50">
              Hunt again
            </button>
            <button onClick={() => { setPhase('setup'); setResult(null); setSets(null) }} className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
              New hunt
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
