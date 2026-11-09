'use client'

import { useState, useEffect } from 'react'
import { X, Search, Check, Shuffle, Gamepad2, Play } from 'lucide-react'
import { getUser } from '@/lib/auth'
import { colorFor } from '@/lib/plan-colors'

// One decision, one modal: pick course(s), start the game.
// Games always shuffle the full course bank — no topic maze.
export default function GameSetupModal(props) {
  const open = props.open
  const onClose = props.onClose
  const game = props.game
  const onStart = props.onStart

  const [planCourses, setPlanCourses] = useState([])
  const [picked, setPicked] = useState([])
  const [q, setQ] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!open) return
    setPicked([])
    setQ('')
    setLoaded(false)
    let cancelled = false
    async function load() {
      try {
        const u = getUser()
        if (u && u.email) {
          const r = await fetch('/api/plans?email=' + encodeURIComponent(u.email), { cache: 'no-store' })
          const p = await r.json()
          if (!cancelled && p && p.supported && Array.isArray(p.courses) && p.courses.length) {
            setPlanCourses(p.courses)
            return
          }
        }
        if (!cancelled) {
          const r2 = await fetch('/api/courses')
          const d = await r2.json()
          const list = Array.isArray(d) ? d : (d.docs || d.courses || [])
          setPlanCourses(list.map(function (c) { return { code: c.code, title: c.title } }))
        }
      } catch (e) {
        // keep empty list; UI shows the empty state
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    return function () { cancelled = true }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape' && onClose) onClose() }
    window.addEventListener('keydown', onKey)
    return function () { window.removeEventListener('keydown', onKey) }
  }, [open, onClose])

  function toggle(code) {
    setPicked(function (prev) {
      return prev.indexOf(code) >= 0 ? prev.filter(function (c) { return c !== code }) : prev.concat([code])
    })
  }

  function start() {
    if (!onStart || picked.length === 0) return
    onStart({ courses: picked, mode: picked.length > 1 ? 'mix' : 'all' })
  }

  if (!open) return null
  const needle = q.trim().toLowerCase()
  const filtered = needle
    ? planCourses.filter(function (c) {
      return (c.code || '').toLowerCase().indexOf(needle) >= 0 || (c.title || '').toLowerCase().indexOf(needle) >= 0
    })
    : planCourses
  const Icon = (game && game.Icon) || Gamepad2

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <div role="dialog" aria-modal="true" aria-label={'Play ' + ((game && game.name) || 'game')} className="relative flex max-h-[85dvh] w-full max-w-sm flex-col overflow-hidden rounded-3xl border bg-card shadow-2xl">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: (game && game.bg) || '#6366f1' }}>
            <Icon className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-extrabold">{(game && game.name) || 'Game'}</span>
            <span className="block text-[11px] text-muted-foreground">Pick courses, then play</span>
          </span>
          <button onClick={onClose} aria-label="Close" className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>
        <div className="border-b px-4 py-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={function (e) { setQ(e.target.value) }}
              placeholder="Search your courses"
              className="w-full rounded-xl border bg-background py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {!loaded && <p className="p-6 text-center text-sm text-muted-foreground">Loading your courses…</p>}
          {loaded && filtered.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">No courses yet — set your department and level in Settings.</p>
          )}
          {loaded && filtered.length > 0 && (
            <div className="grid grid-cols-2 gap-2 p-1">
              {filtered.map(function (c) {
                const on = picked.indexOf(c.code) >= 0
                const color = colorFor(c.code)
                return (
                  <button
                    key={c.code}
                    onClick={function () { toggle(c.code) }}
                    className={'relative overflow-hidden rounded-2xl p-3 text-left text-white transition-all active:scale-[0.97] ' + (on ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : 'opacity-90')}
                    style={{ background: 'linear-gradient(135deg, ' + color + ', ' + color + 'CC)' }}
                  >
                    {on && (
                      <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-white text-black">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                    )}
                    <span className="block pr-5 text-[15px] font-black leading-tight">{c.code}</span>
                    <span className="mt-0.5 line-clamp-1 block text-[11px] text-white/80">{c.title || ''}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <div className="border-t bg-card px-4 py-3">
          {picked.length > 1 && (
            <p className="mb-2 flex items-center justify-center gap-1.5 text-[11px] font-bold text-primary"><Shuffle className="size-3.5" /> Mix mode — rounds rotate through {picked.length} courses</p>
          )}
          <p className="mb-2 text-center text-[11px] text-muted-foreground">Shuffles the full course bank.</p>
          <button
            onClick={start}
            disabled={picked.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground transition-all active:scale-[0.99] disabled:opacity-40"
          >
            <Play className="size-4" fill="currentColor" /> Start{picked.length > 1 ? ' Mix (' + picked.length + ')' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
