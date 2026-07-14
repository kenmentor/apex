'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAdmin } from '@/lib/auth'
import { ArrowLeft, Activity, Users, Smartphone, Monitor, RefreshCw, Download, Clock, Layers, MousePointerClick, Eye, Zap, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, AreaChart, Area,
} from 'recharts'

const COLORS = ['#ff9f43', '#130f40', '#34c759', '#9b59b6', '#e17055', '#007aff', '#00b894', '#6c5ce7', '#d63031', '#636e72']

const PAGE_ICON = {
  overview: TrendingUp, pwa: Smartphone, refreshes: RefreshCw, downloads: Download,
  hours: Clock, flashcards: Layers, engagement: MousePointerClick, pages: Eye,
  quizzes: Zap, retention: Users, active: Activity,
}

const PAGE_LABEL = {
  overview: 'Traffic Overview', pwa: 'PWA vs Web', refreshes: 'Page Refreshes', downloads: 'Downloads',
  hours: 'Peak Hours', flashcards: 'Flashcard Analytics', engagement: 'Engagement', pages: 'Top Pages',
  quizzes: 'Quiz Analytics', retention: 'User Retention', active: 'Active Users',
}

export default function MetricDetailPage({ params }) {
  const { metric } = use(params)
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAdmin()) { router.push('/auth'); return }
    setLoading(true)
    fetch(`/api/admin/dashboard/${metric}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [metric])

  const Icon = PAGE_ICON[metric] || Activity

  if (!data && loading) return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header metric={metric} Icon={Icon} />
      <div className="mx-auto w-full max-w-5xl space-y-3 px-3 pt-3">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  )

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-24">
      <Header metric={metric} Icon={Icon} />
      <div className="mx-auto w-full max-w-5xl space-y-4 px-3 pt-3">
        {metric === 'overview' && <OverviewDetail data={data} />}
        {metric === 'pwa' && <PWADetail data={data} />}
        {metric === 'refreshes' && <RefreshesDetail data={data} />}
        {metric === 'downloads' && <DownloadsDetail data={data} />}
        {metric === 'hours' && <HoursDetail data={data} />}
        {metric === 'flashcards' && <FlashcardsDetail data={data} />}
        {metric === 'engagement' && <EngagementDetail data={data} />}
        {metric === 'pages' && <PagesDetail data={data} />}
        {metric === 'quizzes' && <QuizzesDetail data={data} />}
        {metric === 'retention' && <RetentionDetail data={data} />}
        {metric === 'active' && <ActiveDetail data={data} />}
      </div>
    </div>
  )
}

function Header({ metric, Icon }) {
  return (
    <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Link href="/admin" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
        <ArrowLeft className="size-4" />
      </Link>
      <Icon className="size-4 text-muted-foreground" />
      <h1 className="flex-1 text-base font-bold">{PAGE_LABEL[metric] || metric}</h1>
    </header>
  )
}

function StatCard({ label, value, sub, color }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`mt-0.5 text-xl font-bold ${color || 'text-foreground'}`}>{value ?? '—'}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  )
}

function ChartCard({ title, children, className = '' }) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        {children}
      </CardContent>
    </Card>
  )
}

// ─── OVERVIEW ───
function OverviewDetail({ data }) {
  if (!data) return null
  const { dailyViews, dailySessions, eventTypes } = data
  const totalViews = (dailyViews || []).reduce((s, d) => s + d.count, 0)
  const totalSessions = (dailySessions || []).reduce((s, d) => s + d.count, 0)

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Page Views (30d)" value={totalViews} color="text-blue-500" />
        <StatCard label="Total Sessions (30d)" value={totalSessions} />
        <StatCard label="Avg Daily Views" value={dailyViews?.length ? Math.round(totalViews / dailyViews.length) : 0} />
        <StatCard label="Avg Daily Sessions" value={dailySessions?.length ? Math.round(totalSessions / dailySessions.length) : 0} />
      </div>

      <ChartCard title="Daily Page Views (30 days)">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyViews || []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="_id" tick={{ fontSize: 10 }} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f680" name="Views" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChartCard title="Daily Sessions (30 days)">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySessions || []}>
                <XAxis dataKey="_id" tick={{ fontSize: 10 }} tickFormatter={v => v?.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Sessions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Events Breakdown">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={eventTypes || []} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={70}
                  label={({ _id, count }) => `${_id}: ${count}`}>
                  {(eventTypes || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </>
  )
}

// ─── PWA ───
function PWADetail({ data }) {
  if (!data) return null
  const { byPath, pwaDaily, webDaily } = data
  const pwaTotal = (byPath || []).filter(i => i._id?.pwa).reduce((s, i) => s + i.count, 0)
  const webTotal = (byPath || []).filter(i => !i._id?.pwa).reduce((s, i) => s + i.count, 0)

  const pieData = [
    { name: 'PWA', value: pwaTotal },
    { name: 'Web', value: webTotal },
  ]

  const daily = (pwaDaily || []).map(d => ({
    date: d._id,
    PWA: d.count,
    Web: (webDaily || []).find(w => w._id === d._id)?.count || 0,
  }))

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="PWA Views" value={pwaTotal} color="text-blue-500" sub={`${((pwaTotal / (pwaTotal + webTotal || 1)) * 100).toFixed(1)}%`} />
        <StatCard label="Web Views" value={webTotal} color="text-orange-500" />
        <StatCard label="Total Views" value={pwaTotal + webTotal} />
        <StatCard label="PWA Share" value={`${((pwaTotal / (pwaTotal + webTotal || 1)) * 100).toFixed(0)}%`} color="text-blue-500" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChartCard title="PWA vs Web (7 days)">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}>
                  <Cell fill="#3b82f6" />
                  <Cell fill="#f97316" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Daily Trend (30 days)">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v?.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="PWA" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Web" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="By Path">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="px-2 py-1.5 text-left font-medium">Path</th>
                <th className="px-2 py-1.5 text-right font-medium">Platform</th>
                <th className="px-2 py-1.5 text-right font-medium">Views</th>
              </tr>
            </thead>
            <tbody>
              {(byPath || []).map((i, idx) => (
                <tr key={idx} className="border-b border-muted/50">
                  <td className="px-2 py-1.5 font-mono">{i._id?.path || '/'}</td>
                  <td className="px-2 py-1.5 text-right">{i._id?.pwa ? '📱 PWA' : '🖥️ Web'}</td>
                  <td className="px-2 py-1.5 text-right font-bold">{i.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </>
  )
}

// ─── REFRESHES ───
function RefreshesDetail({ data }) {
  if (!data) return null
  const { byPath, daily } = data
  const total = (byPath || []).reduce((s, i) => s + i.count, 0)

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Refreshes (7d)" value={total} color="text-orange-500" />
        <StatCard label="Avg Daily" value={daily?.length ? Math.round(total / daily.length) : 0} />
        <StatCard label="Paths Affected" value={byPath?.length || 0} />
        <StatCard label="Most Refreshed" value={byPath?.[0]?._id || '—'} sub={byPath?.[0]?.count ? `${byPath[0].count} times` : ''} />
      </div>

      <ChartCard title="Daily Refresh Trend (30 days)">
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily || []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="_id" tick={{ fontSize: 10 }} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#f97316" fill="#f9731680" name="Refreshes" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="By Path">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="px-2 py-1.5 text-left font-medium">#</th>
                <th className="px-2 py-1.5 text-left font-medium">Path</th>
                <th className="px-2 py-1.5 text-right font-medium">Refreshes</th>
                <th className="px-2 py-1.5 text-right font-medium">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {(byPath || []).map((i, idx) => (
                <tr key={idx} className="border-b border-muted/50">
                  <td className="px-2 py-1.5 text-muted-foreground">{idx + 1}</td>
                  <td className="px-2 py-1.5 font-mono">{i._id || '/'}</td>
                  <td className="px-2 py-1.5 text-right font-bold">{i.count}</td>
                  <td className="px-2 py-1.5 text-right text-muted-foreground">{total > 0 ? ((i.count / total) * 100).toFixed(1) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </>
  )
}

// ─── DOWNLOADS ───
function DownloadsDetail({ data }) {
  if (!data) return null
  const { bySource, daily } = data
  const total = (bySource || []).reduce((s, i) => s + i.count, 0)

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Downloads (7d)" value={total} color="text-green-500" />
        <StatCard label="Avg Daily" value={daily?.length ? Math.round(total / daily.length) : 0} />
        <StatCard label="Sources" value={bySource?.length || 0} />
        <StatCard label="Top Source" value={bySource?.[0]?._id || '—'} sub={bySource?.[0]?.count ? `${bySource[0].count} downloads` : ''} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChartCard title="Daily Download Trend (30 days)">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily || []}>
                <XAxis dataKey="_id" tick={{ fontSize: 10 }} tickFormatter={v => v?.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} name="Downloads" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="By Source">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={bySource || []} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={70}
                  label={({ _id, count }) => `${_id}: ${count}`}>
                  {(bySource || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </>
  )
}

// ─── HOURS ───
function HoursDetail({ data }) {
  if (!data) return null
  const { hourly, byEventType } = data

  const maxEvent = (hourly || []).reduce((a, b) => (a.count > b.count ? a : b), { count: 0 })

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Peak Hour" value={maxEvent ? `${maxEvent._id}:00` : '—'} color="text-purple-500" sub={maxEvent ? `${maxEvent.count} events` : ''} />
        <StatCard label="Quietest Hour" value={hourly?.length ? `${hourly.reduce((a, b) => (a.count < b.count ? a : b))._id}:00` : '—'} />
        <StatCard label="Hours with Activity" value={hourly?.length || 0} sub="out of 24" />
        <StatCard label="Total Events" value={(hourly || []).reduce((s, i) => s + i.count, 0)} />
      </div>

      <ChartCard title="24-Hour Event Distribution (7 days)">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourly || []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="_id" tick={{ fontSize: 10 }} tickFormatter={v => `${v}:00`} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip labelFormatter={v => `${v}:00`} />
              <Bar dataKey="count" fill="#a855f7" radius={[4, 4, 0, 0]} name="Events" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Events by Type per Hour">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={(() => {
              const map = {}
              for (const e of byEventType || []) {
                const h = e._id?.hour
                if (!map[h]) map[h] = { hour: `${h}:00` }
                map[h][e._id?.event] = e.count
              }
              return Object.values(map)
            })()}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              {[...new Set((byEventType || []).map(e => e._id?.event))].map((ev, i) => (
                <Bar key={ev} dataKey={ev} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} stackId="a" />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </>
  )
}

// ─── FLASHCARDS ───
function FlashcardsDetail({ data }) {
  if (!data) return null
  const { daily, durations, bySection, durationBuckets } = data

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Opens (30d)" value={(daily || []).reduce((s, d) => s + d.count, 0)} color="text-indigo-500" />
        <StatCard label="Avg Time" value={durations?.avg ? `${durations.avg.toFixed(1)}s` : '—'} sub={durations?.count ? `from ${durations.count} sessions` : ''} />
        <StatCard label="Min Time" value={durations?.min ? `${durations.min}s` : '—'} />
        <StatCard label="Max Time" value={durations?.max ? `${durations.max}s` : '—'} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChartCard title="Daily Opens (30 days)">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="_id" tick={{ fontSize: 10 }} tickFormatter={v => v?.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#6366f1" fill="#6366f180" name="Opens" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Duration Distribution">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(durationBuckets || []).map(b => ({ label: b._id === 999999 ? '120+' : `${b._id}s`, count: b.count }))}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Sessions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {bySection?.length > 0 && (
        <ChartCard title="Opens by Section">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="px-2 py-1.5 text-left font-medium">#</th>
                  <th className="px-2 py-1.5 text-left font-medium">Section</th>
                  <th className="px-2 py-1.5 text-right font-medium">Opens</th>
                </tr>
              </thead>
              <tbody>
                {bySection.map((s, idx) => (
                  <tr key={idx} className="border-b border-muted/50">
                    <td className="px-2 py-1.5 text-muted-foreground">{idx + 1}</td>
                    <td className="px-2 py-1.5">{s._id || 'Unknown'}</td>
                    <td className="px-2 py-1.5 text-right font-bold">{s.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}
    </>
  )
}

// ─── ENGAGEMENT ───
function EngagementDetail({ data }) {
  if (!data) return null
  const { eventDepth, navPaths } = data
  const totalSessions = (eventDepth || []).reduce((s, b) => s + (b.sessions || 0), 0)

  const depthLabels = { '1': '1-2', '3': '3-5', '6': '6-10', '10': '11-20', '20': '21-50', '50': '51-100', '100': '100+' }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Sessions Tracked" value={totalSessions} />
        <StatCard label="Avg Events/Session" value={totalSessions ? ((eventDepth || []).reduce((s, b) => s + (b._id * (b.sessions || 0)), 0) / totalSessions).toFixed(1) : '—'} />
        <StatCard label="Navigation Paths" value={navPaths?.length || 0} />
        <StatCard label="Top Destination" value={navPaths?.[0]?._id || '—'} sub={navPaths?.[0]?.count ? `${navPaths[0].count} clicks` : ''} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChartCard title="Session Depth Distribution">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(eventDepth || []).map(b => ({ label: depthLabels[b._id] || b._id, sessions: b.sessions || 0 }))}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="sessions" fill="#e11d48" radius={[4, 4, 0, 0]} name="Sessions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Navigation Destinations">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(navPaths || []).slice(0, 10)} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="_id" tick={{ fontSize: 9 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#e11d48" radius={[0, 4, 4, 0]} name="Clicks" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </>
  )
}

// ─── PAGES ───
function PagesDetail({ data }) {
  if (!data) return null
  const { pages, daily } = data
  const total = (pages || []).reduce((s, p) => s + p.count, 0)

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Page Views (30d)" value={total} color="text-blue-500" />
        <StatCard label="Unique Pages" value={pages?.length || 0} />
        <StatCard label="Top Page" value={pages?.[0]?._id || '—'} sub={pages?.[0]?.count ? `${pages[0].count} views` : ''} />
        <StatCard label="Avg Views/Page" value={pages?.length ? Math.round(total / pages.length) : 0} />
      </div>

      <ChartCard title="Top Pages (30 days)">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={(pages || []).slice(0, 15)} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="_id" tick={{ fontSize: 9 }} width={120} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Views" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="All Pages">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="px-2 py-1.5 text-left font-medium">#</th>
                <th className="px-2 py-1.5 text-left font-medium">Path</th>
                <th className="px-2 py-1.5 text-right font-medium">Views</th>
                <th className="px-2 py-1.5 text-right font-medium">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {(pages || []).map((p, idx) => (
                <tr key={idx} className="border-b border-muted/50">
                  <td className="px-2 py-1.5 text-muted-foreground">{idx + 1}</td>
                  <td className="px-2 py-1.5 font-mono">{p._id || '/'}</td>
                  <td className="px-2 py-1.5 text-right font-bold">{p.count}</td>
                  <td className="px-2 py-1.5 text-right text-muted-foreground">{total > 0 ? ((p.count / total) * 100).toFixed(1) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </>
  )
}

// ─── QUIZZES ───
function QuizzesDetail({ data }) {
  if (!data) return null
  const { started, completed, answers, completionRate, avgScore, avgTimeSec, totalScored, dailyStarts, dailyCompletions, scoreBuckets, byCourse } = data

  const finalScore = avgScore ? `${avgScore}%` : '—'

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Quiz Started (7d)" value={started} color="text-blue-500" />
        <StatCard label="Completed" value={completed} sub={`${completionRate}% completion`} />
        <StatCard label="Answers Recorded" value={answers} />
        <StatCard label="Avg Score" value={finalScore} color={avgScore >= 70 ? 'text-green-500' : avgScore >= 40 ? 'text-orange-500' : 'text-red-500'} sub={totalScored ? `from ${totalScored} quizzes` : ''} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChartCard title="Daily Quiz Starts (30 days)">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyStarts || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="_id" tick={{ fontSize: 10 }} tickFormatter={v => v?.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f680" name="Starts" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Daily Quiz Completions (30 days)">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyCompletions || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="_id" tick={{ fontSize: 10 }} tickFormatter={v => v?.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#22c55e" fill="#22c55e80" name="Completions" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChartCard title="Score Distribution">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(scoreBuckets || []).map(b => ({ label: b._id === 101 ? '80-100%' : b._id === 'unknown' ? 'Unknown' : `${b._id}-${b._id + 20}%`, count: b.count }))}>
                <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#a855f7" radius={[4, 4, 0, 0]} name="Quizzes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Quizzes by Course">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(byCourse || []).slice(0, 10)} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="_id" tick={{ fontSize: 9 }} width={70} />
                <Tooltip />
                <Bar dataKey="count" fill="#e11d48" radius={[0, 4, 4, 0]} name="Quizzes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {byCourse?.length > 0 && (
        <ChartCard title="Course Performance">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="px-2 py-1.5 text-left font-medium">#</th>
                  <th className="px-2 py-1.5 text-left font-medium">Course</th>
                  <th className="px-2 py-1.5 text-right font-medium">Quizzes</th>
                  <th className="px-2 py-1.5 text-right font-medium">Avg Score</th>
                </tr>
              </thead>
              <tbody>
                {byCourse.map((c, idx) => (
                  <tr key={idx} className="border-b border-muted/50">
                    <td className="px-2 py-1.5 text-muted-foreground">{idx + 1}</td>
                    <td className="px-2 py-1.5 font-mono">{c._id}</td>
                    <td className="px-2 py-1.5 text-right font-bold">{c.count}</td>
                    <td className={`px-2 py-1.5 text-right font-bold ${c.avgScore >= 70 ? 'text-green-500' : c.avgScore >= 40 ? 'text-orange-500' : 'text-red-500'}`}>
                      {c.avgScore ? `${Math.round(c.avgScore)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}
    </>
  )
}

// ─── RETENTION ───
function RetentionDetail({ data }) {
  if (!data) return null
  const { returning, oneTime, retentionRate, totalUsers, avgSessionsPerUser, dailyActivity, sessionDepth } = data

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Users (30d)" value={totalUsers} color="text-blue-500" />
        <StatCard label="Returning" value={returning} sub={`${retentionRate}% retention`} color="text-green-500" />
        <StatCard label="One-Time" value={oneTime} color="text-orange-500" />
        <StatCard label="Avg Sessions/User" value={avgSessionsPerUser} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChartCard title="New vs Returning Users">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sessionDepth || []} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={80}
                  label={({ label, count }) => `${label}: ${count}`}>
                  <Cell fill="#22c55e" />
                  <Cell fill="#f97316" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Daily Active Sessions (30 days)">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyActivity || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v?.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="sessions" stroke="#3b82f6" fill="#3b82f680" name="Sessions" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Retention Summary">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <div className="text-2xl font-bold text-blue-500">{totalUsers}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Total Users</div>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <div className="text-2xl font-bold text-green-500">{retentionRate}%</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Retention Rate</div>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <div className="text-2xl font-bold text-orange-500">{avgSessionsPerUser}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Avg Sessions</div>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <div className="text-2xl font-bold text-purple-500">{((returning / (totalUsers || 1)) * 100).toFixed(0)}%</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Return Rate</div>
          </div>
        </div>
      </ChartCard>
    </>
  )
}

// ─── ACTIVE USERS ───
function ActiveDetail({ data }) {
  if (!data) return null
  const { hourlyActive, dailyActive, activeWindows, weeklyActive, sessionHeartbeats, lastUpdated } = data

  const depthLabels = { '1': '~30s', '3': '~1.5m', '6': '~3m', '12': '~6m', '24': '~12m', '48': '~24m' }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Now (5min)</div>
            <div className="text-2xl font-bold text-green-500">{activeWindows?.['5min'] ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">15 min</div>
            <div className="text-2xl font-bold text-blue-500">{activeWindows?.['15min'] ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">30 min</div>
            <div className="text-2xl font-bold text-orange-500">{activeWindows?.['30min'] ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">1 hour</div>
            <div className="text-2xl font-bold text-purple-500">{activeWindows?.['60min'] ?? '—'}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChartCard title="Hourly Active Users (24h)">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={(hourlyActive || []).map(h => ({ hour: h._id ? h._id.slice(11, 16) : '—', users: h.count }))}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="hour" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="users" stroke="#22c55e" fill="#22c55e80" strokeWidth={2} name="Active Users" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Daily Active Users (30d)">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(dailyActive || []).map(d => ({ date: d._id, users: d.count }))}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={v => v?.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="users" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Active Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChartCard title="Session Duration Distribution (heartbeats)">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(sessionHeartbeats || []).map(b => ({ label: depthLabels[b._id] || `${b._id}x`, sessions: b.sessions || 0 }))}>
                <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="sessions" fill="#a855f7" radius={[4, 4, 0, 0]} name="Sessions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Weekly Active Users">
          <div className="flex h-48 flex-col items-center justify-center">
            <div className="text-5xl font-bold text-green-500">{weeklyActive ?? '—'}</div>
            <div className="mt-1 text-xs text-muted-foreground">unique active sessions (7d)</div>
            {lastUpdated && (
              <div className="mt-4 text-[10px] text-muted-foreground">
                Last updated: {new Date(lastUpdated).toLocaleTimeString()}
              </div>
            )}
          </div>
        </ChartCard>
      </div>
    </>
  )
}
