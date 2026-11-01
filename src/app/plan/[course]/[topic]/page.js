'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Layers } from 'lucide-react'
import TopicContent from '@/components/TopicContent'

export default function TopicPage({ params }) {
  const { course, topic } = use(params)
  const searchParams = useSearchParams()
  const titleHint = searchParams.get('t') || ''
  const [title, setTitle] = useState(titleHint || 'Topic')

  useEffect(() => {
    fetch(`/api/topic-content?course=${encodeURIComponent(course)}&topic=${encodeURIComponent(topic)}&title=${encodeURIComponent(titleHint)}`)
      .then(r => r.json())
      .then(d => { if (d.topic?.title) setTitle(d.topic.title) })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, topic])

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3 px-5 pb-24 pt-4">
      <div className="flex items-center gap-2">
        <Link href="/plan" className="flex size-8 items-center justify-center rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-sm font-bold">{title}</h1>
        <Link
          href={`/courses/${String(course).toLowerCase().replace(/\s+/g, '')}/flashcards?topic=${encodeURIComponent(topic)}${title && title !== 'Topic' ? `&title=${encodeURIComponent(title)}` : titleHint ? `&title=${encodeURIComponent(titleHint)}` : ''}`}
          title="Study this topic's flashcards"
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-violet-500/10 px-2.5 py-2 text-xs font-bold text-violet-600 hover:bg-violet-500/20 dark:text-violet-400"
        >
          <Layers className="size-4" />
          <span className="hidden sm:inline">Flashcards</span>
        </Link>
      </div>

      <TopicContent course={course} topic={topic} titleHint={titleHint} />
    </div>
  )
}
