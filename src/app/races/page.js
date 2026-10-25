'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getUser } from '@/lib/auth'

const COURSES = ['COS 202', 'CSC 282', 'CSC 203']
const SOLO = [['/games/chunk', 'Reassemble'], ['/games/sprint', 'Sprint'], ['/games/pairs', 'Pairs'], ['/games/cloze', 'Cloze']]

export default function RacesPage() {
  const [user, setUser] = useState(null)
  const [races, setRaces] = useState([])
  const [course, setCourse] = useState(COURSES[0])
  const [mode, setMode] = useState('ghost')
  const [stake, setStake] = useState(0)
  const [msg, setMsg] = useState('')

  function load() {
    fetch('/api/races?status=open', { cache: 'no-store' }).then(r => r.json()).then(d => setRaces(Array.isArray(d) ? d : [])).catch(() => {})
  }

  useEffect(() => {
    setUser(getUser())
    load()
  }, [])

  async function create() {
    setMsg('')
    const res = await fetch('/api/races', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, courseCode: course, stake: Number(stake) || 0 }),
    }).then(r => r.json()).catch(() => null)
    if (res?.id) {
      setMsg(mode === 'live'
        ? `Live room created. ${res.escrow || ''}`
        : 'Ghost race created. Join it, then play any game below — your score counts.')
      load()
    } else setMsg(res?.error || 'Failed to create race.')
  }

  async function join(id) {
    setMsg('')
    const res = await fetch('/api/races', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'join', email: user?.email }),
    }).then(r => r.json()).catch(() => null)
    setMsg(res?.success ? (res.escrow ? `Joined. ${res.escrow}` : 'Joined. Pick a game below to race.') : (res?.error || 'Join failed.'))
    load()
  }

  const email = user?.email?.toLowerCase()

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <h1 className="text-xl font-bold">Competitions</h1>
      </div>
      <div className="rounded-xl border p-4 text-xs text-muted-foreground">
        Ghost races are async: join, play any game on the race course, get ranked by accuracy × speed × difficulty. Live rooms pause up to 60s on disconnect.
      </div>

      {user && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select value={course} onChange={e => setCourse(e.target.value)} className="rounded-lg border px-2 py-1">
            {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={mode} onChange={e => setMode(e.target.value)} className="rounded-lg border px-2 py-1">
            <option value="ghost">Ghost (async)</option>
            <option value="live">Live room</option>
          </select>
          <input value={stake} onChange={e => setStake(e.target.value)} type="number" min="0" max="50" placeholder="Stake (0–50)" className="w-28 rounded-lg border px-2 py-1" />
          <button onClick={create} className="rounded-lg bg-primary px-3 py-1 text-sm text-primary-foreground">Create</button>
        </div>
      )}
      {msg && <p className="rounded-lg bg-muted p-3 text-sm">{msg}</p>}

      <h2 className="text-sm font-bold">Open races</h2>
      <ul className="space-y-2">
        {races.map(r => {
          const joined = email && (r.players || []).some(p => p.toLowerCase() === email)
          return (
            <li key={r._id} className="rounded-xl border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span>
                  <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase">{r.mode}</span>
                  <span className="font-semibold">{r.courseCode || (r.topicIds || []).join(', ')}</span>
                  {r.stake ? ` · ${r.stake} stake` : ''} · {(r.players || []).length} in
                </span>
                {user && !joined && <button onClick={() => join(r._id)} className="shrink-0 rounded-lg border px-2 py-1 text-xs hover:bg-muted">Join</button>}
              </div>
              {joined && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="w-full text-[11px] text-muted-foreground">Play to submit your score:</span>
                  {SOLO.filter(([h]) => h !== '/games/chunk' || true).map(([href, label]) => {
                    const extra = href === '/games/chunk' ? '' : `&course=${encodeURIComponent(r.courseCode || course)}`
                    return <Link key={href} href={`${href}?race=${r._id}${extra}`} className="rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">▶ {label}</Link>
                  })}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {!races.length && <p className="text-sm text-muted-foreground">No open races. Create one above.</p>}
    </div>
  )
}
