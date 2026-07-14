'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Clock, BookOpen, Check, X, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

function ScoreRing({ score, max = 10, size = 140 }) {
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
        <span className="text-4xl font-bold" style={{ color }}>{score.toFixed(1)}</span>
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
        if (parsed.courseCode === formattedCode) {
          setData(parsed)
        }
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
  const totalPoints = results.reduce((s, r) => s + (r.totalPoints || 0), 0)
  const maxPoints = results.length * 10
  const overallPct = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0
  const elapsed = data.elapsed || 0
  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60

  const grade = overallPct >= 90 ? 'A' : overallPct >= 80 ? 'B' : overallPct >= 70 ? 'C' : overallPct >= 60 ? 'D' : overallPct >= 50 ? 'E' : 'F'
  const gradeColor = overallPct >= 70 ? 'text-green-600' : overallPct >= 50 ? 'text-amber-600' : 'text-red-500'
  const remark = overallPct >= 90 ? 'DISTINCTION' : overallPct >= 80 ? 'CREDIT' : overallPct >= 70 ? 'GOOD' : overallPct >= 60 ? 'PASS' : overallPct >= 50 ? 'MARGINAL' : 'FAIL'

  const answered = results.filter(r => r.totalPoints > 0).length
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
              <p className="mt-1 text-sm font-semibold text-muted-foreground">{remark}</p>
            </div>
          </div>
        </Card>

        {/* Summary Stats */}
        <Card className="divide-y p-0">
          <div className="flex items-center justify-between p-4">
            <span className="text-sm text-muted-foreground">Total Marks Obtained</span>
            <span className={`text-sm font-bold ${gradeColor}`}>{totalPoints.toFixed(1)} / {maxPoints}</span>
          </div>
          <div className="flex items-center justify-between p-4">
            <span className="text-sm text-muted-foreground">Overall Percentage</span>
            <span className={`text-sm font-bold ${gradeColor}`}>{overallPct}%</span>
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
            <span className="text-sm text-muted-foreground">Total Time</span>
            <span className="text-sm font-bold">{mins}m {secs}s</span>
          </div>
          <div className="flex items-center justify-between p-4">
            <span className="text-sm text-muted-foreground">Average Per Question</span>
            <span className="text-sm font-bold">{(totalPoints / results.length).toFixed(1)} / 10</span>
          </div>
        </Card>

        {/* Individual Question Results */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide">Question-by-Question Analysis</h3>
          {results.map((r, i) => {
            const ref = refs[i]
            const pct = r.percentage || 0
            const qGrade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : pct >= 50 ? 'E' : 'F'
            const qGradeColor = pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'
            const isUnanswered = r.totalPoints === 0

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
                      <div className={`text-lg font-bold ${qGradeColor}`}>{r.totalPoints.toFixed(1)}</div>
                      <div className="text-[10px] text-muted-foreground">Grade {qGrade}</div>
                    </div>
                  </div>

                  {!isUnanswered && (
                    <>
                      <div className="mb-2 flex gap-4 text-xs text-muted-foreground">
                        <span>Keywords: {r.keywordScore?.toFixed(1) || '0.0'}/4.0</span>
                        <span>Examiner: {r.llmScore?.toFixed(1) || '0.0'}/6.0</span>
                      </div>

                      {r.feedback?.breakdown && (
                        <div className="mb-2 rounded-lg bg-muted/50 p-3">
                          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Examiner Remarks</p>
                          <p className="text-xs text-muted-foreground italic">{r.feedback.breakdown}</p>
                        </div>
                      )}

                      {(r.feedback?.matchedConcepts?.length > 0 || r.keywordMatched?.length > 0) && (
                        <div className="flex flex-wrap gap-1">
                          {r.keywordMatched?.slice(0, 3).map((kw, j) => (
                            <Badge key={`kw-${j}`} variant="secondary" className="bg-green-50 text-green-700 text-[10px]">
                              <Check className="mr-0.5 size-2.5" />{kw}
                            </Badge>
                          ))}
                          {r.feedback?.matchedConcepts?.slice(0, 3).map((c, j) => (
                            <Badge key={`mc-${j}`} variant="secondary" className="bg-green-50 text-green-700 text-[10px]">
                              <Check className="mr-0.5 size-2.5" />{c.length > 30 ? c.slice(0, 30) + '...' : c}
                            </Badge>
                          ))}
                          {r.feedback?.missingConcepts?.slice(0, 2).map((c, j) => (
                            <Badge key={`ms-${j}`} variant="secondary" className="bg-red-50 text-red-600 text-[10px]">
                              <X className="mr-0.5 size-2.5" />{c.length > 30 ? c.slice(0, 30) + '...' : c}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 py-5 text-sm font-semibold" onClick={() => router.push(`/courses/${paramCode.toLowerCase()}/theory`)}>
            Retake Examination
          </Button>
          <Button className="flex-1 py-5 text-sm font-semibold" onClick={() => router.push(`/courses/${paramCode.toLowerCase()}`)}>
            Back to Course
          </Button>
        </div>
      </div>
    </div>
  )
}
