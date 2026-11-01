'use client'

import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import SaveToFolder from '@/components/SaveToFolder'
import { PdfCover } from '@/components/MediaCard'

// Shared book display language: 2-col cover grid — title / author / year
// under each cover. Used by the search library and the My Files PDF aisle.
export function uploaderOf(item) {
  const m = String(item.subtitle || '').match(/by\s+(.+)$/)
  return m ? m[1].trim() : 'Study bank'
}

export function savePayload(item, fallbackKind) {
  return {
    name: item.title, itemKind: item.kind || fallbackKind,
    refId: String(item.id || '').replace(/^(v|a|p|t|r|m|q)-/, ''),
    href: item.href || item.url || null, url: item.url || null,
    courseCode: item.courseCode || null, subtitle: item.subtitle || null,
  }
}

export function bookAuthor(item) {
  const u = uploaderOf(item)
  if (u !== 'Study bank') return u
  return item.courseCode || ({ pdf: 'PDF', notes: 'Note', theory: 'Theory', image: 'Image', link: 'Link', file: 'File' }[item.kind] || 'Book')
}

export function bookHref(item) {
  if (item.kind === 'pdf') return item.url || item.href || null
  if (item.url && !String(item.url).includes('/courses') && !String(item.href || '').includes('/courses')) return item.url
  if (item.href) return item.href
  if (item.courseCode) return `/courses/${item.courseCode.toLowerCase().replace(/\s+/g, '')}/theory`
  return null
}

function thumbHue(s) {
  let h = 0
  for (const c of String(s || '?')) h = (h * 31 + c.charCodeAt(0)) % 360
  return h
}

export function BookCover({ item }) {
  if (item.coverUrl) {
    return <img src={item.coverUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
  }
  if (item.kind === 'pdf' && item.url) {
    return <PdfCover url={item.url} className="h-full w-full" />
  }
  const h = thumbHue(item.title)
  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 p-3 text-center"
      style={{ background: `linear-gradient(135deg, hsl(${h} 55% 38%), hsl(${(h + 40) % 360} 60% 24%)` }}>
      <BookOpen className="size-7 text-white/80" />
      <span className="line-clamp-3 text-[11px] font-bold leading-tight text-white">{item.title}</span>
    </span>
  )
}

export default function BookGrid({ items }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-6">
      {(items || []).map((item) => {
        const href = bookHref(item)
        return (
          <div key={item.id} className="min-w-0">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg shadow-md">
              {href && !String(href).startsWith('/courses') ? (
                <a href={href} target="_blank" rel="noreferrer" className="block h-full w-full"><BookCover item={item} /></a>
              ) : href ? (
                <Link href={href} className="block h-full w-full"><BookCover item={item} /></Link>
              ) : (
                <span className="block h-full w-full"><BookCover item={item} /></span>
              )}
              <span className="absolute right-1.5 top-1.5 rounded-lg bg-background/90">
                <SaveToFolder payload={savePayload(item, item.kind)} />
              </span>
            </div>
            <div className="mt-4">
              <h3 className="line-clamp-2 text-[20px] font-medium leading-[1.45] text-black">
                {href && !String(href).startsWith('/courses') ? (
                  <a href={href} target="_blank" rel="noreferrer">{item.title}</a>
                ) : href ? (
                  <Link href={href}>{item.title}</Link>
                ) : item.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-[18px] leading-7 text-gray-600">{bookAuthor(item)}</p>
              {item.year && <p className="text-[18px] leading-7 text-gray-600">{item.year}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
