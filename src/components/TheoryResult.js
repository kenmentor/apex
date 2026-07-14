'use client'

import { useEffect, useState } from 'react'
import { Check, X, AlertCircle, Lightbulb, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function ScoreRing({ score, max = 10 }) {
  const [animated, setAnimated] = useState(0)
  const pct = (score / max) * 100
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (animated / 100) * circumference

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(pct), 100)
    return () => clearTimeout(timer)
  }, [pct])

  const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : pct >= 40 ? '#f97316' : '#ef4444'

  return (
    <div className="relative flex items-center justify-center">
      <svg width="120" height="120" className="-rotate-90">
        <circle cx="60" cy="60" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
        <circle
          cx="60" cy="60" r="45" fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-muted-foreground">/ {max}</span>
      </div>
    </div>
  )
}

export default function TheoryResult({ result, onNext, isLast }) {
  if (!result) return null

  const { keywordScore, llmScore, totalPoints, percentage, feedback, keywordMatched } = result

  const grade = percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : percentage >= 60 ? 'D' : percentage >= 50 ? 'E' : 'F'
  const gradeColor = percentage >= 70 ? 'text-green-600' : percentage >= 50 ? 'text-amber-600' : 'text-red-500'

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Score Header */}
      <Card className="py-6 text-center">
        <div className="space-y-3">
          <ScoreRing score={totalPoints} />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Score</p>
            <p className={`text-2xl font-bold ${gradeColor}`}>{grade}</p>
          </div>
        </div>
      </Card>

      {/* Breakdown */}
      <Card className="divide-y p-0">
        <div className="flex items-center justify-between p-4">
          <span className="text-sm text-muted-foreground">Keyword Relevance</span>
          <span className="text-sm font-bold">{keywordScore.toFixed(1)} / 4.0</span>
        </div>
        <div className="flex items-center justify-between p-4">
          <span className="text-sm text-muted-foreground">Examiner Evaluation</span>
          <span className="text-sm font-bold">{llmScore.toFixed(1)} / 6.0</span>
        </div>
        <div className="flex items-center justify-between p-4">
          <span className="text-sm text-muted-foreground">Total Marks</span>
          <span className={`text-sm font-bold ${gradeColor}`}>{totalPoints.toFixed(1)} / 10.0</span>
        </div>
        <div className="flex items-center justify-between p-4">
          <span className="text-sm text-muted-foreground">Percentage</span>
          <span className={`text-sm font-bold ${gradeColor}`}>{percentage}%</span>
        </div>
      </Card>

      {/* Examiner Remarks */}
      {feedback?.breakdown && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Examiner Remarks</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{feedback.breakdown}</p>
          </CardContent>
        </Card>
      )}

      {/* Concept Assessment */}
      {(feedback?.matchedConcepts?.length > 0 || keywordMatched?.length > 0) && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-green-600">Concepts Demonstrated</p>
            <div className="flex flex-wrap gap-1.5">
              {keywordMatched?.map((kw) => (
                <Badge key={`kw-${kw}`} variant="secondary" className="bg-green-100 text-green-700 text-xs">
                  <Check className="mr-1 size-3" />
                  {kw}
                </Badge>
              ))}
              {feedback?.matchedConcepts?.map((c) => (
                <Badge key={`lc-${c}`} variant="secondary" className="bg-green-100 text-green-700 text-xs">
                  <Check className="mr-1 size-3" />
                  {c.length > 45 ? c.slice(0, 45) + '...' : c}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {feedback?.missingConcepts?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-red-500">Concepts Not Demonstrated</p>
            <div className="flex flex-wrap gap-1.5">
              {feedback.missingConcepts.map((c) => (
                <Badge key={c} variant="secondary" className="bg-red-50 text-red-600 text-xs">
                  <X className="mr-1 size-3" />
                  {c.length > 45 ? c.slice(0, 45) + '...' : c}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {feedback?.illegible?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-600">
              <AlertCircle className="size-3.5" />
              Illegible Content Detected
            </div>
            <p className="text-sm text-muted-foreground">
              Portions of your response could not be read clearly. Write more clearly to ensure full evaluation.
            </p>
          </CardContent>
        </Card>
      )}

      {feedback?.suggestions && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
              <Lightbulb className="size-3.5 text-amber-500" />
              Recommendation
            </p>
            <p className="text-sm text-muted-foreground">{feedback.suggestions}</p>
          </CardContent>
        </Card>
      )}

      {/* Points earned */}
      <div className="flex justify-center pt-1">
        <Badge variant="outline" className={`${percentage >= 50 ? 'border-green-300 text-green-600' : 'border-red-300 text-red-500'} text-xs`}>
          +{totalPoints.toFixed(1)} marks awarded
        </Badge>
      </div>

      {/* Next button */}
      {onNext && (
        <Button
          onClick={onNext}
          className="w-full py-6 text-base font-bold"
        >
          {isLast ? 'VIEW RESULTS' : 'NEXT QUESTION'}
        </Button>
      )}
    </div>
  )
}
