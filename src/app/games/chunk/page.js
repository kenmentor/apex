'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lock, Timer, MousePointerClick, RotateCcw, Shuffle, BookOpen } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { getUser } from '@/lib/auth'
import { chunkText, seededShuffle, scoreOrder } from '@/lib/games'
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

export default function ChunkGamePage() {
  const [phase, setPhase] = useState('setup')
  const [courses, setCourses] = useState([])
  const [pickedCourse, setPickedCourse] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const mixRef = useRef(null)
  if (mixRef.current === null && typeof window !== 'undefined') mixRef.current = playMixParams(new URLSearchParams(window.location.search))
  useEffect(() => {
    const m = mixRef.current
    if (m && m.courses.length) { const first = nextCourse(m); setPickedCourse(first); start(first) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [round, setRound] = useState(null)
  const [slots, setSlots] = useState([])
  const [tray, setTray] = useState([])
  const [locked, setLocked] = useState([])
  const [moves, setMoves] = useState(0)
  const [t0, setT0] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const slotRefs = useRef([])
  const autoSubmitted = useRef(false)

  useEffect(() => {
    fetchJson('/api/courses', { ttl: TTL.list })
      .then(d => setCourses(Array.isArray(d) ? d : (d.docs || d.courses || [])))
      .catch(() => {})
  }, [])

  // Timer while playing.
  useEffect(() => {
    if (phase !== 'play' || result) return
    const id = setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 500)
    return () => clearInterval(id)
  }, [phase, result, t0])

  // Celebrate + auto-submit when every piece snaps home.
  useEffect(() => {
    if (phase === 'play' && !result && round && locked.length && locked.every(Boolean) && !autoSubmitted.current) {
      autoSubmitted.current = true
      const id = setTimeout(() => submit(), 800)
      return () => clearTimeout(id)
    }
  }, [locked, phase, result, round])

  // Standard win moment: confetti + fanfare, or a soft fail cue.
  useEffect(() => {
    if (!result) return
    if (result.passed) { celebrate(result.accuracy >= 95); sfx('win') } else { sfx('fail') }
  }, [result])

  async function start(courseOverride) {
    const course = typeof courseOverride === 'string' ? courseOverride : nextCourse(mixRef.current, pickedCourse)
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (course) params.set('course', course)
      const d = await fetchJson(`/api/games/chunk?${params.toString()}`, { ttl: TTL.fresh })
      if (d.error) throw new Error(d.error)
      setupRound(d)
    } catch (e) {
      setError(e.message || 'Could not load a puzzle. Try again.')
    } finally {
      setLoading(false)
    }
  }

  function setupRound(d) {
    const parts = chunkText(d.text, 8)
    const ids = parts.map((_, i) => i)
    const shuffled = seededShuffle(ids, `chunk-${Date.now()}`)
    setRound({ ...d, parts })
    setSlots(Array(parts.length).fill(null))
    setTray(shuffled)
    setLocked(Array(parts.length).fill(false))
    setMoves(0)
    setResult(null)
    setElapsed(0)
    setT0(Date.now())
    autoSubmitted.current = false
    setPhase('play')
  }

  function retrySame() {
    if (!round) return
    const ids = round.parts.map((_, i) => i)
    setSlots(Array(ids.length).fill(null))
    setTray(seededShuffle(ids, `chunk-${Date.now()}`))
    setLocked(Array(ids.length).fill(false))
    setMoves(0)
    setResult(null)
    setElapsed(0)
    setT0(Date.now())
    autoSubmitted.current = false
    setPhase('play')
  }

  // Place piece into a slot; snap-lock when it sits well.
  function place(piece, target) {
    if (locked[target]) return
    setSlots(prev => {
      const next = [...prev]
      // Remove piece from wherever it was.
      const fromSlot = next.indexOf(piece)
      if (fromSlot >= 0) next[fromSlot] = null
      const occupant = next[target]
      next[target] = piece
      if (occupant != null && occupant !== piece) {
        // Swap: occupant goes back to the origin (or tray).
        if (fromSlot >= 0) next[fromSlot] = occupant
        else setTray(t => [...t, occupant])
      }
      return next
    })
    setTray(prev => prev.filter(p => p !== piece))
    setLocked(prev => {
      const next = [...prev]
      next[target] = piece === target
      return next
    })
    setMoves(m => m + 1)
    if (piece === target) {
      try { haptic.tap() } catch {}
      sfx('pop')
    }
  }

  function placeFirstEmpty(piece) {
    const i = slots.findIndex(s => s == null)
    if (i < 0) return
    place(piece, i)
  }

  function sendBack(piece) {
    const i = slots.indexOf(piece)
    if (i < 0 || locked[i]) return
    setSlots(prev => { const next = [...prev]; next[i] = null; return next })
    setTray(prev => [...prev, piece])
    setMoves(m => m + 1)
  }

  function onDragEnd(piece, from, info) {
    const pt = info.point
    if (!pt) return
    const target = slotRefs.current.findIndex(el => {
      if (!el) return false
      const r = el.getBoundingClientRect()
      return pt.x >= r.left && pt.x <= r.right && pt.y >= r.top && pt.y <= r.bottom
    })
    if (target < 0) return
    if (from.area === 'slot' && from.index === target) return
    place(piece, target)
  }

  async function submit() {
    if (!round) return
    const secs = Math.round((Date.now() - t0) / 1000)
    const correct = round.parts.map((_, i) => i)
    const accuracy = scoreOrder(slots, correct)
    const passed = accuracy >= 80
    let note = ''
    const u = getUser()
    if (u) {
      try {
        const res = await fetch('/api/games/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: u.email, topicId: round.topicId, format: 'chunk', placedIds: slots, correctIds: correct, seconds: secs }),
        })
        const data = await res.json()
        if (!res.ok) note = data.error || ''
      } catch {
        note = 'Could not log attempt (offline?).'
      }
    } else {
      note = 'Sign in to log attempts and join races.'
    }
    setResult({ accuracy, passed, seconds: secs, moves, note })
  }

  const total = round?.parts?.length || 0
  const lockedCount = locked.filter(Boolean).length
  const full = slots.length > 0 && slots.every(s => s != null)

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-3">
        <Link href="/games/chunk" onClick={e => { e.preventDefault(); setPhase('setup'); setResult(null); setRound(null) }} className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-xl font-bold">Reassembler</h1>
        <SfxToggle />
      </div>

      {phase === 'setup' && (
        <div className="space-y-3 rounded-2xl border p-5">
          <p className="text-sm font-semibold">Put the definition back together 🧩</p>
          <p className="text-sm text-muted-foreground">
            A real definition is shattered into pieces. Read every piece — only the meaning tells you what comes next.
            Pieces <span className="font-semibold text-foreground">snap and lock</span> when they sit well.
          </p>
          <CoursePickerButton courses={courses} value={pickedCourse} onOpen={() => setPickerOpen(true)} emptyLabel="🎲 Surprise me" />
          <CoursePickerModal open={pickerOpen} courses={courses} value={pickedCourse} onPick={(c) => { mixRef.current = null; setPickedCourse(c) }} onClose={() => setPickerOpen(false)} allowRandom />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={() => start()}
            disabled={loading}
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {loading ? 'Shattering…' : 'Start puzzle'}
          </button>
          <p className="text-xs text-muted-foreground">80%+ to pass · logged against the topic · counts toward races</p>
        </div>
      )}

      {(phase === 'play' || result) && round && (
        <>
          <div className="flex items-center gap-3 rounded-2xl border px-4 py-2.5 text-xs font-semibold">
            <span className="flex items-center gap-1"><Timer className="size-3.5" />{result ? result.seconds : elapsed}s</span>
            <span className="flex items-center gap-1"><MousePointerClick className="size-3.5" />{result ? result.moves : moves} moves</span>
            <span className="ml-auto">{lockedCount}/{total} snapped</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-emerald-500"
              initial={false}
              animate={{ width: `${total ? (lockedCount / total) * 100 : 0}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Topic: <span className="font-semibold text-foreground">{round.title}</span> · {round.courseCode}</p>

          {/* Board slots */}
          <ol className="space-y-2">
            {slots.map((piece, i) => (
              <li
                key={i}
                ref={el => { slotRefs.current[i] = el }}
                className={'flex min-h-14 items-center gap-2 rounded-2xl border-2 p-1.5 transition-colors ' +
                  (piece == null
                    ? 'border-dashed border-muted-foreground/30'
                    : locked[i]
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-solid border-muted-foreground/20 bg-card')}
              >
                <span className={'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ' +
                  (piece != null && locked[i] ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground')}>
                  {piece != null && locked[i] ? <Lock className="size-3" /> : i + 1}
                </span>
                {piece == null ? (
                  <span className="text-xs text-muted-foreground/60">Drop piece {i + 1} here</span>
                ) : (
                  <motion.button
                    layout
                    layoutId={`piece-${round.topicId}-${piece}`}
                    drag={!locked[i] && !result}
                    dragMomentum={false}
                    dragSnapToOrigin
                    whileDrag={{ scale: 1.05, zIndex: 50 }}
                    onDragEnd={(_, info) => onDragEnd(piece, { area: 'slot', index: i }, info)}
                    onClick={() => { if (!result) sendBack(piece) }}
                    initial={false}
                    animate={locked[i] ? { scale: [1, 1.07, 1] } : { scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className={'flex-1 cursor-grab rounded-xl px-3 py-2 text-left text-sm active:cursor-grabbing ' +
                      (locked[i] ? 'font-medium' : 'bg-muted/60')}
                  >
                    {round.parts[piece]}
                  </motion.button>
                )}
              </li>
            ))}
          </ol>

          {/* Tray */}
          {!result && tray.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Loose pieces — tap or drag {lockedCount > 0 ? `(${tray.length} left)` : ''}</p>
              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {tray.map(piece => (
                    <motion.button
                      key={`piece-${round.topicId}-${piece}`}
                      layout
                      layoutId={`piece-${round.topicId}-${piece}`}
                      drag
                      dragMomentum={false}
                      dragSnapToOrigin
                      whileDrag={{ scale: 1.08, zIndex: 50, rotate: 0 }}
                      onDragEnd={(_, info) => onDragEnd(piece, { area: 'tray' }, info)}
                      onClick={() => placeFirstEmpty(piece)}
                      exit={{ scale: 0.6, opacity: 0 }}
                      initial={false}
                      style={{ rotate: ((piece * 37) % 7) - 3 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                      className="max-w-full cursor-grab rounded-2xl rounded-tl-md border-2 border-primary/30 bg-card px-3 py-2 text-left text-sm shadow-md active:cursor-grabbing"
                    >
                      {round.parts[piece]}
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {!result && (
            <div className="flex gap-2">
              <button
                onClick={submit}
                disabled={!full}
                className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-40"
              >
                {full ? 'Check order' : `Fill all ${total} slots (${slots.filter(s => s != null).length}/${total})`}
              </button>
              <button onClick={retrySame} title="Reshuffle" className="flex size-10 items-center justify-center rounded-xl border hover:bg-muted">
                <Shuffle className="size-4" />
              </button>
            </div>
          )}

          {result && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 rounded-2xl border p-5 text-center">
              <GameStars count={starsFor(result.accuracy)} />
              <p className={`text-2xl font-black ${result.passed ? 'text-emerald-600' : 'text-amber-600'}`}>{result.accuracy}%</p>
              <p className="text-sm text-muted-foreground">
                {result.passed ? 'Locked in. That definition is yours now.' : 'Below 80% — re-read the full text, then retry.'}
                {' '}· {result.seconds}s · {result.moves} moves
              </p>
              {result.note && <p className="text-xs text-muted-foreground">{result.note}</p>}
              <div className="rounded-xl bg-muted/60 p-3 text-left text-sm">
                <p className="mb-1 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground"><BookOpen className="size-3.5" /> The full definition</p>
                {round.parts.map((p, i) => (
                  <span key={i} className={slots[i] === i ? '' : 'bg-amber-500/20'}>{p} </span>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={retrySame} className="flex flex-1 items-center justify-center gap-1 rounded-xl border px-4 py-2.5 text-sm font-bold hover:bg-muted">
                  <RotateCcw className="size-4" /> Retry
                </button>
                <button onClick={() => start()} disabled={loading} className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
                  {loading ? '…' : 'New puzzle'}
                </button>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}
