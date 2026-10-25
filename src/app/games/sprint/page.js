'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Timer, Flame, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { getUser } from '@/lib/auth'
import { scoreSprint } from '@/lib/games'
import { fetchJson, TTL } from '@/lib/fetch-json'
import GameStars from '@/components/game/GameStars'
import SfxToggle from '@/components/game/SfxToggle'
import { sfx } from '@/lib/sfx'
import { celebrate } from '@/lib/celebrate'

function starsFor(accuracy) {
  if (accuracy >= 95) return 3
  if (accuracy >= 80) return 2
  return 1
}

export default function SprintPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center pb-24"><p className="text-sm text-muted-foreground">Loading sprint…</p></div>}>
      <SprintInner />
    </Suspense>
  )
}

function SprintInner() {
  const params = useSearchParams()
  const raceId = params.get('race')

  const [phase, setPhase] = useState('setup')
  const [courses, setCourses] = useState([])
  const [pickedCourse, setPickedCourse] = useState(params.get('course') || '')
  const [count, setCount] = useState(10)
  const [bank, setBank] = useState(null)
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [flash, setFlash] = useState(null) // { qid, letter, right }
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [result, setResult] = useState(null)
  const [t0, setT0] = useState(0)
  const [left, setLeft] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchJson('/api/courses', { ttl: TTL.list })
      .then(d => setCourses(Array.isArray(d) ? d : (d.docs || d.courses || [])))
      .catch(() => {})
  }, [])

  // If opened with ?course= (race link), jump straight in.
  useEffect(() => {
    if (params.get('course')) start(params.get('course'), 10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (phase !== 'play' || result) return
    const t = setInterval(() => {
      setLeft(prev => {
        if (prev <= 1) { clearInterval(t); submit(true); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, result, bank])

  // Standard win moment: confetti + fanfare, or a soft fail cue.
  useEffect(() => {
    if (!result) return
    if (result.passed) { celebrate(result.accuracy >= 95); sfx('win') } else { sfx('fail') }
  }, [result])

  async function start(courseOverride, nOverride) {
    const course = (typeof courseOverride === 'string' ? courseOverride : pickedCourse).trim()
    const n = nOverride || count
    if (!course) { setError('Pick a course first.'); return }
    setLoading(true)
    setError('')
    try {
      const d = await fetchJson(`/api/games/sprint?course=${encodeURIComponent(course)}&n=${n}&seed=sprint-${Date.now()}`, { ttl: TTL.fresh })
      if (!d.questions) throw new Error(d.error || 'No questions for that course.')
      setBank(d)
      setIdx(0)
      setAnswers({})
      setFlash(null)
      setStreak(0)
      setBestStreak(0)
      setResult(null)
      setT0(Date.now())
      setLeft(d.timerSeconds || n * 30)
      setPhase('play')
    } catch (e) {
      setError(e.message || 'Could not load sprint.')
    } finally {
      setLoading(false)
    }
  }

  function pick(letter) {
    if (result || flash || !bank) return
    const q = bank.questions[idx]
    const right = letter.toLowerCase() === String(bank.answers[q.id] || '').toLowerCase()
    setAnswers(prev => ({ ...prev, [q.id]: letter }))
    setFlash({ qid: q.id, letter, right })
    sfx(right ? 'correct' : 'wrong')
    const ns = right ? streak + 1 : 0
    setStreak(ns)
    if (ns > bestStreak) setBestStreak(ns)
    setTimeout(() => {
      setFlash(null)
      if (idx + 1 >= bank.questions.length) submit(false, { ...answers, [q.id]: letter })
      else setIdx(i => i + 1)
    }, right ? 450 : 700)
  }

  async function submit(auto = false, finalAnswers = null) {
    if (result || !bank) return
    const ans = finalAnswers || answers
    const secs = Math.round((Date.now() - t0) / 1000)
    let correct = 0
    for (const q of bank.questions) {
      if ((ans[q.id] || '').toLowerCase() === String(bank.answers[q.id] || '').toLowerCase()) correct += 1
    }
    const accuracy = scoreSprint(correct, bank.questions.length)
    const passed = accuracy >= 80
    let note = ''
    const u = getUser()
    if (u) {
      try {
        const res = await fetch('/api/games/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: u.email, topicId: `sprint-${bank.course}`, format: 'sprint', correct, total: bank.questions.length, seconds: secs }),
        })
        const data = await res.json()
        if (!res.ok) note = data.error || ''
      } catch { note = 'Could not log attempt (offline?).' }
      if (raceId) {
        try {
          await fetch('/api/races', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: raceId, action: 'finish', email: u.email, accuracy, seconds: secs, difficulty: 2, format: 'sprint' }),
          })
          note = (note ? note + ' ' : '') + 'Race entry submitted.'
        } catch {}
      }
    } else {
      note = 'Sign in to log attempts and join races.'
    }
    setResult({ accuracy, correct, total: bank.questions.length, seconds: secs, passed, auto, note })
  }

  const q = bank?.questions?.[idx]
  const totalTime = bank ? (bank.timerSeconds || bank.questions.length * 30) : 1

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-3">
        <Link href={raceId ? '/races' : '/'} className="flex size-9 items-center justify-center rounded-lg hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <h1 className="text-xl font-bold">Speed Sprint ⚡</h1>
        <SfxToggle />
      </div>

      {phase === 'setup' && (
        <div className="space-y-3 rounded-2xl border p-5">
          <p className="text-sm font-semibold">How fast can you think? ⚡</p>
          <p className="text-sm text-muted-foreground">One question at a time against the clock. Tap fast — streaks build fire, mistakes kill it. No going back.</p>
          <label className="block text-xs font-semibold text-muted-foreground">
            Course
            <select value={pickedCourse} onChange={e => setPickedCourse(e.target.value)} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground">
              <option value="">Pick a course…</option>
              {courses.map(c => <option key={c.code} value={c.code}>{c.code} — {c.title}</option>)}
            </select>
          </label>
          <div className="flex gap-1.5">
            {[5, 10, 15].map(n => (
              <button key={n} onClick={() => setCount(n)} className={'flex-1 rounded-xl border px-3 py-1.5 text-xs font-bold ' + (count === n ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted')}>
                {n} Qs
              </button>
            ))}
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button onClick={() => start()} disabled={loading} className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {loading ? 'Loading…' : 'Start sprint'}
          </button>
          <p className="text-xs text-muted-foreground">80%+ to pass · logged · counts toward races</p>
        </div>
      )}

      {phase === 'play' && bank && !result && q && (
        <>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="flex items-center gap-1"><Timer className="size-3.5" />{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span>
              {streak >= 2 && <span className="flex items-center gap-1 text-orange-500"><Flame className="size-3.5" />x{streak}</span>}
              <span className="ml-auto">Q {idx + 1}/{bank.questions.length}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div className={'h-full rounded-full ' + (left < totalTime * 0.2 ? 'bg-red-500' : 'bg-primary')} initial={false} animate={{ width: `${(left / totalTime) * 100}%` }} />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={q.id}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              className="rounded-2xl border p-4"
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{q.section}</p>
              <p className="mt-1 text-base font-semibold">{q.question}</p>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {Object.entries(q.options || {}).map(([letter, text]) => {
                  const isFlash = flash?.qid === q.id && flash?.letter === letter
                  const isRightAnswer = flash && letter.toLowerCase() === String(bank.answers[q.id] || '').toLowerCase()
                  return (
                    <motion.button
                      key={letter}
                      onClick={() => pick(letter)}
                      animate={isFlash && !flash.right ? { x: [0, -8, 8, -5, 5, 0] } : {}}
                      transition={{ duration: 0.35 }}
                      className={'rounded-xl border-2 px-3 py-2.5 text-left text-sm font-medium ' +
                        (flash && isRightAnswer
                          ? 'border-emerald-500 bg-emerald-500/15'
                          : isFlash
                            ? 'border-red-500 bg-red-500/10'
                            : 'border-muted hover:border-primary/50 hover:bg-muted/60')}
                    >
                      <span className="mr-2 inline-flex size-6 items-center justify-center rounded-md bg-muted text-xs font-black uppercase">{letter}</span>
                      {text}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          </AnimatePresence>
          <p className="text-center text-xs text-muted-foreground"><Zap className="mr-1 inline size-3" />No going back — trust your first read</p>
        </>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 rounded-2xl border p-5 text-center">
          <GameStars count={starsFor(result.accuracy)} />
          <p className={`text-2xl font-black ${result.passed ? 'text-emerald-600' : 'text-amber-600'}`}>{result.accuracy}%</p>
          <p className="text-sm text-muted-foreground">
            {result.correct}/{result.total} in {result.seconds}s · best streak x{bestStreak} {result.auto ? '· time up!' : ''}
          </p>
          {result.note && <p className="text-xs text-muted-foreground">{result.note}</p>}
          <div className="flex gap-2">
            <button onClick={() => start(bank.course, bank.questions.length)} disabled={loading} className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold hover:bg-muted disabled:opacity-50">
              Retry
            </button>
            <button onClick={() => { setPhase('setup'); setResult(null); setBank(null) }} className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
              New sprint
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
