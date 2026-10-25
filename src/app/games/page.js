'use client'

import Link from 'next/link'
import { ArrowLeft, Trophy } from 'lucide-react'
import { motion } from 'motion/react'

const GAMES = [
  { href: '/games/chunk', emoji: '🧩', name: 'Reassembler', blurb: 'Snap shattered definitions back in order.', tag: 'Ordering' },
  { href: '/games/sprint', emoji: '⚡', name: 'Speed Sprint', blurb: 'Race the clock through rapid MCQs.', tag: 'Speed' },
  { href: '/games/pairs', emoji: '🧠', name: 'Match Pairs', blurb: 'Flip and match terms to definitions.', tag: 'Memory' },
  { href: '/games/cloze', emoji: '✏️', name: 'Cloze Blanks', blurb: 'Produce the missing word from memory.', tag: 'Recall' },
  { href: '/games/blitz', emoji: '🔥', name: 'Survival Blitz', blurb: 'Streak until 3 mistakes end the run.', tag: 'Survival' },
  { href: '/games/odd', emoji: '🕵️', name: 'Odd One Out', blurb: 'Spot the smuggled-in intruder term.', tag: 'Eye' },
  { href: '/games/boss', emoji: '⚔️', name: 'Boss Battle', blurb: 'Train up, then fight the boss.', tag: 'Battle' },
  { href: '/games/typing', emoji: '⌨️', name: 'Typing Rush', blurb: 'Type terms faster than the clock.', tag: 'Speed' },
]

export default function GamesHubPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <h1 className="text-xl font-bold">Arcade 🎮</h1>
      </div>
      <p className="text-sm text-muted-foreground">{GAMES.length} ways to play · every run logged · every run can race</p>
      <div className="grid grid-cols-2 gap-2.5">
        {GAMES.map((g, i) => (
          <motion.div
            key={g.href}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 26 }}
          >
            <Link href={g.href} className="flex h-full flex-col gap-1 rounded-2xl border p-4 transition-transform hover:scale-[1.03] hover:border-primary/50 active:scale-95">
              <span className="text-4xl">{g.emoji}</span>
              <span className="text-sm font-black">{g.name}</span>
              <span className="text-[11px] leading-snug text-muted-foreground">{g.blurb}</span>
              <span className="mt-auto w-fit rounded-full bg-muted px-2 py-0.5 pt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{g.tag}</span>
            </Link>
          </motion.div>
        ))}
      </div>
      <Link href="/races" className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 hover:bg-primary/10">
        <Trophy className="size-6 shrink-0 text-primary" />
        <span>
          <span className="block text-sm font-black">Races 🏁</span>
          <span className="block text-xs text-muted-foreground">Take any game ghost-to-ghost against rivals, live rooms with stakes.</span>
        </span>
      </Link>
    </div>
  )
}
