'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, AlertTriangle } from 'lucide-react'
import { isAdmin, getToken } from '@/lib/auth'

function Card({ children }) {
  return <div className="rounded-2xl border bg-card p-4">{children}</div>
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-0">
      <span className={`min-w-0 flex-1 truncate ${mono ? 'font-mono text-[13px]' : 'font-medium'}`}>{label}</span>
      <span className="shrink-0 font-bold tabular-nums">{value}</span>
    </div>
  )
}

// Every query people typed + the ones that found nothing (your content gaps).
export default function SearchesPage() {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [range, setRange] = useState('7d')

  useEffect(() => {
    if (!isAdmin()) { router.push('/auth'); return }
    setLoading(true)
    setError('')
    const t = getToken()
    fetch(`/api/analytics?range=${range}`, { headers: t ? { Authorization: `Bearer ${t}` } : {} })
      .then(async r => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d.error || `Failed (${r.status})`)
        setData(d)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [range, router])

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-4 pb-24 pt-4">
      <div className="flex items-center gap-2">
        <Link href="/admin/analytics" aria-label="Back to stats" className="flex size-9 items-center justify-center rounded-lg border hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">Searches</h1>
          <p className="text-[11px] text-muted-foreground">What people look for — and what’s missing</p>
        </div>
        <div className="flex shrink-0 gap-1 rounded-full border bg-card p-0.5 text-xs font-bold">
          {['24h', '7d', '30d'].map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={'rounded-full px-2.5 py-1 ' + (range === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="mx-auto size-8 text-red-500" />
          <p className="mt-2 text-sm font-bold">Searches didn’t load</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-3 rounded-xl border px-4 py-2 text-xs font-bold">Retry</button>
        </div>
      ) : (
        <>
          <div>
            <h2 className="mb-1 flex items-center gap-1.5 px-1 text-sm font-bold"><Search className="size-4 text-muted-foreground" /> Top queries</h2>
            <Card>
              {(data.topSearches?.length) ? data.topSearches.map(s => (
                <Row key={s.q} label={s.q} value={`${s.n}× · ~${s.avgResults}`} mono />
              )) : <p className="py-4 text-center text-xs text-muted-foreground">No searches yet.</p>}
            </Card>
          </div>
          <div>
            <h2 className="mb-1 px-1 text-sm font-bold text-amber-600">Dead ends — content to make</h2>
            <Card>
              {(data.zeroSearches?.length) ? data.zeroSearches.map(s => (
                <Row key={s.q} label={s.q} value={`${s.n}×`} mono />
              )) : <p className="py-4 text-center text-xs text-muted-foreground">No dead ends. Everything people want exists.</p>}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
