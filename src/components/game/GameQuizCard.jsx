'use client'

import { AnimatePresence, motion } from 'motion/react'

// The standard MCQ card: slide-in question, letter-chip option rows,
// emerald flash on the right answer, red flash + shake on a wrong pick.
// Used by every tap-to-answer game (sprint, blitz, boss) so the quiz
// look and feel stays identical everywhere.
export default function GameQuizCard({ q, eyebrow, correctLetter, flash, onPick }) {
  if (!q) return null
  const right = String(correctLetter || '').toLowerCase()
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
        {!!eyebrow && <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{eyebrow}</p>}
        <p className="mt-1 text-base font-semibold">{q.question}</p>
        <div className="mt-3 grid grid-cols-1 gap-2">
          {Object.entries(q.options || {}).map(([letter, text]) => {
            const isFlash = flash?.qid === q.id && flash?.letter === letter
            const isRightAnswer = flash && letter.toLowerCase() === right
            return (
              <motion.button
                key={letter}
                onClick={() => onPick?.(letter)}
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
