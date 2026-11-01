'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getToken, isAdmin } from '@/lib/auth'
import { ArrowLeft, Check, X, GitMerge, History, Inbox, AlertTriangle, ExternalLink, FileText, HelpCircle, Music, PlayCircle, Image as ImageIcon, Mic } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

function getAuthHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

const KIND_ICON = {
  video: PlayCircle, audio: Music, pdf: FileText, image: ImageIcon,
  notes: FileText, file: FileText, link: ExternalLink, viva: Mic, osce: FileText,
  sba: HelpCircle, mtf: HelpCircle, tf: HelpCircle, multi: HelpCircle,
  fib: HelpCircle, match: HelpCircle, assertion: HelpCircle,
  case: FileText, saq: FileText, essay: FileText, meq: FileText,
  spotter: ImageIcon, quiz: HelpCircle,
}

function timeAgo(iso) {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function Preview({ item }) {
  const p = item.preview || {}
  if (item.collection === 'questions') {
    return (
      <div className="space-y-1.5 text-sm">
        <p className="font-medium leading-relaxed">{p.question}</p>
        {p.options && (
          <div className="space-y-1">
            {Object.entries(p.options).map(([k, v]) => {
              const correct = Array.isArray(p.correctAnswer) ? p.correctAnswer.map(String) : p.correctAnswer && typeof p.correctAnswer === 'object' ? Object.keys(p.correctAnswer).filter(key => String(p.correctAnswer[key]) === 'true') : [String(p.correctAnswer ?? '')]
              const isC = correct.map(c => c.toLowerCase()).includes(k.toLowerCase());
              return (
                <div key={k} className={`flex items-center gap-2 rounded-lg px-2 py-1 text-[13px] ${isC ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-muted/60'}`}>
                  <span className="font-black">{k}.</span><span className="flex-1">{v}</span>{isC && <span>✓</span>}
                </div>
              );
            })}
          </div>
        )}
        {p.blankAnswers && <p className="text-xs text-muted-foreground">Accepts: {p.blankAnswers.join(' · ')}</p>}
        {p.pairs && <p className="text-xs text-muted-foreground">{p.pairs.length} pairs: {p.pairs.slice(0, 3).map(x => `${String(x.stem || '').slice(0, 24)}→${x.answer}`).join(' · ')}{p.pairs.length > 3 ? '…' : ''}</p>}
        {p.explanation && <p className="text-xs text-muted-foreground"><strong>Why: </strong>{p.explanation}</p>}
      </div>
    )
  }
  if (item.collection === 'readings') {
    return <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{p.snippet || '(empty)'}{p.content && p.content.length > 400 ? '…' : ''}</p>
  }
  return (
    <div className="flex items-center gap-3">
      {p.url && (/\.(png|jpe?g|gif|webp)(\?|$)/i.test(p.url) ? (
        <img src={p.url} alt="" loading="lazy" className="size-14 shrink-0 rounded-lg object-cover" />
      ) : null)}
      <div className="min-w-0 text-sm">
        <p className="truncate font-semibold">{p.fileName || item.title}</p>
        <p className="truncate text-xs text-muted-foreground">{[p.itemKind, p.mime, p.size ? `${Math.round(p.size / 1024)} KB` : null].filter(Boolean).join(' · ')}</p>
        {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary">Open file ↗</a>}
      </div>
    </div>
  )
}

function StatusBadge({ status, live }) {
  if (live) return <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-green-600">live</span>
  const map = {
    pending: 'bg-amber-500/15 text-amber-600',
    approved: 'bg-green-500/15 text-green-600',
    rejected: 'bg-red-500/15 text-red-600',
    revoked: 'bg-muted text-muted-foreground',
  }
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${map[status] || 'bg-muted text-muted-foreground'}`}>{status}</span>
}

export default function ReviewPage() {
  const router = useRouter()
  const [tab, setTab] = useState('pending')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [keepMap, setKeepMap] = useState({})
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/review', { headers: getAuthHeaders() })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to load')
      setData(d)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (!isAdmin()) { router.push('/auth'); return }
    load()
  }, [])

  async function act(collection, id, action) {
    setBusy(`${collection}:${id}:${action}`)
    try {
      const res = await fetch('/api/admin/review', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ collection, id, action }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Action failed')
      await load()
    } catch (e) { setError(e.message) }
    finally { setBusy('') }
  }

  async function merge(group, gi) {
    const keepId = keepMap[gi] || group.find(i => !i.live)?.id || group[0].id
    const keeper = group.find(i => i.id === keepId) || group[0]
    const dropIds = group.filter(i => i.id !== keepId && !i.live && i.collection === keeper.collection).map(i => i.id)
    setBusy(`merge:${gi}`)
    try {
      const res = await fetch('/api/admin/review', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ collection: keeper.collection, action: 'merge', keepId, dropIds }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Merge failed')
      await load()
    } catch (e) { setError(e.message) }
    finally { setBusy('') }
  }

  const pending = data?.pending || []
  const conflicts = data?.conflicts || []
  const recent = data?.recent || []

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-4 pb-28 pt-4">
      <div className="flex items-center gap-2">
        <Link href="/admin" aria-label="Back to admin" className="flex size-9 items-center justify-center rounded-lg border hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <h1 className="flex-1 text-lg font-bold">Review queue</h1>
        {(data?.counts?.pending ?? 0) > 0 && (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-black text-amber-600">{data.counts.pending} waiting</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
        {[
          { id: 'pending', label: `Pending (${pending.length})`, icon: Inbox },
          { id: 'conflicts', label: `Conflicts (${conflicts.length})`, icon: AlertTriangle },
          { id: 'recent', label: 'Recent', icon: History },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-black ${tab === t.id ? 'bg-background shadow' : 'text-muted-foreground'}`}>
            <t.icon className="size-3.5" />{t.label}
          </button>
        ))}
      </div>

      {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500">{error}</p>}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>
      ) : tab === 'pending' ? (
        pending.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <p className="text-2xl">✅</p>
            <p className="mt-2 text-sm font-bold">Queue clear</p>
            <p className="text-xs text-muted-foreground">New editor publishes will land here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(item => {
              const Icon = KIND_ICON[item.kind] || HelpCircle
              const bkey = `${item.collection}:${item.id}`
              return (
                <Card key={bkey} className="p-4">
                  <div className="flex items-start gap-2.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted"><Icon className="size-4 text-muted-foreground" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm font-bold">{item.title}</p>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {[item.courseCode, item.topic, item.author ? `by ${item.author}` : null, timeAgo(item.createdAt)].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl bg-muted/40 p-3">
                    <Preview item={item} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act(item.collection, item.id, 'reject')} className="text-red-500">
                      {busy === bkey + ':reject' ? '…' : <><X className="mr-1 size-3.5" /> Reject</>}
                    </Button>
                    <Button size="sm" disabled={!!busy} onClick={() => act(item.collection, item.id, 'approve')} className="bg-green-600 hover:bg-green-700">
                      {busy === bkey + ':approve' ? '…' : <><Check className="mr-1 size-3.5" /> Approve</>}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      ) : tab === 'conflicts' ? (
        conflicts.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <p className="text-2xl">🔍</p>
            <p className="mt-2 text-sm font-bold">No conflicts</p>
            <p className="text-xs text-muted-foreground">Items that look like duplicates will be grouped here side-by-side.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {conflicts.map((group, gi) => (
              <Card key={gi} className="overflow-hidden p-0">
                <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2">
                  <GitMerge className="size-4 text-muted-foreground" />
                  <p className="flex-1 text-xs font-black">Possible duplicate · {group[0]?.courseCode || 'General'} ({group.length})</p>
                </div>
                <div className={`grid gap-2 p-3 ${group.length > 2 ? '' : 'sm:grid-cols-2'}`}>
                  {group.map(item => {
                    const Icon = KIND_ICON[item.kind] || HelpCircle
                    const keepId = keepMap[gi] || group.find(i => !i.live)?.id || group[0].id
                    const checked = keepId === item.id
                    return (
                      <div key={`${item.collection}:${item.id}`} className={`space-y-2 rounded-xl border p-3 ${checked ? 'border-green-500 bg-green-500/5' : ''}`}>
                        <label className="flex cursor-pointer items-center gap-2">
                          {!item.live && (
                            <input type="radio" name={`keep-${gi}`} checked={checked}
                              onChange={() => setKeepMap(m => ({ ...m, [gi]: item.id }))} className="size-4 accent-green-600" />
                          )}
                          <Icon className="size-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate text-xs font-bold">{item.title}</span>
                          <StatusBadge status={item.status} live={item.live} />
                        </label>
                        <p className="truncate text-[11px] text-muted-foreground">{[item.topic, item.author ? `by ${item.author}` : null, timeAgo(item.createdAt), item.collection].filter(Boolean).join(' · ')}</p>
                        <div className="max-h-40 overflow-y-auto rounded-lg bg-muted/40 p-2">
                          <Preview item={item} />
                        </div>
                        {!item.live && (
                          <div className="grid grid-cols-2 gap-1.5">
                            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => act(item.collection, item.id, 'reject')} className="h-8 text-xs text-red-500">Reject</Button>
                            <Button size="sm" disabled={!!busy} onClick={() => act(item.collection, item.id, 'approve')} className="h-8 bg-green-600 text-xs hover:bg-green-700">Approve</Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="border-t p-3">
                  <Button disabled={!!busy} onClick={() => merge(group, gi)} className="w-full bg-green-600 hover:bg-green-700">
                    {busy === `merge:${gi}` ? 'Merging…' : <><GitMerge className="mr-1.5 size-4" /> Merge — keep selected, reject the rest</>}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        recent.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-xs text-muted-foreground">No decisions yet.</p>
        ) : (
          <div className="space-y-2">
            {recent.map(item => {
              const Icon = KIND_ICON[item.kind] || HelpCircle
              const bkey = `${item.collection}:${item.id}`
              return (
                <div key={bkey} className="flex items-center gap-2.5 rounded-xl border bg-card p-2.5">
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold">{item.title}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">{[item.courseCode, item.reviewedBy ? `by ${item.reviewedBy}` : null, timeAgo(item.reviewedAt)].filter(Boolean).join(' · ')}</span>
                  </span>
                  <StatusBadge status={item.status} />
                  {item.status === 'approved' && (
                    <button disabled={!!busy} onClick={() => act(item.collection, item.id, 'revoke')} className="shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-bold text-red-500 disabled:opacity-50">
                      {busy === bkey + ':revoke' ? '…' : 'Revoke'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  )
}
