'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getUser } from '@/lib/auth'
import { scoreSprint } from '@/lib/games'

export default function SprintPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center pb-24"><p className="text-sm text-muted-foreground">Loading sprint…</p></div>}>
      <SprintInner />
    </Suspense>
  )
}

function SprintInner() {
  const params = useSearchParams()
  const [user, setUser] = useState(null)
  const [bank, setBank] = useState(null)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [t0, setT0] = useState(0)
  const [left, setLeft] = useState(0)

  const course = params.get('course') || 'COS 202'
  const raceId = params.get('race')

  useEffect(() => {
    setUser(getUser())
    fetch(`/api/games/sprint?course=${encodeURIComponent(course)}&n=10`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.questions) {
          setBank(d)
          setT0(Date.now())
          setLeft(d.timerSeconds || 300)
        }
      })
      .catch(() => {})
  }, [course])

  useEffect(() => {
    if (!bank || result) return
    const t = setInterval(() => {
      setLeft(prev => {
        if (prev <= 1) { clearInterval(t); submit(true); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [bank, result]) // eslint-disable-line react-hooks/exhaustive-deps

  function pick(qid, letter) {
    if (result) return
    setAnswers(prev => ({ ...prev, [qid]: letter }))
  }

  async function submit(auto = false) {
    if (result || !bank) return
    const secs = Math.round((Date.now() - t0) / 1000)
    let correct = 0
    for (const q of bank.questions) {
      if ((answers[q.id] || '').toLowerCase() === String(bank.answers[q.id] || '').toLowerCase()) correct += 1
    }
    const accuracy = scoreSprint(correct, bank.questions.length)
    const passed = accuracy >= 80
    setResult({ accuracy, correct, total: bank.questions.length, seconds: secs, passed, auto })
    const u = user || getUser()
    if (u) {
      await fetch('/api/games/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u.email, topicId: `sprint-${course}`, format: 'sprint', correct, total: bank.questions.length, seconds: secs }),
      }).catch(() => {})
      if (raceId) {
        await fetch('/api/races', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: raceId, action: 'finish', email: u.email, accuracy, seconds: secs, difficulty: 2, format: 'sprint' }),
        }).catch(() => {})
      }
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-3">
        <Link href={raceId ? '/races' : '/'} className="flex size-9 items-center justify-center rounded-lg hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <h1 className="text-xl font-bold">Speed Sprint — {course}</h1>
      </div>
      {!bank && <p className="text-sm text-muted-foreground">Loading sprint…</p>}
      {bank && !result && (
        <>
          <p className="rounded-lg bg-muted p-2 text-center text-sm font-bold">⏱ {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')} · {Object.keys(answers).length}/{bank.questions.length} answered</p>
          <ol className="space-y-3">
            {bank.questions.map((q, i) => (
              <li key={q.id} className="rounded-xl border p-3">
                <p className="text-sm font-medium">{i + 1}. {q.question}</p>
                <div className="mt-2 grid grid-cols-1 gap-1">
                  {Object.entries(q.options || {}).map(([letter, text]) => (
                    <button key={letter} onClick={() => pick(q.id, letter)}
                      className={`rounded-lg border px-2 py-1 text-left text-sm ${answers[q.id] === letter ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                      <span className="font-bold uppercase">{letter}.</span> {text}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <button onClick={() => submit(false)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Submit sprint</button>
        </>
      )}
      {result && (
        <p className={`rounded-lg p-3 text-sm ${result.passed ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'}`}>
          {result.correct}/{result.total} in {result.seconds}s — {result.accuracy}% {result.passed ? 'Passed! Logged.' : 'Below 80%.'} {raceId && 'Race entry submitted.'}
        </p>
      )}
    </div>
  )
}
