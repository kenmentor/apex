'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileText, AlertTriangle } from 'lucide-react'
import { isAdmin, getToken } from '@/lib/auth'

function Card({ children }) {
  return <div className="rounded-2xl border bg-card p-4">{children}</div>
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-0">
      <span className="min-w-0 flex-1 truncate font-medium capitalize">{label}</span>
      <span className="shrink-0 font-bold tabular-nums">{value}</span>
    </div>
  )
}

// What the bank actually holds: uploads by kind, notes written, videos watched.
export default function ContentPage() {
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

  const uploads = (data?.uploadsByKind || []).reduce((a, u) => a + u.n, 0)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-4 pb-24 pt-4">
      <div className="flex items-center gap-2">
        <Link href="/admin/analytics" aria-label="Back to stats" className="flex size-9 items-center justify-center rounded-lg border hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">Content</h1>
          <p className="text-[11px] text-muted-foreground">What the bank holds and what gets used</p>
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
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="mx-auto size-8 text-red-500" />
          <p className="mt-2 text-sm font-bold">Content didn’t load</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-3 rounded-xl border px-4 py-2 text-xs font-bold">Retry</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Card><p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Uploads</p><p className="text-2xl font-extrabold tabular-nums">{uploads}</p></Card>
            <Card><p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Notes</p><p className="text-2xl font-extrabold tabular-nums">{data.notesCreated || 0}</p><p className="text-[11px] text-muted-foreground">written</p></Card>
            <Card><p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Plays</p><p className="text-2xl font-extrabold tabular-nums">{data.videoPlays || 0}</p><p className="text-[11px] text-muted-foreground">videos</p></Card>
          </div>
          <div>
            <h2 className="mb-1 flex items-center gap-1.5 px-1 text-sm font-bold"><FileText className="size-4 text-muted-foreground" /> Uploads by kind</h2>
            <Card>
              {(data.uploadsByKind?.length) ? data.uploadsByKind.map(u => <Row key={u.kind} label={u.kind} value={u.n} />)
                : <p className="py-4 text-center text-xs text-muted-foreground">No uploads in this range.</p>}
            </Card>
          </div>
          {(data.videoByCourse?.length > 0) && (
            <div>
              <h2 className="mb-1 px-1 text-sm font-bold">Most-watched courses</h2>
              <Card>
                {data.videoByCourse.slice(0, 5).map(q => <Row key={q.course} label={q.course} value={`${q.n} plays`} />)}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
