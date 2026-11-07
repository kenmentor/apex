'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Play, FileText, Eye, ArrowBigUp, MessageCircle } from 'lucide-react'
import PlaceholderMedia from '@/components/PlaceholderMedia'
import { getToken } from '@/lib/auth'
import { haptic } from '@/lib/haptics'
import { thumbFor } from '@/lib/youtube'

function mediaKind(m) {
  const t = (m.type || '').toLowerCase()
  const u = (m.url || '').toLowerCase()
  if (t === 'audio' || /\.(mp3|wav|ogg|m4a)(\?|$)/.test(u)) return 'audio'
  if (t === 'video' || /\.(mp4|webm|mov)(\?|$)/.test(u)) return 'video'
  if (t === 'image' || /\.(jpg|jpeg|png|gif|webp)(\?|$)/.test(u)) return 'image'
  return 'file'
}

export function firstMedia(item) {
  const media = item.data?.media || item.media || []
  return Array.isArray(media) && media.length ? media[0] : null
}

// Media-aware feed card: audio plays inline; everything opens its own page.
export default function FeedCard({ item, userEmail }) {
  const d = item.data || {}
  const postId = d.postId || item._id
  const href = postId ? `/feed/${postId}` : (d.space?.id ? `/groups/${d.space.id}` : '#')
  const m = firstMedia(item)
  const kind = m ? mediaKind(m) : 'text'

  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(d.likeCount || 0)

  async function upvote(e) {
    e.preventDefault()
    e.stopPropagation()
    if (!postId) return
    const prev = liked
    if (!prev) haptic.tap()
    setLiked(!prev)
    setLikes(c => c + (prev ? -1 : 1))
    try {
      const res = await fetch(`/api/space-posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json()
      if (typeof data.liked === 'boolean') { setLiked(data.liked); setLikes(data.likeCount) }
    } catch {
      setLiked(prev)
      setLikes(c => c + (prev ? 1 : -1))
    }
  }

  return (
    <div className="rounded-xl border p-3">
      <Link href={href} className="block">
        <div className="flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold">
            {(d.space?.name || d.authorName || 'S').charAt(0)}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs font-semibold">{d.space?.name || d.authorName || ''}</span>
        </div>
        {d.title && <p className="mt-2 truncate text-sm font-medium">{d.title}</p>}
        {d.placeholder ? (
          <span className="mt-2 block" onClick={e => e.preventDefault()}>
            <PlaceholderMedia kind={d.placeholder} label={d.placeholderLabel} duration={d.duration} />
          </span>
        ) : null}
        {kind === 'image' && (
          <img src={m.url} alt={m.label || d.title || ''} loading="lazy" className="mt-2 max-h-48 w-full rounded-lg object-cover" />
        )}
        {kind === 'video' && (() => {
          const vt = thumbFor({ url: m?.url, thumb: m?.thumb })
          if (!vt) {
            return (
              <span className="relative mt-2 flex h-32 items-center justify-center rounded-lg bg-black/80">
                <Play className="size-8 text-white" fill="currentColor" />
              </span>
            )
          }
          return (
            <span className="relative mt-2 block h-32 overflow-hidden rounded-lg bg-black/80">
              <img src={vt} alt={m.label || d.title || ''} loading="lazy" className="size-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                <Play className="size-8 text-white" fill="currentColor" />
              </span>
            </span>
          )
        })()}
        {kind === 'file' && (
          <span className="mt-2 flex items-center gap-2 rounded-lg bg-muted p-2 text-xs">
            <FileText className="size-4 shrink-0" />
            <span className="truncate">{m.label || 'Attachment'}</span>
          </span>
        )}
        {(!m || kind === 'text') && d.content && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{d.content}</p>
        )}
      </Link>
      {kind === 'audio' && (
        <audio controls preload="none" src={m.url} className="mt-2 w-full" style={{ height: 36 }} />
      )}
      <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
        <Link href={href} className="flex items-center gap-1 hover:text-foreground">
          <Eye className="size-3.5" />{d.viewCount || 0}
        </Link>
        <button onClick={upvote} className={'flex items-center gap-1 hover:text-foreground ' + (liked ? 'text-primary font-bold' : '')}>
          <ArrowBigUp className="size-3.5" />{likes}
        </button>
        <Link href={href} className="flex items-center gap-1 hover:text-foreground">
          <MessageCircle className="size-3.5" />{d.commentCount || 0}
        </Link>
      </div>
    </div>
  )
}
