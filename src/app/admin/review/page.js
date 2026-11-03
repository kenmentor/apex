'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getToken, isAdmin } from '@/lib/auth'
import { ArrowLeft, Check, X, GitMerge, History, ExternalLink, FileText, HelpCircle, Music, PlayCircle, Image as ImageIcon, Mic, Pencil, RotateCcw } from 'lucide-react'
import { motion } from 'motion/react'
import TikTokTabs from '@/components/TikTokTabs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const ORDER = ['pending', 'conflicts', 'suggest', 'recent']

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
  const [expanded, setExpanded] = useState({})
  const [rejectFor, setRejectFor] = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [dir, setDir] = useState(1)

  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))

  function goTab(v) {
    setDir(ORDER.indexOf(v) >= ORDER.indexOf(tab) ? 1 : -1)
    setTab(v)
  }

  function stepTab(d) {
    const i = ORDER.indexOf(tab)
    const n = Math.min(ORDER.length - 1, Math.max(0, i + d))
    if (ORDER[n] !== tab) goTab(ORDER[n])
  }

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

  async function act(collection, id, action, extra = {}) {
    setBusy(`${collection}:${id}:${action}`)
    try {
      const res = await fetch('/api/admin/review', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ collection, id, action, ...extra }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Action failed')
      setRejectFor(null)
      setRejectNote('')
      await load()
    } catch (e) { setError(e.message) }
    finally { setBusy('') }
  }

  async function suggestAct(s, action) {
    setBusy(`suggestions:${s.id}:${action}`)
    try {
      const res = await fetch('/api/admin/review', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ action: action === 'approve' ? 'suggest-approve' : 'suggest-reject', suggestionId: s.id, note: action === 'reject' ? rejectNote : '' }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Action failed')
      setRejectFor(null)
      setRejectNote('')
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
  const suggestions = data?.suggestions || []

  function HistoryBlock({ item }) {
    if (!item.hasHistory || !item.versions?.length) return null
    const key = `h:${item.collection}:${item.id}`
    return (
      <div className="mt-2 rounded-xl bg-muted/40 p-2">
        <button onClick={() => toggle(key)} className="flex w-full items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
          <History className="size-3.5" /> Version history ({item.versions.length})
        </button>
        {expanded[key] && (
          <div className="mt-1.5 space-y-1.5">
            {[...item.versions].reverse().map(v => (
              <div key={v.v} className="flex items-center gap-2 rounded-lg bg-background px-2 py-1.5 text-[11px]">
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-black">v{v.v}</span>
                <span className="min-w-0 flex-1 truncate">{v.note || '—'}{v.by ? ` · ${v.by}` : ''}{v.at ? ` · ${timeAgo(v.at)}` : ''}</span>
                {v.hasSnapshot && (
                  <button disabled={!!busy} onClick={() => act(item.collection, item.id, 'revert', { versionIndex: v.idx })} title="Restore this version" className="flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold text-amber-600 disabled:opacity-50">
                    <RotateCcw className="size-3" /> Revert
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-4 pb-28 pt-4">
      <div className="flex items-center gap-2">
        <Link href="/admin" aria-label="Back to admin" className="flex size-9 items-center justify-center rounded-lg border hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <h1 className="flex-1 text-lg font-bold">Review queue</h1>
        {(data?.counts?.pending ?? 0) > 0 && (
          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-black text-amber-600">{data.counts.pending} waiting</span>
        )}
      </div>

      <div className="border-b">
        <TikTokTabs
          tabs={[
            { id: 'pending', label: 'Pending', count: pending.length },
            { id: 'conflicts', label: 'Conflicts', count: conflicts.length },
            { id: 'suggest', label: 'Edits', count: suggestions.length },
            { id: 'recent', label: 'Recent' },
          ]}
          active={tab}
          onChange={goTab}
        />
      </div>
      {(() => {
        const bits = []
        if (pending.length) bits.push(`${pending.length} waiting`)
        if (conflicts.length) bits.push(`${conflicts.length} conflict${conflicts.length === 1 ? '' : 's'}`)
        if (suggestions.length) bits.push(`${suggestions.length} suggested edit${suggestions.length === 1 ? '' : 's'}`)
        if (!bits.length) return null
        return <p className="px-1 text-center text-[11px] font-semibold text-muted-foreground">{bits.join(' · ')}</p>
      })()}

      {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-500">{error}</p>}

      <motion.div
        key={tab}
        initial={{ opacity: 0, x: 48 * dir }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 34 }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        onDragEnd={(_, info) => {
          if (info.offset.x < -80) stepTab(1)
          else if (info.offset.x > 80) stepTab(-1)
        }}
      >
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
                  {item.changeNote && <p className="mt-2 text-[11px] text-muted-foreground"><span className="font-bold text-foreground">Contributor note: </span>{item.changeNote}</p>}
                  {!!item.references?.length && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {item.references.map((r, i) => (
                        <a key={i} href={r.url} target="_blank" rel="noreferrer" className="max-w-full truncate rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-primary">↗ {r.label || r.url}</a>
                      ))}
                    </div>
                  )}
                  {!!item.attachments?.length && (
                    <p className="mt-1.5 text-[11px] text-muted-foreground">📎 {item.attachments.map(a => a.name).join(', ')}</p>
                  )}
                  <HistoryBlock item={item} />
                  {rejectFor === bkey ? (
                    <div className="mt-3 space-y-1.5">
                      <input value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Reason (sent to the contributor)…" className="w-full rounded-xl border bg-background px-3 py-2 text-xs outline-none" autoFocus />
                      <div className="grid grid-cols-2 gap-2">
                        <Button size="sm" variant="outline" disabled={!!busy} onClick={() => { setRejectFor(null); setRejectNote('') }}>Cancel</Button>
                        <Button size="sm" disabled={!!busy} onClick={() => act(item.collection, item.id, 'reject', { note: rejectNote })} className="bg-red-600 hover:bg-red-700">
                          {busy === bkey + ':reject' ? '…' : 'Confirm reject'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button size="sm" variant="outline" disabled={!!busy} onClick={() => setRejectFor(bkey)} className="text-red-500">
                        <X className="mr-1 size-3.5" /> Reject
                      </Button>
                      <Button size="sm" disabled={!!busy} onClick={() => act(item.collection, item.id, 'approve')} className="bg-green-600 hover:bg-green-700">
                        {busy === bkey + ':approve' ? '…' : <><Check className="mr-1 size-3.5" /> Approve</>}
                      </Button>
                    </div>
                  )}
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
      ) : tab === 'suggest' ? (
        suggestions.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <p className="text-2xl">✏️</p>
            <p className="mt-2 text-sm font-bold">No suggested edits</p>
            <p className="text-xs text-muted-foreground">Learner-proposed fixes will land here for review.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map(s => {
              const bkey = `suggestions:${s.id}`
              return (
                <Card key={bkey} className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted"><Pencil className="size-4 text-muted-foreground" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{s.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{[s.courseCode, s.topic, s.author ? `by ${s.author}` : null, timeAgo(s.createdAt)].filter(Boolean).join(' · ')}</p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="mt-2 rounded-xl bg-muted/40 px-3 py-2 text-xs"><span className="font-bold">Why: </span>{s.preview?.note || '—'}</p>
                  {!!s.preview?.references?.length && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {s.preview.references.map((r, i) => (
                        <a key={i} href={r.url} target="_blank" rel="noreferrer" className="max-w-full truncate rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-primary">↗ {r.label || r.url}</a>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 space-y-1.5">
                    {(s.preview?.diffs || []).map((d, i) => (
                      <div key={i} className="overflow-hidden rounded-xl border text-xs">
                        <p className="bg-muted/60 px-2.5 py-1 font-black uppercase tracking-wide text-[10px] text-muted-foreground">{d.key}</p>
                        <p className="px-2.5 py-1.5 text-muted-foreground line-through decoration-red-300">{d.from || '(empty)'}</p>
                        <p className="border-t bg-green-500/5 px-2.5 py-1.5 font-medium text-green-700 dark:text-green-400">{d.to || '(empty)'}</p>
                      </div>
                    ))}
                  </div>
                  {rejectFor === bkey ? (
                    <div className="mt-3 space-y-1.5">
                      <input value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Reason (sent to the suggester)…" className="w-full rounded-xl border bg-background px-3 py-2 text-xs outline-none" autoFocus />
                      <div className="grid grid-cols-2 gap-2">
                        <Button size="sm" variant="outline" disabled={!!busy} onClick={() => { setRejectFor(null); setRejectNote('') }}>Cancel</Button>
                        <Button size="sm" disabled={!!busy} onClick={() => suggestAct(s, 'reject')} className="bg-red-600 hover:bg-red-700">Confirm</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button size="sm" variant="outline" disabled={!!busy} onClick={() => setRejectFor(bkey)} className="text-red-500">
                        {busy === bkey ? '…' : <><X className="mr-1 size-3.5" /> Reject</>}
                      </Button>
                      <Button size="sm" disabled={!!busy} onClick={() => suggestAct(s, 'approve')} className="bg-green-600 hover:bg-green-700">
                        {busy === bkey ? '…' : <><Check className="mr-1 size-3.5" /> Apply</>}
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
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
      </motion.div>
    </div>
  )
}
