'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Timer, Flame, FastForward } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { getUser } from '@/lib/auth'
import { closeMatch, scoreTyping } from '@/lib/games'
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

const SECONDS = 60

export default function TypingPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center pb-24"><p className="text-sm text-muted-foreground">Warming up fingers…</p></div>}>
      <TypingInner />
    </Suspense>
  )
}

function TypingInner() {
  const params = useSearchParams()
  const raceId = params.get('race')

  const [phase, setPhase] = useState('setup')
  const [courses, setCourses] = useState([])
  const [pickedCourse, setPickedCourse] = useState(params.get('course') || '')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [course, setCourse] = useState('')
  const [deck, setDeck] = useState([])
  const [idx, setIdx] = useState(0)
  const [value, setValue] = useState('')
  const [flash, setFlash] = useState(null) // 'right' | 'wrong'
  const [correct, setCorrect] = useState(0)
  const [shown, setShown] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [result, setResult] = useState(null)
  const [left, setLeft] = useState(SECONDS)
  const [t0, setT0] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  const stateRef = useRef({ correct: 0, shown: 0, bestCombo: 0 })

  useEffect(() => {
    fetchJson('/api/courses', { ttl: TTL.list })
      .then(d => setCourses(Array.isArray(d) ? d : (d.docs || d.courses || [])))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (params.get('course')) start(params.get('course'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (phase !== 'play' || result) return
    const t = setInterval(() => {
      setLeft(prev => {
        if (prev <= 1) { clearInterval(t); finish(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, result])

  useEffect(() => {
    if (!result) return
    if (result.passed) { celebrate(result.accuracy >= 95); sfx('win') } else { sfx('fail') }
  }, [result])

  // Keep the deck stocked: fetch more rows when running low.
  useEffect(() => {
    if (phase === 'play' && !result && deck.length - idx < 3 && course) {
      fetchJson(`/api/games/pairs?course=${encodeURIComponent(course)}&seed=typing-${Date.now()}`, { ttl: TTL.fresh })
        .then(d => { if (d.pairs) setDeck(prev => [...prev, ...d.pairs]) })
        .catch(() => {})
    }
  }, [idx, phase, result, deck.length, course])

  async function start(courseOverride) {
    const c = (typeof courseOverride === 'string' ? courseOverride : pickedCourse).trim()
    if (!c) { setError('Pick a course first.'); return }
    setLoading(true)
    setError('')
    try {
      const d = await fetchJson(`/api/games/pairs?course=${encodeURIComponent(c)}&seed=typing-${Date.now()}`, { ttl: TTL.fresh })
      if (!d.pairs) throw new Error(d.error || 'No terms for that course.')
      setDeck(d.pairs)
      setCourse(c)
      setIdx(0)
      setValue('')
      setFlash(null)
      setCorrect(0)
      setShown(0)
      setCombo(0)
      setBestCombo(0)
      stateRef.current = { correct: 0, shown: 0, bestCombo: 0 }
      setResult(null)
      setLeft(SECONDS)
      setT0(Date.now())
      setPhase('play')
      setTimeout(() => inputRef.current?.focus(), 100)
    } catch (e) {
      setError(e.message || 'Could not load terms.')
    } finally {
      setLoading(false)
    }
  }

  function submit(skip = false) {
    if (result || flash || !deck[idx]) return
    const row = deck[idx]
    const ok = !skip && closeMatch(value, [row.term])
    const st = stateRef.current
    st.shown += 1
    let nc = combo
    if (ok) {
      st.correct += 1
      nc = combo + 1
      st.bestCombo = Math.max(st.bestCombo, nc)
      setCorrect(st.correct)
      setBestCombo(st.bestCombo)
      setCombo(nc)
      setFlash('right')
      sfx('correct')
    } else {
      setCombo(0)
      setFlash('wrong')
      sfx('wrong')
    }
    setShown(st.shown)
    setTimeout(() => {
      setFlash(null)
      setValue('')
      setIdx(i => i + 1)
      inputRef.current?.focus()
    }, ok ? 350 : 650)
  }

  async function finish() {
    const st = stateRef.current
    if (!st.shown && !deck.length) return
    const secs = Math.round((Date.now() - t0) / 1000) || SECONDS
    const accuracy = scoreTyping(st.correct, st.shown)
    const passed = accuracy >= 80
    const perMin = Math.round((st.correct / Math.max(secs, 1)) * 60)
    let note = ''
    const u = getUser()
    if (u && st.shown > 0) {
      try {
        const res = await fetch('/api/games/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: u.email, topicId: `typing-${course}`, format: 'typing', correct: st.correct, total: st.shown, seconds: secs }),
        })
        const data = await res.json()
        if (!res.ok) note = data.error || ''
      } catch { note = 'Could not log attempt (offline?).' }
      if (raceId) {
        try {
          await fetch('/api/races', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: raceId, action: 'finish', email: u.email, accuracy, seconds: secs, difficulty: 2, format: 'typing' }),
          })
          note = (note ? note + ' ' : '') + 'Race entry submitted.'
        } catch {}
      }
    } else if (!u) {
      note = 'Sign in to log attempts and join races.'
    }
    setResult({ accuracy, correct: st.correct, shown: st.shown, bestCombo: st.bestCombo, perMin, seconds: secs, passed, note })
  }

  const row = deck[idx]

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-3">
        <Link href={raceId ? '/races' : '/'} className="flex size-9 items-center justify-center rounded-lg hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <h1 className="text-xl font-bold">Typing Rush ⌨️</h1>
        <SfxToggle />
      </div>

      {phase === 'setup' && (
        <div className="space-y-3 rounded-2xl border p-5">
          <p className="text-sm font-semibold">Fingers faster than memory?</p>
          <p className="text-sm text-muted-foreground">Definitions flash for <span className="font-semibold text-foreground">60 seconds</span> — type the exact term. Close spelling counts. Streaks build combo fire. Skip what you don't know, speed is everything.</p>
          <CoursePickerButton courses={courses} value={pickedCourse} onOpen={() => setPickerOpen(true)} />
          <CoursePickerModal open={pickerOpen} courses={courses} value={pickedCourse} onPick={setPickedCourse} onClose={() => setPickerOpen(false)} />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button onClick={() => start()} disabled={loading} className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {loading ? 'Loading…' : 'Start the clock'}
          </button>
          <p className="text-xs text-muted-foreground">80%+ to pass · logged · counts toward races</p>
        </div>
      )}

      {phase === 'play' && !result && (
        <>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="flex items-center gap-1"><Timer className="size-3.5" />{left}s</span>
              {combo >= 2 && <span className="flex items-center gap-1 text-orange-500"><Flame className="size-3.5" />x{combo}</span>}
              <span className="ml-auto">{correct}/{shown} · best x{bestCombo}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div className={'h-full rounded-full ' + (left <= 10 ? 'bg-red-500' : 'bg-primary')} initial={false} animate={{ width: `${(left / SECONDS) * 100}%` }} />
            </div>
          </div>

          {row ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 24 }}
                animate={flash === 'wrong' ? { opacity: 1, y: 0, x: [0, -8, 8, -5, 5, 0] } : { opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.3 }}
                className={'rounded-2xl border-2 p-4 ' + (flash === 'right' ? 'border-emerald-500' : flash === 'wrong' ? 'border-red-500' : '')}
              >
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Define it — {row.term.length} letters</p>
                <p className="mt-1 text-base font-semibold leading-relaxed">{row.def}</p>
                <div className="mt-3 flex gap-2">
                  <input
                    ref={inputRef}
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submit(false) }}
                    placeholder="Type the term…"
                    autoComplete="off"
                    autoCapitalize="off"
                    disabled={!!flash}
                    className="w-full rounded-xl border px-3 py-2.5 font-mono text-sm outline-none focus:border-primary disabled:opacity-60"
                  />
                  <button onClick={() => submit(true)} title="Skip" className="flex shrink-0 items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted">
                    <FastForward className="size-3.5" /> Skip
                  </button>
                </div>
                {flash === 'right' && <p className="mt-2 text-xs font-semibold text-emerald-600">+1 ✓</p>}
                {flash === 'wrong' && <p className="mt-2 text-xs font-semibold text-red-500">Missed — it was “{row.term}”</p>}
              </motion.div>
            </AnimatePresence>
          ) : (
            <p className="text-sm text-muted-foreground">Loading more terms…</p>
          )}
        </>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 rounded-2xl border p-5 text-center">
          <GameStars count={starsFor(result.accuracy)} />
          <p className={`text-2xl font-black ${result.passed ? 'text-emerald-600' : 'text-amber-600'}`}>{result.accuracy}%</p>
          <p className="text-sm text-muted-foreground">{result.correct}/{result.shown} terms · {result.perMin}/min · best combo x{result.bestCombo} · {result.seconds}s</p>
          {result.note && <p className="text-xs text-muted-foreground">{result.note}</p>}
          <div className="flex gap-2">
            <button onClick={() => start(course)} disabled={loading} className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold hover:bg-muted disabled:opacity-50">
              Again
            </button>
            <button onClick={() => { setPhase('setup'); setResult(null); setDeck([]) }} className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
              New rush
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
