'use client'

import { useState } from 'react'
import { X, Search, Globe, FileText, Image as ImageIcon, Music, Plus, Check, Loader2 } from 'lucide-react'
import { getToken } from '@/lib/auth'

const TYPES = [
  { id: 'all', label: 'All' },
  { id: 'pdf', label: 'Books & PDFs' },
  { id: 'image', label: 'Images' },
  { id: 'audio', label: 'Audio' },
]

function TypeIcon({ kind }) {
  if (kind === 'pdf') return <FileText className="size-4 text-red-500" />
  if (kind === 'image') return <ImageIcon className="size-4 text-blue-500" />
  if (kind === 'audio') return <Music className="size-4 text-green-500" />
  return <Globe className="size-4 text-muted-foreground" />
}

// Find free books, PDFs, images and audio on the open web and attach them
// to this topic in one tap. Links go through the normal review queue, then
// render in the native readers/players like local uploads.
export default function OnlineFindSheet({ courseCode, topic, programme, onClose, onDone }) {
  const [q, setQ] = useState(topic || '')
  const [type, setType] = useState('all')
  const [items, setItems] = useState(null)
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState(null)
  const [added, setAdded] = useState(new Set())
  const [error, setError] = useState('')

  async function search() {
    const needle = q.trim()
    if (needle.length < 2 || searching) return
    setSearching(true)
    setError('')
    try {
      const r = await fetch(`/api/discover?q=${encodeURIComponent(needle)}&type=${type}`)
      const d = await r.json().catch(() => ({}))
      setItems(Array.isArray(d.items) ? d.items : [])
    } catch {
      setError('Search failed. Try again.')
      setItems([])
    } finally {
      setSearching(false)
    }
  }

  async function add(item) {
    if (adding || added.has(item.id)) return
    setAdding(item.id)
    setError('')
    try {
      const t = getToken()
      const res = await fetch('/api/contribute/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(t ? { Authorization: `Bearer ${t}` } : {}),
        },
        body: JSON.stringify({
          url: item.url,
          title: item.title,
          fileName: item.title,
          courseCode: courseCode || null,
          topic: topic || null,
          itemKind: item.kind,
          programme: programme || '',
          thumb: item.thumb || null,
          changeNote: `Found online (${item.source})`,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || `Failed (${res.status})`)
      setAdded(prev => new Set(prev).add(item.id))
    } catch (e) {
      setError(e.message)
    } finally {
      setAdding(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border bg-card shadow-2xl sm:rounded-3xl">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Globe className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold">Find online</p>
            <p className="truncate text-[11px] text-muted-foreground">
              Free books, PDFs, images & audio{topic ? ` · ${topic}` : ''}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-2 border-b px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="Search free books, PDFs, images…"
              className="w-full rounded-xl border bg-background py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary"
            />
          </div>
          <div className="flex gap-1.5">
            {TYPES.map(t => (
              <button key={t.id} onClick={() => setType(t.id)}
                className={'rounded-full px-3 py-1.5 text-xs font-bold ' + (type === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70')}>
                {t.label}
              </button>
            ))}
            <button onClick={search} disabled={searching || q.trim().length < 2}
              className="ml-auto rounded-full bg-foreground px-4 py-1.5 text-xs font-bold text-background disabled:opacity-50">
              {searching ? '…' : 'Search'}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-500">{error}</p>}
          {items === null && !searching && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Results link straight into the readers — no downloads, no new tabs.
            </p>
          )}
          {searching && (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Searching the open web…
            </div>
          )}
          {items !== null && !searching && items.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">Nothing free found. Try different words.</p>
          )}
          {(items || []).map(item => {
            const done = added.has(item.id)
            const busy = adding === item.id
            return (
              <div key={item.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-muted/50">
                {item.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumb} alt="" loading="lazy" className="size-11 shrink-0 rounded-lg bg-muted object-cover" draggable={false} />
                ) : (
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <TypeIcon kind={item.kind} />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{item.title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {item.kind.toUpperCase()} · {item.source}{item.author ? ` · ${item.author}` : ''}
                  </span>
                </span>
                <button
                  onClick={() => (done ? onDone?.() : add(item))}
                  disabled={busy}
                  className={'flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-extrabold disabled:opacity-50 ' +
                    (done ? 'bg-emerald-500/15 text-emerald-600' : 'bg-primary text-primary-foreground')}
                >
                  {busy ? <Loader2 className="size-3.5 animate-spin" /> : done ? <Check className="size-3.5" /> : <Plus className="size-3.5" strokeWidth={3} />}
                  {done ? 'Added' : busy ? '…' : 'Add'}
                </button>
              </div>
            )
          })}
        </div>

        {added.size > 0 && (
          <div className="border-t p-3">
            <button onClick={() => onDone?.()}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground">
              Done ({added.size} added — pending review)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
