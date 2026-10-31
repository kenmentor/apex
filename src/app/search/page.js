'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Search, ClipboardList, BookOpen, PlayCircle, Headphones, Play, Music, SlidersHorizontal, X, Check } from 'lucide-react'
import { fetchJson, TTL } from '@/lib/fetch-json'
import { getUser } from '@/lib/auth'
import SaveToFolder from '@/components/SaveToFolder'
import { PdfCover } from '@/components/MediaCard'
import MediaRail from '@/components/MediaRail'
import VideoModal from '@/components/VideoModal'

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

// Perlego-style unified tabs. Books = PDFs + notes + theory.
const TABS = [
  { id: '', label: 'All' },
  { id: 'books', label: 'Books' },
  { id: 'video', label: 'Videos' },
  { id: 'audio', label: 'Audio' },
  { id: 'quiz', label: 'Quizzes' },
]

function ytId(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/)
  return m ? m[1] : null
}

function savePayload(item, fallbackKind) {
  return {
    name: item.title, itemKind: item.kind || fallbackKind,
    refId: String(item.id || '').replace(/^(v|a|p|t|r|m|q)-/, ''),
    href: item.href || item.url || null, url: item.url || null,
    courseCode: item.courseCode || null, subtitle: item.subtitle || null,
  }
}

function uploaderOf(item) {
  const m = String(item.subtitle || '').match(/by\s+(.+)$/)
  return m ? m[1].trim() : 'Study bank'
}

function Shelf({ title, Icon, children, onSeeAll, expanded, count }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5 px-1">
        <h2 className="flex flex-1 items-center gap-1.5 text-[15px] font-bold">
          <Icon className="size-4 text-muted-foreground" /> {title}
        </h2>
        {count > 0 && onSeeAll && (
          <button onClick={onSeeAll} className="shrink-0 px-1 text-xs font-semibold text-primary">
            {expanded ? 'Show less' : `See all (${count})`}
          </button>
        )}
      </div>
      {children}
    </section>
  )
}

function Rail({ children }) {
  return <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">{children}</div>
}

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [tab, setTab] = useState('')
  const [courses, setCourses] = useState([])
  const [spaces, setSpaces] = useState([])
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [shelves, setShelves] = useState(null)
  const [levelLabel, setLevelLabel] = useState('')
  const [mockMode, setMockMode] = useState(false)
  const [videoModal, setVideoModal] = useState(null)
  const [expanded, setExpanded] = useState(null)
  // Filter rail (Perlego-style): course + uploader facets, title sort.
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [facetQ, setFacetQ] = useState('')
  const [selCourses, setSelCourses] = useState([])
  const [selUploaders, setSelUploaders] = useState([])
  const [sort, setSort] = useState('relevance')

  useEffect(() => {
    fetchJson('/api/courses', { ttl: TTL.list }).then(d => setCourses(Array.isArray(d) ? d : (d.docs || d.courses || []))).catch(() => {})
    fetchJson('/api/spaces?limit=50', { ttl: TTL.list }).then(d => setSpaces(Array.isArray(d) ? d : [])).catch(() => {})
    try {
      const t = new URLSearchParams(window.location.search).get('type') || ''
      if (t === 'video' || t === 'audio' || t === 'quiz') setTab(t)
      else if (['theory', 'notes', 'pdf'].includes(t)) setTab('books')
    } catch {}
    try {
      const u = getUser()
      const lv = u?.level || ''
      if (lv) setLevelLabel(lv)
      const sp = new URLSearchParams(window.location.search)
      const mock = sp.get('mock') === '1'
      if (mock) setMockMode(true)
      const qs = new URLSearchParams()
      if (lv) qs.set('level', lv)
      if (mock) qs.set('mock', '1')
      const qstr = qs.toString()
      fetchJson(`/api/browse${qstr ? `?${qstr}` : ''}`, { ttl: TTL.list }).then(d => {
        if (d.error) return
        setShelves(d)
        if (d.level) setLevelLabel(d.level)
      }).catch(() => {})
    } catch {}
  }, [])

  // One search across all study content; tabs/facets filter client-side.
  useEffect(() => {
    const needle = q.trim()
    if (needle.length < 2) { setResults(null); setSearching(false); return }
    setSearching(true)
    const t = setTimeout(() => {
      const params = new URLSearchParams({ q: needle, limit: '12' })
      fetchJson(`/api/search?${params.toString()}`, { ttl: TTL.list })
        .then(d => { if (!d.error) setResults(d); })
        .catch(() => {})
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  const needle = q.trim().toLowerCase()
  const match = (s) => !needle || String(s || '').toLowerCase().includes(needle)
  const hitCourses = courses.filter(c => match(c.code) || match(c.title)).slice(0, 8)
  const hitSpaces = spaces.filter(s => match(s.name) || match(s.description)).slice(0, 8)
  const hitGames = GAMES.filter(g => match(g.label) || match(g.tags)).slice(0, 8)
  const hasFallbackHits = hitCourses.length || hitSpaces.length || hitGames.length

  // Flatten server groups into filterable book rows.
  const allItems = useMemo(() => {
    const g = results?.groups
    if (!g) return []
    const out = []
    const push = (arr, kind) => (arr || []).forEach(i => out.push({ ...i, kind: i.kind || kind }))
    push(g.quiz, 'quiz'); push(g.theory, 'theory'); push(g.notes, 'notes')
    push(g.pdf, 'pdf'); push(g.video, 'video'); push(g.audio, 'audio')
    return out
  }, [results])

  const tabbed = useMemo(() => {
    if (!tab) return allItems
    if (tab === 'books') return allItems.filter(i => ['notes', 'pdf', 'theory'].includes(i.kind))
    return allItems.filter(i => i.kind === tab)
  }, [allItems, tab])

  const courseCounts = useMemo(() => {
    const m = new Map()
    for (const i of tabbed) {
      const c = i.courseCode || 'General'
      m.set(c, (m.get(c) || 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [tabbed])

  const uploaderCounts = useMemo(() => {
    const m = new Map()
    for (const i of tabbed) {
      const u = uploaderOf(i)
      m.set(u, (m.get(u) || 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [tabbed])

  const filtered = useMemo(() => {
    let list = tabbed
    if (selCourses.length) list = list.filter(i => selCourses.includes(i.courseCode || 'General'))
    if (selUploaders.length) list = list.filter(i => selUploaders.includes(uploaderOf(i)))
    if (sort === 'az') list = [...list].sort((a, b) => String(a.title).localeCompare(String(b.title)))
    return list
  }, [tabbed, selCourses, selUploaders, sort])

  const books = filtered.filter(i => ['notes', 'pdf', 'theory'].includes(i.kind))
  const videos = filtered.filter(i => i.kind === 'video')
  const audios = filtered.filter(i => i.kind === 'audio')
  const quizzes = filtered.filter(i => i.kind === 'quiz')

  function toggle(setter, v) {
    setter(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])
  }

  const facetList = (entries, selected, onToggle) => {
    const f = facetQ.trim().toLowerCase()
    const rows = entries.filter(([name]) => !f || name.toLowerCase().includes(f))
    if (!rows.length) return <p className="px-1 py-2 text-xs text-muted-foreground">No matches.</p>
    return rows.map(([name, n]) => (
      <button key={name} onClick={() => onToggle(name)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted">
        <span className={`flex size-4 shrink-0 items-center justify-center rounded border ${selected.includes(name) ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'}`}>
          {selected.includes(name) && <Check className="size-3" strokeWidth={3} />}
        </span>
        <span className="min-w-0 flex-1 truncate">{name}</span>
        <span className="text-[11px] text-muted-foreground">{n}</span>
      </button>
    ))
  }

  const rail = (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <h3 className="flex-1 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Course</h3>
          {(selCourses.length > 0) && <button onClick={() => setSelCourses([])} className="text-[11px] font-semibold text-primary">Clear</button>}
        </div>
        <input value={facetQ} onChange={e => setFacetQ(e.target.value)} placeholder="Filter…"
          className="mb-1 w-full rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground" />
        <div className="max-h-48 space-y-0.5 overflow-y-auto">
          {facetList(courseCounts, selCourses, (v) => toggle(setSelCourses, v))}
        </div>
      </div>
      <div>
        <div className="mb-1 flex items-center gap-2">
          <h3 className="flex-1 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Uploader</h3>
          {(selUploaders.length > 0) && <button onClick={() => setSelUploaders([])} className="text-[11px] font-semibold text-primary">Clear</button>}
        </div>
        <div className="max-h-40 space-y-0.5 overflow-y-auto">
          {facetList(uploaderCounts, selUploaders, (v) => toggle(setSelUploaders, v))}
        </div>
      </div>
      <div>
        <h3 className="mb-1 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Sort by</h3>
        {['relevance', 'az'].map(s => (
          <button key={s} onClick={() => setSort(s)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted">
            <span className={`flex size-4 items-center justify-center rounded-full border ${sort === s ? 'border-primary' : 'border-muted-foreground/40'}`}>
              {sort === s && <span className="size-2 rounded-full bg-primary" />}
            </span>
            {s === 'relevance' ? 'Most relevant' : 'Title A–Z'}
          </button>
        ))}
      </div>
    </div>
  )

  const shelfEmpty = shelves && !shelves.videos?.length && !shelves.audio?.length && !shelves.pdf?.length && !shelves.text?.length && !shelves.quiz?.length
  const showShelf = (k) => !tab || tab === k || (tab === 'books' && k === 'text')

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-4 pb-24 pt-6">
      <div>
        <h1 className="text-2xl font-bold">Library</h1>
        <p className="text-xs text-muted-foreground">{levelLabel ? `${levelLabel} picks · PDFs, videos, audio & more` : 'Open resources · PDFs, videos, audio & more'}</p>
        {mockMode && <p className="mt-1 inline-block rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-600">Mock shelves — development only</p>}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-full border bg-card px-4 py-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Titles, topics, courses, authors…" className="w-full bg-transparent text-sm outline-none" />
        </div>
        {!!needle && needle.length >= 2 && (
          <button onClick={() => setFiltersOpen(true)} aria-label="Filters"
            className={`relative flex size-11 shrink-0 items-center justify-center rounded-full border ${selCourses.length + selUploaders.length > 0 ? 'border-primary bg-primary/10' : 'bg-card'}`}>
            <SlidersHorizontal className="size-4" />
            {selCourses.length + selUploaders.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {selCourses.length + selUploaders.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Perlego-style tabs */}
      <div className="flex gap-5 overflow-x-auto border-b px-1 text-sm font-bold">
        {TABS.map(t => (
          <button key={t.id || 'all'} onClick={() => { setTab(t.id); setExpanded(null) }}
            className={'shrink-0 pb-2 ' + (tab === t.id ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground')}>
            {t.label}
          </button>
        ))}
      </div>

      {!needle && shelves && !shelfEmpty && (
        <>
          {!!(shelves.pdf?.length || shelves.text?.length) && (!tab || tab === 'books') && (
            <Shelf title="Books" Icon={BookOpen} count={(shelves.pdf?.length || 0) + (shelves.text?.length || 0)}>
              <Rail>
                {(() => {
                  const pdfs = (shelves.pdf || []).map(p => ({ ...p, kind: 'pdf' }))
                  const texts = (shelves.text || []).map(t => ({ ...t, kind: 'text' }))
                  const mixed = []
                  const n = Math.max(pdfs.length, texts.length)
                  for (let i = 0; i < n; i++) {
                    if (pdfs[i]) mixed.push(pdfs[i])
                    if (texts[i]) mixed.push(texts[i])
                  }
                  return mixed.slice(0, 5).map(item => <RailBookCard key={item.id} item={item} />)
                })()}
              </Rail>
            </Shelf>
          )}

          {!!shelves.videos?.length && (!tab || tab === 'video') && (
            <Shelf title="Videos" Icon={PlayCircle} count={shelves.videos.length}>
              <div className="space-y-3">
                {shelves.videos.map(v => <VideoCard key={v.id} item={v} wide onOpen={setVideoModal} />)}
              </div>
            </Shelf>
          )}

          {!!(shelves.pdf?.length || shelves.text?.length) && (!tab || tab === 'books') && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-1.5 px-1 text-sm font-bold">
                <BookOpen className="size-4 text-muted-foreground" /> More books
              </h2>
              <BookGrid items={(() => {
                const pdfs = (shelves.pdf || []).map(p => ({ ...p, kind: 'pdf' }))
                const texts = (shelves.text || []).map(t => ({ ...t, kind: 'text' }))
                const mixed = []
                const n = Math.max(pdfs.length, texts.length)
                for (let i = 0; i < n; i++) {
                  if (pdfs[i]) mixed.push(pdfs[i])
                  if (texts[i]) mixed.push(texts[i])
                }
                return mixed.slice(5)
              })()} />
            </section>
          )}

          {!!shelves.audio?.length && (!tab || tab === 'audio') && (
            <Shelf title="Audio" Icon={Headphones} count={shelves.audio.length}
              expanded={expanded === 'audio'} onSeeAll={() => setExpanded(expanded === 'audio' ? null : 'audio')}>
              {expanded === 'audio' ? (
                <div className="divide-y divide-border">{shelves.audio.map(a => <AudioRow key={a.id} item={a} />)}</div>
              ) : (
                <Rail>{shelves.audio.slice(0, 8).map(a => <AudioTile key={a.id} item={a} />)}</Rail>
              )}
            </Shelf>
          )}

          {!!shelves.quiz?.length && (!tab || tab === 'quiz') && (
            <Shelf title="Quizzes" Icon={ClipboardList} count={shelves.quiz.length}
              expanded={expanded === 'quiz'} onSeeAll={() => setExpanded(expanded === 'quiz' ? null : 'quiz')}>
              {(expanded === 'quiz' ? shelves.quiz : shelves.quiz.slice(0, 4)).map(g => <QuizCard key={g.id} item={g} />)}
            </Shelf>
          )}

          {!tab && (
            <Shelf title="Games" Icon={PlayCircle}>
              <Rail>
                {GAMES.slice(0, 8).map(g => (
                  <Link key={g.href} href={g.href} className="flex w-40 shrink-0 snap-start flex-col gap-2 rounded-2xl bg-violet-600 p-4 text-white">
                    <span className="text-2xl">🎮</span>
                    <span className="line-clamp-2 text-sm font-bold leading-snug">{g.label}</span>
                  </Link>
                ))}
              </Rail>
            </Shelf>
          )}
        </>
      )}

      {!needle && (!shelves || shelfEmpty) && (
        <div className="rounded-2xl border border-dashed p-6 text-center">
          <p className="text-sm font-bold">Your library is filling up</p>
          <p className="mt-1 text-xs text-muted-foreground">Uploads from everyone appear here automatically. Add the first file from My Files.</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <Link href="/folders" className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Open My Files</Link>
            <Link href="/search?mock=1" className="rounded-xl border px-4 py-2 text-xs font-bold">Preview sample shelves</Link>
          </div>
        </div>
      )}

      {!!needle && needle.length >= 2 && (
        <div className="md:grid md:grid-cols-[200px_1fr] md:gap-5">
          <aside className="hidden md:block">
            <div className="sticky top-20 space-y-4">{rail}</div>
          </aside>
          <div className="min-w-0 space-y-5">
            {searching && !results && <p className="text-sm text-muted-foreground">Searching study content…</p>}
            {results && filtered.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No matches{q ? ` for “${q}”` : ''}{tab ? ` in ${TABS.find(t => t.id === tab)?.label}` : ''}{selCourses.length + selUploaders.length > 0 ? ' with these filters' : ''}. Try clearing a filter.
              </p>
            )}

            {!!books.length && (
              <section className="space-y-3">
                <h2 className="flex items-center gap-1.5 px-1 text-sm font-bold">
                  <BookOpen className="size-4 text-muted-foreground" /> Books
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{books.length}</span>
                </h2>
                <BookGrid items={books} />
              </section>
            )}
            {!!videos.length && (
              <section className="space-y-3">
                <h2 className="flex items-center gap-1.5 px-1 text-sm font-bold">
                  <PlayCircle className="size-4 text-muted-foreground" /> Videos
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{videos.length}</span>
                </h2>
                {videos.map(item => <VideoCard key={item.id} item={item} wide onOpen={setVideoModal} />)}
              </section>
            )}
            {!!audios.length && (
              <section className="space-y-1">
                <h2 className="flex items-center gap-1.5 px-1 text-sm font-bold">
                  <Headphones className="size-4 text-muted-foreground" /> Audio
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{audios.length}</span>
                </h2>
                <div className="divide-y divide-border">{audios.map(item => <AudioRow key={item.id} item={item} />)}</div>
              </section>
            )}
            {!!quizzes.length && (
              <section className="space-y-2">
                <h2 className="flex items-center gap-1.5 px-1 text-sm font-bold">
                  <ClipboardList className="size-4 text-muted-foreground" /> Quizzes
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{quizzes.length}</span>
                </h2>
                {quizzes.map(item => <QuizCard key={item.id} item={item} />)}
              </section>
            )}

            {hasFallbackHits && (
              <>
                {!!hitCourses.length && (
                  <section className="space-y-2">
                    <h2 className="px-1 text-sm font-bold">Courses</h2>
                    {hitCourses.map(c => (
                      <Link key={c.code || c.title} href={`/courses/${(c.code || '').toLowerCase().replace(/\s+/g, '')}`} className="block rounded-xl border bg-card p-3 text-sm hover:bg-muted">
                        <span className="font-semibold">{c.code}</span> <span className="text-muted-foreground">{c.title}</span>
                      </Link>
                    ))}
                  </section>
                )}
                {!!hitSpaces.length && (
                  <section className="space-y-2">
                    <h2 className="px-1 text-sm font-bold">Study groups</h2>
                    {hitSpaces.map(s => (
                      <Link key={s._id} href={`/groups/${s._id}`} className="block rounded-xl border bg-card p-3 text-sm hover:bg-muted">
                        <span className="font-semibold">{s.name}</span>
                        <span className="block text-xs text-muted-foreground">{s.memberCount || 0} members · {s.intent || 'steady-a'}</span>
                      </Link>
                    ))}
                  </section>
                )}
                {!!hitGames.length && (
                  <section className="space-y-2">
                    <h2 className="px-1 text-sm font-bold">Games</h2>
                    {hitGames.map(g => (
                      <Link key={g.href} href={g.href} className="block rounded-xl border bg-card p-3 text-sm hover:bg-muted">
                        <span className="font-semibold">🎮 {g.label}</span>
                      </Link>
                    ))}
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {filtersOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setFiltersOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col gap-4 overflow-y-auto border-l bg-background p-4">
            <div className="flex items-center gap-2">
              <h2 className="flex-1 text-base font-bold">Filters</h2>
              <button onClick={() => setFiltersOpen(false)} aria-label="Close filters" className="flex size-8 items-center justify-center rounded-lg hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>
            {rail}
            <button onClick={() => setFiltersOpen(false)} className="mt-auto rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground">
              Show {filtered.length} result{filtered.length === 1 ? '' : 's'}
            </button>
          </div>
        </>
      )}

      {videoModal && <VideoModal item={videoModal} onClose={() => setVideoModal(null)} />}
    </div>
  )
}

// Portrait book card for the horizontal Books rail.
function RailBookCard({ item }) {
  const href = bookHref(item)
  const cover = item.coverUrl ? (
    <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
  ) : item.kind === 'pdf' && item.url ? (
    <PdfCover url={item.url} className="h-full w-full" />
  ) : (
    (() => {
      const h = thumbHue(item.title)
      return (
        <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 p-2 text-center"
          style={{ background: `linear-gradient(160deg, hsl(${h} 55% 38%), hsl(${(h + 40) % 360} 60% 24%)` }}>
          <BookOpen className="size-6 text-white/80" />
          <span className="line-clamp-3 text-[10px] font-bold leading-tight text-white">{item.title}</span>
        </span>
      )
    })()
  )
  const body = (
    <>
      <span className="relative block aspect-[2/3] w-full overflow-hidden rounded-lg shadow-md">{cover}</span>
      <span className="line-clamp-2 block text-xs font-semibold leading-snug">{item.title}</span>
      <span className="block truncate text-[11px] text-gray-600">{bookAuthor(item)}</span>
      {item.year && <span className="block text-[11px] text-gray-600">{item.year}</span>}
    </>
  )
  return (
    <div className="w-[62vw] max-w-56 shrink-0 snap-start space-y-1.5">
      {href && !String(href).startsWith('/courses') ? (
        <a href={href} target="_blank" rel="noreferrer" className="block space-y-1.5">{body}</a>
      ) : href ? (
        <Link href={href} className="block space-y-1.5">{body}</Link>
      ) : (
        <div className="space-y-1.5">{body}</div>
      )}
      <SaveToFolder payload={savePayload(item, item.kind)} />
    </div>
  )
}

// Book grid: 2-col cover grid — title / author / year under each cover.
// One display language for books, PDFs and text.
function bookAuthor(item) {
  const u = uploaderOf(item)
  if (u !== 'Study bank') return u
  return item.courseCode || ({ pdf: 'PDF', notes: 'Note', theory: 'Theory' }[item.kind] || 'Book')
}

function bookHref(item) {
  if (item.kind === 'pdf') return item.url || item.href || null
  if (item.url && !String(item.url).includes('/courses') && !String(item.href || '').includes('/courses')) return item.url
  if (item.href) return item.href
  if (item.courseCode) return `/courses/${item.courseCode.toLowerCase().replace(/\s+/g, '')}/theory`
  return null
}

function thumbHue(s) {
  let h = 0
  for (const c of String(s || '?')) h = (h * 31 + c.charCodeAt(0)) % 360
  return h
}

function BookGrid({ items }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-6">
      {items.map((item) => {
        const href = bookHref(item)
        const cover = item.coverUrl ? (
          <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
        ) : item.kind === 'pdf' && item.url ? (
          <PdfCover url={item.url} className="h-full w-full" />
        ) : (
          (() => {
            const h = thumbHue(item.title)
            return (
              <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 p-3 text-center"
                style={{ background: `linear-gradient(135deg, hsl(${h} 55% 38%), hsl(${(h + 40) % 360} 60% 24%)` }}>
                <BookOpen className="size-7 text-white/80" />
                <span className="line-clamp-3 text-[11px] font-bold leading-tight text-white">{item.title}</span>
              </span>
            )
          })()
        )
        return (
          <div key={item.id} className="min-w-0">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg shadow-md">
              {href && !String(href).startsWith('/courses') ? (
                <a href={href} target="_blank" rel="noreferrer" className="block h-full w-full">{cover}</a>
              ) : href ? (
                <Link href={href} className="block h-full w-full">{cover}</Link>
              ) : (
                <span className="block h-full w-full">{cover}</span>
              )}
              <span className="absolute right-1.5 top-1.5 rounded-lg bg-background/90">
                <SaveToFolder payload={savePayload(item, item.kind)} />
              </span>
            </div>
            <div className="mt-4">
              <h3 className="line-clamp-2 text-[20px] font-medium leading-[1.45] text-black">
                {href && !String(href).startsWith('/courses') ? (
                  <a href={href} target="_blank" rel="noreferrer">{item.title}</a>
                ) : href ? (
                  <Link href={href}>{item.title}</Link>
                ) : item.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-[18px] leading-7 text-gray-600">{bookAuthor(item)}</p>
              {item.year && <p className="text-[18px] leading-7 text-gray-600">{item.year}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function VideoCard({ item, wide, className, onOpen }) {
  const vid = ytId(item.url)
  const thumb = item.thumb || (vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : null)
  const playable = !!(vid || item.url)
  const opener = thumb ? (
    <button onClick={() => playable && onOpen?.(item)} className="relative block aspect-video w-full bg-black text-left">
      <img src={thumb} alt={item.title} className="size-full object-cover" loading="lazy" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-black/70">
          <Play className="size-4 text-white" fill="white" />
        </span>
      </span>
    </button>
  ) : (
    <button onClick={() => playable && onOpen?.(item)} className="flex aspect-video w-full items-center justify-center bg-muted">
      <Play className="size-8 text-muted-foreground" fill="currentColor" />
    </button>
  )
  return (
    <div className={(wide ? 'w-full' : (className || 'w-56 shrink-0 snap-start')) + ' overflow-hidden rounded-2xl border bg-card'}>
      {opener}
      <div className="flex items-start gap-2 p-3">
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block text-sm font-semibold leading-snug">{item.title}</span>
          {item.subtitle && <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{item.subtitle}</span>}
        </span>
        <SaveToFolder payload={savePayload(item, 'video')} />
      </div>
    </div>
  )
}

function AudioTile({ item }) {
  const art = item.art || null
  return (
    <div className="w-40 shrink-0 snap-start rounded-2xl border bg-card p-3">
      {art ? (
        item.url ? (
          <a href={item.url} target="_blank" rel="noreferrer" className="block aspect-square w-full overflow-hidden rounded-xl">
            <img src={art} alt={item.title} className="size-full object-cover" loading="lazy" />
          </a>
        ) : (
          <span className="block aspect-square w-full overflow-hidden rounded-xl">
            <img src={art} alt={item.title} className="size-full object-cover" loading="lazy" />
          </span>
        )
      ) : item.url ? (
        <a href={item.url} target="_blank" rel="noreferrer" className="flex size-12 items-center justify-center rounded-full bg-green-500">
          <Music className="size-5 text-white" />
        </a>
      ) : (
        <span className="flex size-12 items-center justify-center rounded-full bg-green-500/15">
          <Music className="size-5 text-green-500" />
        </span>
      )}
      <p className="mt-2 line-clamp-2 text-xs font-bold leading-snug">{item.title}</p>
      {item.subtitle && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.subtitle}</p>}
      <span className="mt-1.5 block"><SaveToFolder payload={savePayload(item, 'audio')} /></span>
    </div>
  )
}

function AudioRow({ item }) {
  return (
    <div className="flex items-center gap-3 px-1 py-2.5">
      {item.url ? (
        <a href={item.url} target="_blank" rel="noreferrer" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-green-500">
          <Music className="size-4 text-white" />
        </a>
      ) : (
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-green-500/15">
          <Music className="size-4 text-green-500" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{item.title}</span>
        {item.subtitle && <span className="block truncate text-[11px] text-muted-foreground">{item.subtitle}</span>}
      </span>
      <SaveToFolder payload={savePayload(item, 'audio')} />
    </div>
  )
}

function QuizCard({ item }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-amber-500 p-4 text-white">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-extrabold">{item.title}</span>
        <span className="block text-xs text-white/80">{item.subtitle}</span>
      </span>
      <SaveToFolder payload={savePayload(item, 'quiz')} />
      <Link href={item.href} className="shrink-0 rounded-xl bg-white px-4 py-2 text-xs font-extrabold text-amber-600">
        Start
      </Link>
    </div>
  )
}
