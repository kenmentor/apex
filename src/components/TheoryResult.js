'use client'

import { useEffect, useState } from 'react'
import { Check, X, Lightbulb } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import FormattedContent from './FormattedContent'

function ScoreRing({ score, max = 6 }) {
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

  const { points, remark, matchedConcepts, missingConcepts, suggestion } = result
  const totalPoints = points || 0
  const percentage = Math.round((totalPoints / 6) * 100)

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Score Header */}
      <Card className="py-6 text-center">
        <div className="space-y-3">
          <ScoreRing score={totalPoints} />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Examiner Score</p>
            <p className={`text-sm font-bold ${percentage >= 70 ? 'text-green-600' : percentage >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
              {percentage}%
            </p>
          </div>
        </div>
      </Card>

      {/* Examiner Remark */}
      {remark && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Examiner Remark</p>
            <FormattedContent content={remark} className="text-sm text-muted-foreground" />
          </CardContent>
        </Card>
      )}

      {/* Concepts Demonstrated */}
      {matchedConcepts?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-green-600">Concepts Demonstrated</p>
            <div className="flex flex-wrap gap-1.5">
              {matchedConcepts.map((c, i) => (
                <Badge key={`mc-${i}`} variant="secondary" className="bg-green-100 text-green-700 text-xs">
                  <Check className="mr-1 size-3" />
                  {c.length > 45 ? c.slice(0, 45) + '...' : c}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Concepts Missing */}
      {missingConcepts?.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-red-500">Concepts Not Demonstrated</p>
            <div className="flex flex-wrap gap-1.5">
              {missingConcepts.map((c, i) => (
                <Badge key={`ms-${i}`} variant="secondary" className="bg-red-50 text-red-600 text-xs">
                  <X className="mr-1 size-3" />
                  {c.length > 45 ? c.slice(0, 45) + '...' : c}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggestion — only if there is one */}
      {suggestion && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
              <Lightbulb className="size-3.5 text-amber-500" />
              Suggestion
            </p>
            <FormattedContent content={suggestion} className="text-sm text-muted-foreground" />
          </CardContent>
        </Card>
      )}

      {/* Points awarded */}
      <div className="flex justify-center pt-1">
        <Badge variant="outline" className={`${percentage >= 50 ? 'border-green-300 text-green-600' : 'border-red-300 text-red-500'} text-xs`}>
          {totalPoints} / 6 marks awarded
        </Badge>
      </div>

      {/* Next button */}
      {onNext && (
        <button
          onClick={onNext}
          className="w-full rounded-xl bg-primary py-5 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {isLast ? 'VIEW RESULTS' : 'NEXT QUESTION'}
        </button>
      )}
    </div>
  )
}
