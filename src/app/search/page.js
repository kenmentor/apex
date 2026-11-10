'use client'

import { useState, useEffect, useMemo, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Search, SearchX, LibraryBig, ClipboardList, BookOpen, PlayCircle, Headphones, Play, Music, SlidersHorizontal, X, Check, ChevronRight, ChevronDown, Gamepad2 } from 'lucide-react'
import { fetchJson, TTL } from '@/lib/fetch-json'
import { getUser } from '@/lib/auth'
import { trackSearch } from '@/lib/telemetry'
import { myScope, inScopeOrAsked, queryCourseToken } from '@/lib/scope'
import SaveToFolder from '@/components/SaveToFolder'
import BookGrid, { BookCover } from '@/components/BookGrid'
import VideoModal from '@/components/VideoModal'

const GAMES = [
  { href: '/games/chunk', label: 'Reassemble the explanation', blurb: 'Rebuild answers in order', tags: 'game chunk reorder definition' },
  { href: '/games/sprint', label: 'Speed Sprint', blurb: 'Timed rapid-fire round', tags: 'game sprint timed mcq quiz' },
  { href: '/games/pairs', label: 'Match Pairs', blurb: 'Match terms to meanings', tags: 'game pairs match term definition memory' },
  { href: '/games/cloze', label: 'Cloze Blanks', blurb: 'Fill the missing words', tags: 'game cloze fill blank explanation' },
  { href: '/games/blitz', label: 'Survival Blitz', blurb: 'Survive the streak', tags: 'game blitz survival streak hearts mcq quiz' },
  { href: '/games/odd', label: 'Odd One Out', blurb: 'Spot the intruder', tags: 'game odd intruder terms discrimination' },
  { href: '/games/boss', label: 'Boss Battle', blurb: 'Battle the boss', tags: 'game boss battle fight hp monster mcq quiz' },
  { href: '/games/typing', label: 'Typing Rush', blurb: 'Type terms, fast', tags: 'game typing rush keyboard speed terms' },
  { href: '/races', label: 'Races', blurb: 'Race live opponents', tags: 'race competition ghost live multiplayer' },
]

// Perlego-style unified tabs. Books = PDFs + notes + theory.
const TABS = [
  { id: '', label: 'All' },
  { id: 'books', label: 'Books' },
  { id: 'qa', label: 'Q&A' },
  { id: 'video', label: 'Videos' },
  { id: 'audio', label: 'Audio' },
  { id: 'quiz', label: 'Quizzes' },
  { id: 'folders', label: 'Folders' },
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

function EmptyState({ icon: Icon, tint = 'bg-muted text-muted-foreground', title, sub, action }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-10 text-center">
      <span className={`flex size-12 items-center justify-center rounded-2xl ${tint}`}>
        <Icon className="size-6" />
      </span>
      <p className="text-sm font-bold">{title}</p>
      {!!sub && <p className="max-w-xs text-xs text-muted-foreground">{sub}</p>}
      {!!action && <span className="mt-1 flex flex-wrap items-center justify-center gap-2">{action}</span>}
    </div>
  )
}

function SearchPageInner() {
  const searchParams = useSearchParams()
  const urlQ = (searchParams.get('q') || '').trim().slice(0, 120)
  const urlType = searchParams.get('type') || ''
  const firedFirst = useRef(false)
  // Paint the query on the very first frame: read it during initial render
  // (URL params + location fallback) instead of waiting for a sync effect
  // after navigation from home.
  const [q, setQ] = useState(() => {
    if (urlQ) return urlQ
    try {
      return (new URLSearchParams(window.location.search).get('q') || '').trim().slice(0, 120)
    } catch { return '' }
  })
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
  // Scope: your level + department by default; Everything opts out.
  const [scopeMode, setScopeMode] = useState('mine')
  const [myDept, setMyDept] = useState('')
  const [myLevel, setMyLevel] = useState('')

  useEffect(() => {
    fetchJson('/api/courses', { ttl: TTL.list }).then(d => setCourses(Array.isArray(d) ? d : (d.docs || d.courses || []))).catch(() => {})
    fetchJson('/api/spaces?limit=50', { ttl: TTL.list }).then(d => setSpaces(Array.isArray(d) ? d : [])).catch(() => {})
    // type param handled by the URL-sync effect below
    try {
      const u = getUser()
      const lv = u?.level || ''
      if (lv) setLevelLabel(lv)
      if (u?.department) setMyDept(u.department)
      if (lv) setMyLevel(lv)
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

  // Keep the input + tab in sync with the URL so home links (?q=, ?type=)
  // prefill instantly and client-side navigations refresh the search too.
  useEffect(() => {
    const t = urlType || ''
    if (['video', 'audio', 'quiz', 'qa', 'folders'].includes(t)) setTab(t)
    else if (t === 'theory') setTab('qa')
    else if (t === 'folder') setTab('folders')
    else if (['notes', 'pdf'].includes(t)) setTab('books')
    else if (!t) setTab('')
    // Only touch the input when the URL actually changed — never clobber
    // keystrokes while typing (typing updates q, not the URL).
    if (urlQ) setQ(prev => (prev === urlQ ? prev : urlQ))
    else setQ(prev => (prev === '' ? prev : ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQ, urlType])

  // One search across all study content; tabs/facets filter client-side.
  // First search (e.g. arriving with ?q=) fires instantly, later typing debounces.
  useEffect(() => {
    const needle = q.trim()
    if (needle.length < 2) { setResults(null); setSearching(false); return }
    setSearching(true)
    const wait = firedFirst.current ? 300 : 0
    firedFirst.current = true
    const t = setTimeout(() => {
      const params = new URLSearchParams({ q: needle, limit: '12' })
      fetchJson(`/api/search?${params.toString()}`, { ttl: TTL.list })
        .then(d => {
          if (!d.error) {
            setResults(d)
            try {
              const n = Object.values(d.groups || {}).reduce((a, arr) => a + (arr || []).length, 0)
              trackSearch({ query_string: needle, results_count: n, tab })
            } catch {}
          }
        })
        .catch(() => {})
        .finally(() => setSearching(false))
    }, wait)
    return () => clearTimeout(t)
  }, [q, tab])

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
    push(g.pdf, 'pdf'); push(g.video, 'video'); push(g.audio, 'audio'); push(g.folders, 'folder')
    return out
  }, [results])

  // Default view is your world only: level + department. An explicit
  // course code in the query ("law 101") or the Everything toggle opts out.
  const scopeObj = useMemo(() => myScope(myDept, myLevel), [myDept, myLevel])
  const askedToken = useMemo(() => queryCourseToken(q), [q])
  const scoped = useMemo(() => {
    if (scopeMode !== 'mine' || !scopeObj || scopeObj.mode === 'all') return allItems
    return allItems.filter(i => inScopeOrAsked(i, scopeObj, askedToken))
  }, [allItems, scopeMode, scopeObj, askedToken])

  const tabbed = useMemo(() => {
    if (!tab) return scoped
    // Books are readable documents only — theory Q&A and curated folders live elsewhere.
    if (tab === 'books') return scoped.filter(i => ['notes', 'pdf'].includes(i.kind))
    if (tab === 'qa') return scoped.filter(i => i.kind === 'theory')
    if (tab === 'folders') return scoped.filter(i => i.kind === 'folder')
    return scoped.filter(i => i.kind === tab)
  }, [scoped, tab])

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

  const books = filtered.filter(i => ['notes', 'pdf'].includes(i.kind))
  const qas = filtered.filter(i => i.kind === 'theory')
  const folderHits = filtered.filter(i => i.kind === 'folder')
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
      {scopeObj.mode !== 'all' && (
        <div>
          <h3 className="mb-1 px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Scope</h3>
          {['mine', 'all'].map(s => (
            <button key={s} onClick={() => setScopeMode(s)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted">
              <span className={`flex size-4 items-center justify-center rounded-full border ${scopeMode === s ? 'border-primary' : 'border-muted-foreground/40'}`}>
                {scopeMode === s && <span className="size-2 rounded-full bg-primary" />}
              </span>
              {s === 'mine' ? `My ${scopeObj.short}` : 'Everything'}
            </button>
          ))}
          <p className="px-2 pt-1 text-[11px] leading-snug text-muted-foreground">
            {scopeMode === 'mine'
              ? 'Only your level + department. Switch to see the whole bank.'
              : 'The whole bank, all levels and departments.'}
          </p>
        </div>
      )}
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

  // Shelf text mixes readable docs with theory Q&A — split them: questions are not books.
  const shelfBooksAll = (shelves?.text || []).filter(t => t.source !== 'theory')
  const shelfQaAll = (shelves?.text || []).filter(t => t.source === 'theory')
  // Shelves never show other levels/departments — browsing stays in your
  // world. Search-with-query and the Everything toggle are the way out.
  const mineOnly = scopeMode === 'mine' && scopeObj && scopeObj.mode !== 'all'
  const keepShelf = (i) => !mineOnly || inScopeOrAsked(i, scopeObj, null)
  const shelfVideos = (shelves?.videos || []).filter(keepShelf)
  const shelfAudio = (shelves?.audio || []).filter(keepShelf)
  const shelfPdf = (shelves?.pdf || []).filter(keepShelf)
  const shelfBooks = shelfBooksAll.filter(keepShelf)
  const shelfQa = shelfQaAll.filter(keepShelf)
  const shelfQuiz = (shelves?.quiz || []).filter(keepShelf)
  const shelfScopedEmpty = !shelfVideos.length && !shelfAudio.length && !shelfPdf.length && !shelfBooks.length && !shelfQa.length && !shelfQuiz.length

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-4 pb-24 pt-6">
      <div>
        <h1 className="text-2xl font-bold">Library</h1>
        <p className="text-xs text-muted-foreground">{levelLabel ? `${levelLabel} picks · PDFs, videos, audio & more` : 'Open resources · PDFs, videos, audio & more'}</p>
        {mockMode && <p className="mt-1 inline-block rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-600">Mock shelves — development only</p>}
      </div>

      <div className="flex items-center gap-2">
        <form
          onSubmit={e => { e.preventDefault(); try { document.getElementById('lib-search-input')?.blur() } catch {} }}
          className="flex flex-1 items-center gap-2 rounded-full border bg-card px-4 py-3"
        >
          <button type="submit" aria-label="Search" className="flex shrink-0 items-center justify-center rounded-full hover:text-foreground">
            <Search className="size-4 text-muted-foreground" />
          </button>
          <input id="lib-search-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Titles, topics, courses, authors…" className="w-full bg-transparent text-sm outline-none" enterKeyHint="search" />
        </form>
        <button onClick={() => setFiltersOpen(true)} aria-label="Filters"
          className={`relative flex size-11 shrink-0 items-center justify-center rounded-full border ${(selCourses.length + selUploaders.length > 0 || scopeMode === 'all') ? 'border-primary bg-primary/10' : 'bg-card'}`}>
            <SlidersHorizontal className="size-4" />
            {selCourses.length + selUploaders.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {selCourses.length + selUploaders.length}
              </span>
            )}
          </button>
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

      {!needle && shelves && !shelfScopedEmpty && (
        <>
          {!!(shelfPdf.length || shelfBooks.length) && (!tab || tab === 'books') && (
            <Shelf title="Books" Icon={BookOpen} count={shelfPdf.length + shelfBooks.length}>
              <Rail>
                {(() => {
                  const pdfs = shelfPdf.map(p => ({ ...p, kind: 'pdf' }))
                  const texts = shelfBooks.map(t => ({ ...t, kind: 'text' }))
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

          {!!shelfQa.length && (!tab || tab === 'qa') && (
            <Shelf title="Q&A" Icon={ClipboardList} count={shelfQa.length}>
              <Rail>
                {shelfQa.slice(0, 8).map(item => <RailQaCard key={item.id} item={item} />)}
              </Rail>
            </Shelf>
          )}

          {!!shelfVideos.length && (!tab || tab === 'video') && (
            <Shelf title="Videos" Icon={PlayCircle} count={shelfVideos.length}>
              <div className="space-y-3">
                {shelfVideos.map(v => <VideoCard key={v.id} item={v} wide onOpen={setVideoModal} />)}
              </div>
            </Shelf>
          )}

          {!!(shelfPdf.length || shelfBooks.length) && (!tab || tab === 'books') && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-1.5 px-1 text-sm font-bold">
                <BookOpen className="size-4 text-muted-foreground" /> More books
              </h2>
              <BookGrid items={(() => {
                const pdfs = shelfPdf.map(p => ({ ...p, kind: 'pdf' }))
                const texts = shelfBooks.map(t => ({ ...t, kind: 'text' }))
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

          {!!shelfAudio.length && (!tab || tab === 'audio') && (
            <Shelf title="Audio" Icon={Headphones} count={shelfAudio.length}
              expanded={expanded === 'audio'} onSeeAll={() => setExpanded(expanded === 'audio' ? null : 'audio')}>
              {expanded === 'audio' ? (
                <div className="divide-y divide-border">{shelfAudio.map(a => <AudioRow key={a.id} item={a} />)}</div>
              ) : (
                <Rail>{shelfAudio.slice(0, 8).map(a => <AudioTile key={a.id} item={a} />)}</Rail>
              )}
            </Shelf>
          )}

          {!!shelfQuiz.length && (!tab || tab === 'quiz') && (
            <Shelf title="Quizzes" Icon={ClipboardList} count={shelfQuiz.length}
              expanded={expanded === 'quiz'} onSeeAll={() => setExpanded(expanded === 'quiz' ? null : 'quiz')}>
              {(expanded === 'quiz' ? shelfQuiz : shelfQuiz.slice(0, 4)).map(g => <QuizCard key={g.id} item={g} />)}
            </Shelf>
          )}

          {!tab && (
            <Shelf title="Games" Icon={Gamepad2}>
              <Rail>
                {GAMES.slice(0, 8).map(g => <GameTile key={g.href} game={g} />)}
              </Rail>
            </Shelf>
          )}
        </>
      )}

      {!needle && shelves && !shelfScopedEmpty && !!tab && (() => {
        const counts = { books: (shelfPdf || []).length + (shelfBooks || []).length, qa: (shelfQa || []).length, video: (shelfVideos || []).length, audio: (shelfAudio || []).length, quiz: (shelfQuiz || []).length }
        if (tab === 'folders' || (counts[tab] || 0) > 0) return null
        return (
          <EmptyState
            icon={SearchX}
            tint="bg-amber-500/15 text-amber-600"
            title={tab === 'folders' ? 'Folders need a search' : `No ${TABS.find(t => t.id === tab)?.label || tab} here yet`}
            sub={tab === 'folders' ? 'Type above to find your curated collections.' : 'New uploads for your courses will appear here automatically.'}
            action={
              <button onClick={() => { setTab(''); setExpanded(null) }} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
                Show everything
              </button>
            }
          />
        )
      })()}

      {!needle && (!shelves || shelfScopedEmpty) && (
        mineOnly ? (
          <EmptyState
            icon={Search}
            tint="bg-sky-500/15 text-sky-600"
            title={`Nothing for ${scopeObj.label} yet`}
            sub="New uploads for your courses will appear here automatically."
            action={
              <button onClick={() => setScopeMode('all')} className="rounded-xl border px-4 py-2 text-xs font-bold">Browse everything</button>
            }
          />
        ) : (
          <EmptyState
            icon={LibraryBig}
            tint="bg-violet-500/15 text-violet-600"
            title="Your library is filling up"
            sub="Uploads from everyone appear here automatically. Add the first file from My Files."
            action={<>
              <Link href="/folders" className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Open My Files</Link>
              <Link href="/search?mock=1" className="rounded-xl border px-4 py-2 text-xs font-bold">Preview samples</Link>
              {(!myDept || !myLevel) && (
                <Link href="/profile/settings" className="rounded-xl border border-primary/40 px-4 py-2 text-xs font-bold text-primary">Set department & level</Link>
              )}
            </>}
          />
        )
      )}

      {!!needle && needle.length >= 2 && (
        <div className="md:grid md:grid-cols-[200px_1fr] md:gap-5">
          <aside className="hidden md:block">
            <div className="sticky top-20 space-y-4">{rail}</div>
          </aside>
          <div className="min-w-0 space-y-5">
            {searching && !results && <p className="text-sm text-muted-foreground">Searching study content…</p>}
            {results && filtered.length === 0 && !tab && (
              <EmptyState
                icon={SearchX}
                tint="bg-amber-500/15 text-amber-600"
                title="No matches"
                sub={`Nothing${q ? ` for “${q}”` : ''}${mineOnly ? ' in your courses' : ''}${selCourses.length + selUploaders.length > 0 ? ' with these filters' : ''}.`}
                action={<>
                  {(selCourses.length + selUploaders.length > 0) && (
                    <button onClick={() => { setSelCourses([]); setSelUploaders([]) }} className="rounded-xl border px-4 py-2 text-xs font-bold">
                      Clear filters
                    </button>
                  )}
                  {mineOnly && allItems.length > 0 && (
                    <button onClick={() => setScopeMode('all')} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
                      Search everything
                    </button>
                  )}
                </>}
              />
            )}
            {results && !!tab && filtered.length === 0 && !searching && (
              <EmptyState
                icon={SearchX}
                tint="bg-amber-500/15 text-amber-600"
                title={tabbed.length === 0 ? `No ${TABS.find(t => t.id === tab)?.label || tab} here` : 'No matches with these filters'}
                sub={`Nothing${q ? ` for “${q}”` : ''} in this tab${mineOnly ? ' in your courses' : ''}${selCourses.length + selUploaders.length > 0 || (tabbed.length > 0) ? ' with these filters' : ''}.`}
                action={<>
                  {(selCourses.length + selUploaders.length > 0) && (
                    <button onClick={() => { setSelCourses([]); setSelUploaders([]) }} className="rounded-xl border px-4 py-2 text-xs font-bold">
                      Clear filters
                    </button>
                  )}
                  <button onClick={() => { setTab(''); setExpanded(null) }} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
                    Show everything
                  </button>
                  {mineOnly && allItems.length > 0 && (
                    <button onClick={() => setScopeMode('all')} className="rounded-xl border px-4 py-2 text-xs font-bold">
                      Search everything
                    </button>
                  )}
                </>}
              />
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
            {!!qas.length && (
              <section className="space-y-2">
                <h2 className="flex items-center gap-1.5 px-1 text-sm font-bold">
                  <ClipboardList className="size-4 text-muted-foreground" /> Q&amp;A
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{qas.length}</span>
                </h2>
                {tab === 'qa' ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {qas.map(item => <QaGridCard key={item.id} item={item} />)}
                  </div>
                ) : (
                  <div className="divide-y divide-border rounded-2xl border">
                    {qas.map(item => <QaRow key={item.id} item={item} />)}
                  </div>
                )}
              </section>
            )}
            {!!folderHits.length && (
              <section className="space-y-2">
                <h2 className="flex items-center gap-1.5 px-1 text-sm font-bold">
                  📁 Folders
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{folderHits.length}</span>
                </h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {folderHits.map(item => <FolderCard key={item.id} item={item} />)}
                </div>
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
                      <Link key={g.href} href={g.href} className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/40">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                          <Gamepad2 className="size-5 text-foreground" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{g.label}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">{g.blurb}</span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
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

function qaHref(item) {
  return item.href || (item.courseCode ? `/courses/${String(item.courseCode).toLowerCase().replace(/\s+/g, '')}/theory` : null)
}

// Q&A rail card + row: theory questions are questions, not books.
function FolderCard({ item }) {
  return (
    <Link href={item.href || '/folders'} className="flex items-center gap-3 rounded-2xl border bg-card p-3 hover:bg-muted/60">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-2xl">📁</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{item.title}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{item.subtitle || 'Curated collection'}</span>
      </span>
      <SaveToFolder payload={savePayload(item, 'folder')} />
    </Link>
  )
}

function GameTile({ game }) {
  return (
    <Link href={game.href} className="flex w-44 shrink-0 snap-start flex-col rounded-2xl border bg-card p-3.5 transition-colors hover:bg-muted/40">
      <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
        <Gamepad2 className="size-5 text-foreground" />
      </span>
      <span className="mt-2.5 line-clamp-2 text-[13px] font-bold leading-snug">{game.label}</span>
      <span className="mt-0.5 truncate text-[11px] text-muted-foreground">{game.blurb}</span>
      <span className="mt-2 flex items-center gap-0.5 text-[11px] font-bold text-primary">
        Play <ChevronRight className="size-3.5" />
      </span>
    </Link>
  )
}

function RailQaCard({ item }) {
  const [flipped, setFlipped] = useState(false)
  const href = qaHref(item)
  const answer = item.answer || null
  const concepts = Array.isArray(item.concepts) ? item.concepts : []
  const canFlip = !!(answer || concepts.length)
  return (
    <div className="relative flex w-56 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-emerald-500/[0.08] to-transparent p-3.5">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-emerald-500 font-serif text-[11px] font-black italic text-white">Q</span>
        <span className="truncate text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Q&amp;A{item.courseCode ? ` · ${item.courseCode}` : ''}</span>
      </div>
      <div
        onClick={() => canFlip && setFlipped(f => !f)}
        className={`relative w-full ${canFlip ? 'cursor-pointer' : ''}`}
        style={{ perspective: '1000px' }}>
        <div
          className="relative w-full transition-transform duration-500"
          style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', minHeight: '9.5rem' }}>
        {/* Front — question */}
        <div className="absolute inset-0 flex min-w-0 flex-col space-y-1.5 overflow-hidden" style={{ backfaceVisibility: 'hidden' }}>
          <span className="line-clamp-4 block flex-1 font-serif text-[15px] font-medium leading-snug">{item.question || item.title}</span>
          {!!metaOf(item) && <span className="block truncate text-[11px] text-muted-foreground">{metaOf(item)}</span>}
        </div>
        {/* Back — model answer */}
        <div className="absolute inset-0 flex min-w-0 flex-col overflow-hidden rounded-xl bg-emerald-500/[0.07] p-2" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <span className="block shrink-0 text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">Model answer</span>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {answer
              ? <span className="block text-[13px] leading-relaxed">{answer}</span>
              : (
                <ul className="list-disc space-y-1 pl-4 text-[13px] leading-relaxed">
                  {concepts.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              )}
          </div>
          {href && (
            <Link href={href} onClick={e => e.stopPropagation()} className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-primary">
              Full answer <ChevronRight className="size-3" />
            </Link>
          )}
        </div>
      </div>
      <span className="mt-2.5 flex items-center gap-2" onClick={e => e.stopPropagation()}>
        {canFlip ? (
          <span className="flex-1 truncate rounded-full bg-emerald-500/10 px-2.5 py-1 text-center text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
            {flipped ? 'Tap to hide' : 'Tap card to reveal answer'}
          </span>
        ) : (
          <span className="flex-1 truncate text-[11px] font-semibold text-muted-foreground">{item.courseCode || 'Q&A'}</span>
        )}
        <SaveToFolder payload={savePayload(item, 'theory')} />
      </span>
    </div>
  )
}

// "GSS 212 · Theory · medium" → eyebrow keeps the course, meta keeps the rest.
function metaOf(item) {
  const parts = String(item.subtitle || '').split('·').map(s => s.trim()).filter(Boolean)
  const rest = parts.filter(p => p !== (item.courseCode || '').trim())
  return rest.join(' · ')
}

// Big flip card for the Q&A tab: room to breathe, question front,
// model answer back. Same data as the rows, more presence.
function QaGridCard({ item }) {
  const [flipped, setFlipped] = useState(false)
  const href = qaHref(item)
  const answer = item.answer || null
  const concepts = Array.isArray(item.concepts) ? item.concepts : []
  const canFlip = !!(answer || concepts.length)
  return (
    <div className="relative flex min-h-48 flex-col overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-emerald-500/[0.06] to-transparent p-5 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500 font-serif text-sm font-black italic text-white">Q</span>
        <span className="truncate text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Q&amp;A{item.courseCode ? ` · ${item.courseCode}` : ''}</span>
      </div>
      <div
        onClick={() => canFlip && setFlipped(f => !f)}
        className={`relative w-full flex-1 ${canFlip ? 'cursor-pointer' : ''}`}
        style={{ perspective: '1000px' }}>
        <div
          className="relative w-full transition-transform duration-500"
          style={{ transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', minHeight: '9rem' }}>
          {/* Front — question */}
          <div className="absolute inset-0 flex min-w-0 flex-col overflow-hidden" style={{ backfaceVisibility: 'hidden' }}>
            <p className="line-clamp-5 flex flex-1 items-center font-serif text-[17px] font-medium leading-snug">{item.question || item.title}</p>
            {!!metaOf(item) && <p className="shrink-0 truncate text-[11px] text-muted-foreground">{metaOf(item)}</p>}
          </div>
          {/* Back — model answer */}
          <div className="absolute inset-0 flex min-w-0 flex-col overflow-hidden rounded-xl bg-emerald-500/[0.07] p-2.5" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">Model answer</span>
            <div className="min-h-0 flex-1 overflow-y-auto py-1">
              {answer
                ? <p className="text-sm leading-relaxed">{answer}</p>
                : (
                  <ul className="list-disc space-y-1 pl-4 text-sm leading-relaxed">
                    {concepts.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                )}
            </div>
            {href && (
              <Link href={href} onClick={e => e.stopPropagation()} className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-bold text-primary">
                Study the full answer <ChevronRight className="size-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
      <span className="mt-3 flex items-center gap-2" onClick={e => e.stopPropagation()}>
        {canFlip ? (
          <span className="flex-1 truncate rounded-full bg-emerald-500/10 px-2.5 py-1 text-center text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
            {flipped ? 'Tap to hide' : 'Tap card to reveal answer'}
          </span>
        ) : (
          <span className="flex-1 truncate text-[11px] font-semibold text-muted-foreground">Q&amp;A</span>
        )}
        <SaveToFolder payload={savePayload(item, 'theory')} />
      </span>
    </div>
  )
}

function QaRow({ item }) {
  const [open, setOpen] = useState(false)
  const href = qaHref(item)
  const text = item.question || item.title
  const meta = metaOf(item)
  const answer = item.answer || null
  const concepts = Array.isArray(item.concepts) ? item.concepts : []
  const canFlip = !!(answer || concepts.length)
  return (
    <div className="group px-4 py-3.5 transition-colors hover:bg-muted/50">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 font-serif text-base font-black italic text-white shadow-sm">Q</span>
        <button
          onClick={() => canFlip && setOpen(o => !o)}
          aria-expanded={open}
          className={`min-w-0 flex-1 text-left ${canFlip ? 'cursor-pointer' : 'cursor-default'}`}>
          {item.courseCode && <span className="block text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Q&amp;A · {item.courseCode}</span>}
          <span className={`mt-0.5 block font-serif text-[15px] font-medium leading-snug ${open ? '' : 'line-clamp-2'}`}>{text}</span>
          {!!meta && <span className="mt-1 block truncate text-[11px] text-muted-foreground">{meta}</span>}
          {canFlip && (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
              {open ? 'Hide answer' : 'Tap to reveal answer'}
              <ChevronDown className={`size-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            </span>
          )}
        </button>
        <span className="flex shrink-0 items-center gap-0.5 pt-0.5">
          <SaveToFolder payload={savePayload(item, 'theory')} />
          {href && (
            <Link href={href} aria-label="Open" className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <ChevronRight className="size-4" />
            </Link>
          )}
        </span>
      </div>
      {open && canFlip && (
        <div className="ml-8 mt-2.5 rounded-xl border-l-2 border-l-emerald-500 bg-muted/40 p-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600">Model answer</p>
          {answer
            ? <p className="text-[13px] leading-relaxed text-muted-foreground">{answer}</p>
            : (
              <ul className="list-disc space-y-1 pl-4 text-[13px] leading-relaxed text-muted-foreground">
                {concepts.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            )}
          {href && (
            <Link href={href} className="mt-1.5 inline-flex items-center gap-0.5 text-[11px] font-bold text-primary">
              Study the full answer <ChevronRight className="size-3" />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

// Portrait rail card: same cover language as the grid, horizontal scroll.
function RailBookCard({ item }) {
  const href = item.kind === 'pdf'
    ? (item.url || item.href || null)
    : (item.url && !String(item.url).includes('/courses') ? item.url : (item.href || (item.courseCode ? `/courses/${item.courseCode.toLowerCase().replace(/\s+/g, '')}/theory` : null)))
  const body = (
    <>
      <span className="relative block aspect-[2/3] w-full overflow-hidden rounded-lg shadow-md"><BookCover item={item} /></span>
      <span className="line-clamp-2 block text-xs font-semibold leading-snug">{item.title}</span>
      <span className="block truncate text-[11px] text-gray-600">{uploaderOf(item) !== 'Study bank' ? uploaderOf(item) : (item.courseCode || item.kind)}</span>
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
  const meta = metaOf(item)
  return (
    <div className="rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/40">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
          <ClipboardList className="size-5 text-amber-600" />
        </span>
        <span className="min-w-0 flex-1">
          {item.courseCode && <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{item.courseCode} · Quiz</span>}
          <span className="mt-0.5 line-clamp-2 block text-sm font-medium leading-relaxed">{item.title}</span>
          {!!(meta || item.subtitle) && <span className="mt-1 block truncate text-[11px] text-muted-foreground">{meta || item.subtitle}</span>}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t pt-3">
        <Link href={item.href} className="flex-1 rounded-xl bg-amber-600 py-2 text-center text-xs font-bold text-white transition-colors hover:bg-amber-700">
          Start quiz
        </Link>
        <SaveToFolder payload={savePayload(item, 'quiz')} />
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="mx-auto flex min-h-dvh w-full max-w-2xl items-center justify-center px-4"><p className="text-sm text-muted-foreground">Loading library…</p></div>}>
      <SearchPageInner />
    </Suspense>
  )
}
