'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Flame, Coins, X } from 'lucide-react'
import { playStreak } from '@/lib/sound'
import { Button } from '@/components/ui/button'

const CONFETTI_COLORS = ['#ff9f43', '#ff4757', '#feca57', '#48dbfb', '#ff6b81', '#7bed9f', '#a29bfe']

export default function StreakModal({ open, streakInfo, onClose }) {
  useEffect(() => {
    if (open) {
      playStreak()
    }
  }, [open])

  if (!open || !streakInfo) return null

  const streak = streakInfo.streak || 0
  const bonuses = streakInfo.bonuses || []
  const message =
    streak >= 50
      ? 'Absolute legend. History is being written. 🔥'
      : streak >= 20
        ? 'This is championship level. Keep it burning!'
        : streak >= 10
          ? 'Double digits! You are unstoppable!'
          : streak >= 2
            ? 'Two days in a row — momentum is building!'
            : 'First flame lit. Come back tomorrow!'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm">
      <div className="animate-streak-in relative w-full max-w-sm overflow-hidden rounded-3xl bg-card text-center shadow-2xl">
        {/* Confetti */}
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <span
            key={i}
            className="animate-confetti pointer-events-none absolute top-3 size-2 rounded-sm"
            style={{ left: `${8 + i * 12}%`, backgroundColor: CONFETTI_COLORS[i], animationDelay: `${i * 0.12}s` }}
          />
        ))}

        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/70"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <div className="relative px-6 pb-6 pt-10">
          <div className="animate-flame-pulse mx-auto flex size-20 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500 to-pink-600 text-white shadow-xl shadow-orange-500/30">
            <Flame className="size-10" />
          </div>

          <h2 className="mt-5 text-3xl font-extrabold tracking-tight">
            {streak} <span className="text-base font-bold text-muted-foreground">day streak!</span>
          </h2>
          <p className="mt-1.5 text-sm font-medium text-orange-500">{message}</p>

          {bonuses.length > 0 && (
            <div className="mt-4 space-y-2">
              {bonuses.map((b, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500/15 to-pink-500/15 px-3 py-2.5 text-sm font-semibold text-orange-600 dark:text-orange-400"
                >
                  <Flame className="size-4 shrink-0" />
                  {b.message} +{b.points} points added!
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border bg-muted/50 px-3 py-2.5 text-sm font-bold">
            <Coins className="size-4 text-yellow-500" />
            {streakInfo.points || 0} total points
          </div>

          <div className="mt-5 space-y-2">
            <Button asChild className="w-full py-4 text-sm font-bold">
              <Link href="/streak" onClick={onClose}>
                View My Streak
              </Link>
            </Button>
            <Button variant="ghost" className="w-full py-4 text-sm font-semibold" onClick={onClose}>
              Keep Going
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
