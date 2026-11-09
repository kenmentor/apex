'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Heart, Flame, Timer, Dumbbell } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { getUser } from '@/lib/auth'
import { scoreBoss } from '@/lib/games'
import { fetchJson, TTL } from '@/lib/fetch-json'
import GameStars from '@/components/game/GameStars'
import SfxToggle from '@/components/game/SfxToggle'
import CoursePickerModal, { CoursePickerButton } from '@/components/game/CoursePickerModal'
import { playMixParams, nextCourse } from '@/lib/play-params'
import { sfx } from '@/lib/sfx'
import { celebrate } from '@/lib/celebrate'
import FightArena from '@/components/game/FightArena'

function starsFor(accuracy) {
  if (accuracy >= 95) return 3
  if (accuracy >= 80) return 2
  return 1
}

const BOSSES = [
  { emoji: '👾', name: 'Guzzler' },
  { emoji: '🐉', name: 'Syllabiss' },
  { emoji: '🤖', name: 'Examtron' },
  { emoji: '👹', name: 'Distracto' },
  { emoji: '🧌', name: 'Cramlord' },
  { emoji: '🦂', name: 'Sting' },
]

const TIERS = [
  { min: 0, emoji: '🌱', title: 'Recruit' },
  { min: 40, emoji: '🛡️', title: 'Guard' },
  { min: 100, emoji: '⚔️', title: 'Knight' },
  { min: 180, emoji: '🔥', title: 'Champion' },
]

const BUILD_SECONDS = 90
const BUILD_N = 24
const BATTLE_N = 12
const BOSS_MAX = 120
const PLAYER_MAX = 100
// Boss strikes if you stare too long — hesitation costs HP.
const STRIKE_SECONDS = 15
const STRIKE_DMG = 12

function bossFor(course) {
  let h = 0
  for (const ch of String(course || 'boss')) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return BOSSES[h % BOSSES.length]
}

function tierFor(power) {
  let t = TIERS[0]
  for (const tier of TIERS) if (power >= tier.min) t = tier
  return t
}

export default function BossPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center pb-24"><p className="text-sm text-muted-foreground">Summoning boss…</p></div>}>
      <BossInner />
    </Suspense>
  )
}

function BossInner() {
  const params = useSearchParams()
  const raceId = params.get('race')

  const [phase, setPhase] = useState('setup')
  const [courses, setCourses] = useState([])
  const [pickedCourse, setPickedCourse] = useState(params.get('course') || '')
  const [pickerOpen, setPickerOpen] = useState(false)
  const mixRef = useRef(null)
  if (mixRef.current === null) mixRef.current = playMixParams(params)
  const [course, setCourse] = useState('')
  const [boss, setBoss] = useState(BOSSES[0])
  const [bank, setBank] = useState(null)
  const [idx, setIdx] = useState(0)
  const [flash, setFlash] = useState(null)
  // Build stats
  const [power, setPower] = useState(0)
  const [buildCorrect, setBuildCorrect] = useState(0)
  const [buildAnswered, setBuildAnswered] = useState(0)
  const [left, setLeft] = useState(BUILD_SECONDS)
  const [popups, setPopups] = useState([])
  // Battle stats
  const [bossHp, setBossHp] = useState(BOSS_MAX)
  const [playerHp, setPlayerHp] = useState(PLAYER_MAX)
  const [streak, setStreak] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [dealt, setDealt] = useState(0)
  const [flavor, setFlavor] = useState('')
  const [shakeKey, setShakeKey] = useState(0)
  const [round, setRound] = useState(1)
  const arenaRef = useRef(null)
  const [hits, setHits] = useState([])
  const [result, setResult] = useState(null)
  const [t0, setT0] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [popId, setPopId] = useState(0)
  const [timeLeft, setTimeLeft] = useState(STRIKE_SECONDS)
  const flashRef = useRef(false)
  const firedRef = useRef(false)

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

  // flashRef mirrors flash state for the strike timer (avoids stale closures).
  useEffect(() => { flashRef.current = !!flash }, [flash]);
  useEffect(() => {
    if (phase !== 'build') return
    const t = setInterval(() => {
      setLeft(prev => {
        if (prev <= 1) { clearInterval(t); enterBattle(); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // Battle strike clock — one fresh fuse per question. Hesitate and the boss hits you.
  useEffect(() => {
    if (phase !== 'battle' || !bank) return
    firedRef.current = false
    const startedAt = Date.now()
    const span = STRIKE_SECONDS * 1000
    setTimeLeft(STRIKE_SECONDS)
    const t = setInterval(() => {
      const remain = Math.max(0, span - (Date.now() - startedAt))
      setTimeLeft(Math.ceil(remain / 1000))
      if (remain <= 0 && !firedRef.current) {
        firedRef.current = true
        clearInterval(t)
        timeoutStrike()
      }
    }, 100)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx, round, bank])

  useEffect(() => {
    if (!result) return
    if (result.won) { celebrate(result.accuracy >= 95); sfx('win') } else { sfx('fail') }
  }, [result])

  async function start(courseOverride) {
    const c = (typeof courseOverride === 'string' ? courseOverride : nextCourse(mixRef.current, pickedCourse)).trim()
    if (!c) { setError('Pick a course first.'); return }
    setLoading(true)
    setError('')
    try {
      const d = await fetchJson(`/api/games/sprint?course=${encodeURIComponent(c)}&n=${BUILD_N}&seed=boss-build-${Date.now()}`, { ttl: TTL.fresh })
      if (!d.questions) throw new Error(d.error || 'No questions for that course.')
      resetAll(d, c)
      setPhase('build')
      sfx('click')
    } catch (e) {
      setError(e.message || 'Could not start battle.')
    } finally {
      setLoading(false)
    }
  }

  function resetAll(d, c) {
    setCourse(c)
    setBoss(bossFor(c))
    setBank(d)
    setIdx(0)
    setFlash(null)
    flashRef.current = false
    firedRef.current = false
    setTimeLeft(STRIKE_SECONDS)
    setPower(0)
    setBuildCorrect(0)
    setBuildAnswered(0)
    setLeft(BUILD_SECONDS)
    setPopups([])
    setBossHp(BOSS_MAX)
    setPlayerHp(PLAYER_MAX)
    setRound(1)
    try { arenaRef.current?.reset() } catch {}
    setStreak(0)
    setCorrect(0)
    setAnswered(0)
    setDealt(0)
    setFlavor('')
    setHits([])
    setResult(null)
    setT0(Date.now())
  }

  function popup(text, color) {
    setPopId(x => x + 1)
    const id = popId + 1
    setPopups(prev => [...prev, { id, text, color }])
    setTimeout(() => setPopups(prev => prev.filter(p => p.id !== id)), 1000)
  }

  // ── Build phase: rapid answers forge power ──
  function train(letter) {
    if (phase !== 'build' || flash || !bank) return
    const q = bank.questions[idx]
    const right = letter.toLowerCase() === String(bank.answers[q.id] || '').toLowerCase()
    setFlash({ qid: q.id, letter, right })
    const na = buildAnswered + 1
    setBuildAnswered(na)
    if (right) {
      const gain = 10 + Math.min(streak, 10) * 2
      const np = power + gain
      const before = tierFor(power).title
      const after = tierFor(np).title
      setPower(np)
      setBuildCorrect(c => c + 1)
      setStreak(s => s + 1)
      sfx('correct')
      popup(`+${gain} power`, 'text-orange-500')
      if (after !== before) setTimeout(() => { popup(`${after}!`, 'text-amber-500'); sfx('pop') }, 250)
    } else {
      setStreak(0)
      sfx('wrong')
    }
    setTimeout(() => {
      setFlash(null)
      if (idx + 1 >= bank.questions.length) enterBattle()
      else setIdx(i => i + 1)
    }, right ? 350 : 600)
  }

  // ── Battle phase: power becomes damage ──
  async function enterBattle() {
    if (phase !== 'build') return
    try {
      const d = await fetchJson(`/api/games/sprint?course=${encodeURIComponent(course)}&n=${BATTLE_N}&seed=boss-fight-${Date.now()}`, { ttl: TTL.fresh })
      if (d.questions) setBank(d)
    } catch {}
    setIdx(0)
    setFlash(null)
    setStreak(0)
    setFlavor(power < 40
      ? `Underpowered (${power})! ${boss.name} smells fear…`
      : `Power ${power} — ${tierFor(power).title} enters the arena!`)
    setPhase('battle')
    sfx('pop')
  }

  function strike(letter) {
    if (phase !== 'battle' || flash || !bank) return
    const q = bank.questions[idx]
    const right = letter.toLowerCase() === String(bank.answers[q.id] || '').toLowerCase()
    setFlash({ qid: q.id, letter, right })
    const na = answered + 1
    setAnswered(na)
    if (right) {
      const ns = streak + 1
      const crit = ns % 3 === 0
      const dmg = Math.round((6 + Math.floor(power / 12)) * (crit ? 2 : 1))
      setStreak(ns)
      setPower(p => p + 4)
      setCorrect(c => c + 1)
      setDealt(x => x + dmg)
      sfx('correct')
      if (crit) setTimeout(() => sfx('pop'), 120)
      try { arenaRef.current?.hit('player', crit) } catch {}
      floatHit(crit ? `CRIT -${dmg}` : `-${dmg}`, crit ? 'text-amber-500' : 'text-emerald-500')
      const remaining = bossHp - dmg
      setBossHp(Math.max(0, remaining))
      setFlavor((crit ? 'CRITICAL! The arena roars!' : remaining <= 30 && remaining > 0 ? "It's staggering — finish it!" : 'Direct hit!') + ' +4⚡')
      setTimeout(() => {
        setFlash(null)
        if (remaining <= 0) knockOut(true)
        else if (idx + 1 >= bank.questions.length) nextRound()
        else setIdx(i => i + 1)
      }, 650)
    } else {
      setStreak(0)
      sfx('wrong')
      setShakeKey(k => k + 1)
      try { arenaRef.current?.hit('boss', false) } catch {}
      const remaining = playerHp - 14
      setPlayerHp(Math.max(0, remaining))
      floatHit('-14 HP', 'text-red-500')
      setFlavor('Ouch! It counters!')
      setTimeout(() => {
        setFlash(null)
        if (remaining <= 0) knockOut(false)
        else if (idx + 1 >= bank.questions.length) nextRound()
        else setIdx(i => i + 1)
      }, 800)
    }
  }

  // ── Boss strike: hesitate too long and it hits you first ──
  function timeoutStrike() {
    if (phase !== 'battle' || flashRef.current || !bank?.questions?.[idx] || result) return
    setFlash({ qid: bank.questions[idx].id, letter: null, right: false })
    setStreak(0)
    setAnswered(a => a + 1)
    sfx('wrong')
    setShakeKey(k => k + 1)
    try { arenaRef.current?.hit('boss', false) } catch {}
    setPlayerHp(h => {
      const remaining = Math.max(0, h - STRIKE_DMG)
      return remaining
    })
    const remaining = Math.max(0, playerHp - STRIKE_DMG)
    floatHit(`-${STRIKE_DMG} HP`, 'text-red-500')
    setFlavor(`${boss.name} strikes while you hesitated!`)
    setTimeout(() => {
      setFlash(null)
      if (remaining <= 0) knockOut(false)
      else if (idx + 1 >= bank.questions.length) nextRound()
      else setIdx(i => i + 1)
    }, 900)
  }

  // Fresh questions keep flowing — answering is what keeps you alive.
  async function nextRound() {
    const r = round + 1
    setRound(r)
    const heal = Math.round(BOSS_MAX * 0.4)
    setBossHp(h => Math.min(BOSS_MAX, h + heal))
    setFlavor(`Round ${r} — fresh questions! It recovers ${heal} HP. Keep answering!`)
    sfx('pop')
    try {
      const d = await fetchJson(`/api/games/sprint?course=${encodeURIComponent(course)}&n=${BATTLE_N}&seed=boss-fight-${Date.now()}`, { ttl: TTL.fresh })
      if (d.questions) setBank(d)
    } catch {}
    setIdx(0)
  }

  function knockOut(won) {
    try { arenaRef.current?.ko(won ? 'boss' : 'player') } catch {}
    setTimeout(() => finish(won), 1600)
  }

  function floatHit(text, color) {
    setPopId(x => x + 1)
    const id = popId + 100000
    setHits(prev => [...prev, { id, text, color }])
    setTimeout(() => setHits(prev => prev.filter(h => h.id !== id)), 1100)
  }

  async function finish(won) {
    const secs = Math.round((Date.now() - t0) / 1000)
    const nc = buildCorrect + correct
    const na = buildAnswered + answered
    const accuracy = scoreBoss(nc, Math.max(na, 1))
    let note = won ? `${boss.name} defeated! ` : 'Defeated… train harder. '
    const u = getUser()
    if (u && na > 0) {
      try {
        const res = await fetch('/api/games/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: u.email, topicId: `boss-${course}`, format: 'boss', correct: nc, total: na, seconds: secs }),
        })
        const data = await res.json()
        if (!res.ok) note += data.error || ''
      } catch { note += 'Could not log attempt (offline?).' }
      if (raceId) {
        try {
          await fetch('/api/races', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: raceId, action: 'finish', email: u.email, accuracy, seconds: secs, difficulty: 3, format: 'boss' }),
          })
          note += ' Race entry submitted.'
        } catch {}
      }
    } else if (!u) {
      note += 'Sign in to log attempts and join races.'
    }
    setResult({ won, accuracy, power, tier: tierFor(power).title, dealt, seconds: secs, note: note.trim() })
    setPhase('done')
  }

  const q = bank?.questions?.[idx]
  const tier = tierFor(power)
  const dmgPreview = 6 + Math.floor(power / 12)

  function answerCard(onPick) {
    if (!q) return null
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          className="rounded-2xl border p-4"
        >
          <p className="text-base font-semibold">{q.question}</p>
          <div className="mt-3 grid grid-cols-1 gap-2">
            {Object.entries(q.options || {}).map(([letter, text]) => {
              const isFlash = flash?.qid === q.id && flash?.letter === letter
              const isRightAnswer = flash && letter.toLowerCase() === String(bank.answers[q.id] || '').toLowerCase()
              return (
                <motion.button
                  key={letter}
                  onClick={() => onPick(letter)}
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
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-3">
        <Link href={raceId ? '/races' : '/games'} className="flex size-9 items-center justify-center rounded-lg hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <h1 className="text-xl font-bold">Boss Battle ⚔️</h1>
        <SfxToggle />
      </div>

      {phase === 'setup' && (
        <div className="space-y-3 rounded-2xl border p-5 text-center">
          <div className="flex items-center justify-center gap-4 text-5xl">
            <motion.span animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>🌱</motion.span>
            <span className="text-2xl">→</span>
            <motion.span animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 2 }}>👾</motion.span>
          </div>
          <p className="text-sm font-semibold">Train. Evolve. Fight.</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">① Build ({BUILD_SECONDS}s):</span> answer fast, forge power, evolve 🌱→🔥.<br />
            <span className="font-semibold text-foreground">② Battle:</span> your power becomes damage. Answer each question within {STRIKE_SECONDS}s or {bossFor(pickedCourse || 'boss').name} <span className="font-semibold">strikes you first</span> — stall and you die.
          </p>
          <CoursePickerButton courses={courses} value={pickedCourse} onOpen={() => setPickerOpen(true)} />
          <CoursePickerModal open={pickerOpen} courses={courses} value={pickedCourse} onPick={(c) => { mixRef.current = null; setPickedCourse(c) }} onClose={() => setPickerOpen(false)} />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button onClick={() => start()} disabled={loading} className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {loading ? 'Entering…' : 'Start training'}
          </button>
          <p className="text-xs text-muted-foreground">Logged · counts toward races</p>
        </div>
      )}

      {phase === 'build' && (
        <>
          <div className="relative overflow-hidden rounded-2xl border border-orange-500/30 bg-orange-500/5 p-4 text-center">
            <AnimatePresence>
              {popups.map(p => (
                <motion.span key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: -24 }} exit={{ opacity: 0 }} className={`pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 text-lg font-black ${p.color}`}>
                  {p.text}
                </motion.span>
              ))}
            </AnimatePresence>
            <p className="flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground"><Dumbbell className="size-3.5" /> Training · <Timer className="size-3.5" />{left}s</p>
            <motion.div key={tier.title} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }} className="my-1 text-6xl">
              {tier.emoji}
            </motion.div>
            <p className="text-sm font-black">{tier.title} · ⚡{power} power</p>
            <div className="mx-auto mt-2 h-2 max-w-56 overflow-hidden rounded-full bg-muted">
              <motion.div className="h-full rounded-full bg-orange-500" initial={false} animate={{ width: `${Math.min(100, (power / 180) * 100)}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Next: {TIERS.find(t => t.min > power)?.title || 'MAX'} · ~{dmgPreview} dmg/hit in battle</p>
          </div>
          {answerCard(train)}
        </>
      )}

      {phase === 'battle' && (
        <motion.div key={shakeKey} animate={shakeKey ? { x: [0, -10, 10, -6, 6, 0] } : {}} transition={{ duration: 0.4 }} className="flex flex-col gap-3">
          <div className="relative overflow-hidden rounded-2xl border p-4 text-center">
            <AnimatePresence>
              {hits.map(h => (
                <motion.span key={h.id} initial={{ opacity: 0, y: 10, scale: 0.8 }} animate={{ opacity: 1, y: -34, scale: 1.15 }} exit={{ opacity: 0 }} className={`pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 text-xl font-black ${h.color}`}>
                  {h.text}
                </motion.span>
              ))}
            </AnimatePresence>
            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Round {round} · {tier.title} ⚡{power} vs {boss.name}</p>
            <FightArena ref={arenaRef} />
            <div className="mx-auto mt-2 grid max-w-64 grid-cols-2 gap-2 text-[11px] font-bold">
              <div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div className="h-full rounded-full bg-orange-500" initial={false} animate={{ width: `${(bossHp / BOSS_MAX) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
                </div>
                <p className="text-muted-foreground">BOSS {bossHp}</p>
              </div>
              <div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div className="h-full rounded-full bg-emerald-500" initial={false} animate={{ width: `${(playerHp / PLAYER_MAX) * 100}%` }} />
                </div>
                <p className="text-muted-foreground">YOU {playerHp}</p>
              </div>
            </div>
          </div>
          {flavor && <p className="text-center text-xs italic text-muted-foreground">{flavor}</p>}
          {/* Strike clock — answer before it empties or the boss hits you */}
          <div className="flex items-center gap-2">
            <Timer className={`size-4 shrink-0 ${timeLeft <= 5 ? 'animate-pulse text-red-500' : 'text-muted-foreground'}`} />
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-[width] duration-100 ${timeLeft <= 5 ? 'bg-red-500' : 'bg-amber-500'}`}
                style={{ width: `${(timeLeft / STRIKE_SECONDS) * 100}%` }}
              />
            </div>
            <span className={`w-8 text-right text-xs font-black tabular-nums ${timeLeft <= 5 ? 'text-red-500' : 'text-muted-foreground'}`}>{timeLeft}s</span>
          </div>
          {answerCard(strike)}
        </motion.div>
      )}

      {phase === 'done' && result && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 rounded-2xl border p-5 text-center">
          <p className="text-4xl">{result.won ? '🏆' : '💀'}</p>
          <p className={`text-xl font-black ${result.won ? 'text-emerald-600' : 'text-red-500'}`}>
            {result.won ? `${boss.name} DEFEATED!` : 'DEFEATED…'}
          </p>
          <p className="text-sm text-muted-foreground">Built ⚡{result.power} power as {result.tier} · dealt {result.dealt} damage · {result.seconds}s</p>
          <GameStars count={starsFor(result.accuracy)} />
          <p className={`text-lg font-black ${result.accuracy >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{result.accuracy}%</p>
          {result.note && <p className="text-xs text-muted-foreground">{result.note}</p>}
          <div className="flex gap-2">
            <button onClick={() => start()} disabled={loading} className="flex-1 rounded-xl border px-4 py-2.5 text-sm font-bold hover:bg-muted disabled:opacity-50">
              Rematch
            </button>
            <button onClick={() => { setPhase('setup'); setResult(null); setBank(null) }} className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
              New battle
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
