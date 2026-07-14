'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getUser, getToken } from '@/lib/auth'
import { playClick, playWrong } from '@/lib/sound'
import { ChevronLeft, Clock, BookOpen, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function TheoryQuizPage() {
  const params = useParams()
  const router = useRouter()
  const paramCode = (params.code || '').toUpperCase().replace(/-/g, '')
  const formattedCode = paramCode.replace(/^([A-Z]+)(\d+)$/, '$1 $2')

  const [references, setReferences] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [currentText, setCurrentText] = useState('')
  const [started, setStarted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [examFinished, setExamFinished] = useState(false)
  const [grading, setGrading] = useState(false)
  const [error, setError] = useState(null)
  const startTimeRef = useRef(null)

  useEffect(() => {
    fetch(`/api/theory/references?courseCode=${encodeURIComponent(formattedCode)}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load questions')
        return r.json()
      })
      .then(data => {
        setReferences(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load examination questions. Please try again.')
        setLoading(false)
      })
  }, [formattedCode])

  const timeExpiredRef = useRef()
  timeExpiredRef.current = { references, currentIndex, answers, currentText }

  useEffect(() => {
    if (!started || timeLeft === null || examFinished || grading) return
    if (timeLeft <= 0) {
      const { references: refs, currentIndex: idx, answers: prevAnswers, currentText: text } = timeExpiredRef.current
      const ref = refs[idx]
      if (!ref) {
        setError('Examination error: question not found.')
        return
      }
      const newAnswers = [...prevAnswers, {
        referenceId: ref.id,
        text: text.trim(),
        answerType: 'text',
      }]
      setAnswers(newAnswers)
      setCurrentText('')
      playWrong()

      if (idx < refs.length - 1) {
        setCurrentIndex(idx + 1)
        setTimeLeft(600)
      } else {
        setExamFinished(true)
        submitAllAnswers(newAnswers)
      }
      return
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
    return () => clearTimeout(timer)
  }, [started, timeLeft, examFinished, grading])

  function startExam() {
    const shuffled = [...references].sort(() => Math.random() - 0.5)
    setReferences(shuffled)
    setCurrentIndex(0)
    setAnswers([])
    setCurrentText('')
    setStarted(true)
    setTimeLeft(600)
    startTimeRef.current = Date.now()
  }

  function handleSubmitRequest() {
    if (currentText.trim().length < 10) return
    setShowConfirm(true)
  }

  function handleConfirmSubmit() {
    const ref = references[currentIndex]
    if (!ref) return

    setShowConfirm(false)
    setSubmitting(true)
    playClick()

    const newAnswers = [...answers, {
      referenceId: ref.id,
      text: currentText.trim(),
      answerType: 'text',
    }]
    setAnswers(newAnswers)
    setCurrentText('')

    if (currentIndex < references.length - 1) {
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1)
        setTimeLeft(600)
        setSubmitting(false)
      }, 300)
    } else {
      setExamFinished(true)
      setSubmitting(false)
      submitAllAnswers(newAnswers)
    }
  }

  async function submitAllAnswers(allAnswers) {
    setGrading(true)
    try {
      const user = getUser()
      if (!user?.email) {
        setError('Please sign in to view your results.')
        setGrading(false)
        return
      }

      const token = getToken()
      if (!token) {
        setError('Session expired. Please sign in again.')
        setGrading(false)
        return
      }

      const res = await fetch('/api/theory/grade', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseCode: formattedCode,
          answers: allAnswers,
        }),
      })

      let data
      try {
        data = await res.json()
      } catch {
        throw new Error('Server returned an invalid response. Please try again.')
      }

      if (!res.ok) {
        throw new Error(data.error || 'Grading failed')
      }

      if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
        throw new Error('No results returned from examiner.')
      }

      const elapsed = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0

      try {
        sessionStorage.setItem('theory_results', JSON.stringify({
          courseCode: formattedCode,
          results: data.results,
          references: references.map(r => ({ id: r.id, question: r.question })),
          totalPoints: data.totalPoints,
          maxPoints: data.maxPoints,
          percentage: data.percentage,
          elapsed,
          totalQuestions: references.length,
        }))
      } catch {}

      router.push(`/courses/${paramCode.toLowerCase()}/theory/results`)
    } catch (err) {
      setError(err.message || 'Examination grading failed. Please try again.')
      setGrading(false)
    }
  }

  // ─────────── ERROR ───────────
  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-5 pb-24">
        <Card className="w-full max-w-lg py-16 text-center">
          <div className="space-y-4 px-6">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="size-7 text-red-500" />
            </div>
            <h2 className="text-lg font-bold">Examination Error</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => router.push(`/courses/${paramCode.toLowerCase()}`)}>
                Back to Course
              </Button>
              <Button className="flex-1" onClick={() => { setError(null); setGrading(false); setExamFinished(false) }}>
                Retry
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // ─────────── LOADING ───────────
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-5 pb-24">
        <Card className="w-full max-w-lg flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">Loading examination...</p>
        </Card>
      </div>
    )
  }

  // ─────────── NO QUESTIONS ───────────
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

  // ─────────── GRADING SCREEN ───────────
  if (grading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-5 pb-24">
        <Card className="w-full max-w-lg py-16 text-center">
          <div className="space-y-4">
            <Loader2 className="mx-auto size-10 animate-spin text-primary" />
            <h2 className="text-lg font-bold">Evaluating Examination</h2>
            <p className="text-sm text-muted-foreground px-8">
              The examiner is reviewing your answers. This may take a moment.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  // ─────────── EXAM INSTRUCTIONS ───────────
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
                  {[
                    `This examination consists of ${references.length} essay questions. Answer all questions.`,
                    'Each question is graded out of 6 marks by the examiner. Total: ' + (references.length * 6) + ' marks.',
                    'You have 10 minutes per question. The clock starts when you view the question.',
                    'No going back. Once you submit, you cannot return to a previous question.',
                    'If time expires, the question is marked as unanswered (0 marks).',
                    'Answers are evaluated strictly by the examiner. Write clearly and demonstrate understanding.',
                  ].map((rule, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">{i + 1}</span>
                      <p className="text-sm text-muted-foreground">{rule}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
              <CardContent className="flex items-start gap-3 p-4">
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Academic Integrity</p>
                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                    By starting this examination, you agree to answer independently. Your responses will be evaluated for originality and conceptual accuracy.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button onClick={startExam} className="w-full py-6 text-base font-bold tracking-wide">
              BEGIN EXAMINATION
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ─────────── EXAM SCREEN ───────────
  const currentRef = references[currentIndex]
  if (!currentRef) {
    setError('Question not found.')
    return null
  }

  const progress = ((currentIndex) / references.length) * 100
  const mins = Math.floor((timeLeft || 0) / 60)
  const secs = (timeLeft || 0) % 60

  return (
    <div className="flex min-h-dvh flex-col bg-background px-5 pb-24 pt-6">
      <div className="mx-auto w-full max-w-lg">
        {/* Top bar */}
        <div className="mb-5 flex items-center justify-between">
          <button
            onClick={() => {
              if (!submitting && confirm('Exit examination? Your progress will be lost.')) {
                router.push(`/courses/${paramCode.toLowerCase()}`)
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
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #ff9f43, #ff4757)',
            }}
          />
        </div>

        {/* Question */}
        <Card className="mb-6 flex min-h-[120px] items-center justify-center px-7 py-9 text-center">
          <p className="text-base font-medium leading-relaxed">{currentRef.question}</p>
        </Card>

        {/* Input area */}
        {!submitting && (
          <div className="space-y-3">
            <textarea
              value={currentText}
              onChange={(e) => setCurrentText(e.target.value)}
              placeholder="Write your answer here..."
              className="w-full min-h-[200px] resize-none rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {currentText.trim().length} characters {currentText.trim().length < 10 && `(minimum 10)`}
              </span>
              <Button
                onClick={handleSubmitRequest}
                disabled={currentText.trim().length < 10}
                size="sm"
                className="font-bold"
              >
                SUBMIT ANSWER
              </Button>
            </div>
          </div>
        )}

        {/* Submit confirmation */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm">
            <Card className="w-full max-w-sm space-y-4 py-8 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="size-7 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold">Submit Answer?</h3>
              <p className="px-6 text-sm text-muted-foreground">
                Once submitted, you cannot go back to change your answer.
              </p>
              <div className="space-y-2 px-6 pt-2">
                <Button onClick={handleConfirmSubmit} className="w-full py-5 text-sm font-bold">
                  YES, SUBMIT
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setShowConfirm(false)}>
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
