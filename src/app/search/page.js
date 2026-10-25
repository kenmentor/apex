'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { getUser } from '@/lib/auth'
import { fetchJson, TTL } from '@/lib/fetch-json'

const GAMES = [
  { href: '/games/chunk', label: 'Reassemble the explanation', tags: 'game chunk reorder definition' },
  { href: '/games/sprint', label: 'Speed Sprint', tags: 'game sprint timed mcq quiz' },
  { href: '/games/pairs', label: 'Match Pairs', tags: 'game pairs match term definition memory' },
  { href: '/games/cloze', label: 'Cloze Blanks', tags: 'game cloze fill blank explanation' },
  { href: '/races', label: 'Races', tags: 'race competition ghost live multiplayer' },
]

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [courses, setCourses] = useState([])
  const [spaces, setSpaces] = useState([])

  useEffect(() => {
    fetchJson('/api/courses', { ttl: TTL.list }).then(d => setCourses(Array.isArray(d) ? d : (d.docs || d.courses || []))).catch(() => {})
    fetchJson('/api/spaces?limit=50', { ttl: TTL.list }).then(d => setSpaces(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  const needle = q.trim().toLowerCase()
  const match = (s) => !needle || String(s || '').toLowerCase().includes(needle)
  const hitCourses = courses.filter(c => match(c.code) || match(c.title)).slice(0, 8)
  const hitSpaces = spaces.filter(s => match(s.name) || match(s.description)).slice(0, 8)
  const hitGames = GAMES.filter(g => match(g.label) || match(g.tags)).slice(0, 8)

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">Search</h1>
      </div>
      <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Courses, groups, games…" className="w-full bg-transparent text-sm outline-none" />
      </div>
      {!needle && <p className="text-sm text-muted-foreground">Try “COS”, “Java”, “sprint”, or “study”.</p>}
      {needle && !(hitCourses.length || hitSpaces.length || hitGames.length) && (
        <p className="text-sm text-muted-foreground">No matches for “{q}”.</p>
      )}
      {!!hitCourses.length && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold">Courses</h2>
          {hitCourses.map(c => (
            <Link key={c.code || c.title} href={`/courses/${(c.code || '').toLowerCase().replace(/\s+/g, '')}`} className="block rounded-xl border p-3 text-sm hover:bg-muted">
              <span className="font-semibold">{c.code}</span> <span className="text-muted-foreground">{c.title}</span>
            </Link>
          ))}
        </section>
      )}
      {!!hitSpaces.length && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold">Study groups</h2>
          {hitSpaces.map(s => (
            <Link key={s._id} href={`/groups/${s._id}`} className="block rounded-xl border p-3 text-sm hover:bg-muted">
              <span className="font-semibold">{s.name}</span>
              <span className="block text-xs text-muted-foreground">{s.memberCount || 0} members · {s.intent || 'steady-a'}</span>
            </Link>
          ))}
        </section>
      )}
      {!!hitGames.length && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold">Games</h2>
          {hitGames.map(g => (
            <Link key={g.href} href={g.href} className="block rounded-xl border p-3 text-sm hover:bg-muted">
              <span className="font-semibold">🎮 {g.label}</span>
            </Link>
          ))}
        </section>
      )}
    </div>
  )
}
