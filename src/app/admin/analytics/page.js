'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, UserPlus, Download, Share2, ClipboardList, PlayCircle, Layers, Search, FileText, AlertTriangle, Eye, ChevronRight, Inbox, ShieldCheck, Smartphone, Clock, CalendarDays } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Legend } from 'recharts'
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

function SummaryTile({ icon: Icon, tint, label, value, sub }) {
  return (
    <div className="rounded-2xl border bg-card p-3.5">
      <div className="flex items-center gap-2">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${tint}`}><Icon className="size-4" /></span>
        <p className="truncate text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 truncate text-2xl font-extrabold tabular-nums">{value}</p>
      {!!sub && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</p>}
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

function fmtDate(d) {
  if (!d) return ''
  const [y, m, day] = String(d).split('-')
  if (!y || !m || !day) return String(d).slice(5)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[Number(m) - 1] || m} ${Number(day)}`
}

function fmtDuration(sec) {
  if (!sec) return '—'
  if (sec < 60) return `${sec}s`
  const m = Math.round(sec / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

const todayStr = () => new Date().toISOString().slice(0, 10)

// Overview hub: the whole system at a glance. Every section drills into its
// own page — this screen presents, never crowds.
export default function AnalyticsHubPage() {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [range, setRange] = useState('7d')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const isCustom = range === 'custom'

  useEffect(() => {
    if (!isAdmin()) { router.push('/auth'); return }
    // Custom needs both dates before fetching.
    if (range === 'custom' && (!from || !to)) { setLoading(false); return }
    setLoading(true)
    setError('')
    const t = getToken()
    let url = `/api/analytics?range=${range === 'custom' ? '7d' : range}`
    if (range === 'custom') url = `/api/analytics?from=${from}&to=${to}`
    fetch(url, { headers: t ? { Authorization: `Bearer ${t}` } : {} })
      .then(async r => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d.error || `Failed (${r.status})`)
        setData(d)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [range, from, to, router])

  const rangeLabel = useMemo(() => {
    if (range === 'custom') {
      if (from && to) return `${fmtDate(from)} – ${fmtDate(to)}`
      return 'pick dates below'
    }
    return range === '24h' ? '24 hours' : range === '30d' ? '30 days' : '7 days'
  }, [range, from, to])

  const quiz = data?.quiz || {}
  const days = useMemo(() => {
    const m = new Map()
    const put = (date, k, v) => {
      const r = m.get(date) || { date, label: fmtDate(date), active: 0, signedIn: 0, signups: 0, events: 0, installs: 0, downloads: 0 }
      r[k] = v
      m.set(date, r)
    }
    for (const d of data?.dailyActive || []) put(d.date, 'active', d.users)
    for (const d of data?.signupsDaily || []) put(d.date, 'signups', d.users)
    for (const d of data?.dailySignedIn || []) put(d.date, 'signedIn', d.users)
    for (const d of data?.dailyEvents || []) put(d.date, 'events', d.n)
    for (const d of data?.dailyInstalls || []) put(d.date, 'installs', d.n)
    for (const d of data?.dailyDownloads || []) put(d.date, 'downloads', d.n)
    return [...m.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)))
  }, [data])

  const dayCount = Math.max(days.length, 1)
  const avg = (n) => (Math.round((Number(n || 0) / dayCount) * 10) / 10).toString()
  const peopleSeries = [
    { key: 'active', label: 'Active', color: '#007aff' },
    { key: 'signedIn', label: 'Signed in', color: '#6c5ce7' },
    { key: 'signups', label: 'New users', color: '#34c759' },
  ]

  const applyPreset = (r) => { setRange(r); setError('') }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-4 px-4 pb-24 pt-4">
      <div className="flex items-center gap-2">
        <Link href="/admin" aria-label="Back to admin" className="flex size-9 items-center justify-center rounded-lg border hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">Stats</h1>
          <p className="text-[11px] text-muted-foreground">
            {isCustom ? `Custom · ${rangeLabel}` : `Last ${rangeLabel}`}
            {data?.from && data?.to ? ` · ${fmtDate(data.from)} – ${fmtDate(data.to)}` : ''}
          </p>
        </div>
      </div>

      {/* Range picker: presets + any custom calendar range */}
      <Card>
        <div className="flex flex-wrap items-center gap-1">
          <div className="flex gap-1 rounded-full border bg-muted/40 p-0.5 text-xs font-bold">
            {['24h', '7d', '30d'].map(r => (
              <button key={r} onClick={() => applyPreset(r)}
                className={'rounded-full px-2.5 py-1 ' + (range === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
                {r}
              </button>
            ))}
            <button onClick={() => setRange('custom')}
              className={'flex items-center gap-1 rounded-full px-2.5 py-1 ' + (isCustom ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>
              <CalendarDays className="size-3" /> Custom
            </button>
          </div>
        </div>
        {isCustom && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Start date</span>
              <input type="date" value={from} max={to || todayStr()} onChange={e => setFrom(e.target.value)}
                className="w-full rounded-xl border bg-background px-2.5 py-2 text-sm font-semibold" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">End date</span>
              <input type="date" value={to} min={from || undefined} max={todayStr()} onChange={e => setTo(e.target.value)}
                className="w-full rounded-xl border bg-background px-2.5 py-2 text-sm font-semibold" />
            </label>
            {from && to && from > to && (
              <p className="col-span-2 text-xs font-bold text-red-500">Start date must be before end date.</p>
            )}
          </div>
        )}
      </Card>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="mx-auto size-8 text-red-500" />
          <p className="mt-2 text-sm font-bold">Stats didn’t load</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}. Your data is safe — usually the database napping.</p>
          <button onClick={() => window.location.reload()} className="mt-3 rounded-xl border px-4 py-2 text-xs font-bold">Retry</button>
        </div>
      ) : isCustom && (!from || !to) ? (
        <div className="rounded-2xl border border-dashed p-6 text-center">
          <CalendarDays className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-bold">Pick a start and end date</p>
          <p className="mt-1 text-xs text-muted-foreground">See as far back as you want — any range in your history.</p>
        </div>
      ) : (
        <>
          <Card>
            <div className="grid grid-cols-4 gap-2">
              <Stat label="Active" value={data.uniqueVisitors || 0} sub={`~${avg(data.uniqueVisitors)}/day`} />
              <Stat label="Signed in" value={data.signedInCount || 0} sub={`~${avg(data.signedInCount)}/day`} />
              <Stat label="New" value={data.signups || 0} sub={`~${avg(data.signups)}/day`} />
              <Stat label="Events" value={data.totalEvents || 0} sub={`~${avg(data.totalEvents)}/day`} />
            </div>
            {days.length > 0 && (
              <>
                <div className="mt-4 border-t pt-3">
                  <p className="text-xs font-bold">People over time</p>
                  <p className="text-[11px] text-muted-foreground">Active sessions, signed-in users and new signups per day</p>
                  <div className="mt-2 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={days} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} minTickGap={24} />
                        <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ''} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {peopleSeries.map(s => (
                          <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} fill={s.color} fillOpacity={0.14} />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="mt-4 border-t pt-3">
                  <p className="text-xs font-bold">Installs, downloads & events</p>
                  <p className="text-[11px] text-muted-foreground">App installs and file downloads per day vs total events</p>
                  <div className="mt-2 h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={days} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} minTickGap={24} />
                        <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ''} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="installs" name="Installs" fill="#007aff" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="downloads" name="Downloads" fill="#27ae60" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
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
            <Card><Stat label="Shares" value={data.shares || 0} sub={`~${avg(data.shares)}/day`} /></Card>
            <Card><Stat label="Installs" value={data.installs || 0} sub={`~${avg(data.installs)}/day · PWA`} /></Card>
          </div>

          {/* Period summary — every total with its daily average, in clean tiles */}
          <div className="space-y-2">
            <h2 className="px-1 text-sm font-bold text-muted-foreground">
              Period summary {isCustom && from && to ? `· ${fmtDate(from)} – ${fmtDate(to)}` : `· last ${rangeLabel}`}
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <SummaryTile icon={Clock} tint="bg-indigo-500/15 text-indigo-600" label="Avg session"
                value={fmtDuration(data.avgSessionDuration)} sub="per session" />
              <SummaryTile icon={UserPlus} tint="bg-green-500/15 text-green-600" label="New users"
                value={data.signups || 0} sub={`avg ${avg(data.signups)}/day`} />
              <SummaryTile icon={Smartphone} tint="bg-blue-500/15 text-blue-600" label="App installs"
                value={data.installs || 0} sub={`avg ${avg(data.installs)}/day`} />
              <SummaryTile icon={Download} tint="bg-emerald-500/15 text-emerald-600" label="Downloads"
                value={data.downloads || 0} sub={`${data.downloaderCount || 0} people · avg ${avg(data.downloads)}/day`} />
              <SummaryTile icon={Share2} tint="bg-violet-500/15 text-violet-600" label="Shares"
                value={data.shares || 0} sub={`avg ${avg(data.shares)}/day`} />
              <SummaryTile icon={PlayCircle} tint="bg-orange-500/15 text-orange-600" label="Video plays"
                value={data.videoPlays || 0} sub={`avg ${avg(data.videoPlays)}/day`} />
            </div>
            <p className="flex items-center gap-1 px-1 text-[11px] text-muted-foreground">
              <Users className="size-3" /> {data.uniqueVisitors || 0} active in period
              <span className="mx-1">·</span>{dayCount} day{dayCount === 1 ? '' : 's'} shown
            </p>
          </div>
        </>
      )}
    </div>
  )
}
