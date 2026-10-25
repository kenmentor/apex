'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getUser } from '@/lib/auth'
import { scorePairs } from '@/lib/games'

export default function PairsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center pb-24"><p className="text-sm text-muted-foreground">Shuffling pairs…</p></div>}>
      <PairsInner />
    </Suspense>
  )
}

function PairsInner() {
  const params = useSearchParams()
  const [user, setUser] = useState(null)
  const [round, setRound] = useState(null)
  const [selTerm, setSelTerm] = useState(null)
  const [cleared, setCleared] = useState([])
  const [mistakes, setMistakes] = useState(0)
  const [result, setResult] = useState(null)
  const [t0, setT0] = useState(0)
  const [runId, setRunId] = useState(0)

  const course = params.get('course') || 'COS 202'
  const raceId = params.get('race')

  function load(seedSuffix = '') {
    const seed = `pairs-${Date.now()}${seedSuffix}`
    fetch(`/api/games/pairs?course=${encodeURIComponent(course)}&seed=${seed}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.pairs) {
          setRound(d)
          setCleared([])
          setMistakes(0)
          setResult(null)
          setSelTerm(null)
          setT0(Date.now())
        }
      })
      .catch(() => {})
  }

  useEffect(() => { setUser(getUser()); load() }, [course]) // eslint-disable-line react-hooks/exhaustive-deps

  function tapTerm(i) {
    if (result || cleared.includes(i)) return
    if (selTerm === i) { setSelTerm(null); return }
    setSelTerm(i)
  }

  function tapDef(j) {
    if (result || selTerm === null || cleared.includes(selTerm)) return
    if (selTerm === j) {
      setCleared(prev => [...prev, j])
      setSelTerm(null)
      if (cleared.length + 1 >= (round?.pairs?.length || 0)) finish(cleared.length + 1, mistakes)
    } else {
      setMistakes(m => m + 1)
      setSelTerm(null)
    }
  }

  async function finish(done, errs) {
    const total = round.pairs.length
    const secs = Math.round((Date.now() - t0) / 1000)
    const accuracy = scorePairs(done, total, errs)
    const passed = accuracy >= 80
    setResult({ accuracy, done, total, mistakes: errs, seconds: secs, passed })
    const u = user || getUser()
    if (u) {
      await fetch('/api/games/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u.email, topicId: `pairs-${course}`, format: 'pairs', cleared: done, total, mistakes: errs, seconds: secs }),
      }).catch(() => {})
      if (raceId) {
        await fetch('/api/races', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: raceId, action: 'finish', email: u.email, accuracy, seconds: secs, difficulty: 1, format: 'pairs' }),
        }).catch(() => {})
      }
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-3">
        <Link href={raceId ? '/races' : '/'} className="flex size-9 items-center justify-center rounded-lg hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <h1 className="text-xl font-bold">Match Pairs — {course}</h1>
      </div>
      {!round && <p className="text-sm text-muted-foreground">Shuffling pairs…</p>}
      {round && !result && (
        <>
          <p className="rounded-lg bg-muted p-2 text-center text-sm">Cleared {cleared.length}/{round.pairs.length} · ❌ {mistakes} (−5 each) — tap a term, then its match</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              {round.terms.map(i => (
                <button key={i} disabled={cleared.includes(i)} onClick={() => tapTerm(i)}
                  className={`w-full rounded-lg border p-2 text-left text-xs ${cleared.includes(i) ? 'bg-green-500/10 text-green-600' : selTerm === i ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                  {round.pairs[i].term}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {round.defs.map(i => (
                <button key={i} disabled={cleared.includes(i)} onClick={() => tapDef(i)}
                  className={`w-full rounded-lg border p-2 text-left text-xs ${cleared.includes(i) ? 'bg-green-500/10 text-green-600' : 'hover:bg-muted'}`}>
                  {round.pairs[i].def}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      {result && (
        <div className="space-y-2 rounded-xl border p-4">
          <p className={`text-sm ${result.passed ? 'text-green-600' : 'text-amber-600'}`}>
            {result.done}/{result.total} pairs, {result.mistakes} mistakes, {result.seconds}s — {result.accuracy}% {result.passed ? 'Passed!' : 'Below 80%.'}
          </p>
          <button onClick={() => { setRunId(r => r + 1); load(':r' + runId) }} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground">Replay (reshuffled)</button>
        </div>
      )}
    </div>
  )
}
