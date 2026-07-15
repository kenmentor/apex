'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAdmin } from '@/lib/auth'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Activity, Users, Zap, Eye, RefreshCw, Download, MousePointerClick, Clock, Layers, Smartphone, BarChart3 } from 'lucide-react'

function Trend({ trend, change }) {
  if (trend === 'up') return <span className="inline-flex items-center gap-0.5 text-xs font-bold text-green-500"><TrendingUp className="size-3" /> +{change}%</span>
  if (trend === 'down') return <span className="inline-flex items-center gap-0.5 text-xs font-bold text-red-500"><TrendingDown className="size-3" /> {change}%</span>
  return <span className="inline-flex items-center gap-0.5 text-xs font-bold text-muted-foreground"><Minus className="size-3" /> 0%</span>
}

function StatCard({ icon: Icon, label, now, prev, trend, change, color }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`flex size-8 items-center justify-center rounded-lg ${color || 'bg-muted'}`}>
            <Icon className="size-4 text-muted-foreground" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>
        <Trend trend={trend} change={change} />
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold">{now ?? '—'}</span>
        <span className="text-xs text-muted-foreground line-through">{prev ?? '—'}</span>
      </div>
    </div>
  )
}

function HealthGauge({ score, direction }) {
  const color = direction === 'improving' ? 'bg-green-500' : direction === 'declining' ? 'bg-red-500' : 'bg-yellow-500'
  const textColor = direction === 'improving' ? 'text-green-500' : direction === 'declining' ? 'text-red-500' : 'text-yellow-500'
  return (
    <div className="rounded-xl border bg-card p-5 text-center">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Overall Health</div>
      <div className="relative mx-auto mb-2 flex size-24 items-center justify-center">
        <svg className="size-24 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={direction === 'improving' ? '#22c55e' : direction === 'declining' ? '#ef4444' : '#eab308'} strokeWidth="8" strokeDasharray={`${(score / 100) * 264} 264`} strokeLinecap="round" />
        </svg>
        <span className={`absolute text-2xl font-extrabold ${textColor}`}>{score}%</span>
      </div>
      <div className={`text-sm font-bold capitalize ${textColor}`}>{direction}</div>
      <div className="text-[10px] text-muted-foreground mt-1">vs previous 7 days</div>
    </div>
  )
}

export default function ProgressPage() {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAdmin()) { router.push('/auth'); return }
    fetch('/api/admin/progress')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (!data && loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading progress...</div>
      </div>
    )
  }

  const m = data?.metrics || {}
  const h = data?.health || {}

  return (
    <div className="min-h-dvh bg-background pb-24">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link href="/admin" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="flex-1 text-base font-bold">Progress</h1>
        <Link href="/admin/analytics" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
          <BarChart3 className="size-4" />
        </Link>
      </header>

      <div className="mx-auto max-w-4xl space-y-4 px-3 pt-4">
        {/* Health score */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <HealthGauge score={h.score} direction={h.direction} />
          <div className="col-span-1 grid grid-rows-3 gap-3 sm:col-span-3 sm:grid-cols-3 sm:grid-rows-2">
            <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-green-500/10"><TrendingUp className="size-5 text-green-500" /></div>
              <div><div className="text-lg font-bold text-green-500">{h.improving ?? 0}</div><div className="text-[10px] text-muted-foreground">Improving</div></div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-red-500/10"><TrendingDown className="size-5 text-red-500" /></div>
              <div><div className="text-lg font-bold text-red-500">{h.declining ?? 0}</div><div className="text-[10px] text-muted-foreground">Declining</div></div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted"><Minus className="size-5 text-muted-foreground" /></div>
              <div><div className="text-lg font-bold">{h.stable ?? 0}</div><div className="text-[10px] text-muted-foreground">Stable</div></div>
            </div>
            <div className="sm:col-span-3 flex items-center gap-3 rounded-xl border bg-card p-4">
              <Activity className="size-5 text-muted-foreground" />
              <div className="text-xs text-muted-foreground">
                Comparing <strong className="text-foreground">current 7 days</strong> vs <strong className="text-foreground">previous 7 days</strong>
                {data?.period?.start && <> ({data.period.start.slice(0, 10)} – {data.period.end.slice(0, 10)})</>}
              </div>
            </div>
          </div>
        </div>

        {/* Engagement */}
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Engagement</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={Zap} label="Total Events" {...m.totalEvents} />
            <StatCard icon={Users} label="Unique Sessions" {...m.uniqueSessions} />
            <StatCard icon={Eye} label="Page Views" {...m.pageViews} />
            <StatCard icon={RefreshCw} label="Page Refreshes" {...m.pageRefreshes} />
          </div>
        </div>

        {/* Quiz Performance */}
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quiz Performance</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={Zap} label="Quizzes Started" {...m.quiz?.started} />
            <StatCard icon={Zap} label="Quizzes Completed" {...m.quiz?.completed} />
            <StatCard icon={Zap} label="Completion Rate" {...m.quiz?.completionRate} />
            <StatCard icon={BarChart3} label="Avg Score" {...m.quiz?.avgScore} />
          </div>
        </div>

        {/* Flashcards */}
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Flashcards</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={Layers} label="Flashcard Opens" {...m.flashcard?.opens} />
            <StatCard icon={Clock} label="Avg Duration (s)" {...m.flashcard?.avgDuration} />
          </div>
        </div>

        {/* Activity */}
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activity</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={MousePointerClick} label="Nav Clicks" {...m.navClicks} />
            <StatCard icon={Download} label="Downloads" {...m.downloads} />
            <StatCard icon={Activity} label="Heartbeats" {...m.heartbeats} />
            <StatCard icon={Clock} label="Active Minutes" {...m.estimatedActiveMinutes} />
          </div>
        </div>

        {/* Sessions */}
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sessions</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={Smartphone} label="PWA Sessions" {...m.pwaSessions} />
            <StatCard icon={Activity} label="Avg Events/Session" {...m.avgEventsPerSession} />
            <StatCard icon={Clock} label="Avg Duration (sec)" {...m.avgSessionDurationSec} />
          </div>
        </div>
      </div>
    </div>
  )
}
