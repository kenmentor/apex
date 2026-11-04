'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Timer, Lightbulb, Eye } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { getUser } from '@/lib/auth'
import { closeMatch, scoreCloze } from '@/lib/games'
import { fetchJson, TTL } from '@/lib/fetch-json'
import GameStars from '@/components/game/GameStars'
import SfxToggle from '@/components/game/SfxToggle'
import CoursePickerModal, { CoursePickerButton } from '@/components/game/CoursePickerModal'
import { sfx } from '@/lib/sfx'
import { celebrate } from '@/lib/celebrate'

function starsFor(accuracy) {
  if (accuracy >= 95) return 3
  if (accuracy >= 80) return 2
  return 1
}

export default function ClozePage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center pb-24"><p className="text-sm text-muted-foreground">Preparing blanks…</p></div>}>
      <ClozeInner />
    </Suspense>
  )
}

function ClozeInner() {
  const params = useSearchParams()
  const raceId = params.get('race')

  const [phase, setPhase] = useState('setup')
  const [courses, setCourses] = useState([])
  const [pickedCourse, setPickedCourse] = useState(params.get('course') || '')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [items, setItems] = useState(null)
  const [course, setCourse] = useState('')
  const [idx, setIdx] = useState(0)
  const [value, setValue] = useState('')
  const [tries, setTries] = useState(0)
  const [hint, setHint] = useState('')
  const [marks, setMarks] = useState([]) // true/false per item
  const [given, setGiven] = useState([]) // what the player typed
  const [flash, setFlash] = useState(null) // 'right' | 'wrong' | 'reveal'
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
    if (params.get('course')) load(params.get('course'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (phase !== 'play' || result) return
    const id = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 500)
    return () => clearInterval(id)
  }, [phase, result, t0])

  // Standard win moment: confetti + fanfare, or a soft fail cue.
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
      const d = await fetchJson(`/api/games/cloze?course=${encodeURIComponent(c)}`, { ttl: TTL.fresh })
      if (!d.items) throw new Error(d.error || 'No blanks for that course.')
      setItems(d.items)
      setCourse(c)
      setIdx(0)
      setValue('')
      setTries(0)
      setHint('')
      setMarks([])
      setGiven([])
      setFlash(null)
      setMistakes(0)
      setResult(null)
      setElapsed(0)
      setT0(Date.now())
      setPhase('play')
    } catch (e) {
      setError(e.message || 'Could not load blanks.')
    } finally {
      setLoading(false)
    }
  }

  function check() {
    if (result || flash || !items) return
    const it = items[idx]
    const ok = closeMatch(value, it.answers)
    if (ok) {
      setFlash('right')
      sfx('correct')
      const m = [...marks, true]
      const g = [...given, value.trim()]
      setTimeout(() => advance(m, g, mistakes), 550)
    } else if (tries + 1 >= 2) {
      setFlash('reveal')
      sfx('wrong')
      const m = [...marks, false]
      const g = [...given, value.trim()]
      setMistakes(x => x + 1)
      setTimeout(() => advance(m, g, mistakes + 1), 1500)
    } else {
      setFlash('wrong')
      sfx('wrong')
      setTries(t => t + 1)
      setHint(`Starts with “${String(it.answers[0] || '').charAt(0)}” · ${String(it.answers[0] || '').length} letters`)
      setTimeout(() => { setFlash(null); setValue('') }, 800)
    }
  }

  function advance(m, g, errs) {
    setMarks(m)
    setGiven(g)
    setFlash(null)
    setValue('')
    setTries(0)
    setHint('')
    if (idx + 1 >= items.length) finish(m, g, errs)
    else setIdx(i => i + 1)
  }

  async function finish(m, g, errs) {
    const total = items.length
    const correct = m.filter(Boolean).length
    const secs = Math.round((Date.now() - t0) / 1000)
    const accuracy = scoreCloze(correct, total)
    const passed = accuracy >= 80
    let note = ''
    const u = getUser()
    if (u) {
      try {
        const res = await fetch('/api/games/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: u.email, topicId: `cloze-${course}`, format: 'cloze', correct, total, seconds: secs }),
        })
        const data = await res.json()
        if (!res.ok) note = data.error || ''
      } catch { note = 'Could not log attempt (offline?).' }
      if (raceId) {
        try {
          await fetch('/api/races', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: raceId, action: 'finish', email: u.email, accuracy, seconds: secs, difficulty: 2, format: 'cloze' }),
          })
          note = (note ? note + ' ' : '') + 'Race entry submitted.'
        } catch {}
      }
    } else {
      note = 'Sign in to log attempts and join races.'
    }
    setResult({ accuracy, correct, total, seconds: secs, mistakes: errs, passed, marks: m, given: g, note })
  }

  const it = items?.[idx]
  const total = items?.length || 0

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-3">
        <Link href={raceId ? '/races' : '/'} className="flex size-9 items-center justify-center rounded-lg hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <h1 className="text-xl font-bold">Cloze Blanks ✏️</h1>
        <SfxToggle />
      </div>

      {phase === 'setup' && (
        <div className="space-y-3 rounded-2xl border p-5">
          <p className="text-sm font-semibold">Say it in your own words.</p>
          <p className="text-sm text-muted-foreground">Definitions with the key term blanked out. One blank at a time — two tries each. Close spelling counts, but you have to <span className="font-semibold text-foreground">produce</span> the answer, not just recognize it.</p>
          <CoursePickerButton courses={courses} value={pickedCourse} onOpen={() => setPickerOpen(true)} />
          <CoursePickerModal open={pickerOpen} courses={courses} value={pickedCourse} onPick={setPickedCourse} onClose={() => setPickerOpen(false)} />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button onClick={() => load()} disabled={loading} className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {loading ? 'Preparing…' : 'Start blanks'}
          </button>
          <p className="text-xs text-muted-foreground">80%+ to pass · logged · counts toward races</p>
        </div>
      )}

      {phase === 'play' && items && !result && it && (
        <>
          <div className="flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-xs font-semibold">
            <span className="flex items-center gap-1"><Timer className="size-3.5" />{elapsed}s</span>
            <span className="ml-auto">Blank {idx + 1}/{total} · ❌ {mistakes}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div className="h-full rounded-full bg-primary" initial={false} animate={{ width: `${(idx / total) * 100}%` }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              className={'rounded-2xl border-2 p-4 ' + (flash === 'right' ? 'border-emerald-500' : flash === 'wrong' ? 'border-red-500' : flash === 'reveal' ? 'border-amber-500' : '')}
            >
              <motion.p
                animate={flash === 'wrong' ? { x: [0, -8, 8, -5, 5, 0] } : flash === 'right' ? { scale: [1, 1.03, 1] } : {}}
                transition={{ duration: 0.35 }}
                className="text-base font-medium leading-relaxed"
              >
                {it.text}
              </motion.p>
              <div className="mt-3 flex gap-2">
                <input
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') check() }}
                  placeholder={tries > 0 ? 'One last try…' : 'Missing word'}
                  autoFocus
                  disabled={!!flash}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60"
                />
                <button onClick={check} disabled={!!flash || !value.trim()} className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-40">
                  Check
                </button>
              </div>
              {hint && tries > 0 && flash !== 'reveal' && <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Lightbulb className="size-3.5" />{hint}</p>}
              {flash === 'wrong' && <p className="mt-2 text-xs font-semibold text-red-500">Not quite — one more try.</p>}
              {flash === 'right' && <p className="mt-2 text-xs font-semibold text-emerald-600">Nailed it ✓</p>}
              {flash === 'reveal' && <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-amber-600"><Eye className="size-3.5" /> Answer: {it.answers[0]}</p>}
              <p className="mt-2 text-[11px] text-muted-foreground">Try {tries + 1}/2</p>
            </motion.div>
          </AnimatePresence>
        </>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="space-y-2 rounded-2xl border p-5 text-center">
            <GameStars count={starsFor(result.accuracy)} />
            <p className={`text-2xl font-black ${result.passed ? 'text-emerald-600' : 'text-amber-600'}`}>{result.accuracy}%</p>
            <p className="text-sm text-muted-foreground">{result.correct}/{result.total} in {result.seconds}s · {result.mistakes} missed</p>
            {result.note && <p className="text-xs text-muted-foreground">{result.note}</p>}
            <div className="flex gap-2">
              <button onClick={() => load(course)} disabled={loading} className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold hover:bg-muted disabled:opacity-50">
                Retry
              </button>
              <button onClick={() => { setPhase('setup'); setResult(null); setItems(null) }} className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
                New blanks
              </button>
            </div>
          </div>
          {items.map((item, i) => (
            <div key={i} className={`rounded-xl border p-3 text-sm ${result.marks[i] ? 'border-emerald-500/40' : 'border-amber-500/40'}`}>
              <p>{item.text}</p>
              <p className="mt-1 text-xs text-muted-foreground">You: {result.given[i] || '—'} · Correct: {item.answers[0]}</p>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
