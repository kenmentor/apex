'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Timer, MousePointerClick } from 'lucide-react'
import { motion } from 'motion/react'
import { getUser } from '@/lib/auth'
import { seededShuffle, scorePairs } from '@/lib/games'
import { fetchJson, TTL } from '@/lib/fetch-json'
import GameStars from '@/components/game/GameStars'
import SfxToggle from '@/components/game/SfxToggle'
import CoursePickerModal, { CoursePickerButton } from '@/components/game/CoursePickerModal'
import { playMixParams, nextCourse } from '@/lib/play-params'
import { sfx } from '@/lib/sfx'
import { haptic } from '@/lib/haptics'
import { celebrate } from '@/lib/celebrate'

function starsFor(accuracy) {
  if (accuracy >= 95) return 3
  if (accuracy >= 80) return 2
  return 1
}

function FlipCard({ faceUp, cleared, selected, label, sub, onTap }) {
  return (
    <button onClick={onTap} disabled={cleared} className="h-24 w-full [perspective:600px]">
      <motion.div
        initial={false}
        animate={{ rotateY: faceUp || cleared ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="relative size-full [transform-style:preserve-3d]"
      >
        {/* Back (face down) */}
        <span className={'absolute inset-0 flex items-center justify-center rounded-2xl border-2 text-2xl ' +
          (selected ? 'border-primary bg-primary/15' : 'border-primary/30 bg-gradient-to-br from-primary/20 to-primary/5') +
          ' [backface-visibility:hidden]'}>
          🧠
        </span>
        {/* Front (face up) */}
        <span className={'absolute inset-0 flex flex-col items-center justify-center gap-0.5 overflow-hidden rounded-2xl border-2 p-1.5 text-center ' +
          (cleared ? 'border-emerald-500 bg-emerald-500/10' : selected ? 'border-primary bg-card' : 'border-muted-foreground/25 bg-card') +
          ' [backface-visibility:hidden] [transform:rotateY(180deg)]'}>
          <span className="line-clamp-3 text-[11px] font-semibold leading-tight">{label}</span>
          {sub && <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{sub}</span>}
        </span>
      </motion.div>
    </button>
  )
}

export default function PairsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center pb-24"><p className="text-sm text-muted-foreground">Shuffling pairs…</p></div>}>
      <PairsInner />
    </Suspense>
  )
}

function PairsInner() {
  const params = useSearchParams()
  const raceId = params.get('race')

  const [phase, setPhase] = useState('setup')
  const [courses, setCourses] = useState([])
  const [pickedCourse, setPickedCourse] = useState(params.get('course') || '')
  const [pickerOpen, setPickerOpen] = useState(false)
  const mixRef = useRef(null)
  if (mixRef.current === null) mixRef.current = playMixParams(params)
  const [round, setRound] = useState(null)
  const [deck, setDeck] = useState([])
  const [open, setOpen] = useState([]) // face-up card keys (max 2)
  const [cleared, setCleared] = useState([]) // cleared pair indexes
  const [mistakes, setMistakes] = useState(0)
  const [flips, setFlips] = useState(0)
  const [result, setResult] = useState(null)
  const [t0, setT0] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shakeKey, setShakeKey] = useState(null)

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

  // Standard win moment: confetti + fanfare, or a soft fail cue.
  useEffect(() => {
    if (!result) return
    if (result.passed) { celebrate(result.accuracy >= 95); sfx('win') } else { sfx('fail') }
  }, [result])

  async function load(courseOverride) {
    const course = (typeof courseOverride === 'string' ? courseOverride : pickedCourse).trim()
    if (!course) { setError('Pick a course first.'); return }
    setLoading(true)
    setError('')
    try {
      const d = await fetchJson(`/api/games/pairs?course=${encodeURIComponent(course)}&seed=pairs-${Date.now()}`, { ttl: TTL.fresh })
      if (!d.pairs) throw new Error(d.error || 'No pairs for that course.')
      const cards = [
        ...d.pairs.map((_, i) => ({ key: `t${i}`, pair: i, kind: 'term' })),
        ...d.pairs.map((_, i) => ({ key: `d${i}`, pair: i, kind: 'def' })),
      ]
      setRound(d)
      setDeck(seededShuffle(cards, `deck-${Date.now()}`))
      setOpen([])
      setCleared([])
      setMistakes(0)
      setFlips(0)
      setResult(null)
      setElapsed(0)
      setT0(Date.now())
      setPhase('play')
    } catch (e) {
      setError(e.message || 'Could not load pairs.')
    } finally {
      setLoading(false)
    }
  }

  function tapCard(card) {
    if (result || cleared.includes(card.pair) || open.includes(card.key) || open.length >= 2) return
    const next = [...open, card.key]
    setOpen(next)
    setFlips(f => f + 1)
    sfx('flip')
    if (next.length === 2) {
      const [a, b] = next.map(k => deck.find(c => c.key === k))
      if (a.pair === b.pair && a.kind !== b.kind) {
        const done = [...cleared, a.pair]
        setTimeout(() => {
          setCleared(done)
          setOpen([])
          try { haptic.success() } catch {}
          sfx('correct')
          if (done.length >= (round?.pairs?.length || 0)) finish(done, mistakes)
        }, 350)
      } else {
        setShakeKey(`${a.key}+${b.key}`)
        sfx('wrong')
        setTimeout(() => {
          setMistakes(m => m + 1)
          setOpen([])
          setShakeKey(null)
        }, 700)
      }
    }
  }

  async function finish(done, errs) {
    const total = round.pairs.length
    const secs = Math.round((Date.now() - t0) / 1000)
    const accuracy = scorePairs(done.length, total, errs)
    const passed = accuracy >= 80
    let note = ''
    const u = getUser()
    if (u) {
      try {
        const res = await fetch('/api/games/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: u.email, topicId: `pairs-${round.course || pickedCourse}`, format: 'pairs', cleared: done.length, total, mistakes: errs, seconds: secs }),
        })
        const data = await res.json()
        if (!res.ok) note = data.error || ''
      } catch { note = 'Could not log attempt (offline?).' }
      if (raceId) {
        try {
          await fetch('/api/races', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: raceId, action: 'finish', email: u.email, accuracy, seconds: secs, difficulty: 1, format: 'pairs' }),
          })
          note = (note ? note + ' ' : '') + 'Race entry submitted.'
        } catch {}
      }
    } else {
      note = 'Sign in to log attempts and join races.'
    }
    setResult({ accuracy, done: done.length, total, mistakes: errs, seconds: secs, flips, passed, note })
  }

  const totalPairs = round?.pairs?.length || 0

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-3">
        <Link href={raceId ? '/races' : '/'} className="flex size-9 items-center justify-center rounded-lg hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <h1 className="text-xl font-bold">Match Pairs 🧠</h1>
        <SfxToggle />
      </div>

      {phase === 'setup' && (
        <div className="space-y-3 rounded-2xl border p-5">
          <p className="text-sm font-semibold">Flip. Remember. Match.</p>
          <p className="text-sm text-muted-foreground">Terms and definitions are shuffled face-down. Flip two — a true match locks in green, a miss costs you (−5 each). Clear the whole board.</p>
          <CoursePickerButton courses={courses} value={pickedCourse} onOpen={() => setPickerOpen(true)} />
          <CoursePickerModal open={pickerOpen} courses={courses} value={pickedCourse} onPick={(c) => { mixRef.current = null; setPickedCourse(c) }} onClose={() => setPickerOpen(false)} />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button onClick={() => load()} disabled={loading} className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {loading ? 'Shuffling…' : 'Start matching'}
          </button>
          <p className="text-xs text-muted-foreground">80%+ to pass · logged · counts toward races</p>
        </div>
      )}

      {phase === 'play' && round && !result && (
        <>
          <div className="flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-xs font-semibold">
            <span className="flex items-center gap-1"><Timer className="size-3.5" />{elapsed}s</span>
            <span className="flex items-center gap-1"><MousePointerClick className="size-3.5" />{flips} flips</span>
            <span className="ml-auto">{cleared.length}/{totalPairs} matched · ❌ {mistakes}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div className="h-full rounded-full bg-emerald-500" initial={false} animate={{ width: `${totalPairs ? (cleared.length / totalPairs) * 100 : 0}%` }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
          </div>
          <motion.div key={shakeKey || 'board'} animate={shakeKey ? { x: [0, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.35 }} className="grid grid-cols-3 gap-2">
            {deck.map(card => {
              const p = round.pairs[card.pair]
              return (
                <FlipCard
                  key={card.key}
                  label={card.kind === 'term' ? p.term : p.def}
                  sub={card.kind}
                  faceUp={open.includes(card.key)}
                  cleared={cleared.includes(card.pair)}
                  selected={open.includes(card.key)}
                  onTap={() => tapCard(card)}
                />
              )
            })}
          </motion.div>
        </>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 rounded-2xl border p-5 text-center">
          <GameStars count={starsFor(result.accuracy)} />
          <p className={`text-2xl font-black ${result.passed ? 'text-emerald-600' : 'text-amber-600'}`}>{result.accuracy}%</p>
          <p className="text-sm text-muted-foreground">{result.done}/{result.total} pairs · {result.mistakes} mistakes · {result.seconds}s · {result.flips} flips</p>
          {result.note && <p className="text-xs text-muted-foreground">{result.note}</p>}
          <div className="flex gap-2">
            <button onClick={() => load()} disabled={loading} className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold hover:bg-muted disabled:opacity-50">
              Replay
            </button>
            <button onClick={() => { setPhase('setup'); setResult(null); setRound(null) }} className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
              New board
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
