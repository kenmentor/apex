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

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-center">
        <ScoreRing score={totalPoints} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex items-center gap-2 p-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <Sparkles className="size-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Keywords</div>
              <div className="text-sm font-bold">{keywordScore} / 4</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-2 p-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
              <Sparkles className="size-4" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Examiner</div>
              <div className="text-sm font-bold">{llmScore} / 6</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {feedback?.breakdown && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-purple-500" />
              Examiner Feedback
            </div>
            <p className="text-sm text-muted-foreground">{feedback.breakdown}</p>
          </CardContent>
        </Card>
      )}

      {(feedback?.matchedConcepts?.length > 0 || keywordMatched?.length > 0) && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 text-sm font-semibold text-green-600">What you got right</div>
            <div className="flex flex-wrap gap-1.5">
              {keywordMatched?.map((kw) => (
                <Badge key={`kw-${kw}`} variant="secondary" className="bg-green-100 text-green-700">
                  <Check className="mr-1 size-3" />
                  {kw}
                </Badge>
              ))}
              {feedback?.matchedConcepts?.map((c) => (
                <Badge key={`lc-${c}`} variant="secondary" className="bg-green-100 text-green-700">
                  <Check className="mr-1 size-3" />
                  {c.length > 40 ? c.slice(0, 40) + '...' : c}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {feedback?.missingConcepts?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 text-sm font-semibold text-red-500">What you missed</div>
            <div className="flex flex-wrap gap-1.5">
              {feedback.missingConcepts.map((c) => (
                <Badge key={c} variant="secondary" className="bg-red-50 text-red-600">
                  <X className="mr-1 size-3" />
                  {c.length > 40 ? c.slice(0, 40) + '...' : c}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {feedback?.illegible?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-600">
              <AlertCircle className="size-4" />
              Illegible parts detected
            </div>
            <p className="text-sm text-muted-foreground">
              Some parts of your handwriting couldn&apos;t be read clearly. Try writing more clearly next time.
            </p>
          </CardContent>
        </Card>
      )}

      {feedback?.suggestions && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Lightbulb className="size-4 text-amber-500" />
              Suggestion
            </div>
            <p className="text-sm text-muted-foreground">{feedback.suggestions}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center pt-2">
        <div
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            percentage >= 80 ? 'bg-green-100 text-green-700' :
            percentage >= 60 ? 'bg-yellow-100 text-yellow-700' :
            percentage >= 40 ? 'bg-orange-100 text-orange-700' :
            'bg-red-100 text-red-600'
          }`}
        >
          +{totalPoints} points added
        </div>
      </div>

      {onNext && (
        <button
          onClick={onNext}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {isLast ? 'View Results' : 'Next Question'}
        </button>
      )}
    </div>
  )
}
