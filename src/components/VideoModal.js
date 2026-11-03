'use client'

import { useEffect, useRef, useState } from 'react'
import { X, ExternalLink, Headphones, Maximize, Minimize } from 'lucide-react'
import SaveToFolder from '@/components/SaveToFolder'
import { ytId, ytThumb } from '@/lib/youtube'

// Fullscreen watch player. Portrait: fullscreen takeover with 16:9 stage +
// title/meta/actions below. Landscape (phone slanted): chrome + meta hide
// and the stage fills the whole screen like a native player.
// Standard youtube.com embed (widest compatibility) + an always-visible
// "Watch on YouTube" escape hatch for embeds the owner blocked.
export default function VideoModal({ item, onClose }) {
  const wrapRef = useRef(null)
  const [isFs, setIsFs] = useState(false)
  const [failed, setFailed] = useState(false)

  const src = item?.url || item?.href || null
  const vid = ytId(src)
  const isAudio = !vid && ((item?.kind === 'audio') || /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(src || ''))
  const art = ytThumb(src) || item?.thumb || null

  // Lock page scroll + Esc/back-button close while open.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    window.history.pushState({ video: true }, '')
    const onPop = () => { try { onClose?.() } catch {} }
    window.addEventListener('popstate', onPop)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('popstate', onPop)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const sync = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  async function toggleFs() {
    try {
      if (!document.fullscreenElement) await wrapRef.current?.requestFullscreen?.()
      else await document.exitFullscreen()
    } catch {}
  }

  // System back pops our pushed entry (→ onPop → onClose). The X button
  // mirrors that so one back-press never feels dead afterwards.
  function close() {
    try {
      if (window.history.state?.video) { window.history.back(); return }
    } catch {}
    onClose?.()
  }

  if (!item) return null

  return (
    <div ref={wrapRef} className="fixed inset-0 z-[70] flex h-dvh flex-col bg-black text-white">
      {/* Portrait chrome — hidden in landscape so video owns the screen */}
      <div className="flex shrink-0 items-center gap-1 px-2 py-2 landscape:hidden">
        <button onClick={close} aria-label="Close player"
          className="flex size-10 items-center justify-center rounded-full hover:bg-white/10">
          <X className="size-5" />
        </button>
        <p className="min-w-0 flex-1 truncate text-sm font-bold">{item.title || 'Video'}</p>
        <button onClick={toggleFs} aria-label="Fullscreen"
          className="flex size-10 items-center justify-center rounded-full hover:bg-white/10">
          {isFs ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
        </button>
      </div>

      {/* Stage */}
      <div className="relative w-full shrink-0 bg-black portrait:aspect-video landscape:min-h-0 landscape:flex-1">
        {vid ? (
          <iframe
            key={vid}
            src={`https://www.youtube.com/embed/${vid}?rel=0&playsinline=1&autoplay=1`}
            title={item.title || 'Video'}
            className="absolute inset-0 size-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : isAudio ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-violet-950 via-[#130f40] to-black p-6">
            {art ? (
              <img src={art} alt="" className="size-24 rounded-2xl object-cover shadow-lg" />
            ) : (
              <span className="flex size-24 items-center justify-center rounded-2xl bg-white/10">
                <Headphones className="size-10 text-white" />
              </span>
            )}
            <audio src={src} controls autoPlay playsInline preload="metadata" className="w-full max-w-sm" />
            <p className="max-w-sm truncate text-xs text-white/60">{item.title}</p>
          </div>
        ) : src && !failed ? (
          <video
            key={src}
            src={src}
            controls
            autoPlay
            playsInline
            preload="metadata"
            onError={() => setFailed(true)}
            className="absolute inset-0 size-full bg-black"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm font-bold text-white/80">{src ? 'This video won’t play here' : 'No playable source'}</p>
            {src && (
              <a href={src} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-black">
                <ExternalLink className="size-3.5" /> Open original
              </a>
            )}
          </div>
        )}
        {/* Landscape close — only control left on screen */}
        <button onClick={close} aria-label="Close player"
          className="absolute right-2 top-2 hidden size-10 items-center justify-center rounded-full bg-black/70 text-white landscape:flex">
          <X className="size-5" />
        </button>
      </div>

      {/* Portrait meta — hidden in landscape */}
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4 pb-8 landscape:hidden">
        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug">{item.title}</h3>
        {item.subtitle && <p className="truncate text-xs text-white/60">{item.subtitle}</p>}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <SaveToFolder payload={{
            name: item.title, itemKind: item.kind || 'video',
            refId: String(item.id || '').replace(/^(v|a|p|t|r|m|q)-/, ''),
            href: item.href || src || null, url: src || null,
            courseCode: item.courseCode || null, subtitle: item.subtitle || null,
          }} />
          {src && (
            <a href={src} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/10">
              <ExternalLink className="size-3.5" /> {vid ? 'Watch on YouTube' : 'Open original'}
            </a>
          )}
        </div>
        {vid && <p className="pt-1 text-[11px] text-white/40">Slant your phone sideways — the video fills the screen.</p>}
      </div>
    </div>
  )
}
