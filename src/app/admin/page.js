'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, isAdmin } from '@/lib/auth'
import Link from 'next/link'
import {
  ArrowLeft, BarChart3, Users, RefreshCw, Smartphone, Monitor, Download,
  Clock, Layers, MousePointerClick, Zap, Activity, Eye, FileText, TrendingUp,
  Pencil, Trash2, Bell,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'

const CRUD_TABS = [
  { key: 'categories', label: 'Categories' },
  { key: 'courses', label: 'Courses' },
  { key: 'questions', label: 'Questions' },
  { key: 'videos', label: 'Videos' },
  { key: 'readings', label: 'Readings' },
  { key: 'feedback', label: 'Feedback' },
]

function getAuthHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

function MetricCard({ icon: Icon, label, value, sub, color, href }) {
  const inner = (
    <CardContent className="p-3">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className={`mt-0.5 text-xl font-bold ${color || 'text-foreground'}`}>{value}</div>
          {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
        </div>
        {Icon && (
          <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${color ? color.replace('text-', 'bg-').replace('foreground', 'muted') : 'bg-muted'} opacity-60`}>
            <Icon className="size-4 text-muted-foreground" />
          </div>
        )}
      </div>
    </CardContent>
  )
  if (href) return <Link href={href}><Card className="overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors">{inner}</Card></Link>
  return <Card className="overflow-hidden">{inner}</Card>
}

function Bar({ value, max, color = 'bg-primary' }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState('overview')
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editDoc, setEditDoc] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [dash, setDash] = useState(null)

  useEffect(() => {
    if (!isAdmin()) { router.push('/auth'); return }
    if (tab === 'overview') {
      loadDashboard()
    } else {
      loadDocs()
    }
  }, [tab])

  async function loadDashboard() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/dashboard')
      const data = await res.json()
      setDash(data)
    } catch {}
    setLoading(false)
  }

  async function loadDocs() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/${tab}`, { headers: getAuthHeaders() })
      const data = await res.json()
      setDocs(data.docs || [])
    } catch { setDocs([]) }
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this item?')) return
    try {
      await fetch(`/api/admin/${tab}/${id}`, { method: 'DELETE', headers: getAuthHeaders() })
      loadDocs()
    } catch { setMessage('Delete failed') }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    const form = new FormData(e.target)
    const data = Object.fromEntries(form.entries())
    if (data.options) {
      try { data.options = JSON.parse(data.options) }
      catch { setMessage('Options must be valid JSON'); setSaving(false); return }
    }
    try {
      const url = editDoc?._id ? `/api/admin/${tab}/${editDoc._id}` : `/api/admin/${tab}`
      const res = await fetch(url, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Save failed')
      setEditDoc(null)
      setMessage('Saved!')
      loadDocs()
    } catch (err) { setMessage(err.message) }
    setSaving(false)
  }

  function renderForm() {
    const fields = {
      categories: [
        { name: 'code', label: 'Code', required: true },
        { name: 'title', label: 'Title', required: true },
        { name: 'color', label: 'Color' },
      ],
      courses: [
        { name: 'code', label: 'Course Code', required: true },
        { name: 'title', label: 'Title', required: true },
        { name: 'description', label: 'Description' },
        { name: 'color', label: 'Color' },
      ],
      questions: [
        { name: 'courseCode', label: 'Course Code', required: true },
        { name: 'section', label: 'Section' },
        { name: 'question', label: 'Question', required: true },
        { name: 'options', label: 'Options (JSON object)', required: true },
        { name: 'correctAnswer', label: 'Correct Answer', required: true },
        { name: 'explanation', label: 'Explanation' },
      ],
      videos: [
        { name: 'courseCode', label: 'Course Code', required: true },
        { name: 'title', label: 'Title', required: true },
        { name: 'url', label: 'YouTube URL', required: true },
        { name: 'description', label: 'Description' },
        { name: 'order', label: 'Order' },
      ],
      readings: [
        { name: 'courseCode', label: 'Course Code', required: true },
        { name: 'title', label: 'Title', required: true },
        { name: 'order', label: 'Order' },
        { name: 'content', label: 'Content (HTML)', required: true },
      ],
    }
    return (fields[tab] || []).map(f => (
      <div key={f.name} className="space-y-1.5">
        <Label htmlFor={f.name} className="text-xs">{f.label}</Label>
        {f.name === 'content' || f.name === 'options' ? (
          <Textarea id={f.name} name={f.name}
            defaultValue={f.name === 'options' && editDoc?.[f.name] ? JSON.stringify(editDoc[f.name], null, 2) : (editDoc?.[f.name] || '')}
            required={f.required} rows={f.name === 'content' ? 8 : 6} className="font-mono text-xs" />
        ) : (
          <Input id={f.name} name={f.name} defaultValue={editDoc?.[f.name] || ''} required={f.required} />
        )}
      </div>
    ))
  }

  const d = dash || {}

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-24">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link href="/" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="flex-1 text-base font-bold">Admin</h1>
        <Link href="/admin/progress" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted" title="Progress">
          <TrendingUp className="size-4" />
        </Link>
        <Link href="/admin/analytics" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted" title="Analytics">
          <BarChart3 className="size-4" />
        </Link>
      </header>

      <div className="mx-auto w-full max-w-4xl space-y-3 px-3 pt-3">
        <Tabs value={tab} onValueChange={(v) => { setTab(v); setEditDoc(null) }}>
          <TabsList className="w-full overflow-x-auto flex-nowrap justify-start">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            {CRUD_TABS.map(t => (
              <TabsTrigger key={t.key} value={t.key} className="text-xs">{t.label}</TabsTrigger>
            ))}
          </TabsList>

          {/* ════ OVERVIEW TAB ════ */}
          <TabsContent value="overview" className="mt-3 space-y-3">
            {loading ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[...Array(9)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : (
              <>
                {/* Row 1: Core metrics */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <MetricCard icon={Activity} label="Active Now" value={d.activeNow ?? '—'} color="text-green-500" href="/admin/analytics/active" />
                  <MetricCard icon={Users} label="Today" value={d.todayUnique ?? '—'} sub="unique users" href="/admin/analytics/overview" />
                  <MetricCard icon={Users} label="7-Day Sessions" value={d.uniqueSessions ?? '—'}
                    sub={d.metrics?.uniqueSessions?.trend === 'up' ? `↑ +${d.metrics.uniqueSessions.change}%` : d.metrics?.uniqueSessions?.trend === 'down' ? `↓ ${d.metrics.uniqueSessions.change}%` : '—'}
                    href="/admin/analytics/overview" />
                  <MetricCard icon={Zap} label="Total Events" value={d.totalEvents ?? '—'}
                    sub={d.metrics?.totalEvents?.trend === 'up' ? `↑ +${d.metrics.totalEvents.change}%` : d.metrics?.totalEvents?.trend === 'down' ? `↓ ${d.metrics.totalEvents.change}%` : '—'}
                    href="/admin/analytics/overview" />
                </div>

                {/* Row 2: PWA / Web + Refreshes + Downloads */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Link href="/admin/analytics/pwa">
                    <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                      <CardContent className="p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">PWA vs Web</div>
                        <div className="flex gap-3 text-xs">
                          <div className="flex items-center gap-1">
                            <Smartphone className="size-3 text-blue-500" />
                            <span className="font-bold">{d.webPwaSessions?.pwa ?? 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Monitor className="size-3 text-orange-500" />
                            <span className="font-bold">{d.webPwaSessions?.web ?? 0}</span>
                          </div>
                        </div>
                        <Bar value={d.webPwaSessions?.pwa || 0} max={(d.webPwaSessions?.pwa || 0) + (d.webPwaSessions?.web || 1)} color="bg-blue-500" />
                      </CardContent>
                    </Card>
                  </Link>
                  <MetricCard icon={RefreshCw} label="Page Refreshes" value={d.pageRefreshes ?? '—'} color="text-orange-500"
                    sub={d.metrics?.pageRefreshes?.trend === 'up' ? `↑ +${d.metrics.pageRefreshes.change}%` : d.metrics?.pageRefreshes?.trend === 'down' ? `↓ ${d.metrics.pageRefreshes.change}%` : '—'}
                    href="/admin/analytics/refreshes" />
                  <MetricCard icon={Download} label="Downloads" value={d.downloadClicks ?? '—'}
                    sub={d.metrics?.downloads?.trend === 'up' ? `↑ +${d.metrics.downloads.change}%` : d.metrics?.downloads?.trend === 'down' ? `↓ ${d.metrics.downloads.change}%` : '—'}
                    href="/admin/analytics/downloads" />
                  <Link href="/admin/analytics/hours">
                    <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                      <CardContent className="p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Peak Hour</div>
                        <div className="flex items-center gap-2">
                          <Clock className="size-4 text-purple-500" />
                          <span className="text-lg font-bold">
                            {d.peakHours?.[0] ? `${d.peakHours[0].hour}:00` : '—'}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {d.peakHours?.[0] ? `${d.peakHours[0].count} events` : 'no data'}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>

                {/* Row 3: Flashcard + Engagement stats */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <MetricCard icon={Layers} label="Flashcard Opens"
                    value={d.flashcard?.opens ?? '—'}
                    sub={d.metrics?.flashcardOpens?.trend === 'up' ? `↑ +${d.metrics.flashcardOpens.change}% · ~${d.flashcard.avgTimeSeconds}s avg` : d.metrics?.flashcardOpens?.trend === 'down' ? `↓ ${d.metrics.flashcardOpens.change}% · ~${d.flashcard.avgTimeSeconds}s avg` : d.flashcard?.avgTimeSeconds ? `~${d.flashcard.avgTimeSeconds}s avg` : ''}
                    href="/admin/analytics/flashcards" />
                  <Link href="/admin/analytics/engagement">
                    <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                      <CardContent className="p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Click-Through</div>
                        <div className="flex items-center gap-2">
                          <MousePointerClick className="size-4 text-rose-500" />
                          <span className="text-lg font-bold">{d.engagement?.ctr ?? 0}%</span>
                        </div>
                        <Bar value={d.engagement?.navigationClicks || 0} max={d.engagement?.pageViews || 1} color="bg-rose-500" />
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span>{d.engagement?.navigationClicks || 0} nav / {d.engagement?.pageViews || 0} views</span>
                          {d.metrics?.ctr?.trend === 'up' ? <span className="text-green-500">↑ +{d.metrics.ctr.change}%</span> : d.metrics?.ctr?.trend === 'down' ? <span className="text-red-500">↓ {d.metrics.ctr.change}%</span> : null}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                  <Link href="/admin/analytics/engagement">
                    <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                      <CardContent className="p-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Engagement</div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">{d.engagement?.avgEventsPerSession ?? '—'}</span>
                          {d.metrics?.avgEventsPerSession?.trend === 'up' ? <span className="text-xs text-green-500">↑ +{d.metrics.avgEventsPerSession.change}%</span> : d.metrics?.avgEventsPerSession?.trend === 'down' ? <span className="text-xs text-red-500">↓ {d.metrics.avgEventsPerSession.change}%</span> : null}
                        </div>
                        <div className="text-[10px] text-muted-foreground">avg events/session</div>
                        <div className="mt-1 text-[10px] text-muted-foreground">~{d.engagement?.estimatedActiveMinutes ?? 0} min active</div>
                      </CardContent>
                    </Card>
                  </Link>
                  <MetricCard icon={Eye} label="Page Views" value={d.engagement?.pageViews ?? '—'}
                    sub={d.metrics?.pageViews?.trend === 'up' ? `↑ +${d.metrics.pageViews.change}%` : d.metrics?.pageViews?.trend === 'down' ? `↓ ${d.metrics.pageViews.change}%` : '—'}
                    href="/admin/analytics/pages" />
                </div>

                {/* Row 4: Quiz + Retention */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <MetricCard icon={Zap} label="Quiz Started"
                    value={d.metrics?.quizStarted?.now ?? '—'}
                    sub={d.metrics?.quizStarted?.trend === 'up' ? `↑ +${d.metrics.quizStarted.change}%` : d.metrics?.quizStarted?.trend === 'down' ? `↓ ${d.metrics.quizStarted.change}%` : '—'}
                    href="/admin/analytics/quizzes" />
                  <MetricCard icon={BarChart3} label="Quiz Avg Score"
                    value={d.metrics?.quizAvgScore?.now != null ? `${d.metrics.quizAvgScore.now}%` : '—'}
                    sub={d.metrics?.quizAvgScore?.trend === 'up' ? `↑ +${d.metrics.quizAvgScore.change}%` : d.metrics?.quizAvgScore?.trend === 'down' ? `↓ ${d.metrics.quizAvgScore.change}%` : '—'}
                    href="/admin/analytics/quizzes" />
                </div>

                {/* Row 5: Top Pages */}
                <Link href="/admin/analytics/pages">
                  <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <CardContent className="p-3">
                      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Top Pages (7d)</div>
                      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                        {(d.topPages || []).slice(0, 6).map(p => (
                          <div key={p.path} className="flex items-center justify-between rounded-lg bg-muted/50 px-2 py-1">
                            <span className="truncate text-[11px] font-mono text-muted-foreground">{p.path || '/'}</span>
                            <span className="ml-1 shrink-0 text-xs font-bold">{p.count}</span>
                          </div>
                        ))}
                        {(d.topPages || []).length === 0 && (
                          <span className="col-span-full text-center text-[11px] text-muted-foreground py-2">No data yet</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </>
            )}
          </TabsContent>

          {/* ════ CRUD TABS ════ */}
          {CRUD_TABS.map(t => (
            <TabsContent key={t.key} value={t.key} className="mt-3 space-y-3">
              {t.key !== 'feedback' && (
                <Card>
                  <CardContent className="p-4">
                    <h2 className="mb-3 text-sm font-bold">{editDoc ? 'Edit' : 'Add'} {t.label.slice(0, -1)}</h2>
                    <form onSubmit={handleSave} className="space-y-3">
                      {tab === t.key && renderForm()}
                      <div className="flex gap-2 pt-1">
                        <Button type="submit" disabled={saving} size="sm">
                          {saving ? 'Saving...' : editDoc ? 'Update' : 'Create'}
                        </Button>
                        {editDoc && (
                          <Button type="button" variant="outline" size="sm" onClick={() => setEditDoc(null)}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </form>
                    {message && (
                      <p className={`mt-2 text-xs font-medium ${message === 'Saved!' ? 'text-green-500' : 'text-red-500'}`}>{message}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-0">
                  <div className="flex items-center justify-between border-b px-4 py-2.5">
                    <span className="text-xs font-semibold text-muted-foreground">{docs.length} {t.label.toLowerCase()}</span>
                    {t.key === 'feedback' && (
                      <button onClick={() => loadDocs()} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <RefreshCw className="size-3" />
                      </button>
                    )}
                  </div>
                  {tab !== t.key ? null : loading ? (
                    <div className="space-y-2 p-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>
                  ) : docs.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">No {t.label.toLowerCase()} yet</div>
                  ) : t.key === 'feedback' ? (
                    <div className="divide-y divide-border">
                      {docs.map(doc => (
                        <div key={doc._id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-muted-foreground">{doc.course || '—'}</span>
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <span key={s} className="text-sm" style={{ color: s <= doc.rating ? '#f59e0b' : '#d1d5db' }}>★</span>
                                  ))}
                                </div>
                                <span className="text-[10px] text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString()}</span>
                              </div>
                              {doc.comment && (
                                <p className="text-sm text-foreground leading-relaxed">{doc.comment}</p>
                              )}
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(doc._id)} className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-500/10">
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {docs.map(doc => (
                        <div key={doc._id} className="flex items-center justify-between px-4 py-2.5">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{doc.title || doc.question || doc.code || doc.name || doc._id}</div>
                            {doc.code && <div className="text-[11px] text-muted-foreground">{doc.code}</div>}
                          </div>
                          <div className="flex gap-1 shrink-0 ml-2">
                            <Button variant="outline" size="sm" onClick={() => setEditDoc(doc)}><Pencil className="size-3" /></Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(doc._id)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10"><Trash2 className="size-3" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
