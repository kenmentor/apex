'use client'

import { useState, useEffect, use, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Send, FileText, Image as ImageIcon, Film, Music, File, X, Download, Heart, MessageCircle, Share2, ChevronDown, ChevronUp, Settings, ExternalLink, Trash2, Lock, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { getUser, getToken } from '@/lib/auth'
import { haptic } from '@/lib/haptics'
import { trackEvent } from '@/lib/tracking'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import LiveRoom from '@/components/LiveRoom'
import GroupChat from '@/components/group/GroupChat'
import TikTokSheet from '@/components/TikTokSheet'
import SnapRow from '@/components/SnapRow'
import ShareSheet from '@/components/ShareSheet'
import { pdfReadHref } from '@/lib/reader'
import { RichContent } from '@/components/TagCard'

export const LABELS = [
  { value: 'past_question', label: 'Past Question', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { value: 'notes', label: 'Notes', color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  { value: 'video', label: 'Video', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  { value: 'textbook', label: 'Textbook', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  { value: 'other', label: 'Other', color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' },
]

export function MediaVisual({ m }) {
  const isVideo = m.type === 'video' || m.url?.match(/\.(mp4|webm|mov)/i)
  if (isVideo) {
    return (
      <div className="overflow-hidden rounded-xl border">
        <video src={m.url} controls className="max-h-80 w-full" />
        {m.label && <div className="px-3 py-2 text-xs text-muted-foreground">{m.label}</div>}
      </div>
    )
  }
  return (
    <div className="relative overflow-hidden rounded-xl border">
      <img src={m.url} alt={m.label || ''} className="max-h-80 w-full object-cover" />
      {m.label && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
          <span className="text-xs text-white font-medium">{m.label}</span>
        </div>
      )}
    </div>
  )
}

export function MediaSection({ media }) {
  if (!media || media.length === 0) return null
  const visual = []
  const docs = []
  media.forEach((m) => {
    const isImage = m.type === 'image' || m.url?.match(/\.(jpg|jpeg|png|gif|webp)/i)
    const isVideo = m.type === 'video' || m.url?.match(/\.(mp4|webm|mov)/i)
    if (isImage || isVideo) visual.push(m)
    else docs.push(m)
  })
  return (
    <div className="space-y-2">
      {visual.length > 0 && (
        <SnapRow
          items={visual.map((m, i) => ({ ...m, key: `${i}-${m.url}` }))}
          slideClass="basis-[86%]"
          showCounter={visual.length > 1}
          renderItem={(m) => <MediaVisual m={m} />}
        />
      )}
      {docs.map((m, i) => {
        const isAudio = m.type === 'audio' || m.url?.match(/\.(mp3|wav|ogg|m4a)/i)
        const isPdf = m.type === 'pdf' || m.url?.match(/\.pdf/i)

        if (isAudio) {
          return (
            <div key={i} className="rounded-xl border p-3 space-y-1">
              <div className="flex items-center gap-2">
                <Music className="size-4 text-green-500" />
                <span className="text-xs font-medium">{m.label || 'Audio'}</span>
              </div>
              <audio src={m.url} controls className="w-full" />
            </div>
          )
        }
        if (isPdf) {
          const readerHref = pdfReadHref({ url: m.url, title: m.label || 'PDF Document' })
          if (readerHref) {
            return (
              <Link key={i} href={readerHref}
                className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/50">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                  <FileText className="size-5 text-red-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{m.label || 'PDF Document'}</div>
                  <div className="text-[11px] text-muted-foreground">Tap to read</div>
                </div>
                <BookOpen className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            )
          }
          return (
            <a key={i} href={m.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/50">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                <FileText className="size-5 text-red-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{m.label || 'PDF Document'}</div>
                <div className="text-[11px] text-muted-foreground">Tap to open</div>
              </div>
              <Download className="size-4 shrink-0 text-muted-foreground" />
            </a>
          )
        }
        return (
          <a key={i} href={m.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/50">
            <File className="size-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{m.label || 'File'}</div>
            </div>
          </a>
        )
      })}
    </div>
  )
}

export function PostCard({ post, user, spaceCreator, onDelete }) {
  const [liked, setLiked] = useState(user ? post.likes?.includes(user.email) : false)
  const [likeCount, setLikeCount] = useState(post.likeCount || 0)
  const [liking, setLiking] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commenting, setCommenting] = useState(false)
  const [commentCount, setCommentCount] = useState(post.commentCount || 0)
  const [shareCount, setShareCount] = useState(post.shareCount || 0)
  const [sharing, setSharing] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  const label = LABELS.find(l => l.value === post.label)
  const timeAgo = getTimeAgo(post.createdAt)

  async function trackShare(platform) {
    setShareCount(prev => prev + 1)
    try { trackEvent('share_completed', { platform, source: 'group' }) } catch {}
    try {
      const res = await fetch(`/api/space-posts/${post._id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ platform }),
      })
      const data = await res.json()
      if (data.shareCount !== undefined) setShareCount(data.shareCount)
    } catch {}
  }

  async function handleShare() {
    if (!user) return
    const text = `${post.title || post.content || 'Check out this material'}\n\nShared from Apex Groups`
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title || 'Apex Group', text })
        await trackShare('native')
      } catch {}
    } else {
      setShowShareModal(true)
    }
  }

  async function loadComments() {
    if (commentsLoaded) return
    try {
      const res = await fetch(`/api/space-posts/${post._id}/comments`)
      const data = await res.json()
      setComments(Array.isArray(data) ? data : [])
      setCommentsLoaded(true)
    } catch {}
  }

  async function handleComment() {
    if (!commentText.trim() || commenting) return
    const text = commentText.trim()
    const tempId = Date.now().toString()
    const optimistic = { _id: tempId, authorName: user.name || user.email, authorAvatar: user.avatar || null, content: text, createdAt: new Date().toISOString() }
    setComments(prev => [optimistic, ...prev])
    setCommentText('')
    setCommentCount(prev => prev + 1)
    setCommenting(true)
    try {
      const res = await fetch(`/api/space-posts/${post._id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ content: text }),
      })
      const data = await res.json()
      if (data.success) {
        setComments(prev => prev.map(c => c._id === tempId ? data.doc : c))
        onEngagement?.()
      } else {
        setComments(prev => prev.filter(c => c._id !== tempId))
        setCommentCount(prev => prev - 1)
        setCommentText(text)
      }
    } catch {
      setComments(prev => prev.filter(c => c._id !== tempId))
      setCommentCount(prev => prev - 1)
      setCommentText(text)
    }
    setCommenting(false)
  }

  async function handleLike() {
    if (!user || liking) return
    const prevLiked = liked
    const prevCount = likeCount
    if (!prevLiked) haptic.tap()
    setLiked(!prevLiked)
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1)
    setLiking(true)
    try {
      const res = await fetch(`/api/space-posts/${post._id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json()
      setLiked(data.liked)
      setLikeCount(data.likeCount)
    } catch {
      setLiked(prevLiked)
      setLikeCount(prevCount)
    }
    setLiking(false)
  }

  function toggleComments() {
    if (!showComments) loadComments()
    setShowComments(!showComments)
  }

  function downloadFile(url, filename) {
    fetch(url).then(r => r.blob()).then(blob => {
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename || 'download'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
      trackEvent('download_click', { filename, source: 'space' })
    }).catch(() => {
      window.open(url, '_blank')
    })
  }

  function downloadAllMedia() {
    if (!post.media || post.media.length === 0) return
    post.media.forEach((m, i) => {
      downloadFile(m.url, m.label || `file-${i + 1}`)
    })
  }

  const canDelete = user && (post.authorEmail === user.email || spaceCreator === user.email)

  async function handleDelete() {
    if (!confirm('Delete this post?')) return
    onDelete?.(post._id)
  }

  return (
    <div className="border-b border-border last:border-b-0 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/profile/${encodeURIComponent(post.authorEmail)}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Avatar className="size-7 shrink-0">
            <AvatarImage src={post.authorAvatar} />
            <AvatarFallback className="bg-primary text-[8px] font-bold text-primary-foreground">
              {(post.authorName || '?').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-semibold">{post.authorName}</span>
        </Link>
        <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
      </div>

      {label && (
        <Badge variant="secondary" className={`text-[10px] ${label.color}`}>
          {label.label}
        </Badge>
      )}

      {post.title && <h3 className="text-sm font-bold">{post.title}</h3>}
      {post.content && <RichContent text={post.content} className="text-xs text-muted-foreground leading-relaxed" />}

      <MediaSection media={post.media} />

      {/* Engagement Bar */}
      <div className="flex items-center gap-1 pt-1 border-t border-border">
        <button
          onClick={handleLike}
          disabled={!user}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${
            liked ? 'text-red-500 font-semibold' : 'text-muted-foreground hover:text-red-500 hover:bg-muted'
          }`}
        >
          <Heart className={`size-4 ${liked ? 'fill-current' : ''}`} />
          {likeCount}
        </button>

        <button
          onClick={toggleComments}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-primary hover:bg-muted"
        >
          <MessageCircle className="size-4" />
          {commentCount}
        </button>

        <button
          onClick={handleShare}
          disabled={!user || sharing}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-green-600 hover:bg-muted"
        >
          <Share2 className="size-4" />
          {shareCount}
        </button>

        {post.media && post.media.length > 0 && (
          <button
            onClick={downloadAllMedia}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-blue-500 hover:bg-muted ml-auto"
          >
            <Download className="size-4" />
          </button>
        )}

        {canDelete && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-red-500 hover:bg-muted"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="space-y-3 pt-2">
          {/* Comment Input */}
          {user && (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Write a comment..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleComment()}
                className="flex-1"
                size="sm"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleComment}
                disabled={!commentText.trim() || commenting}
              >
                <Send className="size-3.5" />
              </Button>
            </div>
          )}

          {/* Comments List */}
          {comments.length === 0 ? (
            <p className="text-center text-[11px] text-muted-foreground py-2">No comments yet</p>
          ) : (
            <div className="space-y-2.5">
              {comments.map(c => (
                <div key={c._id} className="flex items-start gap-2">
                  <Link href={`/profile/${encodeURIComponent(c.authorEmail)}`}>
                    <Avatar className="size-6 shrink-0">
                      <AvatarImage src={c.authorAvatar} />
                      <AvatarFallback className="bg-muted text-[7px] font-bold">
                        {(c.authorName || '?').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="min-w-0 flex-1 rounded-lg bg-muted/50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Link href={`/profile/${encodeURIComponent(c.authorEmail)}`} className="text-[11px] font-semibold hover:text-primary transition-colors">{c.authorName}</Link>
                      <span className="text-[9px] text-muted-foreground">{getTimeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-xs leading-relaxed mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Share sheet */}
      <ShareSheet
        open={showShareModal}
        onOpenChange={setShowShareModal}
        post={post}
        user={user}
        currentGroupId={post.spaceId}
      />
    </div>
  )
}

export function getTimeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

export default function GroupDetailPage({ params }) {
  const { id } = use(params)
  const [space, setSpace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [isMember, setIsMember] = useState(false)
  const [joining, setJoining] = useState(false)

  // (group hub lives on the settings page)
  // Phase 2: entry survey + invite-link join
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteTried = useRef(false)
  const [showSurvey, setShowSurvey] = useState(false)
  const [surveyAnswers, setSurveyAnswers] = useState([])

  // Phase 6: meetings + live room
  const [meetings, setMeetings] = useState([])
  const [liveOpen, setLiveOpen] = useState(false)
  const [nowTs, setNowTs] = useState(() => Date.now())

  useEffect(() => {
    setUser(getUser())
    loadData()
  }, [id])

  async function loadData() {
    try {
      const spaceRes = await fetch(`/api/spaces?id=${id}`)
      const spaceData = await spaceRes.json()
      setSpace(spaceData)
      const u = getUser()
      if (u && spaceData.members?.includes(u.email)) {
        setIsMember(true)
        loadMeetings()
      }
    } catch {}
    setLoading(false)
  }

  async function handleJoin(opts = {}) {
    if (!user) return
    const wasMember = isMember
    setIsMember(!wasMember)
    setSpace(prev => ({
      ...prev,
      memberCount: wasMember ? Math.max(0, (prev.memberCount || 1) - 1) : (prev.memberCount || 0) + 1,
      members: wasMember ? (prev.members || []).filter(e => e !== user.email) : [...(prev.members || []), user.email],
    }))
    setJoining(true)
    try {
      const res = await fetch(`/api/spaces/${id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...(opts.code ? { code: opts.code } : {}), ...(opts.answers ? { answers: opts.answers } : {}) }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        setIsMember(wasMember)
        setSpace(prev => ({
          ...prev,
          memberCount: wasMember ? (prev.memberCount || 0) + 1 : Math.max(0, (prev.memberCount || 1) - 1),
          members: wasMember ? [...(prev.members || []), user.email] : (prev.members || []).filter(e => e !== user.email),
        }))
      } else if (data.requested) {
        toast.success('Request sent! An admin will review it.')
        setIsMember(false)
        setSpace(prev => ({
          ...prev,
          memberCount: Math.max(0, (prev.memberCount || 1) - 1),
          members: (prev.members || []).filter(e => e !== user.email),
        }))
      } else {
        setIsMember(data.joined)
        if (data.joined) loadMeetings()
        setSpace(prev => ({
          ...prev,
          memberCount: data.joined ? (prev.memberCount || 0) + 1 : Math.max(0, (prev.memberCount || 1) - 1),
          members: data.joined ? [...(prev.members || []), user.email] : (prev.members || []).filter(e => e !== user.email),
        }))
      }
    } catch {
      setIsMember(wasMember)
      setSpace(prev => ({
        ...prev,
        memberCount: wasMember ? (prev.memberCount || 0) + 1 : Math.max(0, (prev.memberCount || 1) - 1),
        members: wasMember ? [...(prev.members || []), user.email] : (prev.members || []).filter(e => e !== user.email),
      }))
    }
    setJoining(false)
  }

  function startJoin() {
    // Approval groups with a survey answer questions first.
    if (!isMember && (space?.visibility || 'open') === 'approval' && (space?.survey || []).length > 0) {
      setSurveyAnswers((space.survey || []).map(() => ''))
      setShowSurvey(true)
      return
    }
    handleJoin()
  }

  async function loadMeetings() {
    try {
      const res = await fetch(`/api/spaces/${id}/meetings`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json()
      if (Array.isArray(data)) setMeetings(data)
    } catch {}
  }

  function meetStatus(m) {
    if (!m || m.status === 'ended' || m.status === 'cancelled') return 'ended'
    const start = new Date(m.startsAt).getTime()
    const end = start + (Number(m.durationMin) || 60) * 60000
    if (nowTs < start) return 'upcoming'
    if (nowTs <= end) return 'live'
    return 'ended'
  }

  // Invite-link auto-join (?invite=CODE)
  useEffect(() => {
    const code = searchParams.get('invite')
    if (!code || inviteTried.current || !user || !space || isMember) return
    inviteTried.current = true
    handleJoin({ code })
    router.replace(`/groups/${id}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user, space, isMember])

  // Clock tick for meeting countdowns / auto-live.
  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background pb-4">
        <header className="sticky top-0 z-50 flex items-center gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Link href="/groups" className="flex size-8 items-center justify-center rounded-lg hover:bg-muted">
            <ArrowLeft className="size-4" />
          </Link>
          <Skeleton className="h-5 w-32" />
        </header>
        <div className="mx-auto w-full max-w-2xl space-y-4 px-5 pt-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!space) {
    return (
      <div className="flex min-h-dvh items-center justify-center pb-24">
          <p className="text-muted-foreground">Group not found</p>
      </div>
    )
  }

  const meetingsWithStatus = meetings.map(m => ({ ...m, _s: meetStatus(m) }))
  const liveMeeting = isMember ? meetingsWithStatus.find(m => m._s === 'live') : null

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background pb-4">
      <header className="sticky top-0 z-50 flex items-center gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link href="/groups" className="flex size-8 items-center justify-center rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="flex-1 truncate text-sm font-bold">{space.name}</h1>
        {isMember && (
          <Button size="sm" variant="ghost" asChild className="size-8 px-0">
            <Link href={`/groups/${id}/settings`} aria-label="Group settings">
              <Settings className="size-4" />
            </Link>
          </Button>
        )}
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-0 px-5 pt-4">
        {!isMember && user && (space.visibility || 'open') !== 'invite' && (
          <div className="mb-4">
            <Button onClick={startJoin} disabled={joining} className="w-full" variant="outline">
              {joining ? 'Joining...' : (space.visibility === 'approval' ? 'Request to Join' : 'Join this Group')}
            </Button>
          </div>
        )}
        {!isMember && user && (space.visibility || 'open') === 'invite' && (
          <div className="mb-4 flex items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
            <Lock className="size-4" /> This group is invite-only
          </div>
        )}

        {!user && (
          <div className="mb-4">
            <Link href="/auth" className="block w-full rounded-xl bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground">
              Sign In to Join
            </Link>
          </div>
        )}

        {/* Live banner — a scheduled session auto-started */}
        {liveMeeting && !liveOpen && (
          <button
            onClick={() => setLiveOpen(true)}
            className="mb-4 flex w-full items-center gap-3 rounded-xl bg-red-500 p-3 text-left text-white shadow-lg shadow-red-500/20"
          >
            <span className="relative flex size-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-white" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">🔴 {liveMeeting.title} — LIVE now</span>
              <span className="block text-xs text-white/80">Tap to join the session</span>
            </span>
          </button>
        )}

        {/* Group chat */}
        {isMember && (
          <div className="pb-2">
            <GroupChat groupId={id} user={user} />
          </div>
        )}

      </div>

      {/* Entry survey sheet */}
      <TikTokSheet
        open={showSurvey}
        onOpenChange={setShowSurvey}
        title={`Answer to join ${space.name}`}
        subtitle="An admin will review your answers"
        footer={
          <Button
            onClick={() => { setShowSurvey(false); handleJoin({ answers: surveyAnswers }) }}
            disabled={joining || (space.survey || []).some((_, i) => !(surveyAnswers[i] || '').trim())}
            className="h-12 w-full text-base"
          >
            {joining ? 'Sending...' : 'Send request'}
          </Button>
        }
      >
        <div className="space-y-4">
          {(space.survey || []).map((q, i) => (
            <div key={i} className="space-y-1.5">
              <label className="text-sm font-medium">{q}</label>
              <Textarea
                value={surveyAnswers[i] || ''}
                onChange={e => setSurveyAnswers(prev => prev.map((v, j) => j === i ? e.target.value : v))}
                rows={2}
                maxLength={500}
                placeholder="Your answer..."
              />
            </div>
          ))}
        </div>
      </TikTokSheet>

      {liveOpen && liveMeeting && (
        <LiveRoom
          groupId={id}
          meeting={liveMeeting}
          userEmail={user?.email}
          onClose={() => setLiveOpen(false)}
        />
      )}
    </div>
  )
}
