'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getUser } from '@/lib/auth'
import { getCached, setCached } from '@/lib/client-cache'
import { Skeleton } from '@/components/ui/skeleton'

function formatTime(secs) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}m ${s}s`
}

export default function QuizHistoryPage() {
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

  return (
    <div className="min-h-dvh bg-background pb-28">
      <div className="mx-auto w-full max-w-xl px-4 pt-4">
        <div className="flex items-center gap-3 py-2">
          <Link href="/profile" aria-label="Go back" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-bold tracking-tight">Quiz history</h1>
          {scores && <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">{scores.length}</span>}
        </div>
        {!scores ? (
          <div className="space-y-2 pt-2">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : scores.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          <div className="space-y-1.5 pt-2">
            {scores.map((s, i) => (
              <div key={`${i}-${s.course || 'unknown'}`} className="flex items-center justify-between rounded-xl bg-muted/60 p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{s.course}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatTime(s.timeSpent)} · {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">{s.score}/{s.total}</span>
                  <span className={`text-base font-bold ${s.percentage >= 50 ? 'text-green-600' : 'text-red-500'}`}>
                    {s.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
