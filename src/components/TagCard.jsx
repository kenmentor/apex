'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Zap, FileText, Image as ImageIcon, Film, Music, ExternalLink } from 'lucide-react'
import { parseContent } from '@/lib/material-tags'

const cache = new Map()

const KIND_META = {
  course: { icon: BookOpen, tint: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', tag: 'COURSE' },
  quiz: { icon: Zap, tint: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', tag: 'QUIZ' },
  material: { icon: FileText, tint: 'bg-green-500/10 text-green-600 dark:text-green-400', tag: 'MATERIAL' },
}

function MediaGlyph({ kind }) {
  if (kind === 'image') return <ImageIcon className="size-4" />
  if (kind === 'video') return <Film className="size-4" />
  if (kind === 'audio') return <Music className="size-4" />
  return <FileText className="size-4" />
}

export function TagCard({ kind, tagRef }) {
  const meta = KIND_META[kind] || KIND_META.material
  const Icon = meta.icon
  const key = `${kind}:${tagRef}`
  const [data, setData] = useState(() => (cache.has(key) ? cache.get(key) : null))

  useEffect(() => {
    if (cache.has(key)) return
    let live = true
    fetch(`/api/tag-resolve?kind=${encodeURIComponent(kind)}&ref=${encodeURIComponent(tagRef)}`)
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!live) return
        const val = ok ? d : { error: true }
        cache.set(key, val)
        setData(val)
      })
      .catch(() => { if (live) { cache.set(key, { error: true }); setData({ error: true }) } })
    return () => { live = false }
  }, [key, kind, tagRef])

  // Unresolved (yet or never): quiet inline chip, never broken-looking.
  if (!data || data.error) {
    return (
      <span className="mx-0.5 inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 align-baseline text-[11px] font-semibold text-muted-foreground">
        <Icon className="size-3" />
        {tagRef}
      </span>
    )
  }

  return (
    <Link
      href={data.href}
      className="my-1.5 flex items-center gap-3 rounded-xl border bg-muted/40 p-3 transition-colors hover:bg-muted"
    >
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${meta.tint}`}>
        {kind === 'material' ? <MediaGlyph kind={data.mediaKind} /> : <Icon className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{meta.tag}</span>
        <span className="block truncate text-sm font-bold">{data.title}</span>
        <span className="block truncate text-xs text-muted-foreground">{data.subtitle}</span>
      </span>
      <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}

// Post body: plain text with embedded tag cards.
export function RichContent({ text, className = '' }) {
  const segs = parseContent(text || '')
  if (!segs.length) return null
  return (
    <div className={className}>
      {segs.map((s, i) => s.t === 'text'
        ? <span key={i} className="whitespace-pre-wrap">{s.v}</span>
        : <TagCard key={i} kind={s.kind} tagRef={s.ref} />
      )}
    </div>
  )
}
