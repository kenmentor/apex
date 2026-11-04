'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, ShieldCheck, ShieldOff } from 'lucide-react'
import { getToken, isAdmin } from '@/lib/auth'

function headers() {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

const ROLE_LABEL = { student: 'Normal user', editor: 'Editor', official: 'Official' }

// Admin-only people control: find anyone by email, set their role, grant or
// revoke the admin flag (never your own). Everyone else stays a normal user
// and can neither see this page nor call its APIs (403 either way).
export default function AdminUsersPage() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  async function load(query) {
    setLoading(true)
    setError('')
    try {
      const qs = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''
      const res = await fetch(`/api/admin/users${qs}`, { headers: headers() })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || `Failed (${res.status})`)
      setRows(d.users || [])
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!isAdmin()) { router.replace('/auth'); return }
    load('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { load(q) }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  async function patch(email, body) {
    if (busy) return
    setBusy(email + JSON.stringify(body))
    setError('')
    setDone('')
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH', headers: headers(), body: JSON.stringify({ email, ...body }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || `Failed (${res.status})`)
      setRows(prev => prev.map(r => (r.email === email ? d.user : r)))
      setDone(`${email} updated ✓`)
      setTimeout(() => setDone(''), 2500)
    } catch (e) { setError(e.message) } finally { setBusy('') }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-3 px-4 pb-24 pt-4">
      <div className="flex items-center gap-2">
        <Link href="/admin" aria-label="Back to admin" className="flex size-9 items-center justify-center rounded-lg border hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <h1 className="flex-1 text-xl font-bold">People</h1>
      </div>

      <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by email…" inputMode="email"
          className="w-full bg-transparent text-sm outline-none" />
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-600">{error}</p>}
      {done && <p className="rounded-xl bg-emerald-500/10 p-2.5 text-xs font-bold text-emerald-600">{done}</p>}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {q.trim() ? `No one matches “${q.trim()}”.` : 'No users yet.'}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map(u => (
            <div key={u.email} className="rounded-2xl border bg-card p-3.5">
              <div className="flex items-start gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{u.name || u.email}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{u.email}</span>
                  {(u.department || u.level) && (
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {[u.department, u.level].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </span>
                {u.admin && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-violet-500/15 px-2 py-1 text-[10px] font-bold text-violet-600">
                    <ShieldCheck className="size-3" /> Admin
                  </span>
                )}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t pt-2.5">
                <select value={u.role || 'student'} disabled={!!busy}
                  onChange={e => patch(u.email, { role: e.target.value })}
                  aria-label={`Role for ${u.email}`}
                  className="rounded-lg border bg-background px-2 py-1.5 text-xs font-bold outline-none disabled:opacity-50">
                  {Object.entries(ROLE_LABEL).map(([v, label]) => (
                    <option key={v} value={v}>{label}</option>
                  ))}
                </select>
                {u.admin ? (
                  <button onClick={() => patch(u.email, { admin: false })} disabled={!!busy}
                    className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold text-red-500 hover:bg-red-500/10 disabled:opacity-50">
                    <ShieldOff className="size-3.5" /> Remove admin
                  </button>
                ) : (
                  <button onClick={() => patch(u.email, { admin: true })} disabled={!!busy}
                    className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold text-violet-600 hover:bg-violet-500/10 disabled:opacity-50">
                    <ShieldCheck className="size-3.5" /> Make admin
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="px-1 text-[11px] text-muted-foreground">Editors contribute · officials are verified voices · only admins open this section.</p>
    </div>
  )
}
