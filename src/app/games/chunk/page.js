'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getUser } from '@/lib/auth'
import { chunkText, seededShuffle, scoreOrder } from '@/lib/games'

const SAMPLE = 'Photosynthesis converts light energy into chemical energy. Chlorophyll captures sunlight in the leaves. Water and carbon dioxide are the raw inputs. Glucose and oxygen are the outputs.'

export default function ChunkGamePage() {
  const [started, setStarted] = useState(false)
  const [chunks, setChunks] = useState([])
  const [placed, setPlaced] = useState([])
  const [result, setResult] = useState(null)
  const [seconds, setSeconds] = useState(0)
  const [t0, setT0] = useState(0)

  function start() {
    const parts = chunkText(SAMPLE)
    const correct = parts.map((_, i) => i)
    const shuffled = seededShuffle(correct, 'sample-' + Date.now())
    setChunks(parts)
    setPlaced(shuffled)
    setResult(null)
    setT0(Date.now())
    setStarted(true)
  }

  function move(i, dir) {
    setPlaced(prev => {
      const next = [...prev]
      const j = i + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  async function submit() {
    const secs = Math.round((Date.now() - t0) / 1000)
    setSeconds(secs)
    const correct = chunks.map((_, i) => i)
    const accuracy = scoreOrder(placed, correct)
    setResult({ accuracy, passed: accuracy >= 80, seconds: secs })
    const u = getUser()
    if (u) {
      await fetch('/api/games/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u.email, topicId: 'sample-photosynthesis', placedIds: placed, correctIds: correct, seconds: secs }),
      }).catch(() => {})
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <h1 className="text-xl font-bold">Reassemble the explanation</h1>
      </div>
      {!started && (
        <div className="space-y-3 rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">The explanation is chunked and shuffled. Put the pieces back in order — 80%+ to pass.</p>
          <button onClick={start} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Start game</button>
        </div>
      )}
      {started && (
        <>
          <ol className="space-y-2">
            {placed.map((ci, i) => (
              <li key={i} className="flex items-center gap-2 rounded-xl border p-3 text-sm">
                <span className="flex-1">{chunks[ci]}</span>
                <button onClick={() => move(i, -1)} className="rounded border px-2 py-1 text-xs">↑</button>
                <button onClick={() => move(i, 1)} className="rounded border px-2 py-1 text-xs">↓</button>
              </li>
            ))}
          </ol>
          <button onClick={submit} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Submit ({seconds ? `${seconds}s` : 'timing...'})</button>
        </>
      )}
      {result && (
        <p className={`rounded-lg p-3 text-sm ${result.passed ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'}`}>
          {result.accuracy}% correct in {result.seconds}s — {result.passed ? 'Passed! Logged against the topic.' : 'Below 80%. Try again or re-read the topic.'}
        </p>
      )}
    </div>
  )
}
