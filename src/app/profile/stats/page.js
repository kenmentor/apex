'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Medal, Target, Clock, Layers } from 'lucide-react'
import { getUser } from '@/lib/auth'
import { getCached, setCached } from '@/lib/client-cache'
import { Skeleton } from '@/components/ui/skeleton'

function Row({ icon: Icon, tint, label, value }) {
  return (
    <div className="flex items-center gap-3 py-3.5">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${tint}`}><Icon className="size-4" /></span>
      <span className="min-w-0 flex-1 truncate text-sm font-bold">{label}</span>
      <span className="shrink-0 text-base font-bold">{value}</span>
    </div>
  )
}

export default function PerformancePage() {
  const [scores, setScores] = useState(() => getCached('scores'))

  useEffect(() => {
    const u = getUser()
    if (!u?.email) { setScores([]); return }
    fetch(`/api/scores?email=${encodeURIComponent(u.email)}`)
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : []
        setScores(list)
        setCached('scores', list)
      })
      .catch(() => { if (!getCached('scores')) setScores([]) })
  }, [])

  const best = scores && scores.length ? Math.max(...scores.map(s => s.percentage || 0)) : 0
  const avg = scores && scores.length ? Math.round(scores.reduce((a, s) => a + (s.percentage || 0), 0) / scores.length) : 0
  const totalMins = scores ? Math.round(scores.reduce((a, s) => a + (s.timeSpent || 0), 0) / 60) : 0

  return (
    <div className="min-h-dvh bg-background pb-28">
      <div className="mx-auto w-full max-w-xl px-4 pt-4">
        <div className="flex items-center gap-3 py-2">
          <Link href="/profile" aria-label="Go back" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-bold tracking-tight">Performance</h1>
        </div>
        {!scores ? (
          <div className="space-y-2 pt-2">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : (
          <div className="divide-y divide-border/60 px-1 pt-1">
            <Row icon={Medal} tint="bg-amber-500 text-white" label="Best score" value={`${best}%`} />
            <Row icon={Target} tint="bg-blue-500 text-white" label="Average" value={`${avg}%`} />
            <Row icon={Clock} tint="bg-orange-500 text-white" label="Total time" value={`${totalMins}m`} />
            <Row icon={Layers} tint="bg-muted text-muted-foreground" label="Quizzes taken" value={scores.length} />
          </div>
        )}
      </div>
    </div>
  )
}
