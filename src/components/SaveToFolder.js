'use client'

import { useState } from 'react'
import { Folder, ChevronRight, X, BookmarkPlus } from 'lucide-react'
import { getToken } from '@/lib/auth'

async function api(path, opts = {}) {
  const t = getToken()
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(opts.headers || {}) },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Failed')
  return data
}

export default function SaveToFolder({ payload, label = 'Save' }) {
  const [open, setOpen] = useState(false)
  const [browseId, setBrowseId] = useState(null)
  const [browse, setBrowse] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function openPicker() {
    setOpen(true)
    setMsg('')
    await load(null)
  }

  async function load(id) {
    try {
      const d = await api(id ? `/api/library?parentId=${id}` : '/api/library')
      setBrowse(d)
      setBrowseId(id)
    } catch (e) { setMsg(e.message) }
  }

  async function saveHere() {
    if (busy) return
    setBusy(true)
    setMsg('')
    try {
      await api('/api/library', {
        method: 'POST',
        body: JSON.stringify({
          kind: 'ref',
          name: payload.name?.slice(0, 120) || 'Saved item',
          parentId: browseId,
          itemKind: payload.itemKind || 'link',
          refId: payload.refId || null,
          href: payload.href || null,
          url: payload.url || null,
          courseCode: payload.courseCode || null,
          subtitle: payload.subtitle || null,
        }),
      })
      setMsg('Saved ✓')
      setTimeout(() => setOpen(false), 600)
    } catch (e) { setMsg(e.message) } finally { setBusy(false) }
  }

  if (!getTokenSafe()) return null

  return (
    <>
      <button onClick={openPicker} className="shrink-0 rounded-lg border px-2 py-1 text-[11px] font-bold text-muted-foreground hover:bg-muted">
        {label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-3xl border-t bg-background p-4 pb-8">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
            <div className="mb-2 flex items-center gap-2">
              <BookmarkPlus className="size-4" />
              <h3 className="flex-1 text-sm font-black">Save to folder</h3>
              <button onClick={() => setOpen(false)} aria-label="Close" className="flex size-8 items-center justify-center rounded-lg hover:bg-muted"><X className="size-4" /></button>
            </div>
            <p className="mb-2 truncate text-xs text-muted-foreground">{payload.name}</p>
            <div className="mb-2 flex items-center gap-1 text-xs">
              <button onClick={() => load(null)} className="font-bold">Folders</button>
              {(browse?.breadcrumb || []).map(b => (
                <span key={b.id} className="flex items-center gap-1 text-muted-foreground"><ChevronRight className="size-3" /><button onClick={() => load(b.id)}>{b.name}</button></span>
              ))}
            </div>
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {(browse?.children || []).filter(c => c.kind === 'folder').map(f => (
                <button key={f.id} onClick={() => load(f.id)} className="flex w-full items-center gap-2 rounded-xl border p-2.5 text-left text-sm hover:bg-muted">
                  <Folder className="size-4 text-muted-foreground" /><span className="flex-1 truncate font-semibold">{f.name}</span><ChevronRight className="size-4 text-muted-foreground" />
                </button>
              ))}
            </div>
            {msg && <p className="mt-2 text-xs font-semibold text-muted-foreground">{msg}</p>}
            <button onClick={saveHere} disabled={busy} className="mt-3 w-full rounded-xl bg-primary py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
              {busy ? 'Saving…' : browseId ? 'Save here' : 'Save to My Folders'}
            </button>
          </div>
        </>
      )}
    </>
  )
}

function getTokenSafe() {
  try { return getToken() } catch { return null }
}
