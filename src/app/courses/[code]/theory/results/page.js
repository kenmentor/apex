'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Clock, Check, X, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

function ScoreRing({ score, max = 60, size = 140 }) {
  const [animated, setAnimated] = useState(0)
  const pct = (score / max) * 100
  const r = (size - 16) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (animated / 100) * circumference

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(pct), 200)
    return () => clearTimeout(timer)
  }, [pct])

  const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : pct >= 40 ? '#f97316' : '#ef4444'

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/30" />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold" style={{ color }}>{score}</span>
        <span className="text-sm text-muted-foreground">/ {max}</span>
      </div>
    </div>
  )
}

export default function TheoryResultsPage() {
  const params = useParams()
  const router = useRouter()
  const paramCode = (params.code || '').toUpperCase().replace(/-/g, '')
  const formattedCode = paramCode.replace(/^([A-Z]+)(\d+)$/, '$1 $2')

  const [data, setData] = useState(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('theory_results')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.courseCode === formattedCode) setData(parsed)
      }
    } catch {}
  }, [formattedCode])

  if (!data || !data.results || data.results.length === 0) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-5 pb-24">
        <Card className="w-full max-w-lg flex items-center justify-center py-20 text-center">
          <div>
            <div className="mb-4 text-5xl">📚</div>
            <p className="text-muted-foreground">No examination results found.</p>
            <Link href={`/courses/${paramCode.toLowerCase()}/theory`} className="mt-5 inline-block">
              <Button className="mt-5 px-6">Begin Examination</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const results = data.results
  const refs = data.references || []
  const totalPoints = results.reduce((s, r) => s + (r.points || 0), 0)
  const maxPoints = results.length * 6
  const overallPct = data.percentage || (maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0)
  const elapsed = data.elapsed || 0
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  const grade = overallPct >= 90 ? 'A' : overallPct >= 80 ? 'B' : overallPct >= 70 ? 'C' : overallPct >= 60 ? 'D' : overallPct >= 50 ? 'E' : 'F'
  const gradeColor = overallPct >= 70 ? 'text-green-600' : overallPct >= 50 ? 'text-amber-600' : 'text-red-500'

  const answered = results.filter(r => r.points > 0).length
  const unanswered = results.length - answered

  return (
    <div className="flex min-h-dvh flex-col bg-background px-5 pb-24 pt-6">
      <div className="mx-auto w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <Link href={`/courses/${paramCode.toLowerCase()}`} className="flex size-10 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80">
            <ChevronLeft className="size-4" />
          </Link>
          <h1 className="text-lg font-bold">Examination Result</h1>
          <div className="size-10" />
        </div>

        {/* Result Slip */}
        <Card className="py-10 text-center">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Examination Result Slip</p>
            <p className="text-lg font-bold">{formattedCode} — Theory</p>
            <ScoreRing score={totalPoints} max={maxPoints} />
            <div>
              <p className={`text-3xl font-bold ${gradeColor}`}>GRADE {grade}</p>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">{overallPct}%</p>
            </div>
          </div>
        </Card>

        {/* Summary Stats */}
        <Card className="divide-y p-0">
          <div className="flex items-center justify-between p-4">
            <span className="text-sm text-muted-foreground">Total Marks</span>
            <span className={`text-sm font-bold ${gradeColor}`}>{totalPoints} / {maxPoints}</span>
          </div>
          <div className="flex items-center justify-between p-4">
            <span className="text-sm text-muted-foreground">Questions Answered</span>
            <span className="text-sm font-bold">{answered} / {results.length}</span>
          </div>
          {unanswered > 0 && (
            <div className="flex items-center justify-between p-4">
              <span className="text-sm text-muted-foreground">Unanswered</span>
              <span className="text-sm font-bold text-red-500">{unanswered}</span>
            </div>
          )}
          <div className="flex items-center justify-between p-4">
            <span className="text-sm text-muted-foreground">Time Taken</span>
            <span className="text-sm font-bold">{mins}m {secs}s</span>
          </div>
        </Card>

        {/* Per-Question Results */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide">Examiner Remarks</h3>
          {results.map((r, i) => {
            const ref = refs[i]
            const pct = r.points > 0 ? Math.round((r.points / 6) * 100) : 0
            const isUnanswered = r.points === 0 && (!r.remark || r.remark.length === 0)

            return (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">Q{i + 1}</span>
                        {isUnanswered && (
                          <Badge variant="secondary" className="bg-red-100 text-red-600 text-[10px]">
                            <AlertTriangle className="mr-0.5 size-2.5" />
                            Unanswered
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-medium line-clamp-2">
                        {ref?.question || `Question ${i + 1}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={`text-lg font-bold ${pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                        {r.points}/6
                      </div>
                      <div className="text-[10px] text-muted-foreground">{pct}%</div>
                    </div>
                  </div>

                  {r.remark && (
                    <div className="mb-2 rounded-lg bg-muted/50 p-3">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Examiner Remark</p>
                      <p className="text-xs text-muted-foreground">{r.remark}</p>
                    </div>
                  )}

                  {r.matchedConcepts?.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {r.matchedConcepts.map((c, j) => (
                        <Badge key={`mc-${j}`} variant="secondary" className="bg-green-50 text-green-700 text-[10px]">
                          <Check className="mr-0.5 size-2.5" />{c.length > 30 ? c.slice(0, 30) + '...' : c}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {r.missingConcepts?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {r.missingConcepts.map((c, j) => (
                        <Badge key={`ms-${j}`} variant="secondary" className="bg-red-50 text-red-600 text-[10px]">
                          <X className="mr-0.5 size-2.5" />{c.length > 30 ? c.slice(0, 30) + '...' : c}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {r.suggestion && (
                    <div className="mt-2 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/20">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600 mb-1">Suggestion</p>
                      <p className="text-xs text-amber-800 dark:text-amber-300">{r.suggestion}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 py-5 text-sm font-semibold" onClick={() => router.push(`/courses/${paramCode.toLowerCase()}/theory`)}>
            Retake
          </Button>
          <Button className="flex-1 py-5 text-sm font-semibold" onClick={() => router.push(`/courses/${paramCode.toLowerCase()}`)}>
            Back to Course
          </Button>
        </div>
      </div>
    </div>
  )
}
