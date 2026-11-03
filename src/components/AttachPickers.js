'use client'

import { useState, useEffect } from 'react'
import { FolderOpen } from 'lucide-react'
import { getToken } from '@/lib/auth'

function api(path, opts = {}) {
  const t = getToken()
  return fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(opts.headers || {}) },
  }).then(async r => {
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d.error || `Failed (${r.status})`)
    return d
  })
}

export function ytThumb(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/)
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null
}

// Inline digital-folder browser (your app folders). Strict kind filter.
export function FolderBrowseInline({ kind, onPick }) {
  const [parentId, setParentId] = useState(null)
  const [crumbs, setCrumbs] = useState([])
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [addedIds, setAddedIds] = useState({})

  useEffect(() => {
    setLoading(true)
    api(parentId ? `/api/library?parentId=${encodeURIComponent(parentId)}` : '/api/library')
      .then(d => {
        setChildren(d.children || [])
        if (d.breadcrumb) setCrumbs(d.breadcrumb)
        else if (!parentId) setCrumbs([])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [parentId])

  const needle = q.trim().toLowerCase()
  const folders = children.filter(c => c.kind === 'folder' && (!needle || String(c.name || '').toLowerCase().includes(needle)))
  const files = children.filter(c => {
    if (c.kind !== 'ref') return false
    if (needle && !String(c.name || '').toLowerCase().includes(needle)) return false
    const k = c.itemKind || 'file'
    if (k === 'draft') return kind === 'notes' && !!c.content
    if (!kind) return !!(c.url || c.href)
    if (kind === 'notes') return ['file', 'notes', 'text'].includes(k) && !!(c.url || c.href)
    return k === kind && !!(c.url || c.href)
  })

  function enter(f) {
    setParentId(f.id)
    setCrumbs(prev => [...prev, { id: f.id, name: f.name }])
    setQ('')
  }

  return (
    <div className="space-y-2 rounded-2xl border p-3">
      <div className="flex flex-wrap items-center gap-1 text-xs font-bold">
        <button onClick={() => { setParentId(null); setCrumbs([]); setQ('') }} className={'rounded-lg px-2 py-1 ' + (!parentId ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>My folders</button>
        {crumbs.map((c, i) => (
          <span key={c.id || i} className="flex items-center gap-1">
            <span className="text-muted-foreground">/</span>
            <button onClick={() => { setParentId(c.id); setCrumbs(crumbs.slice(0, i + 1)); setQ('') }} className="rounded-lg bg-muted px-2 py-1 text-muted-foreground">{String(c.name || 'Folder').slice(0, 16)}</button>
          </span>
        ))}
      </div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search this folder…" className="w-full rounded-xl border bg-background px-3 py-2 text-xs outline-none" />
      {loading ? <p className="py-4 text-center text-xs text-muted-foreground">Opening folders…</p> : (
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {folders.map(f => (
            <button key={f.id} onClick={() => enter(f)} className="flex w-full items-center gap-2 rounded-xl border p-2 text-left hover:bg-muted/60">
              <FolderOpen className="size-4 shrink-0 text-sky-600" />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold">{f.name}</span>
              <span className="text-[11px] font-bold text-muted-foreground">›</span>
            </button>
          ))}
          {files.map(f => {
            const thumb = ytThumb(f.url || f.href)
            const isImg = (f.itemKind === 'image') || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(f.url || f.href || '')
            const isDraft = f.itemKind === 'draft'
            return (
              <div key={f.id} className="flex items-center gap-2 rounded-xl border p-1.5">
                {thumb ? <img src={thumb} alt="" loading="lazy" className="size-10 shrink-0 rounded-lg object-cover" />
                : isImg && (f.url || f.href) ? <img src={f.url || f.href} alt="" loading="lazy" className="size-10 shrink-0 rounded-lg object-cover" />
                : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold">{f.name}</span>
                  {isDraft && <span className="block text-[10px] font-bold text-amber-600">Draft</span>}
                </span>
                <button onClick={() => { onPick(isDraft ? { name: f.name, content: f.content, draftId: f.id, itemKind: 'draft', courseCode: f.courseCode, topic: f.topic } : { name: f.name, url: f.url || f.href, thumb, itemKind: f.itemKind, courseCode: f.courseCode }); setAddedIds(p => ({ ...p, [f.id]: true })); setTimeout(() => setAddedIds(p => ({ ...p, [f.id]: false })), 1500) }} className={'shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold ' + (addedIds[f.id] ? 'bg-green-100 text-green-700' : 'bg-primary text-primary-foreground')}>
                  {addedIds[f.id] ? (isDraft ? 'Opened ✓' : 'Added ✓') : (isDraft ? 'Open' : 'Add')}
                </button>
              </div>
            )
          })}
          {!folders.length && !files.length && <p className="py-4 text-center text-xs text-muted-foreground">Empty here — open another folder.</p>}
        </div>
      )}
    </div>
  )
}

// Flat "From library" list — everything you already uploaded, newest first.
// Strict kind filter.
export function LibraryListInline({ kind, onPick }) {
  const [q, setQ] = useState('')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [addedIds, setAddedIds] = useState({})
  useEffect(() => {
    api('/api/contribute/my-files')
      .then(d => setFiles(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])
  const needle = q.trim().toLowerCase()
  const rows = files.filter(f => {
    if (needle && !String(f.name || '').toLowerCase().includes(needle)) return false
    if (!kind) return true
    if (kind === 'notes') return ['file', 'notes', 'text'].includes(f.kind)
    return f.kind === kind
  })
  return (
    <div className="space-y-2 rounded-2xl border p-3">
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search your library…" className="w-full rounded-xl border bg-background px-3 py-2 text-xs outline-none" />
      {loading ? <p className="py-4 text-center text-xs text-muted-foreground">Loading your library…</p>
      : rows.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">Nothing here yet — upload fresh first.</p> : (
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {rows.map(f => {
            const thumb = ytThumb(f.url)
            const isImg = f.kind === 'image' || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(f.url || '')
            return (
              <div key={f.id} className="flex items-center gap-2 rounded-xl border p-1.5">
                {thumb ? <img src={thumb} alt="" loading="lazy" className="size-10 shrink-0 rounded-lg object-cover" />
                : isImg && f.url ? <img src={f.url} alt="" loading="lazy" className="size-10 shrink-0 rounded-lg object-cover" />
                : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold">{f.name}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{[f.courseCode, f.kind].filter(Boolean).join(' · ')}</span>
                </span>
                <button onClick={() => { onPick({ name: f.name, url: f.url, thumb, itemKind: f.kind, courseCode: f.courseCode }); setAddedIds(p => ({ ...p, [f.id]: true })); setTimeout(() => setAddedIds(p => ({ ...p, [f.id]: false })), 1500) }} className={'shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold ' + (addedIds[f.id] ? 'bg-green-100 text-green-700' : 'bg-primary text-primary-foreground')}>
                  {addedIds[f.id] ? 'Added ✓' : 'Add'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
