'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getUser } from '@/lib/auth'
import { closeMatch, scoreCloze } from '@/lib/games'

export default function ClozePage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center pb-24"><p className="text-sm text-muted-foreground">Preparing blanks…</p></div>}>
      <ClozeInner />
    </Suspense>
  )
}

function ClozeInner() {
  const params = useSearchParams()
  const [user, setUser] = useState(null)
  const [items, setItems] = useState(null)
  const [inputs, setInputs] = useState({})
  const [result, setResult] = useState(null)
  const [t0, setT0] = useState(0)

  const course = params.get('course') || 'COS 202'
  const raceId = params.get('race')

  useEffect(() => {
    setUser(getUser())
    fetch(`/api/games/cloze?course=${encodeURIComponent(course)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.items) { setItems(d.items); setInputs({}); setResult(null); setT0(Date.now()) }
      })
      .catch(() => {})
  }, [course])

  async function submit() {
    if (result || !items) return
    const secs = Math.round((Date.now() - t0) / 1000)
    let correct = 0
    const marks = items.map((it, i) => {
      const ok = closeMatch(inputs[i] || '', it.answers)
      if (ok) correct += 1
      return ok
    })
    const accuracy = scoreCloze(correct, items.length)
    const passed = accuracy >= 80
    setResult({ accuracy, correct, total: items.length, seconds: secs, passed, marks })
    const u = user || getUser()
    if (u) {
      await fetch('/api/games/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u.email, topicId: `cloze-${course}`, format: 'cloze', correct, total: items.length, seconds: secs }),
      }).catch(() => {})
      if (raceId) {
        await fetch('/api/races', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: raceId, action: 'finish', email: u.email, accuracy, seconds: secs, difficulty: 2, format: 'cloze' }),
        }).catch(() => {})
      }
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-3">
        <Link href={raceId ? '/races' : '/'} className="flex size-9 items-center justify-center rounded-lg hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <h1 className="text-xl font-bold">Cloze Blanks — {course}</h1>
      </div>
      {!items && <p className="text-sm text-muted-foreground">Preparing blanks…</p>}
      {items && !result && (
        <>
          {items.map((it, i) => (
            <div key={i} className="rounded-xl border p-3">
              <p className="text-sm">{it.text}</p>
              <input value={inputs[i] || ''} onChange={e => setInputs(prev => ({ ...prev, [i]: e.target.value }))}
                placeholder="Missing word" className="mt-2 w-full rounded-lg border px-2 py-1 text-sm" />
            </div>
          ))}
          <button onClick={submit} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Check answers</button>
        </>
      )}
      {result && items && (
        <div className="space-y-2">
          <p className={`rounded-lg p-3 text-sm ${result.passed ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'}`}>
            {result.correct}/{result.total} in {result.seconds}s — {result.accuracy}% {result.passed ? 'Passed!' : 'Below 80%.'} {raceId && 'Race entry submitted.'}
          </p>
          {items.map((it, i) => (
            <div key={i} className={`rounded-xl border p-3 text-sm ${result.marks[i] ? 'border-green-500/40' : 'border-amber-500/40'}`}>
              <p>{it.text}</p>
              <p className="mt-1 text-xs text-muted-foreground">Your answer: {inputs[i] || '—'} · Correct: {it.answers[0]}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
