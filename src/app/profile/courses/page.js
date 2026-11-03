'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { getToken } from '@/lib/auth'
import { getCached, setCached } from '@/lib/client-cache'
import { Skeleton } from '@/components/ui/skeleton'

export default function CoursesMaintainedPage() {
  const [courses, setCourses] = useState(() => getCached('contrib')?.courses ?? null)

  useEffect(() => {
    const t = getToken()
    if (!t) { setCourses([]); return }
    fetch('/api/contributions/mine', { headers: { Authorization: `Bearer ${t}` }, cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (!d.error) {
          setCached('contrib', d)
          setCourses(d.courses || [])
        } else if (!getCached('contrib')) setCourses([])
      })
      .catch(() => { if (!getCached('contrib')) setCourses([]) })
  }, [])

  return (
    <div className="min-h-dvh bg-background pb-28">
      <div className="mx-auto w-full max-w-xl px-4 pt-4">
        <div className="flex items-center gap-3 py-2">
          <Link href="/profile" aria-label="Go back" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-bold tracking-tight">Courses maintained</h1>
          {courses && <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">{courses.length}</span>}
        </div>
        {!courses ? (
          <div className="space-y-2 pt-2">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : courses.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          <div className="divide-y divide-border/60 px-1 pt-1">
            {courses.map(c => (
              <Link key={c.courseCode} href={`/courses/${String(c.courseCode || '').toLowerCase().replace(/\s+/g, '')}`} className="flex items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{c.courseCode}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{c.total} items · {c.approved} approved</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
