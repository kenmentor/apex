'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getUser, getToken } from '@/lib/auth'
import { playClick, playCorrect, playWrong } from '@/lib/sound'
import { ArrowLeft, Clock, BookOpen, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import TheoryInput from '@/components/TheoryInput'
import TheoryResult from '@/components/TheoryResult'

export default function TheoryQuizPage() {
  const params = useParams()
  const router = useRouter()
  const paramCode = (params.code || '').toUpperCase().replace(/-/g, '')
  const formattedCode = paramCode.replace(/^([A-Z]+)(\d+)$/, '$1 $2')

  const [references, setReferences] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState([])
  const [currentResult, setCurrentResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [started, setStarted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)

  useEffect(() => {
    fetch(`/api/theory/references?courseCode=${encodeURIComponent(formattedCode)}`)
      .then(r => r.json())
      .then(data => {
        setReferences(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [formattedCode])

  useEffect(() => {
    if (!started || timeLeft === null || currentResult) return
    if (timeLeft <= 0) {
      handleAutoSubmit()
      return
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
    return () => clearTimeout(timer)
  }, [started, timeLeft, currentResult])

  function startQuiz() {
    const shuffled = [...references].sort(() => Math.random() - 0.5)
    setReferences(shuffled)
    setCurrentIndex(0)
    setResults([])
    setCurrentResult(null)
    setStarted(true)
    setTimeLeft(300)
  }

  const handleAutoSubmit = useCallback(() => {
    if (currentResult || submitting) return
    playWrong()
    const skipped = {
      keywordScore: 0,
      llmScore: 0,
      totalPoints: 0,
      percentage: 0,
      feedback: { breakdown: 'Time expired — answer skipped', matchedConcepts: [], missingConcepts: [], suggestions: '' },
      keywordMatched: [],
    }
    setCurrentResult(skipped)
    setResults(prev => [...prev, skipped])
  }, [currentResult, submitting])

  async function handleSubmit(answer) {
    if (submitting) return
    setSubmitting(true)
    playClick()

    try {
      const user = getUser()
      const ref = references[currentIndex]

      if (!user?.email) {
        alert('Please sign in to submit theory answers')
        setSubmitting(false)
        return
      }

      let res
      if (answer.answerType === 'image' && answer.imageFile) {
        const form = new FormData()
        form.append('courseCode', formattedCode)
        form.append('referenceId', ref.id)
        form.append('answerType', 'image')
        form.append('image', answer.imageFile)

        res = await fetch('/api/theory/submit', {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: form,
        })
      } else {
        res = await fetch('/api/theory/submit', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            courseCode: formattedCode,
            referenceId: ref.id,
            answerType: 'text',
            text: answer.text,
          }),
        })
      }

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Submission failed')
      }

      if (data.totalPoints >= 7) playCorrect()
      else if (data.totalPoints >= 4) playClick()
      else playWrong()

      const result = {
        keywordScore: data.keywordScore,
        llmScore: data.llmScore,
        totalPoints: data.totalPoints,
        percentage: data.percentage,
        feedback: data.feedback,
        keywordMatched: data.keywordMatched,
      }

      setCurrentResult(result)
      setResults(prev => [...prev, result])
    } catch (err) {
      alert(err.message || 'Failed to submit answer')
    }
    setSubmitting(false)
  }

  function goNext() {
    if (currentIndex < references.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setCurrentResult(null)
      setTimeLeft(300)
    } else {
      const allResults = results
      try {
        sessionStorage.setItem('theory_results', JSON.stringify({
          courseCode: formattedCode,
          results: allResults,
          references: references.map(r => ({ id: r.id, question: r.question })),
        }))
      } catch {}
      router.push(`/courses/${paramCode.toLowerCase()}/theory/results`)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col bg-background pb-24">
        <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
          <Link href={`/courses/${paramCode.toLowerCase()}`} className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="flex-1 text-center text-base font-bold">Theory</h1>
          <div className="size-9" />
        </header>
        <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-8">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (references.length === 0) {
    return (
      <div className="flex min-h-dvh flex-col bg-background pb-24">
        <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
          <Link href={`/courses/${paramCode.toLowerCase()}`} className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="flex-1 text-center text-base font-bold">Theory</h1>
          <div className="size-9" />
        </header>
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <BookOpen className="size-16 text-muted-foreground/40" />
          <div>
            <h2 className="text-lg font-semibold">No Theory Questions Yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Theory questions for {formattedCode} haven&apos;t been added yet.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/courses/${paramCode.toLowerCase()}`}>Back to Course</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!started) {
    return (
      <div className="flex min-h-dvh flex-col bg-background pb-24">
        <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
          <Link href={`/courses/${paramCode.toLowerCase()}`} className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="flex-1 text-center text-base font-bold">Theory</h1>
          <div className="size-9" />
        </header>
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-8">
          <Card className="w-full">
            <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
                <BookOpen className="size-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{formattedCode} Theory</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {references.length} question{references.length !== 1 ? 's' : ''} available
                </p>
              </div>
              <div className="grid w-full grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="text-lg font-bold">{references.length}</div>
                  <div className="text-xs text-muted-foreground">Questions</div>
                </div>
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="text-lg font-bold">10</div>
                  <div className="text-xs text-muted-foreground">Points each</div>
                </div>
              </div>
              <div className="w-full space-y-2 text-left text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-blue-500" />
                  4 points from keyword matching
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-purple-500" />
                  6 points from AI examiner grading
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-amber-500" />
                  5 minutes per question
                </div>
              </div>
              <Button onClick={startQuiz} className="w-full" size="lg">
                Start Theory Exam
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const currentRef = references[currentIndex]
  const progress = ((currentIndex + (currentResult ? 1 : 0)) / references.length) * 100
  const mins = Math.floor((timeLeft || 0) / 60)
  const secs = (timeLeft || 0) % 60

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-24">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => { if (confirm('Exit theory exam? Progress will be lost.')) router.push(`/courses/${paramCode.toLowerCase()}`) }}
            className="flex size-9 items-center justify-center rounded-lg hover:bg-muted"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex-1 text-center">
            <div className="text-xs text-muted-foreground">
              Question {currentIndex + 1} of {references.length}
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm font-mono">
            <Clock className={`size-4 ${timeLeft && timeLeft < 60 ? 'text-red-500' : 'text-muted-foreground'}`} />
            <span className={timeLeft && timeLeft < 60 ? 'text-red-500 font-bold' : ''}>
              {mins}:{secs.toString().padStart(2, '0')}
            </span>
          </div>
        </div>
        <div className="h-1 w-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 py-4">
        <div className="flex items-start gap-2">
          <Badge variant="outline" className="mt-0.5 shrink-0">
            {currentRef.difficulty || 'Q'}
          </Badge>
          <h2 className="text-base font-semibold leading-relaxed">
            {currentRef.question}
          </h2>
        </div>

        {currentRef.mainConcepts?.length > 0 && !currentResult && (
          <Card className="border-dashed">
            <CardContent className="p-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Key areas to cover:</p>
              <div className="flex flex-wrap gap-1.5">
                {currentRef.mainConcepts.slice(0, 3).map((c, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {c.length > 50 ? c.slice(0, 50) + '...' : c}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {submitting && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Your examiner is grading...</p>
          </div>
        )}

        {!submitting && currentResult && (
          <TheoryResult
            result={currentResult}
            onNext={goNext}
            isLast={currentIndex === references.length - 1}
          />
        )}

        {!submitting && !currentResult && (
          <TheoryInput onSubmit={handleSubmit} disabled={submitting} />
        )}
      </div>
    </div>
  )
}
