'use client'

import { X, ExternalLink, Headphones } from 'lucide-react'
import SaveToFolder from '@/components/SaveToFolder'
import { ytId, ytThumb } from '@/lib/youtube'

// YouTube-style watch modal: 16:9 player on top, title + meta below,
// Save + open-in-YouTube actions. No page change, no new tab.
export default function VideoModal({ item, onClose }) {
  if (!item) return null
  const vid = ytId(item.url)
  const isAudio = !vid && (item.kind === 'audio' || /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(item.url || ''))
  const art = ytThumb(item.url) || item.thumb || null
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-2xl overflow-hidden rounded-t-3xl bg-background shadow-2xl sm:inset-0 sm:m-auto sm:h-fit sm:max-w-xl sm:rounded-3xl">
        <div className="relative aspect-video w-full bg-black">
          {vid ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${vid}?rel=0&autoplay=1`}
              title={item.title}
              className="size-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : isAudio ? (
            <div className="flex size-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-violet-950 via-[#130f40] to-black p-6">
              {art ? (
                <img src={art} alt="" className="size-20 rounded-2xl object-cover shadow-lg" />
              ) : (
                <span className="flex size-20 items-center justify-center rounded-2xl bg-white/10">
                  <Headphones className="size-9 text-white" />
                </span>
              )}
              <audio src={item.url} controls autoPlay playsInline className="w-full max-w-sm" />
            </div>
          ) : item.url ? (
            <video src={item.url} controls autoPlay playsInline className="size-full" />
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-white/60">No playable source</div>
          )}
          <button onClick={onClose} aria-label="Close player"
            className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90">
            <X className="size-5" />
          </button>
        </div>
        <div className="space-y-1 p-4 pb-6">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug">{item.title}</h3>
          {item.subtitle && <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>}
          <div className="flex items-center gap-2 pt-2">
            <SaveToFolder payload={{
              name: item.title, itemKind: item.kind || 'video',
              refId: String(item.id || '').replace(/^(v|a|p|t|r|m|q)-/, ''),
              href: item.href || item.url || null, url: item.url || null,
              courseCode: item.courseCode || null, subtitle: item.subtitle || null,
            }} />
            {item.url && (
              <a href={item.url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted">
                <ExternalLink className="size-3.5" /> YouTube
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
