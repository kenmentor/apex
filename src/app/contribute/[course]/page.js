'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lock, Plus, ChevronDown, PlayCircle, FileText, ClipboardList, Music, Zap, GraduationCap, X, BookOpen, Globe } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import TikTokTabs from '@/components/TikTokTabs'
import { getUser, getToken } from '@/lib/auth'
import { fetchJson, TTL } from '@/lib/fetch-json'
import { colorFor } from '@/lib/plan-colors'
import { pdfReadHref } from '@/lib/reader'
import AddSheet from '@/components/ContributeAdd'
import OnlineFindSheet from '@/components/OnlineFindSheet'

const TABS = [
  { id: 'video', label: 'Video' },
  { id: 'audio', label: 'Audio' },
  { id: 'text', label: 'Text' },
  { id: 'pdf', label: 'PDF' },
  { id: 'quiz', label: 'Quiz' },
]

function ytId(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/)
  return m ? m[1] : null
}

async function api(path, opts = {}) {
  const t = getToken()
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(opts.headers || {}) },
  })
  const d = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(d.error || `Failed (${res.status})`)
  return d
}

// Contributor clone: compact validation view. Same course, same tabs, but
// rows are shrunken (checks replaced by + add buttons) because this screen
// is for quick validation, not consumption. Videos lead.
export default function ContributeCoursePage({ params }) {
  const { course: slug } = use(params)
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [content, setContent] = useState(null)
  const [titles, setTitles] = useState({})
  const [tab, setTab] = useState('video')
  const [openTopic, setOpenTopic] = useState(null)
  const [addFor, setAddFor] = useState(null)
  const [findOnline, setFindOnline] = useState(false)
  const [showNewTopic, setShowNewTopic] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const u = getUser()
    setUser(u)
    setReady(true)
    fetchJson(`/api/course-content?course=${encodeURIComponent(slug)}`, { token: getToken(), ttl: TTL.list })
      .then(d => { if (d.courseCode) setContent(d) })
      .catch(() => {})
  }, [slug])

  // Deep link from empty topics ("Add video / Add note"): ?topic=<title>&tab=<kind>&add=1
  // preselects the topic + tab and opens the add sheet immediately.
  useEffect(() => {
    if (!content?.topics?.length) return
    let sp
    try { sp = new URLSearchParams(window.location.search) } catch { return }
    const tabParam = (sp.get('tab') || '').toLowerCase()
    const validTab = TABS.some(t => t.id === tabParam) ? tabParam : null
    if (validTab) setTab(validTab)
    const topicParam = (sp.get('topic') || '').trim()
    if (!topicParam) return
    const hit = content.topics.find(t => String(t.title || '').trim().toLowerCase() === topicParam.toLowerCase())
    const kind = validTab || tab
    if (hit) {
      setOpenTopic(hit.id)
      if (sp.get('add') === '1') setAddFor({ topic: hit.title, kind })
    } else if (sp.get('add') === '1') {
      setAddFor({ topic: topicParam, kind })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  if (!ready) return <div className="flex min-h-dvh items-center justify-center pb-24"><p className="text-sm text-muted-foreground">Opening contributor view…</p></div>

  const role = user?.role || 'student'
  const allowed = !!user && (!!user.admin || role === 'editor' || role === 'official' || role === 'admin')
  const code = content?.courseCode || String(slug || '').toUpperCase()
  const color = colorFor(code)
  const topics = content?.topics || []
  const prog = (course) => String(course || '').replace(/\s+/g, '').replace(/^([A-Z]+).*/, '$1')

  async function createTopic() {
    const title = newTitle.trim()
    if (title.length < 3) { setError('Give the topic a title'); return }
    setBusy(true)
    setError('')
    try {
      await api('/api/contribute/topics', { method: 'POST', body: JSON.stringify({ courseCode: code, title }) })
      setNewTitle('')
      setShowNewTopic(false)
      window.location.reload()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-4 pb-24 pt-6">
        <div className="flex items-center gap-2">
          <Link href="/contribute" className="flex size-9 items-center justify-center rounded-lg border hover:bg-muted"><ArrowLeft className="size-4" /></Link>
          <h1 className="flex-1 text-xl font-bold">Contributor</h1>
        </div>
        <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">Sign in to manage content.</p>
      </div>
    )
  }

  if (!allowed) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-4 pb-24 pt-6">
        <div className="flex items-center gap-2">
          <Link href="/contribute" className="flex size-9 items-center justify-center rounded-lg border hover:bg-muted"><ArrowLeft className="size-4" /></Link>
          <h1 className="flex-1 text-xl font-bold">Contributor</h1>
        </div>
        <div className="rounded-2xl border p-6 text-center">
          <Lock className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-bold">Contributors only</p>
          <p className="mt-1 text-xs text-muted-foreground">Ask an admin to set your role to editor and this hub will unlock.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-4 pb-28 pt-4">
      <div className="flex items-center gap-2">
        <Link href="/contribute" className="flex size-9 items-center justify-center rounded-lg border hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <h1 className="min-w-0 flex-1 truncate text-sm font-bold">{code} · Contributor</h1>
        <button onClick={() => setFindOnline(true)} aria-label="Find free books and media online" title="Find online"
          className="flex size-9 shrink-0 items-center justify-center rounded-full border hover:bg-muted">
          <Globe className="size-4" />
        </button>
        <button onClick={() => setAddFor({ topic: null, kind: tab })} aria-label="Add content to course"
          className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
          <Plus className="size-5" strokeWidth={2.5} />
        </button>
      </div>

      <div className="rounded-3xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)` }}>
        <p className="text-2xl font-extrabold">{code}</p>
        <p className="truncate text-xs text-white/75">{titles[code] || `${topics.length} topics · validation view`}</p>
      </div>

      <div className="border-b">
        <TikTokTabs tabs={TABS.map(t => ({ id: t.id, label: t.label }))} active={tab} onChange={setTab} />
      </div>

      <div>
        <button onClick={() => setShowNewTopic(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed py-3 text-sm font-bold text-muted-foreground hover:bg-muted/50">
          <Plus className="size-4" /> New topic
        </button>
      </div>

      <div className="divide-y divide-border">
        {topics.map(t => {
          const items = (t.tabs?.[tab === 'quiz' ? 'quiz' : tab] || [])
          const counts = t.counts || {}
          const expanded = openTopic === t.id
          return (
            <div key={t.id} className="py-1">
              <div className="flex items-center gap-2 px-1 py-2">
                <button onClick={() => setAddFor({ topic: t.title, kind: tab })} aria-label={`Add to ${t.title}`}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20">
                  <Plus className="size-4" strokeWidth={3} />
                </button>
                <button onClick={() => setOpenTopic(expanded ? null : t.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold">{t.title}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {(() => {
                        if (tab === 'quiz') return 'Quiz bank';
                        const n = counts[tab] || 0;
                        const noun = tab === 'video' ? (n === 1 ? 'video' : 'videos') : tab === 'audio' ? 'audio' : tab === 'pdf' ? 'PDFs' : 'texts';
                        return n ? `${n} ${noun}` : `Empty — tap + to add the first ${tab}`;
                      })()}
                    </span>
                  </span>
                  <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {expanded && (
                <div className="pb-2 pl-11">
                  {tab === 'quiz' ? (
                    <Link href={`/courses/${String(code).toLowerCase().replace(/\s+/g, '')}/quiz`}
                      className="flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-2.5 text-sm font-bold text-white">
                      <GraduationCap className="size-4" /> Open {code} quiz bank
                    </Link>
                  ) : items.length === 0 ? (
                    <p className="rounded-xl bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">Nothing here yet — tap + to add the first {tab}.</p>
                  ) : (
                    <div className="space-y-1">
                      {items.map(item => <CompactRow key={item.id} item={item} />)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {topics.length === 0 && (
          <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">No topics yet — add the first one above.</p>
        )}
      </div>

      {addFor && (
        <AddSheet
          courseCode={code}
          topic={addFor.topic}
          kind={addFor.kind || tab}
          programme={prog(code)}
          onClose={() => setAddFor(null)}
          onDone={() => { setAddFor(null); window.location.reload() }}
        />
      )}
      {findOnline && (
        <OnlineFindSheet
          courseCode={code}
          topic={null}
          programme={prog(code)}
          onClose={() => setFindOnline(false)}
          onDone={() => { setFindOnline(false); window.location.reload() }}
        />
      )}

      {showNewTopic && (
        <div>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => !busy && setShowNewTopic(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-3xl border-t bg-background p-4 pb-8">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
            <div className="mb-3 flex items-center gap-2">
              <h2 className="flex-1 text-base font-black">New topic in {code}</h2>
              <button onClick={() => !busy && setShowNewTopic(false)} aria-label="Close" className="flex size-8 items-center justify-center rounded-lg hover:bg-muted"><X className="size-4" /></button>
            </div>
            <div className="space-y-2">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Topic title (e.g. Demand & Supply)" className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-bold outline-none" autoFocus />
              {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
              <button disabled={busy} onClick={createTopic} className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
                {busy ? 'Adding…' : 'Add topic'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CompactRow({ item }) {
  const vid = item.kind === 'video' || (item.url && item.url.includes('youtu'))
  const thumb = item.thumb || (item.url ? (ytId(item.url) ? `https://img.youtube.com/vi/${ytId(item.url)}/hqdefault.jpg` : null) : null)
  const readerHref = item.kind === 'pdf' ? pdfReadHref({ url: item.url, title: item.title }) : null
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-muted/40 p-2">
      {thumb ? (
        <span className="relative block h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-black">
          <img src={thumb} alt="" loading="lazy" className="size-full object-cover" draggable={false} />
        </span>
      ) : vid ? (
        <PlayCircle className="size-4 shrink-0 text-muted-foreground" />
      ) : item.kind === 'audio' ? (
        <Music className="size-4 shrink-0 text-muted-foreground" />
      ) : item.kind === 'pdf' ? (
        <FileText className="size-4 shrink-0 text-muted-foreground" />
      ) : (
        <BookOpen className="size-4 shrink-0 text-muted-foreground" />
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="block truncate text-[13px] font-semibold">{item.title}</span>
          {item.underReview && (
            <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-px text-[9px] font-black uppercase tracking-wide text-amber-600">
              Under review
            </span>
          )}
        </span>
        {item.url && <span className="block truncate text-[10px] text-muted-foreground">{hostOf(item.url)}</span>}
      </span>
      {item.url ? (
        readerHref ? (
          <Link href={readerHref} className="shrink-0 text-[11px] font-bold text-primary">Read</Link>
        ) : (
          <a href={item.url} target="_blank" rel="noreferrer" className="shrink-0 text-[11px] font-bold text-primary">Open</a>
        )
      ) : (
        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">bank</span>
      )}
    </div>
  )
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}
