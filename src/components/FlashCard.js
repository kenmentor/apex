'use client'

import { useState, useRef, useEffect } from 'react'
import { RotateCcw } from 'lucide-react'
import FormattedContent from './FormattedContent'
import { trackEvent } from '@/lib/tracking'

export default function FlashCard({ question, answer, section, index, total }) {
  const [flipped, setFlipped] = useState(false)
  const flipStart = useRef(null)
  const trackedOpen = useRef(false)

  useEffect(() => {
    trackedOpen.current = false
    flipStart.current = null
  }, [index])

  useEffect(() => {
    if (flipped && !trackedOpen.current) {
      trackedOpen.current = true
      flipStart.current = Date.now()
      trackEvent('flashcard_open', { questionIndex: index, section })
    }
    if (!flipped && flipStart.current) {
      const duration = Math.round((Date.now() - flipStart.current) / 1000)
      trackEvent('flashcard_time', { duration, questionIndex: index, section })
      flipStart.current = null
    }
  }, [flipped])

  return (
    <div className="w-full">
      <div
        className="relative w-full cursor-pointer"
        style={{ perspective: '1000px' }}
        onClick={() => setFlipped(!flipped)}
      >
        <div
          className="relative w-full transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            minHeight: '280px',
          }}
        >
          {/* Front - Question */}
          <div
            className="absolute inset-0 flex flex-col rounded-2xl border bg-card p-6 shadow-sm"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                Q{index + 1} of {total}
              </span>
              {section && (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {section}
                </span>
              )}
            </div>
            <div className="flex flex-1 items-center justify-center overflow-y-auto">
              <p className="text-center text-base font-medium leading-relaxed break-words">{question}</p>
            </div>
            <p className="text-center text-xs text-muted-foreground">Tap to reveal answer</p>
          </div>

          {/* Back - Answer */}
          <div
            className="absolute inset-0 flex flex-col rounded-2xl border border-primary/20 bg-primary/5 p-6 shadow-sm"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Answer
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setFlipped(false) }}
                className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/80"
              >
                <RotateCcw className="size-2.5" />
                Flip
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <FormattedContent content={answer} className="text-sm leading-relaxed text-card-foreground" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
