'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getUser, getToken } from '@/lib/auth'
import { playClick, playCorrect, playWrong } from '@/lib/sound'
import { ArrowLeft, Clock, BookOpen, Loader2, AlertTriangle, ChevronLeft } from 'lucide-react'
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
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [startTime, setStartTime] = useState(null)

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
    setTimeLeft(600)
    setStartTime(Date.now())
  }

  const handleAutoSubmit = useCallback(() => {
    if (currentResult || submitting) return
    playWrong()
    const skipped = {
      keywordScore: 0,
      llmScore: 0,
      totalPoints: 0,
      percentage: 0,
      feedback: { breakdown: 'Time expired. No answer was recorded for this question.', matchedConcepts: [], missingConcepts: [], suggestions: '' },
      keywordMatched: [],
    }
    setCurrentResult(skipped)
    setResults(prev => [...prev, skipped])
  }, [currentResult, submitting])

  async function handleSubmit(answer) {
    if (submitting) return
    setConfirmSubmit(false)
    setSubmitting(true)
    playClick()

    try {
      const user = getUser()
      const ref = references[currentIndex]

      if (!user?.email) {
        alert('Please sign in to submit your answer.')
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
      alert(err.message || 'Failed to submit answer.')
    }
    setSubmitting(false)
  }

  function goNext() {
    if (currentIndex < references.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setCurrentResult(null)
      setConfirmSubmit(false)
      setTimeLeft(600)
    } else {
      const elapsed = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0
      try {
        sessionStorage.setItem('theory_results', JSON.stringify({
          courseCode: formattedCode,
          results,
          references: references.map(r => ({ id: r.id, question: r.question })),
          elapsed,
          totalQuestions: references.length,
        }))
      } catch {}
      router.push(`/courses/${paramCode.toLowerCase()}/theory/results`)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-5 pb-24">
        <Card className="w-full max-w-lg flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">Loading theory questions...</p>
        </Card>
      </div>
    )
  }

  if (references.length === 0) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-5 pb-24">
        <Card className="w-full max-w-lg flex items-center justify-center py-20 text-center">
          <div>
            <div className="mb-4 text-5xl">📚</div>
            <p className="text-muted-foreground">No theory questions for {formattedCode}</p>
            <Link href={`/courses/${paramCode.toLowerCase()}`} className="mt-5 inline-block">
              <Button className="mt-5 px-6">Back to Course</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  // ─────────── EXAM INSTRUCTIONS SCREEN ───────────
  if (!started) {
    return (
      <div className="flex min-h-dvh flex-col bg-background px-5 pb-24 pt-6">
        <div className="mx-auto w-full max-w-lg">
          <div className="mb-8 flex items-center justify-between">
            <Link href={`/courses/${paramCode.toLowerCase()}`} className="flex size-10 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80">
              <ChevronLeft className="size-4" />
            </Link>
            <h1 className="text-lg font-bold">Theory Examination</h1>
            <div className="size-10" />
          </div>

          <div className="space-y-6">
            <Card className="py-8 text-center">
              <div className="space-y-3">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
                  <BookOpen className="size-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold">{formattedCode}</h2>
                <p className="text-sm text-muted-foreground">Theory Examination</p>
              </div>
            </Card>

            <Card>
              <CardContent className="p-5">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide">Examination Rules</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">1</span>
                    <p className="text-sm text-muted-foreground">This examination consists of <span className="font-semibold text-foreground">{references.length} essay questions</span>. Answer all questions.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">2</span>
                    <p className="text-sm text-muted-foreground">Each question carries <span className="font-semibold text-foreground">10 marks</span> (4 marks for keyword relevance, 6 marks for AI examiner evaluation). Total: <span className="font-semibold text-foreground">{references.length * 10} marks</span>.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">3</span>
                    <p className="text-sm text-muted-foreground">You have <span className="font-semibold text-foreground">10 minutes per question</span>. The clock starts when you view each question.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">4</span>
                    <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">No going back.</span> Once you submit an answer, you cannot return to a previous question.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">5</span>
                    <p className="text-sm text-muted-foreground">If time expires before submission, the question will be marked as <span className="font-semibold text-foreground"> unanswered (0 marks)</span>.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">6</span>
                    <p className="text-sm text-muted-foreground">Answers are evaluated by an AI examiner using a reference marking guide. Write clearly and demonstrate understanding of key concepts.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
              <CardContent className="flex items-start gap-3 p-4">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Important Notice</p>
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                    By starting this examination, you agree to answer independently without external assistance. Your responses will be evaluated for originality and conceptual accuracy.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button onClick={startQuiz} className="w-full py-6 text-base font-bold tracking-wide">
              BEGIN EXAMINATION
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ─────────── EXAM SCREEN ───────────
  const currentRef = references[currentIndex]
  const progress = ((currentIndex + (currentResult ? 1 : 0)) / references.length) * 100
  const mins = Math.floor((timeLeft || 0) / 60)
  const secs = (timeLeft || 0) % 60

  return (
    <div className="flex min-h-dvh flex-col bg-background px-5 pb-24 pt-6">
      <div className="mx-auto w-full max-w-lg">
        {/* Top bar */}
        <div className="mb-5 flex items-center justify-between">
          <button
            onClick={() => {
              if (!currentResult && !submitting) {
                if (confirm('Exit examination? Your progress on this question will be lost.')) {
                  router.push(`/courses/${paramCode.toLowerCase()}`)
                }
              }
            }}
            className="flex size-10 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
          >
            <ChevronLeft className="size-4" />
          </button>
          <h1 className="text-lg font-bold">{formattedCode}</h1>
          <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 font-semibold ${timeLeft && timeLeft < 120 ? 'bg-red-100 text-red-500 dark:bg-red-950/50' : 'bg-red-50 text-red-500 dark:bg-red-950/30'}`}>
            <Clock className="size-4" />
            <span className="font-mono text-sm">{mins}:{secs.toString().padStart(2, '0')}</span>
          </div>
        </div>

        {/* Progress */}
        <p className="mb-2 text-sm text-muted-foreground">Question {currentIndex + 1} of {references.length}</p>
        <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-400 ease-out"
            style={{
              width: `${(currentIndex / references.length) * 100}%`,
              background: 'linear-gradient(90deg, #ff9f43, #ff4757)',
            }}
          />
        </div>

        {/* Question */}
        <Card className="mb-6 flex min-h-[120px] items-center justify-center px-7 py-9 text-center">
          <p className="text-base font-medium leading-relaxed">{currentRef.question}</p>
        </Card>

        {/* Grading in progress */}
        {submitting && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Evaluating your response...</p>
            <p className="text-xs text-muted-foreground">This may take a moment</p>
          </div>
        )}

        {/* Result */}
        {!submitting && currentResult && (
          <TheoryResult
            result={currentResult}
            onNext={goNext}
            isLast={currentIndex === references.length - 1}
          />
        )}

        {/* Input */}
        {!submitting && !currentResult && (
          <TheoryInput onSubmit={handleSubmit} disabled={submitting} />
        )}
      </div>
    </div>
  )
}
