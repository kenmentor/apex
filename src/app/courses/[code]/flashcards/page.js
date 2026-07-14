'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getUser, getToken } from '@/lib/auth'
import { ChevronLeft, ChevronRight, Shuffle, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import FlashCard from '@/components/FlashCard'

export default function FlashCardsPage() {
  const params = useParams()
  const router = useRouter()
  const paramCode = (params.code || '').toUpperCase().replace(/-/g, '')
  const formattedCode = paramCode.replace(/^([A-Z]+)(\d+)$/, '$1 $2')

  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [shuffled, setShuffled] = useState(false)

  useEffect(() => {
    const user = getUser()
    if (!user?.email) {
      setError('Please sign in to study flash cards.')
      setLoading(false)
      return
    }

    fetch(`/api/theory/references?courseCode=${encodeURIComponent(formattedCode)}&withAnswer=true`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => {
        if (!r.ok) throw new Error('Failed to load flash cards')
        return r.json()
      })
      .then(data => {
        const items = Array.isArray(data) ? data : []
        setCards(items)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load flash cards. Please try again.')
        setLoading(false)
      })
  }, [formattedCode])

  function handleShuffle() {
    const shuffledCards = [...cards].sort(() => Math.random() - 0.5)
    setCards(shuffledCards)
    setCurrentIdx(0)
    setShuffled(true)
  }

  function handleNext() {
    setCurrentIdx(prev => (prev + 1) % cards.length)
  }

  function handlePrev() {
    setCurrentIdx(prev => (prev - 1 + cards.length) % cards.length)
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-5 pb-24">
        <Card className="w-full max-w-lg flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">Loading flash cards...</p>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-5 pb-24">
        <Card className="w-full max-w-lg py-16 text-center">
          <div className="space-y-4 px-6">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <Layers className="size-7 text-red-500" />
            </div>
            <h2 className="text-lg font-bold">Unable to Load</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button className="mt-2" onClick={() => router.push(`/courses/${paramCode.toLowerCase()}`)}>
              Back to Course
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-5 pb-24">
        <Card className="w-full max-w-lg py-16 text-center">
          <div className="space-y-4 px-6">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-muted">
              <Layers className="size-7 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-bold">No Flash Cards</h2>
            <p className="text-sm text-muted-foreground">No theory questions available for {formattedCode} yet.</p>
            <Button className="mt-2" onClick={() => router.push(`/courses/${paramCode.toLowerCase()}`)}>
              Back to Course
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const current = cards[currentIdx]
  const sections = [...new Set(cards.map(c => c.section).filter(Boolean))]

  return (
    <div className="flex min-h-dvh flex-col bg-background px-5 pb-24 pt-6">
      <div className="mx-auto w-full max-w-lg">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link href={`/courses/${paramCode.toLowerCase()}`} className="flex size-10 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80">
            <ChevronLeft className="size-4" />
          </Link>
          <h1 className="text-lg font-bold">Flash Cards</h1>
          <button
            onClick={handleShuffle}
            className="flex size-10 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
            title="Shuffle cards"
          >
            <Shuffle className="size-4" />
          </button>
        </div>

        {/* Card count */}
        <div className="mb-4 flex items-center justify-center gap-2">
          <Badge variant="outline" className="text-xs">
            {currentIdx + 1} / {cards.length}
          </Badge>
          {sections.length > 1 && current.section && (
            <Badge variant="secondary" className="text-xs">
              {current.section}
            </Badge>
          )}
        </div>

        {/* Flash Card */}
        <div className="mb-6">
          <FlashCard
            key={currentIdx}
            question={current.question}
            answer={current.referenceAnswer || 'Answer not available.'}
            section={current.section}
            index={currentIdx}
            total={cards.length}
          />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handlePrev}
            disabled={cards.length <= 1}
          >
            <ChevronLeft className="mr-1 size-4" />
            Previous
          </Button>
          <Button
            className="flex-1"
            onClick={handleNext}
            disabled={cards.length <= 1}
          >
            Next
            <ChevronRight className="ml-1 size-4" />
          </Button>
        </div>

        {/* Progress dots */}
        <div className="mt-6 flex flex-wrap justify-center gap-1.5">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              className={`size-2 rounded-full transition-colors ${
                i === currentIdx ? 'bg-primary' : 'bg-muted hover:bg-muted/80'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
