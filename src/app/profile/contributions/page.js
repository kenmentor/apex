'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { getToken } from '@/lib/auth'
import { getCached, setCached } from '@/lib/client-cache'
import { Skeleton } from '@/components/ui/skeleton'

const STATUS_STYLE = {
  approved: 'bg-green-500/15 text-green-600',
  pending: 'bg-amber-500/15 text-amber-600',
  rejected: 'bg-red-500/15 text-red-500',
  revoked: 'bg-muted text-muted-foreground',
}

export default function AllContributionsPage() {
  const [items, setItems] = useState(() => getCached('contrib')?.items ?? null)

  useEffect(() => {
    const t = getToken()
    if (!t) { setItems([]); return }
    fetch('/api/contributions/mine', { headers: { Authorization: `Bearer ${t}` }, cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (!d.error) {
          setCached('contrib', d)
          setItems(d.items || [])
        } else if (!getCached('contrib')) setItems([])
      })
      .catch(() => { if (!getCached('contrib')) setItems([]) })
  }, [])

  return (
    <div className="min-h-dvh bg-background pb-28">
      <div className="mx-auto w-full max-w-xl px-4 pt-4">
        <div className="flex items-center gap-3 py-2">
          <Link href="/profile" aria-label="Go back" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-bold tracking-tight">Resources submitted</h1>
          {items && <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">{items.length}</span>}
        </div>
        {!items ? (
          <div className="space-y-2 pt-2">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Nothing yet.</p>
        ) : (
          <div className="space-y-1.5 pt-2">
            {items.map(it => (
              <Link key={`${it.collection}:${it.id}`} href={it.link || '/contribute'} className="flex items-center gap-2.5 rounded-xl bg-muted/60 p-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold">{it.title}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {[it.courseCode, it.topic, it.createdAt ? new Date(it.createdAt).toLocaleDateString() : null].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${STATUS_STYLE[it.status] || STATUS_STYLE.pending}`}>{it.status}</span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
