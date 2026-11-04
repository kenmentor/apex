'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, UserPlus, Download, Share2, ClipboardList, PlayCircle, Layers, Search, FileText, AlertTriangle, Eye, ChevronRight, Inbox, ShieldCheck } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { isAdmin, getToken } from '@/lib/auth'

function Card({ children, className = '' }) {
  return <div className={`rounded-2xl border bg-card p-4 ${className}`}>{children}</div>
}

function Stat({ label, value, sub }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-2xl font-extrabold tabular-nums">{value}</p>
      {!!sub && <p className="truncate text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}

function Drill({ href, icon: Icon, tint, title, sub, badge }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 transition-colors hover:bg-muted/40">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tint}`}><Icon className="size-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{title}</span>
        {!!sub && <span className="block truncate text-[11px] text-muted-foreground">{sub}</span>}
      </span>
      {badge != null && badge !== '' && (
        <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-600">{badge}</span>
      )}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}

// Overview hub: the whole system at a glance. Every section drills into its
// own page — this screen presents, never crowds.
export default function AnalyticsHubPage() {
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

  const rangeLabel = range === '24h' ? '24 hours' : range === '30d' ? '30 days' : '7 days'
  const quiz = data?.quiz || {}
  const days = (() => {
    const m = new Map()
    for (const d of data?.dailyActive || []) m.set(d.date, { date: d.date, active: d.users, signups: 0 })
    for (const d of data?.signupsDaily || []) {
      const r = m.get(d.date) || { date: d.date, active: 0, signups: 0 }
      r.signups = d.users
      m.set(d.date, r)
    }
    return [...m.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)))
  })()

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-4 pb-24 pt-4">
      <div className="flex items-center gap-2">
        <Link href="/admin" aria-label="Back to admin" className="flex size-9 items-center justify-center rounded-lg border hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">Stats</h1>
          <p className="text-[11px] text-muted-foreground">Last {rangeLabel}</p>
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
          <p className="mt-2 text-sm font-bold">Stats didn’t load</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}. Your data is safe — usually the database napping.</p>
          <button onClick={() => window.location.reload()} className="mt-3 rounded-xl border px-4 py-2 text-xs font-bold">Retry</button>
        </div>
      ) : (
        <>
          <Card>
            <div className="grid grid-cols-4 gap-2">
              <Stat label="Active" value={data.uniqueVisitors || 0} />
              <Stat label="Signed in" value={data.signedInCount || 0} />
              <Stat label="New" value={data.signups || 0} />
              <Stat label="Events" value={data.totalEvents || 0} />
            </div>
            {days.length > 1 && (
              <div className="mt-3 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={days} margin={{ top: 4, right: 0, bottom: 0, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={v => String(v).slice(5)} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="active" name="Active" strokeWidth={2} fillOpacity={0.15} />
                    <Area type="monotone" dataKey="signups" name="Signups" strokeWidth={2} fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <div className="space-y-2">
            <h2 className="px-1 text-sm font-bold text-muted-foreground">Drill down</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              <Drill href="/admin/analytics/insights" icon={ClipboardList} tint="bg-violet-500/15 text-violet-600"
                title="Insights" sub={`${quiz.completionRate || 0}% finish · ${quiz.avgScore || 0}% avg`} />
              <Drill href="/admin/requests" icon={Inbox} tint="bg-amber-500/15 text-amber-600"
                title="Contributor requests" sub="Approve editors" badge={data.contributor?.pending || ''} />
              <Drill href="/admin/analytics/searches" icon={Search} tint="bg-sky-500/15 text-sky-600"
                title="Searches" sub={`${(data.topSearches || []).length ? data.topSearches[0].q : 'No queries yet'}`} badge={(data.zeroSearches || []).length || ''} />
              <Drill href="/admin/analytics/content" icon={FileText} tint="bg-emerald-500/15 text-emerald-600"
                title="Content" sub={`${data.notesCreated || 0} notes · ${data.videoPlays || 0} plays`} />
              <Drill href="/admin/analytics/telemetry" icon={AlertTriangle} tint="bg-red-500/15 text-red-600"
                title="Stability" sub={`${(data.runtimeErrors || []).reduce((a, e) => a + e.n, 0)} crashes · ${data.rageClicks || 0} rage taps`} />
              <Drill href="/admin/analytics/activity" icon={Eye} tint="bg-muted text-muted-foreground"
                title="Activity" sub="Events over time" />
              <Drill href="/admin/users" icon={ShieldCheck} tint="bg-indigo-500/15 text-indigo-600"
                title="People & roles" sub="Find anyone, set roles" />
              <Drill href="/admin/analytics/pages" icon={Layers} tint="bg-muted text-muted-foreground"
                title="Pages" sub={`${(data.pageViews || []).length} tracked`} />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Card><Stat label="Quiz finish" value={`${quiz.completionRate || 0}%`} sub={`${quiz.completed || 0}/${quiz.started || 0}`} /></Card>
            <Card><Stat label="Shares" value={data.shares || 0} sub="viral loops" /></Card>
            <Card><Stat label="Installs" value={data.installs || 0} sub="PWA" /></Card>
          </div>

          <p className="flex items-center gap-1 px-1 text-[11px] text-muted-foreground">
            <Users className="size-3" /> Avg session {data.avgSessionDuration ? `${Math.round(data.avgSessionDuration / 60)}m` : '—'}
            <span className="mx-1">·</span><UserPlus className="size-3" /> {data.signups || 0} new
            <span className="mx-1">·</span><Download className="size-3" /> {data.installs || 0} installs
            <span className="mx-1">·</span><Share2 className="size-3" /> {data.shares || 0} shares
            <span className="mx-1">·</span><PlayCircle className="size-3" /> {data.videoPlays || 0} plays
          </p>
        </>
      )}
    </div>
  )
}
