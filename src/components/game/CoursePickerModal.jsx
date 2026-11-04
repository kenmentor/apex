'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Search, Check, Shuffle, BookOpen, ChevronRight } from 'lucide-react'

const CHIP = [
  'bg-violet-500/15 text-violet-600',
  'bg-sky-500/15 text-sky-600',
  'bg-emerald-500/15 text-emerald-600',
  'bg-amber-500/15 text-amber-600',
  'bg-rose-500/15 text-rose-600',
  'bg-indigo-500/15 text-indigo-600',
]

function chipFor(code) {
  let h = 0
  for (let i = 0; i < String(code).length; i++) h = (h + String(code).charCodeAt(i)) % CHIP.length
  return CHIP[h]
}

export function courseLabel(courses, code) {
  const c = (courses || []).find(c => c.code === code)
  return c ? `${c.code} — ${c.title}` : code
}

// Centered modal listing every course — drop-in replacement for the old
// <select> dropdown on game setup screens.
export default function CoursePickerModal({
  open,
  courses = [],
  value = '',
  onPick,
  onClose,
  allowRandom = false,
  title = 'Pick a course',
}) {
  const [q, setQ] = useState('')

  useEffect(() => {
    if (open) setQ('')
  }, [open ])

  // Esc closes.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return courses
    return courses.filter(c =>
      c.code?.toLowerCase().includes(needle) || c.title?.toLowerCase().includes(needle)
    )
  }, [courses, q])

  const pick = (code) => {
    onPick?.(code)
    onClose?.()
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="relative flex max-h-[80dvh] w-full max-w-sm flex-col overflow-hidden rounded-3xl border bg-card shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookOpen className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold">{title}</p>
                <p className="text-[11px] text-muted-foreground">{courses.length} course{courses.length === 1 ? '' : 's'}</p>
              </div>
              <button onClick={onClose} aria-label="Close" className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>

            <div className="border-b px-4 py-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Search courses…"
                  className="w-full rounded-xl border bg-background py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {allowRandom && !q.trim() && (
                <button
                  onClick={() => pick('')}
                  className={'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-muted/60 ' + (!value ? 'bg-primary/5 ring-1 ring-primary/30' : '')}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-lg">🎲</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">Surprise me</span>
                    <span className="block truncate text-[11px] text-muted-foreground">Random course, random questions</span>
                  </span>
                  {!value && <Check className="size-4 shrink-0 text-primary" />}
                </button>
              )}
              {filtered.map(c => {
                const selected = value === c.code
                return (
                  <button
                    key={c.code}
                    onClick={() => pick(c.code)}
                    className={'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-muted/60 ' + (selected ? 'bg-primary/5 ring-1 ring-primary/30' : '')}
                  >
                    <span className={`flex h-10 min-w-10 shrink-0 items-center justify-center rounded-xl px-1.5 text-[11px] font-black ${chipFor(c.code)}`}>
                      {c.code}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{c.title}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{c.code}</span>
                    </span>
                    {selected
                      ? <Check className="size-4 shrink-0 text-primary" />
                      : <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />}
                  </button>
                )
              })}
              {filtered.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No courses match “{q.trim()}”.
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// The setup-screen trigger button: shows the picked course, opens the modal.
export function CoursePickerButton({ courses = [], value = '', onOpen, placeholder = 'Pick a course…', emptyLabel = '' }) {
  const selected = (courses || []).find(c => c.code === value)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-xl border bg-background px-3 py-2.5 text-left transition-colors hover:border-primary/50"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {selected ? <BookOpen className="size-4" /> : <Shuffle className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Course</span>
        <span className={'block truncate text-sm font-bold ' + (selected || (emptyLabel && !value) ? 'text-foreground' : 'font-medium text-muted-foreground')}>
          {selected ? `${selected.code} — ${selected.title}` : (emptyLabel && !value ? emptyLabel : placeholder)}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  )
}
