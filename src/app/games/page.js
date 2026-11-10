'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trophy, ChevronRight, Puzzle, Zap, Brain, PenLine, Flame, Eye, Keyboard, Play, Swords, ClipboardList, Gamepad2 } from 'lucide-react'
import { motion } from 'motion/react'
import GameSetupModal from '@/components/game/GameSetupModal'
import QuizSetupModal from '@/components/game/QuizSetupModal'
import { playQuery } from '@/lib/play-params'

const GAMES = [
  { href: '/games/chunk', Icon: Puzzle, bg: 'linear-gradient(160deg, #2e1065 0%, #5b21b6 100%)', name: 'Reassembler', blurb: 'Snap shattered definitions back in order.', tag: 'Ordering' },
  { href: '/games/sprint', Icon: Zap, bg: 'linear-gradient(160deg, #451a03 0%, #b45309 100%)', name: 'Speed Sprint', blurb: 'Race the clock through rapid MCQs.', tag: 'Speed' },
  { href: '/games/pairs', Icon: Brain, bg: 'linear-gradient(160deg, #1e1b4b 0%, #4338ca 100%)', name: 'Match Pairs', blurb: 'Flip and match terms to definitions.', tag: 'Memory' },
  { href: '/games/cloze', Icon: PenLine, bg: 'linear-gradient(160deg, #082f3d 0%, #0369a1 100%)', name: 'Cloze Blanks', blurb: 'Produce the missing word from memory.', tag: 'Recall' },
  { href: '/games/blitz', Icon: Flame, bg: 'linear-gradient(160deg, #431407 0%, #c2410f 100%)', name: 'Survival Blitz', blurb: 'Streak until 3 mistakes end the run.', tag: 'Survival' },
  { href: '/games/odd', Icon: Eye, bg: 'linear-gradient(160deg, #042f2e 0%, #0f7661 100%)', name: 'Odd One Out', blurb: 'Spot the smuggled-in intruder term.', tag: 'Eye' },
  { href: '/games/typing', Icon: Keyboard, bg: 'linear-gradient(160deg, #020617 0%, #334155 100%)', name: 'Typing Rush', blurb: 'Type terms faster than the clock.', tag: 'Speed' },
]

const BOSS = { href: '/games/boss', Icon: Swords, bg: 'linear-gradient(150deg, #450a0a 0%, #7f1d1d 55%, #b91c1c 100%)', name: 'Boss Battle', blurb: 'Train up, then fight the boss. Win the run.', tag: 'Featured' }

function Watermark({ Icon }) {
  return <Icon className="pointer-events-none absolute -bottom-5 -right-5 size-32 text-white/10" strokeWidth={1.5} />;
}

export default function GamesHubPage() {
  const router = useRouter()
  const [view, setView] = useState('home')
  const [game, setGame] = useState(null)
  const [quizOpen, setQuizOpen] = useState(false)

  function startGame(sel) {
    const g = game
    setGame(null)
    if (!g) return
    router.push(g.href + '?' + playQuery(sel))
  }

  function startQuiz(sel) {
    setQuizOpen(false)
    const slug = sel.course.toLowerCase().replace(/\s+/g, '')
    if (sel.topics.length === 1) {
      router.push('/plan/' + slug + '/' + encodeURIComponent(sel.topics[0]))
    } else {
      router.push('/courses/' + slug + '/quiz')
    }
  }

  // ---- GAMES full screen: pick a game, then set it up ----
  if (view === 'games') {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 pb-24 pt-6">
        <div className="flex items-center gap-2">
          <button onClick={() => setView('home')} aria-label="Back" className="flex size-9 items-center justify-center rounded-lg border hover:bg-muted">
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold">Pick a game</h1>
            <p className="text-[11px] text-muted-foreground">{GAMES.length + 1} ways to play · every run logged</p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        >
          <button onClick={() => setGame(BOSS)} className="relative block w-full overflow-hidden rounded-3xl p-5 text-left text-white shadow-lg" style={{ background: BOSS.bg }}>
            <Swords className="pointer-events-none absolute -bottom-6 -right-6 size-40 text-white/10" strokeWidth={1.25} />
            <span className="inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest backdrop-blur">Featured</span>
            <span className="mt-8 block text-2xl font-black tracking-tight">Boss Battle</span>
            <span className="mt-0.5 block max-w-[75%] text-[13px] leading-snug text-white/75">Train up, then fight the boss. Win the run.</span>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-extrabold text-black">
              <Play className="size-3.5" fill="currentColor" /> Enter the arena
            </span>
          </button>
        </motion.div>

        <div className="grid grid-cols-2 gap-2.5">
          {GAMES.map((g, i) => (
            <motion.div
              key={g.href}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.04, type: 'spring', stiffness: 280, damping: 26 }}
            >
              <button onClick={() => setGame(g)} className="relative flex aspect-[3/4] w-full flex-col overflow-hidden rounded-3xl p-4 text-left text-white shadow-md transition-transform active:scale-[0.97]">
                <span className="absolute inset-0" style={{ background: g.bg }} aria-hidden />
                <Watermark Icon={g.Icon} />
                <span className="relative flex size-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                  <g.Icon className="size-5" />
                </span>
                <span className="relative mt-auto">
                  <span className="block text-[15px] font-extrabold leading-tight">{g.name}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-white/70">{g.blurb}</span>
                  <span className="mt-2.5 flex items-center justify-between">
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur">{g.tag}</span>
                    <span className="flex size-8 items-center justify-center rounded-full bg-white text-black">
                      <Play className="size-3.5" fill="currentColor" />
                    </span>
                  </span>
                </span>
              </button>
            </motion.div>
          ))}
        </div>

        <Link href="/races" className="relative flex items-center gap-3 overflow-hidden rounded-3xl border bg-card p-4 shadow-md transition-colors hover:bg-muted/40">
          <Trophy className="pointer-events-none absolute -bottom-4 -right-4 size-28 text-muted-foreground/10" strokeWidth={1.5} />
          <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted">
            <Trophy className="size-5" />
          </span>
          <span className="relative min-w-0 flex-1">
            <span className="block text-sm font-extrabold">Races</span>
            <span className="block truncate text-[11px] text-muted-foreground">Ghost-to-ghost against rivals, live rooms with stakes</span>
          </span>
          <ChevronRight className="relative size-4 shrink-0 text-muted-foreground" />
        </Link>

        <GameSetupModal game={game} open={!!game} onClose={() => setGame(null)} onStart={startGame} />
      </div>
    )
  }

  // ---- HOME: Quiz stacked on top of Games, each a full square ----
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-2">
        <Link href="/" aria-label="Back" className="flex size-9 items-center justify-center rounded-lg border hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">Arcade</h1>
          <p className="text-[11px] text-muted-foreground">{GAMES.length + 1} ways to play · every run logged</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4">
        <button
          onClick={() => setQuizOpen(true)}
          className="relative flex aspect-square w-full flex-col items-start justify-between gap-2 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-left text-white shadow-lg transition-all active:scale-[0.98]"
        >
          <ClipboardList className="pointer-events-none absolute -bottom-8 -right-8 size-56 text-white/10" strokeWidth={1.25} />
          <span className="relative flex size-14 items-center justify-center rounded-2xl bg-white/20">
            <ClipboardList className="size-7" />
          </span>
          <span className="relative w-full">
            <span className="block text-4xl font-black leading-none tracking-tight">QUIZ</span>
            <span className="mt-2 block max-w-[85%] text-sm leading-snug text-white/80">Pick a course, pick topics, start answering</span>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-emerald-900">Start <ChevronRight className="size-4" /></span>
          </span>
        </button>
        <button
          onClick={() => setView('games')}
          className="relative flex aspect-square w-full flex-col items-start justify-between gap-2 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 to-indigo-800 p-6 text-left text-white shadow-lg transition-all active:scale-[0.98]"
        >
          <Gamepad2 className="pointer-events-none absolute -bottom-8 -right-8 size-56 text-white/10" strokeWidth={1.25} />
          <span className="relative flex size-14 items-center justify-center rounded-2xl bg-white/20">
            <Gamepad2 className="size-7" />
          </span>
          <span className="relative w-full">
            <span className="block text-4xl font-black leading-none tracking-tight">GAMES</span>
            <span className="mt-2 block max-w-[85%] text-sm leading-snug text-white/80">Mix courses, then choose a game</span>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-violet-900">Play <ChevronRight className="size-4" /></span>
          </span>
        </button>
      </div>

      <QuizSetupModal open={quizOpen} onClose={() => setQuizOpen(false)} onStart={startQuiz} />
    </div>
  )
}
