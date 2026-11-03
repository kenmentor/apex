'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Eye, ArrowBigUp, MessageCircle, FileText } from 'lucide-react'
import { getUser, getToken } from '@/lib/auth'
import { Skeleton } from '@/components/ui/skeleton'
import { pdfReadHref } from '@/lib/reader'

function kindOf(m) {
  const t = (m.type || '').toLowerCase()
  const u = (m.url || '').toLowerCase()
  if (t === 'audio' || /\.(mp3|wav|ogg|m4a)(\?|$)/.test(u)) return 'audio'
  if (t === 'video' || /\.(mp4|webm|mov)(\?|$)/.test(u)) return 'video'
  if (t === 'image' || /\.(jpg|jpeg|png|gif|webp)(\?|$)/.test(u)) return 'image'
  return 'file'
}

export default function FeedItemPage({ params }) {
  const { id } = use(params)
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(0)

  useEffect(() => {
    fetch(`/api/space-posts/${id}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (!d.error) {
          setPost(d)
          setLikes(d.likeCount || 0)
          const u = getUser()
          if (u && (d.likes || []).includes(u.email)) setLiked(true)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  async function upvote() {
    const prev = liked
    setLiked(!prev)
    setLikes(c => c + (prev ? -1 : 1))
    try {
      const res = await fetch(`/api/space-posts/${id}/like`, {
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

  if (loading) return <div className="mx-auto max-w-md px-4 pb-24 pt-6"><Skeleton className="h-64 w-full rounded-xl" /></div>
  if (!post) return <div className="mx-auto max-w-md px-4 pb-24 pt-6"><p className="text-sm text-muted-foreground">Post not found.</p><Link href="/" className="text-sm font-medium text-primary">Back home</Link></div>

  const media = Array.isArray(post.media) ? post.media : []

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted"><ArrowLeft className="size-4" /></Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold">{post.title || 'Post'}</h1>
          <p className="text-xs text-muted-foreground">{post.spaceName} · {post.authorName || ''}</p>
        </div>
      </div>

      {post.title && <h2 className="text-lg font-bold">{post.title}</h2>}
      {post.content && <p className="whitespace-pre-wrap text-sm leading-relaxed">{post.content}</p>}

      <div className="space-y-2">
        {media.map((m, i) => {
          const k = kindOf(m)
          if (k === 'audio') return (
            <div key={i} className="rounded-xl border p-3">
              <p className="mb-2 text-xs font-medium">{m.label || 'Audio'}</p>
              <audio controls preload="metadata" src={m.url} className="w-full" />
            </div>
          )
          if (k === 'video') return <video key={i} src={m.url} controls className="max-h-80 w-full rounded-xl" />
          if (k === 'image') return <img key={i} src={m.url} alt={m.label || ''} loading="lazy" className="w-full rounded-xl object-cover" />
          const readerHref = pdfReadHref({ url: m.url, title: m.label })
          if (readerHref) return (
            <Link key={i} href={readerHref} className="flex items-center gap-2 rounded-xl border p-3 text-sm hover:bg-muted">
              <FileText className="size-4 shrink-0" /><span className="truncate">{m.label || 'Attachment'}</span>
            </Link>
          )
          return (
            <a key={i} href={m.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border p-3 text-sm hover:bg-muted">
              <FileText className="size-4 shrink-0" /><span className="truncate">{m.label || 'Attachment'}</span>
            </a>
          )
        })}
      </div>

      <div className="flex items-center gap-5 rounded-xl border p-3 text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground"><Eye className="size-4" />{post.viewCount || 0} views</span>
        <button onClick={upvote} className={'flex items-center gap-1.5 ' + (liked ? 'text-primary font-bold' : 'text-muted-foreground')}>
          <ArrowBigUp className="size-4" />{likes} upvotes
        </button>
        <span className="flex items-center gap-1.5 text-muted-foreground"><MessageCircle className="size-4" />{post.commentCount || 0}</span>
      </div>
    </div>
  )
}
