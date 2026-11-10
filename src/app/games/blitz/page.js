'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Flame, Heart } from 'lucide-react'
import { motion } from 'motion/react'
import { getUser } from '@/lib/auth'
import { scoreBlitz, blitzDifficulty } from '@/lib/games'
import { fetchJson, TTL } from '@/lib/fetch-json'
import GameStars from '@/components/game/GameStars'
import SfxToggle from '@/components/game/SfxToggle'
import CoursePickerModal, { CoursePickerButton } from '@/components/game/CoursePickerModal'
import GameQuizCard from '@/components/game/GameQuizCard'
import { playMixParams, nextCourse } from '@/lib/play-params'
import { sfx } from '@/lib/sfx'
import { celebrate } from '@/lib/celebrate'

function starsFor(accuracy) {
  if (accuracy >= 95) return 3
  if (accuracy >= 80) return 2
  return 1
}

const HEARTS = 3
const BANK_N = 30

export default function BlitzPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center pb-24"><p className="text-sm text-muted-foreground">Arming blitz…</p></div>}>
      <BlitzInner />
    </Suspense>
  )
}

function BlitzInner() {
  const params = useSearchParams()
  const raceId = params.get('race')

  const [phase, setPhase] = useState('setup')
  const [courses, setCourses] = useState([])
  const [pickedCourse, setPickedCourse] = useState(params.get('course') || '')
  const [pickerOpen, setPickerOpen] = useState(false)
  const mixRef = useRef(null)
  if (mixRef.current === null) mixRef.current = playMixParams(params)
  const [bank, setBank] = useState(null)
  const [idx, setIdx] = useState(0)
  const [hearts, setHearts] = useState(HEARTS)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [flash, setFlash] = useState(null)
  const [result, setResult] = useState(null)
  const [t0, setT0] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchJson('/api/courses', { ttl: TTL.list })
      .then(d => setCourses(Array.isArray(d) ? d : (d.docs || d.courses || [])))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const m0 = mixRef.current
    if (m0 && m0.courses.length) { const first = nextCourse(m0); setPickedCourse(first); start(first) }
    else if (params.get('course')) start(params.get('course'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!result) return
    if (result.passed) { celebrate(result.accuracy >= 95); sfx('win') } else { sfx('fail') }
  }, [result])

  async function start(courseOverride) {
    const course = (typeof courseOverride === 'string' ? courseOverride : nextCourse(mixRef.current, pickedCourse)).trim()
    if (!course) { setError('Pick a course first.'); return }
    setLoading(true)
    setError('')
    try {
      const d = await fetchJson(`/api/games/sprint?course=${encodeURIComponent(course)}&n=${BANK_N}&seed=blitz-${Date.now()}`, { ttl: TTL.fresh })
      if (!d.questions) throw new Error(d.error || 'No questions for that course.')
      setBank(d)
      setIdx(0)
      setHearts(HEARTS)
      setStreak(0)
      setBest(0)
      setCorrect(0)
      setAnswered(0)
      setFlash(null)
      setResult(null)
      setT0(Date.now())
      setPhase('play')
    } catch (e) {
      setError(e.message || 'Could not load blitz.')
    } finally {
      setLoading(false)
    }
  }

  function pick(letter) {
    if (result || flash || !bank) return
    const q = bank.questions[idx]
    const right = letter.toLowerCase() === String(bank.answers[q.id] || '').toLowerCase()
    setFlash({ qid: q.id, letter, right })
    sfx(right ? 'correct' : 'wrong')
    const nc = correct + (right ? 1 : 0)
    const na = answered + 1
    const ns = right ? streak + 1 : 0
    const nb = Math.max(best, ns)
    const nh = right ? hearts : hearts - 1
    setCorrect(nc)
    setAnswered(na)
    setStreak(ns)
    setBest(nb)
    setTimeout(() => {
      setFlash(null)
      if (!right && nh <= 0) {
        setHearts(0)
        finish(nc, na, nb)
      } else {
        setHearts(nh)
        if (idx + 1 >= bank.questions.length) finish(nc, na, nb, true)
        else setIdx(i => i + 1)
      }
    }, right ? 400 : 750)
  }

  async function finish(nc, na, nb, survived = false) {
    const secs = Math.round((Date.now() - t0) / 1000)
    const accuracy = scoreBlitz(nc, na)
    const passed = accuracy >= 80
    let note = survived ? 'You survived the whole bank! ' : ''
    const u = getUser()
    if (u) {
      try {
        const res = await fetch('/api/games/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: u.email, topicId: `blitz-${bank.course}`, format: 'blitz', correct: nc, total: na, seconds: secs }),
        })
        const data = await res.json()
        if (!res.ok) note += data.error || ''
      } catch { note += 'Could not log attempt (offline?).' }
      if (raceId) {
        try {
          await fetch('/api/races', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: raceId, action: 'finish', email: u.email, accuracy, seconds: secs, difficulty: blitzDifficulty(nb), format: 'blitz' }),
          })
          note += ' Race entry submitted.'
        } catch {}
      }
    } else {
      note += 'Sign in to log attempts and join races.'
    }
    setResult({ accuracy, correct: nc, answered: na, best: nb, seconds: secs, passed, survived, note: note.trim() })
  }

  const q = bank?.questions?.[idx]

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-3">
        <Link href={raceId ? '/races' : '/'} className="flex size-9 items-center justify-center rounded-lg hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <h1 className="text-xl font-bold">Survival Blitz 🔥</h1>
        <SfxToggle />
      </div>

      {phase === 'setup' && (
        <div className="space-y-3 rounded-2xl border p-5">
          <p className="text-sm font-semibold">How long can you survive?</p>
          <p className="text-sm text-muted-foreground">One MCQ at a time, no clock — but 3 wrong answers and the run is over. Streaks build fire and raise your race difficulty. Wrong resets the streak.</p>
          <CoursePickerButton courses={courses} value={pickedCourse} onOpen={() => setPickerOpen(true)} />
          <CoursePickerModal open={pickerOpen} courses={courses} value={pickedCourse} onPick={(c) => { mixRef.current = null; setPickedCourse(c) }} onClose={() => setPickerOpen(false)} />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button onClick={() => start()} disabled={loading} className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {loading ? 'Loading…' : 'Start run'}
          </button>
          <p className="text-xs text-muted-foreground">80%+ to pass · logged · counts toward races</p>
        </div>
      )}

      {phase === 'play' && bank && !result && q && (
        <>
          <div className="flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold">
            <span className="flex gap-0.5" aria-label={`${hearts} hearts left`}>
              {[0, 1, 2].map(i => (
                <motion.span key={i} initial={false} animate={i < hearts ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0.25 }}>
                  <Heart className={'size-4 ' + (i < hearts ? 'fill-red-500 text-red-500' : '')} />
                </motion.span>
              ))}
            </span>
            {streak >= 2 && <span className="flex items-center gap-1 text-orange-500"><Flame className="size-3.5" />x{streak}</span>}
            <span className="ml-auto">{answered} answered · best x{best}</span>
          </div>

          <GameQuizCard q={q} eyebrow={q.section} correctLetter={bank.answers[q.id]} flash={flash} onPick={pick} />
          <p className="text-center text-xs text-muted-foreground">3 misses ends the run — protect the streak</p>
        </>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 rounded-2xl border p-5 text-center">
          <GameStars count={starsFor(result.accuracy)} />
          <p className={`text-2xl font-black ${result.passed ? 'text-emerald-600' : 'text-amber-600'}`}>{result.accuracy}%</p>
          <p className="text-sm text-muted-foreground">
            {result.correct}/{result.answered} in {result.seconds}s · best streak x{result.best}
            {result.survived ? ' · survived everything!' : ''}
          </p>
          {result.note && <p className="text-xs text-muted-foreground">{result.note}</p>}
          <div className="flex gap-2">
            <button onClick={() => start()} disabled={loading} className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold hover:bg-muted disabled:opacity-50">
              Run it back
            </button>
            <button onClick={() => { setPhase('setup'); setResult(null); setBank(null) }} className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
              New blitz
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
