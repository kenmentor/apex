'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, X } from 'lucide-react'
import { getToken, isAdmin } from '@/lib/auth'

function headers() {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

function timeAgo(iso) {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// Admin triage for contributor requests: approve flips the user to editor
// on the spot and tells them; decline just tells them. Admins only —
// everyone else never sees this page (or the APIs behind it).
export default function AdminRequestsPage() {
  const router = useRouter()
  const [filter, setFilter] = useState('pending')
  const [rows, setRows] = useState([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  async function load(f) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/contribute/requests?status=${encodeURIComponent(f)}`, { headers: headers() })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || `Failed (${res.status})`)
      setRows(d.requests || [])
      setPendingCount(d.pendingCount || 0)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!isAdmin()) { router.replace('/auth'); return }
    load(filter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  async function decide(email, action) {
    if (busy) return
    setBusy(email + action)
    setError('')
    try {
      const res = await fetch('/api/contribute/requests', {
        method: 'PATCH', headers: headers(), body: JSON.stringify({ email, action }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || `Failed (${res.status})`)
      load(filter)
    } catch (e) { setError(e.message) } finally { setBusy('') }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-3 px-4 pb-24 pt-4">
      <div className="flex items-center gap-2">
        <Link href="/admin" aria-label="Back to admin" className="flex size-9 items-center justify-center rounded-lg border hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <h1 className="flex-1 text-xl font-bold">Contributor requests</h1>
        {pendingCount > 0 && (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-600">{pendingCount} pending</span>
        )}
      </div>

      <div className="flex gap-5 overflow-x-auto border-b px-1 text-sm font-bold">
        {['pending', 'approved', 'declined', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={'shrink-0 pb-2 capitalize ' + (filter === f ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground')}>
            {f}
          </button>
        ))}
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-600">{error}</p>}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {filter === 'pending' ? 'No one waiting — requests land here the second they ask.' : `No ${filter} requests.`}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map(r => (
            <div key={r.id} className="rounded-2xl border bg-card p-3.5">
              <div className="flex items-start gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{r.name || r.email}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{r.email}</span>
                  {(r.department || r.level) && (
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {[r.department, r.level].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  {r.note && <span className="mt-1 block text-xs italic leading-relaxed">“{r.note}”</span>}
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {timeAgo(r.createdAt)}{r.status !== 'pending' && ` · ${r.status}${r.decidedBy ? ` by ${r.decidedBy}` : ''}`}
                  </span>
                </span>
                {r.status === 'pending' && (
                  <span className="flex shrink-0 gap-1.5">
                    <button onClick={() => decide(r.email, 'decline')} disabled={!!busy}
                      aria-label="Decline" className="flex size-9 items-center justify-center rounded-xl border text-red-500 hover:bg-red-500/10 disabled:opacity-50">
                      <X className="size-4" />
                    </button>
                    <button onClick={() => decide(r.email, 'approve')} disabled={!!busy}
                      aria-label="Approve as editor" className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                      <Check className="size-4" strokeWidth={3} />
                    </button>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
