'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Users, Plus, Send, FileText, Image as ImageIcon, Film, Music, File, X, Download, Heart, MessageCircle, Share2, ChevronDown, ChevronUp, Settings, Palette, Upload, ExternalLink, Trash2 } from 'lucide-react'
import { getUser, getToken } from '@/lib/auth'
import { trackEvent } from '@/lib/tracking'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'

const LABELS = [
  { value: 'past_question', label: 'Past Question', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { value: 'notes', label: 'Notes', color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  { value: 'video', label: 'Video', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  { value: 'textbook', label: 'Textbook', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  { value: 'other', label: 'Other', color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' },
]

const COLORS = ['#130f40', '#1a5276', '#7d3c98', '#c0392b', '#27ae60', '#e67e22', '#2c3e50', '#8e44ad', '#1e272e', '#4834d4']

function MediaSection({ media }) {
  if (!media || media.length === 0) return null
  return (
    <div className="space-y-2">
      {media.map((m, i) => {
        const isImage = m.type === 'image' || m.url?.match(/\.(jpg|jpeg|png|gif|webp)/i)
        const isVideo = m.type === 'video' || m.url?.match(/\.(mp4|webm|mov)/i)
        const isAudio = m.type === 'audio' || m.url?.match(/\.(mp3|wav|ogg|m4a)/i)
        const isPdf = m.type === 'pdf' || m.url?.match(/\.pdf/i)

        if (isImage) {
          return (
            <div key={i} className="relative overflow-hidden rounded-xl border">
              <img src={m.url} alt={m.label || ''} className="w-full max-h-80 object-cover" />
              {m.label && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <span className="text-xs text-white font-medium">{m.label}</span>
                </div>
              )}
            </div>
          )
        }
        if (isVideo) {
          return (
            <div key={i} className="rounded-xl border overflow-hidden">
              <video src={m.url} controls className="w-full max-h-80" />
              {m.label && <div className="px-3 py-2 text-xs text-muted-foreground">{m.label}</div>}
            </div>
          )
        }
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

function PostCard({ post, user, spaceCreator, onDelete }) {
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
    const text = `${post.title || post.content || 'Check out this material'}\n\nShared from Apex Spaces`
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title || 'Apex Space', text })
        await trackShare('native')
      } catch {}
    } else {
      setShowShareModal(true)
    }
  }

  async function shareVia(platform) {
    const text = encodeURIComponent(`${post.title || post.content || 'Check out this material'}\n\nShared from Apex Spaces`)
    const urls = {
      clipboard: null,
      whatsapp: `https://wa.me/?text=${text}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}`,
      telegram: `https://t.me/share/url?text=${text}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?quote=${text}`,
      email: `mailto:?subject=${encodeURIComponent(post.title || 'Shared from Apex')}&body=${text}`,
    }
    if (platform === 'clipboard') {
      await navigator.clipboard.writeText(decodeURIComponent(text))
    } else if (urls[platform]) {
      window.open(urls[platform], '_blank', 'noopener,noreferrer,width=600,height=500')
    }
    await trackShare(platform)
    setShowShareModal(false)
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
      {post.content && <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{post.content}</p>}

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

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center" onClick={() => setShowShareModal(false)}>
          <div className="w-full max-w-sm rounded-t-2xl bg-background p-5 space-y-4 sm:rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <h3 className="text-base font-bold">Share</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{post.title || 'This material'}</p>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <button onClick={() => shareVia('clipboard')} className="flex flex-col items-center gap-1.5 rounded-xl p-3 hover:bg-muted transition-colors">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted text-sm">📋</div>
                <span className="text-[10px]">Copy</span>
              </button>
              <button onClick={() => shareVia('whatsapp')} className="flex flex-col items-center gap-1.5 rounded-xl p-3 hover:bg-muted transition-colors">
                <div className="flex size-10 items-center justify-center rounded-full bg-green-500/10 text-sm">💬</div>
                <span className="text-[10px]">WhatsApp</span>
              </button>
              <button onClick={() => shareVia('twitter')} className="flex flex-col items-center gap-1.5 rounded-xl p-3 hover:bg-muted transition-colors">
                <div className="flex size-10 items-center justify-center rounded-full bg-sky-500/10 text-sm">🐦</div>
                <span className="text-[10px]">Twitter</span>
              </button>
              <button onClick={() => shareVia('telegram')} className="flex flex-col items-center gap-1.5 rounded-xl p-3 hover:bg-muted transition-colors">
                <div className="flex size-10 items-center justify-center rounded-full bg-blue-500/10 text-sm">✈️</div>
                <span className="text-[10px]">Telegram</span>
              </button>
              <button onClick={() => shareVia('facebook')} className="flex flex-col items-center gap-1.5 rounded-xl p-3 hover:bg-muted transition-colors">
                <div className="flex size-10 items-center justify-center rounded-full bg-blue-600/10 text-sm">📘</div>
                <span className="text-[10px]">Facebook</span>
              </button>
              <button onClick={() => shareVia('email')} className="flex flex-col items-center gap-1.5 rounded-xl p-3 hover:bg-muted transition-colors">
                <div className="flex size-10 items-center justify-center rounded-full bg-orange-500/10 text-sm">✉️</div>
                <span className="text-[10px]">Email</span>
              </button>
            </div>
            <button onClick={() => setShowShareModal(false)} className="w-full rounded-xl border py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function getTimeAgo(dateStr) {
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

export default function SpaceDetailPage({ params }) {
  const { id } = use(params)
  const [space, setSpace] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [isMember, setIsMember] = useState(false)
  const [joining, setJoining] = useState(false)

  const [showComposer, setShowComposer] = useState(false)
  const [postTitle, setPostTitle] = useState('')
  const [postContent, setPostContent] = useState('')
  const [postLabel, setPostLabel] = useState('')
  const [postMedia, setPostMedia] = useState([])
  const [uploading, setUploading] = useState(false)
  const [posting, setPosting] = useState(false)

  const [showSettings, setShowSettings] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editCover, setEditCover] = useState(null)
  const [editCoverPublicId, setEditCoverPublicId] = useState(null)
  const [editPostingPermission, setEditPostingPermission] = useState('everyone')
  const [uploadingCover, setUploadingCover] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    setUser(getUser())
    loadData()
  }, [id])

  async function loadData() {
    try {
      const [spaceRes, postsRes] = await Promise.all([
        fetch(`/api/spaces?id=${id}`),
        fetch(`/api/spaces/${id}/posts`),
      ])
      const spaceData = await spaceRes.json()
      const postsData = await postsRes.json()
      setSpace(spaceData)
      setPosts(Array.isArray(postsData) ? postsData : [])
      const u = getUser()
      if (u && spaceData.members?.includes(u.email)) setIsMember(true)
    } catch {}
    setLoading(false)
  }

  async function handleJoin() {
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
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json()
      setIsMember(data.joined)
      setSpace(prev => ({
        ...prev,
        memberCount: data.joined ? (prev.memberCount || 0) + 1 : Math.max(0, (prev.memberCount || 1) - 1),
        members: data.joined ? [...(prev.members || []), user.email] : (prev.members || []).filter(e => e !== user.email),
      }))
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

  async function handleFileUpload(e) {
    const files = Array.from(e.target.files || [])
    for (const file of files) {
      setUploading(true)
      try {
        const form = new FormData()
        form.append('file', file)
        form.append('folder', 'gss-quiz/spaces/posts')
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: form,
        })
        const data = await res.json()
        if (data.url) {
          let type = 'file'
          if (file.type.startsWith('image/')) type = 'image'
          else if (file.type.startsWith('video/')) type = 'video'
          else if (file.type.startsWith('audio/')) type = 'audio'
          else if (file.name.endsWith('.pdf')) type = 'pdf'
          setPostMedia(prev => [...prev, { url: data.url, publicId: data.publicId, type, label: file.name }])
        }
      } catch {}
      setUploading(false)
    }
  }

  async function handlePost() {
    if (!postTitle.trim() && !postContent.trim() && postMedia.length === 0) return
    setPosting(true)
    try {
      const res = await fetch(`/api/spaces/${id}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ title: postTitle, content: postContent, media: postMedia, label: postLabel }),
      })
      const data = await res.json()
      if (data.success) {
        setPostTitle('')
        setPostContent('')
        setPostLabel('')
        setPostMedia([])
        setShowComposer(false)
        loadData()
      }
    } catch {}
    setPosting(false)
  }

  function openSettings() {
    setEditName(space.name || '')
    setEditDescription(space.description || '')
    setEditColor(space.color || COLORS[0])
    setEditCover(space.cover || null)
    setEditCoverPublicId(space.coverPublicId || null)
    setEditPostingPermission(space.postingPermission || 'everyone')
    setShowSettings(true)
  }

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('folder', 'gss-quiz/spaces/covers')
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      })
      const data = await res.json()
      if (data.url) {
        setEditCover(data.url)
        setEditCoverPublicId(data.publicId || null)
      }
    } catch {}
    setUploadingCover(false)
  }

  async function handleSaveSettings() {
    if (!editName.trim()) return
    const prev = { ...space }
    setSpace(s => ({
      ...s,
      name: editName.trim(),
      description: editDescription.trim(),
      cover: editCover,
      color: editColor,
      postingPermission: editPostingPermission,
    }))
    setShowSettings(false)
    setSavingSettings(true)
    try {
      const res = await fetch('/api/spaces', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ id, name: editName, description: editDescription, cover: editCover, coverPublicId: editCoverPublicId, color: editColor, postingPermission: editPostingPermission }),
      })
      const data = await res.json()
      if (!data.success) {
        setSpace(prev)
      }
    } catch {
      setSpace(prev)
    }
    setSavingSettings(false)
  }

  async function handleDeletePost(postId) {
    setPosts(prev => prev.filter(p => p._id !== postId))
    setSpace(prev => ({ ...prev, postCount: Math.max(0, (prev.postCount || 1) - 1) }))
    try {
      const res = await fetch(`/api/spaces/${id}/posts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ postId }),
      })
      const data = await res.json()
      if (!data.success) {
        loadData()
      }
    } catch {
      loadData()
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background pb-24">
        <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Link href="/spaces" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
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
        <p className="text-muted-foreground">Space not found</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background pb-24">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link href="/spaces" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="flex-1 text-base font-bold truncate">{space.name}</h1>
        {isMember && user?.email === space.creatorEmail && (
          <Button size="sm" variant="ghost" onClick={openSettings}>
            <Settings className="size-4" />
          </Button>
        )}
        {isMember && !(space.postingPermission === 'creator_only' && user?.email !== space.creatorEmail) && (
          <Button size="sm" variant="secondary" onClick={() => setShowComposer(!showComposer)}>
            {showComposer ? 'Cancel' : <><Plus className="size-3.5 mr-1" /> Upload</>}
          </Button>
        )}
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-0 px-5 pt-4">
        {/* Space Info */}
        <div className="mb-4 relative overflow-hidden rounded-xl p-4 text-white"
          style={{ background: `linear-gradient(135deg, ${space.color || '#130f40'}, ${space.color || '#130f40'}cc)` }}
        >
          {space.cover && (
            <div className="absolute inset-0" style={{ background: `url(${space.cover}) center/cover` }} />
          )}
          {space.cover && <div className="absolute inset-0 bg-black/30" />}
          <div className="relative flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/20 text-lg font-bold backdrop-blur-sm">
              {space.name?.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold">{space.name}</h2>
              <p className="text-xs text-white/70">{space.description || 'Study space'}</p>
              {space.postingPermission === 'creator_only' && (
                <p className="text-[10px] text-white/50 mt-1">Only creator can post</p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <div className="text-lg font-bold">{space.memberCount || 0}</div>
              <div className="text-[10px] text-white/60">members</div>
            </div>
          </div>
        </div>

        {!isMember && user && (
          <div className="mb-4">
            <Button onClick={handleJoin} disabled={joining} className="w-full" variant="outline">
              {joining ? 'Joining...' : 'Join this Space'}
            </Button>
          </div>
        )}
        {!user && (
          <div className="mb-4">
            <Link href="/auth" className="block w-full rounded-xl bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground">
              Sign In to Join
            </Link>
          </div>
        )}

        {/* Composer */}
        {showComposer && isMember && (
          <div className="mb-4 rounded-xl border p-4 space-y-3">
            <Input
              placeholder="Title (e.g. GST 111 2024 Past Questions)"
              value={postTitle}
              onChange={e => setPostTitle(e.target.value)}
            />
            <div className="flex flex-wrap gap-1.5">
              {LABELS.map(l => (
                <button
                  key={l.value}
                  onClick={() => setPostLabel(postLabel === l.value ? '' : l.value)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                    postLabel === l.value
                      ? `${l.color} ring-1 ring-current/20`
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Description or details about the material..."
              value={postContent}
              onChange={e => setPostContent(e.target.value)}
              rows={2}
            />
            {postMedia.length > 0 && (
              <div className="space-y-1.5">
                {postMedia.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs">
                    {m.type === 'image' && <ImageIcon className="size-3.5 shrink-0 text-blue-500" />}
                    {m.type === 'video' && <Film className="size-3.5 shrink-0 text-purple-500" />}
                    {m.type === 'audio' && <Music className="size-3.5 shrink-0 text-green-500" />}
                    {m.type === 'pdf' && <FileText className="size-3.5 shrink-0 text-red-500" />}
                    {m.type === 'file' && <File className="size-3.5 shrink-0" />}
                    <span className="flex-1 truncate">{m.label}</span>
                    <button onClick={() => setPostMedia(prev => prev.filter((_, j) => j !== i))}>
                      <X className="size-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <label className="flex size-9 cursor-pointer items-center justify-center rounded-lg border hover:bg-muted">
                <Plus className="size-4 text-muted-foreground" />
                <input type="file" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" />
              </label>
              <Button onClick={handlePost} disabled={posting || uploading} className="flex-1" size="sm">
                <Send className="size-3.5 mr-1" />
                {posting ? 'Posting...' : uploading ? 'Uploading...' : 'Share'}
              </Button>
            </div>
          </div>
        )}

        {/* Posts Feed */}
        {posts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <FileText className="size-12 opacity-20" />
            <p className="text-sm">No materials shared yet</p>
            {isMember && (
              <button onClick={() => setShowComposer(true)} className="text-xs font-medium text-primary">
                Share first material
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden divide-y divide-border">
            {posts.map(post => (
              <PostCard key={post._id} post={post} user={user} spaceCreator={space.creatorEmail} onDelete={handleDeletePost} />
            ))}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center" onClick={() => setShowSettings(false)}>
          <div className="w-full max-w-lg max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-background p-5 space-y-5 sm:rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Customize Space</h3>
              <button onClick={() => setShowSettings(false)} className="rounded-lg p-1 hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>

            {/* Cover Preview */}
            <div className="relative h-36 w-full overflow-hidden rounded-xl">
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(135deg, ${editColor}, ${editColor}88)` }}
              />
              {editCover && (
                <div className="absolute inset-0" style={{ background: `url(${editCover}) center/cover` }} />
              )}
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
                <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-white/20 text-lg font-bold backdrop-blur-sm">
                  {editName ? editName.slice(0, 2).toUpperCase() : '??'}
                </div>
                <div className="text-sm font-bold">{editName || 'Space Name'}</div>
              </div>
              <label className="absolute bottom-2 right-2 flex size-8 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60">
                <Upload className="size-4" />
                <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
              </label>
              {editCover && (
                <button
                  onClick={() => setEditCover(null)}
                  className="absolute bottom-2 right-12 flex size-8 items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
                >
                  <X className="size-4" />
                </button>
              )}
              {uploadingCover && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                  <span className="text-sm text-white font-medium">Uploading...</span>
                </div>
              )}
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Palette className="size-4 text-muted-foreground" />
                Backdrop Color
              </div>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setEditColor(c)}
                    className={`size-8 rounded-full transition-all ${editColor === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Space Name</label>
              <Input
                placeholder="Space name"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                maxLength={60}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="What kind of materials will be shared here?"
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                rows={3}
                maxLength={300}
              />
            </div>

            {/* Posting Permission */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Who can post</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditPostingPermission('everyone')}
                  className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                    editPostingPermission === 'everyone'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Everyone
                </button>
                <button
                  onClick={() => setEditPostingPermission('creator_only')}
                  className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                    editPostingPermission === 'creator_only'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Only me
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveSettings} disabled={!editName.trim() || savingSettings} className="flex-1">
                {savingSettings ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
