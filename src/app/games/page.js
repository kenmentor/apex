'use client'

import Link from 'next/link'
import { ArrowLeft, Trophy, ChevronRight, Puzzle, Zap, Brain, PenLine, Flame, Eye, Swords, Keyboard, Play } from 'lucide-react'
import { motion } from 'motion/react'

const GAMES = [
  { href: '/games/chunk', Icon: Puzzle, bg: 'linear-gradient(160deg, #2e1065 0%, #5b21b6 100%)', name: 'Reassembler', blurb: 'Snap shattered definitions back in order.', tag: 'Ordering' },
  { href: '/games/sprint', Icon: Zap, bg: 'linear-gradient(160deg, #451a03 0%, #b45309 100%)', name: 'Speed Sprint', blurb: 'Race the clock through rapid MCQs.', tag: 'Speed' },
  { href: '/games/pairs', Icon: Brain, bg: 'linear-gradient(160deg, #1e1b4b 0%, #4338ca 100%)', name: 'Match Pairs', blurb: 'Flip and match terms to definitions.', tag: 'Memory' },
  { href: '/games/cloze', Icon: PenLine, bg: 'linear-gradient(160deg, #082f49 0%, #0369a1 100%)', name: 'Cloze Blanks', blurb: 'Produce the missing word from memory.', tag: 'Recall' },
  { href: '/games/blitz', Icon: Flame, bg: 'linear-gradient(160deg, #431407 0%, #c2410c 100%)', name: 'Survival Blitz', blurb: 'Streak until 3 mistakes end the run.', tag: 'Survival' },
  { href: '/games/odd', Icon: Eye, bg: 'linear-gradient(160deg, #042f2e 0%, #0f766e 100%)', name: 'Odd One Out', blurb: 'Spot the smuggled-in intruder term.', tag: 'Eye' },
  { href: '/games/typing', Icon: Keyboard, bg: 'linear-gradient(160deg, #020617 0%, #334155 100%)', name: 'Typing Rush', blurb: 'Type terms faster than the clock.', tag: 'Speed' },
]

function Watermark({ Icon }) {
  return <Icon className="pointer-events-none absolute -bottom-5 -right-5 size-32 text-white/10" strokeWidth={1.5} />;
}

export default function GamesHubPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-2">
        <Link href="/" aria-label="Back" className="flex size-9 items-center justify-center rounded-lg border hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">Arcade</h1>
          <p className="text-[11px] text-muted-foreground">{GAMES.length + 1} ways to play · every run logged</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      >
        <Link href="/games/boss" className="relative block overflow-hidden rounded-3xl p-5 text-white shadow-lg" style={{ background: 'linear-gradient(150deg, #450a0a 0%, #7f1d1d 55%, #b91c1c 100%)' }}>
          <Swords className="pointer-events-none absolute -bottom-6 -right-6 size-40 text-white/10" strokeWidth={1.25} />
          <span className="inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest backdrop-blur">Featured</span>
          <span className="mt-8 block text-2xl font-black tracking-tight">Boss Battle</span>
          <span className="mt-0.5 block max-w-[75%] text-[13px] leading-snug text-white/75">Train up, then fight the boss. Win the run.</span>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-extrabold text-black">
            <Play className="size-3.5" fill="currentColor" /> Enter the arena
          </span>
        </Link>
      </motion.div>

      <div className="grid grid-cols-2 gap-2.5">
        {GAMES.map((g, i) => (
          <motion.div
            key={g.href}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.05, type: 'spring', stiffness: 280, damping: 26 }}
          >
            <Link href={g.href} className="relative flex aspect-[3/4] flex-col overflow-hidden rounded-3xl p-4 text-white shadow-md">
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
            </Link>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, type: 'spring', stiffness: 280, damping: 26 }}
      >
        <Link href="/races" className="relative flex items-center gap-3 overflow-hidden rounded-3xl p-4 text-white shadow-md" style={{ background: 'linear-gradient(150deg, #130f40 0%, #2c2c54 100%)' }}>
          <Trophy className="pointer-events-none absolute -bottom-4 -right-4 size-28 text-white/10" strokeWidth={1.5} />
          <span className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Trophy className="size-5" />
          </span>
          <span className="relative min-w-0 flex-1">
            <span className="block text-sm font-extrabold">Races</span>
            <span className="block truncate text-[11px] text-white/70">Ghost-to-ghost against rivals, live rooms with stakes</span>
          </span>
          <ChevronRight className="relative size-4 shrink-0 text-white/70" />
        </Link>
      </motion.div>
    </div>
  )
}
