'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, ClipboardList, BookOpen, FileText, Files, PlayCircle, Headphones } from 'lucide-react'
import { fetchJson, TTL } from '@/lib/fetch-json'

const GAMES = [
  { href: '/games/chunk', label: 'Reassemble the explanation', tags: 'game chunk reorder definition' },
  { href: '/games/sprint', label: 'Speed Sprint', tags: 'game sprint timed mcq quiz' },
  { href: '/games/pairs', label: 'Match Pairs', tags: 'game pairs match term definition memory' },
  { href: '/games/cloze', label: 'Cloze Blanks', tags: 'game cloze fill blank explanation' },
  { href: '/games/blitz', label: 'Survival Blitz', tags: 'game blitz survival streak hearts mcq quiz' },
  { href: '/games/odd', label: 'Odd One Out', tags: 'game odd intruder terms discrimination' },
  { href: '/games/boss', label: 'Boss Battle', tags: 'game boss battle fight hp monster mcq quiz' },
  { href: '/games/typing', label: 'Typing Rush', tags: 'game typing rush keyboard speed terms' },
  { href: '/races', label: 'Races', tags: 'race competition ghost live multiplayer' },
]

const TYPE_CHIPS = [
  { value: '', label: 'All' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'theory', label: 'Theory' },
  { value: 'notes', label: 'Notes' },
  { value: 'pdf', label: 'PDF' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
]

const SECTIONS = [
  { key: 'quiz', label: 'Quizzes', Icon: ClipboardList },
  { key: 'theory', label: 'Theory', Icon: BookOpen },
  { key: 'notes', label: 'Notes', Icon: FileText },
  { key: 'pdf', label: 'PDFs', Icon: Files },
  { key: 'video', label: 'Videos', Icon: PlayCircle },
  { key: 'audio', label: 'Audio', Icon: Headphones },
]

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [course, setCourse] = useState('')
  const [courses, setCourses] = useState([])
  const [spaces, setSpaces] = useState([])
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    fetchJson('/api/courses', { ttl: TTL.list }).then(d => setCourses(Array.isArray(d) ? d : (d.docs || d.courses || []))).catch(() => {})
    fetchJson('/api/spaces?limit=50', { ttl: TTL.list }).then(d => setSpaces(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  // Debounced server study-content search (300ms).
  useEffect(() => {
    const needle = q.trim()
    if (needle.length < 2) { setResults(null); setSearching(false); return }
    setSearching(true)
    const t = setTimeout(() => {
      const params = new URLSearchParams({ q: needle, limit: '8' })
      if (type) params.set('type', type)
      if (course.trim()) params.set('course', course.trim())
      fetchJson(`/api/search?${params.toString()}`, { ttl: TTL.list })
        .then(d => { if (!d.error) setResults(d); })
        .catch(() => {})
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(t)
  }, [q, type, course])

  const needle = q.trim().toLowerCase()
  const match = (s) => !needle || String(s || '').toLowerCase().includes(needle)
  const hitCourses = courses.filter(c => match(c.code) || match(c.title)).slice(0, 8)
  const hitSpaces = spaces.filter(s => match(s.name) || match(s.description)).slice(0, 8)
  const hitGames = GAMES.filter(g => match(g.label) || match(g.tags)).slice(0, 8)
  const studyGroups = results?.groups || null
  const studyHits = studyGroups ? Object.values(studyGroups).reduce((n, a) => n + (a || []).length, 0) : 0
  const hasFallbackHits = hitCourses.length || hitSpaces.length || hitGames.length

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">Search</h1>
      </div>
      <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Quizzes, theory, notes, PDFs, videos…" className="w-full bg-transparent text-sm outline-none" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TYPE_CHIPS.map(c => (
          <button
            key={c.label}
            onClick={() => setType(c.value)}
            className={'rounded-full border px-3 py-1 text-xs font-medium ' + (type === c.value ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted')}
          >
            {c.label}
          </button>
        ))}
      </div>
      <input
        value={course}
        onChange={e => setCourse(e.target.value)}
        placeholder="Filter by course (e.g. COS 202) — optional"
        className="w-full rounded-xl border px-3 py-2 text-xs outline-none placeholder:text-muted-foreground"
      />

      {!needle && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold">Popular picks</h2>
          <p className="text-sm text-muted-foreground">Try “COS”, “Java”, “sprint”, or “study”.</p>
          {courses.slice(0, 6).map(c => (
            <Link key={c.code || c.title} href={`/courses/${(c.code || '').toLowerCase().replace(/\s+/g, '')}`} className="block rounded-xl border p-3 text-sm hover:bg-muted">
              <span className="font-semibold">{c.code}</span> <span className="text-muted-foreground">{c.title}</span>
            </Link>
          ))}
          {GAMES.map(g => (
            <Link key={g.href} href={g.href} className="block rounded-xl border p-3 text-sm hover:bg-muted">
              <span className="font-semibold">🎮 {g.label}</span>
            </Link>
          ))}
        </section>
      )}

      {!!needle && searching && !studyGroups && (
        <p className="text-sm text-muted-foreground">Searching study content…</p>
      )}

      {!!needle && studyGroups && (
        studyHits === 0 ? (
          <p className="text-sm text-muted-foreground">No study content found for “{q}”{type ? ` in ${type}` : ''}.</p>
        ) : (
          SECTIONS.filter(s => (studyGroups[s.key] || []).length).map(({ key, label, Icon }) => (
            <section key={key} className="space-y-2">
              <h2 className="flex items-center gap-1.5 text-sm font-bold">
                <Icon className="size-4" /> {label}
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{studyGroups[key].length}</span>
              </h2>
              {studyGroups[key].map(item => (
                <Link key={item.id} href={item.href} className="block rounded-xl border p-3 text-sm hover:bg-muted">
                  <span className="line-clamp-2 font-medium">{item.title}</span>
                  {item.subtitle && <span className="mt-0.5 block text-xs text-muted-foreground">{item.subtitle}</span>}
                </Link>
              ))}
            </section>
          ))
        )
      )}

      {!!needle && !!(hasFallbackHits) && (
        <>
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
        </>
      )}
      {!!needle && studyGroups && studyHits > 0 && !hasFallbackHits && searching && (
        <p className="text-xs text-muted-foreground">Loading more…</p>
      )}
    </div>
  )
}
