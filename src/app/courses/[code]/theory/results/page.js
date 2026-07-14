'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trophy, TrendingUp, Check, X, BookOpen } from 'lucide-react'
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
      <div className="flex min-h-dvh flex-col bg-background pb-24">
        <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
          <Link href={`/courses/${paramCode.toLowerCase()}`} className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="flex-1 text-center text-base font-bold">Theory Results</h1>
          <div className="size-9" />
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <BookOpen className="size-16 text-muted-foreground/40" />
          <div>
            <h2 className="text-lg font-semibold">No Results Found</h2>
            <p className="mt-1 text-sm text-muted-foreground">Complete a theory exam to see your results here.</p>
          </div>
          <Button asChild>
            <Link href={`/courses/${paramCode.toLowerCase()}/theory`}>Start Theory Exam</Link>
          </Button>
        </div>
      </div>
    )
  }

  const results = data.results
  const refs = data.references || []
  const totalPoints = results.reduce((s, r) => s + (r.totalPoints || 0), 0)
  const maxPoints = results.length * 10
  const overallPct = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0
  const avgPerQ = results.length > 0 ? totalPoints / results.length : 0

  const comment = overallPct >= 90 ? 'Outstanding! You clearly understand this course.' :
    overallPct >= 70 ? 'Great work! A few areas to revise.' :
    overallPct >= 50 ? 'Not bad! Focus on the topics you missed.' :
    'Keep studying! Review the reference materials.'

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-24">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <Link href={`/courses/${paramCode.toLowerCase()}`} className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="flex-1 text-center text-base font-bold">Theory Results</h1>
        <div className="size-9" />
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6">
        <div className="flex flex-col items-center gap-4">
          <ScoreRing score={totalPoints} max={maxPoints} />
          <div className="text-center">
            <h2 className="text-2xl font-bold">{formattedCode} Theory</h2>
            <p className="mt-1 text-sm text-muted-foreground">{comment}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="flex flex-col items-center p-3">
              <Trophy className="mb-1 size-5 text-amber-500" />
              <div className="text-lg font-bold">{overallPct}%</div>
              <div className="text-xs text-muted-foreground">Overall</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center p-3">
              <TrendingUp className="mb-1 size-5 text-green-500" />
              <div className="text-lg font-bold">{avgPerQ.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">Avg / Question</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center p-3">
              <BookOpen className="mb-1 size-5 text-blue-500" />
              <div className="text-lg font-bold">{results.length}</div>
              <div className="text-xs text-muted-foreground">Answered</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Question Breakdown</h3>
          {results.map((r, i) => {
            const ref = refs[i]
            const pct = r.percentage || 0
            return (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-muted-foreground">Q{i + 1}</div>
                      <p className="text-sm font-medium line-clamp-2">
                        {ref?.question || `Question ${i + 1}`}
                      </p>
                    </div>
                    <div className={`shrink-0 text-lg font-bold ${pct >= 70 ? 'text-green-600' : pct >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                      {r.totalPoints}/10
                    </div>
                  </div>

                  <div className="mb-2 flex gap-3 text-xs text-muted-foreground">
                    <span>Keywords: {r.keywordScore}/4</span>
                    <span>Examiner: {r.llmScore}/6</span>
                  </div>

                  {r.feedback?.breakdown && (
                    <p className="mb-2 text-xs text-muted-foreground italic">
                      &ldquo;{r.feedback.breakdown}&rdquo;
                    </p>
                  )}

                  {r.feedback?.matchedConcepts?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {r.feedback.matchedConcepts.slice(0, 4).map((c, j) => (
                        <Badge key={j} variant="secondary" className="bg-green-50 text-green-700 text-[10px]">
                          <Check className="mr-0.5 size-2.5" />{c.length > 30 ? c.slice(0, 30) + '...' : c}
                        </Badge>
                      ))}
                      {r.feedback.missingConcepts?.slice(0, 3).map((c, j) => (
                        <Badge key={`m-${j}`} variant="secondary" className="bg-red-50 text-red-600 text-[10px]">
                          <X className="mr-0.5 size-2.5" />{c.length > 30 ? c.slice(0, 30) + '...' : c}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="flex gap-3">
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/courses/${paramCode.toLowerCase()}/theory`}>Try Again</Link>
          </Button>
          <Button asChild className="flex-1">
            <Link href={`/courses/${paramCode.toLowerCase()}`}>Back to Course</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
