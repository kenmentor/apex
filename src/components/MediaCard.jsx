'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Eye, Heart, Music } from 'lucide-react'
import { FileIcon, defaultStyles } from 'react-file-icon'
import AudioPlayer from '@/components/AudioPlayer'
import { getToken } from '@/lib/auth'
import { toast } from 'sonner'
import Link from 'next/link'
import { pdfReadHref } from '@/lib/reader'

// Standard media presentation: every video / audio / PDF / file renders
// through this card — same cover language, same views + upvote row.
// - Views count once per session per URL (tab switches remount cards).
// - Upvotes toggle per signed-in user.

const PDFJS_VERSION = '6.4.299'
const coverCache = new Map() // pdfUrl -> dataUrl | null
const pagesCache = new Map() // pdfUrl -> page count
const viewedOnce = new Set()
let pdfjsPromise = null

function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((m) => {
      m.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`
      return m
    })
  }
  return pdfjsPromise
}

export function extOf(url) {
  const m = String(url || '').split('?')[0].match(/\.([a-z0-9]{2,5})$/i)
  return (m ? m[1] : '').toLowerCase()
}

export function kindOf(item = {}) {
  const url = String(item.url || '')
  const t = String(item.type || item.kind || '').toLowerCase()
  if (/youtu\.be|youtube\.com/.test(url)) return 'youtube'
  if (t === 'video' || /\.(mp4|webm|mov)(\?|$)/i.test(url)) return 'video'
  if (t === 'audio' || /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(url)) return 'audio'
  if (t === 'pdf' || /\.pdf(\?|$)/i.test(url)) return 'pdf'
  if (t === 'image' || /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url)) return 'image'
  return 'file'
}

export function styleForExt(ext) {
  return defaultStyles[ext] || null
}

function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function useMediaStat(url) {
  const [stat, setStat] = useState({ views: 0, upvotes: 0, upvoted: false })

  useEffect(() => {
    if (!url) return
    let live = true
    fetch(`/api/media-stats?u=${encodeURIComponent(url)}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (live && !d.error) setStat({ views: d.views || 0, upvotes: d.upvotes || 0, upvoted: !!d.upvoted }) })
      .catch(() => {})
    if (!viewedOnce.has(url)) {
      viewedOnce.add(url)
      fetch('/api/media-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ url, action: 'view' }),
      }).then(r => r.json())
        .then(d => { if (live && !d.error) setStat({ views: d.views || 0, upvotes: d.upvotes || 0, upvoted: !!d.upvoted }) })
        .catch(() => {})
    }
    return () => { live = false }
  }, [url])

  async function toggleUpvote() {
    if (!url) return
    if (!getToken()) { toast.error('Sign in to upvote'); return }
    setStat(s => ({ views: s.views, upvotes: s.upvotes + (s.upvoted ? -1 : 1), upvoted: !s.upvoted }))
    try {
      const res = await fetch('/api/media-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ url, action: 'upvote' }),
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setStat({ views: d.views || 0, upvotes: d.upvotes || 0, upvoted: !!d.upvoted })
    } catch (e) {
      setStat(s => ({ views: s.views, upvotes: s.upvotes + (s.upvoted ? -1 : 1), upvoted: !s.upvoted }))
      toast.error(e.message || 'Could not upvote')
    }
  }

  return [stat, toggleUpvote]
}

function StatRow({ url, className = '' }) {
  const [stat, toggleUpvote] = useMediaStat(url)
  return (
    <div className={`flex items-center gap-4 text-[11px] text-muted-foreground ${className}`}>
      <span className="flex items-center gap-1">
        <Eye className="size-3.5" />
        <span className="font-semibold tabular-nums">{stat.views}</span>
      </span>
      <button onClick={toggleUpvote} aria-label="Upvote" className="flex items-center gap-1 transition hover:scale-105">
        <Heart className={`size-3.5 ${stat.upvoted ? 'fill-red-500 text-red-500' : ''}`} />
        <span className={`font-semibold tabular-nums ${stat.upvoted ? 'text-red-500' : ''}`}>{stat.upvotes}</span>
      </button>
    </div>
  )
}

function FileGlyph({ ext, size = 40 }) {
  const style = styleForExt(ext)
  if (style) return <FileIcon extension={ext} {...style} style={{ width: size }} />
  return <FileIcon extension={ext || '?'} color="#8e99a4" style={{ width: size }} />
}

// True book cover: first PDF page rendered via pdf.js, cached per URL.
// Remote PDFs go through /api/pdf-proxy so servers without CORS headers
// still render (browsers block direct cross-origin pdf.js fetches).
function proxiedPdfUrl(url) {
  if (!url || !/^https?:\/\//i.test(url)) return url
  return `/api/pdf-proxy?url=${encodeURIComponent(url)}`
}

// True book cover: first PDF page rendered via pdf.js, cached per URL.
export function PdfCover({ url, className, onPages }) {
  const srcUrl = proxiedPdfUrl(url)
  const [src, setSrc] = useState(() => (coverCache.has(srcUrl) ? coverCache.get(srcUrl) : undefined));

  useEffect(() => {
    if (!srcUrl) return
    if (coverCache.has(srcUrl)) {
      setSrc(coverCache.get(srcUrl))
      if (pagesCache.has(srcUrl)) onPages?.(pagesCache.get(srcUrl))
      return
    }
    let live = true
    ;(async () => {
      try {
        const pdfjs = await loadPdfjs()
        const pdf = await pdfjs.getDocument({ url: srcUrl, withCredentials: false }).promise
        const page = await pdf.getPage(1)
        const viewport = page.getViewport({ scale: 0.55 })
        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72)
        coverCache.set(srcUrl, dataUrl)
        pagesCache.set(srcUrl, pdf.numPages)
        if (live) { setSrc(dataUrl); onPages?.(pdf.numPages) }
        await pdf.destroy().catch(() => {})
      } catch {
        coverCache.set(srcUrl, null)
        if (live) setSrc(null)
      }
    })()
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  if (src) return <img src={src} alt="PDF cover" className={`object-cover ${className}`} loading="lazy" draggable={false} />
  if (src === undefined) {
    return (
      <div className={`flex animate-pulse items-center justify-center bg-muted ${className}`}>
        <FileGlyph ext="pdf" size={32} />
      </div>
    )
  }
  return (
    <div className={`flex items-center justify-center bg-muted ${className}`}>
      <FileGlyph ext="pdf" size={36} />
    </div>
  )
}

function YouTubeCard({ item }) {
  const [playing, setPlaying] = useState(false)
  const m = String(item.url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/)
  const vid = m ? m[1] : null
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {playing && vid ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${vid}?rel=0&cc_load_policy=1&autoplay=1`}
          title={item.title}
          className="aspect-video w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button onClick={() => vid && setPlaying(true)} className="relative block aspect-video w-full bg-black text-left">
          {vid && (
            <img src={`https://img.youtube.com/vi/${vid}/hqdefault.jpg`} alt={item.title} className="size-full object-cover" loading="lazy" />
          )}
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-black/70">
              <Play className="size-5 text-white" fill="white" />
            </span>
          </span>
        </button>
      )}
      <div className="px-3 pt-2.5">
        <div className="truncate text-sm font-semibold">{item.title}</div>
      </div>
      {item.url && <StatRow url={item.url} className="px-3 pb-2 pt-1" />}
    </div>
  )
}

function VideoFileCard({ item }) {
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef(null)
  function play() {
    setPlaying(true)
    requestAnimationFrame(() => videoRef.current?.play().catch(() => {}))
  }
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="relative bg-black">
        <video ref={videoRef} src={item.url} controls={playing} muted={!playing} playsInline preload="metadata" className="max-h-80 w-full" />
        {!playing && (
          <button onClick={play} aria-label="Play video" className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-black/70">
              <Play className="size-5 text-white" fill="white" />
            </span>
          </button>
        )}
      </div>
      <div className="px-3 pt-2.5">
        <div className="truncate text-sm font-semibold">{item.title}</div>
      </div>
      {item.url && <StatRow url={item.url} className="px-3 pb-2 pt-1" />}
    </div>
  )
}

function AudioCard({ item }) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center gap-3 p-3 pb-1">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-500/10">
          <Music className="size-4 text-green-500" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{item.title}</span>
          {item.duration && <span className="text-[11px] text-muted-foreground">{item.duration}</span>}
        </span>
      </div>
      {item.url ? (
        <div className="px-2 pb-2">
          <AudioPlayer src={item.url} />
        </div>
      ) : (
        <p className="px-3 pb-3 text-[11px] text-muted-foreground">Audio coming soon</p>
      )}
      {item.url && <StatRow url={item.url} className="px-3 pb-2" />}
    </div>
  )
}

function PdfCard({ item, onOpen }) {
  const [pages, setPages] = useState(() => pagesCache.get(item.url) ?? null)
  // Uploaded cover wins; otherwise the cover is rendered from the PDF itself.
  const cover = item.coverUrl || null
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <button onClick={() => onOpen?.(item)} className="flex w-full items-center gap-3.5 p-3 text-left">
        <span className="relative block w-24 shrink-0 overflow-hidden rounded-r-md rounded-l-[2px] border shadow-[4px_4px_12px_rgba(0,0,0,0.18)]">
          {cover ? (
            <img src={cover} alt="Book cover" className="aspect-[2/3] w-full object-cover" loading="lazy" draggable={false} />
          ) : (
            <PdfCover url={item.url} className="aspect-[2/3] w-full" onPages={setPages} />
          )}
          <span className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/40 via-white/20 to-transparent" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">E-book</span>
          <span className="line-clamp-2 text-sm font-extrabold leading-snug">{item.title}</span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground">
            {pages ? `${pages} page${pages === 1 ? '' : 's'}` : 'PDF'}
          </span>
          <span className="mt-1 inline-block rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
            Read now →
          </span>
        </span>
      </button>
      {item.url && <StatRow url={item.url} className="border-t px-3 py-2" />}
    </div>
  )
}

function FileCard({ item }) {
  const ext = extOf(item.url || item.title)
  const readerHref = pdfReadHref({ url: item.url, title: item.title || item.fileName })
  if (readerHref) {
    return (
      <Link href={readerHref} className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:bg-muted/50">
        <span className="shrink-0">
          <FileGlyph ext={ext} size={40} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{item.title || item.fileName || 'File'}</p>
          <p className="text-[11px] uppercase text-muted-foreground">{ext || 'file'} · tap to read</p>
          {item.url && <StatRow url={item.url} className="pt-1" />}
        </div>
      </Link>
    )
  }
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:bg-muted/50">
      <span className="shrink-0">
        <FileGlyph ext={ext} size={40} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{item.title || item.fileName || 'File'}</p>
        <p className="text-[11px] uppercase text-muted-foreground">{ext || 'file'} · tap to open</p>
        {item.url && <StatRow url={item.url} className="pt-1" />}
      </div>
    </a>
  )
}

// The one standardized card. kind auto-detected unless item.type forces it.
export default function MediaCard({ item, onOpenPdf }) {
  const kind = kindOf(item)
  if (kind === 'youtube') return <YouTubeCard item={item} />
  if (kind === 'video') return <VideoFileCard item={item} />
  if (kind === 'audio') return <AudioCard item={item} />
  if (kind === 'pdf') return <PdfCard item={item} onOpen={onOpenPdf} />
  if (kind === 'image') {
    return (
      <div className="overflow-hidden rounded-xl border bg-card">
        <img src={item.url} alt={item.title || ''} className="max-h-80 w-full object-cover" loading="lazy" />
        <div className="px-3 pt-2.5">
          <div className="truncate text-sm font-semibold">{item.title}</div>
        </div>
        {item.url && <StatRow url={item.url} className="px-3 pb-2 pt-1" />}
      </div>
    )
  }
  return <FileCard item={item} />
}
