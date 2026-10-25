'use client'

import { useState } from 'react'
import { Plus, Send, Mic, Tag, X, Image as ImageIcon, Film, Music, FileText, File } from 'lucide-react'
import { getToken } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import TikTokSheet from '@/components/TikTokSheet'
import SnapRow from '@/components/SnapRow'
import VoiceRecorder from '@/components/VoiceRecorder'
import { LABELS } from '@/app/groups/[id]/page'
import { toast } from 'sonner'

// Post composer as a TikTok bottom sheet.
// Props: open, onOpenChange, groupId, user, posts (for material tagging), onPosted.
export default function ComposerSheet({ open, onOpenChange, groupId, user, posts = [], onPosted }) {
  const [postTitle, setPostTitle] = useState('')
  const [postContent, setPostContent] = useState('')
  const [postLabel, setPostLabel] = useState('')
  const [postMedia, setPostMedia] = useState([])
  const [uploading, setUploading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [showVoice, setShowVoice] = useState(false)
  const [showTag, setShowTag] = useState(false)
  const [tagTab, setTagTab] = useState('course')
  const [tagQuery, setTagQuery] = useState('')
  const [courseList, setCourseList] = useState([])

  function openTagPicker() {
    setShowTag(v => !v)
    if (courseList.length === 0) {
      fetch('/api/courses').then(r => r.json()).then(d => {
        setCourseList(Array.isArray(d.docs) ? d.docs : [])
      }).catch(() => {})
    }
  }

  function insertTag(kind, ref) {
    setPostContent(prev => (prev ? prev.replace(/\s+$/, '') + '\n' : '') + `[${kind}:${ref}]` + '\n')
  }

  const tagCourseHits = tagQuery.trim()
    ? courseList.filter(c => (c.code || '').toLowerCase().includes(tagQuery.toLowerCase()) || (c.title || '').toLowerCase().includes(tagQuery.toLowerCase())).slice(0, 8)
    : courseList.slice(0, 8)

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

  async function handleVoiceSend({ blob, duration }) {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', blob, `voice-note-${Date.now()}.webm`)
      form.append('folder', 'gss-quiz/spaces/voice')
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      })
      const data = await res.json()
      if (!data.url) throw new Error('Upload failed')
      const mm = Math.floor((duration || 0) / 60)
      const ss = String(Math.floor((duration || 0) % 60)).padStart(2, '0')
      setPostMedia(prev => [...prev, { url: data.url, publicId: data.publicId, type: 'audio', label: `Voice note (${mm}:${ss})` }])
      setShowVoice(false)
    } catch {
      toast.error('Voice note upload failed')
      throw new Error('upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handlePost() {
    if (!postTitle.trim() && !postContent.trim() && postMedia.length === 0) return
    setPosting(true)
    try {
      const res = await fetch(`/api/spaces/${groupId}/posts`, {
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
        onOpenChange(false)
        onPosted?.()
      } else {
        toast.error(data.error || 'Could not post')
      }
    } catch {
      toast.error('Could not post')
    }
    setPosting(false)
  }

  return (
    <TikTokSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Share material"
      wide
      footer={
        <Button onClick={handlePost} disabled={posting || uploading} className="h-12 w-full text-base">
          <Send className="size-4 mr-2" />
          {posting ? 'Posting...' : uploading ? 'Uploading...' : 'Share'}
        </Button>
      }
    >
      <div className="space-y-3">
        <Input
          placeholder="Title (e.g. GST 111 2024 Past Questions)"
          value={postTitle}
          onChange={e => setPostTitle(e.target.value)}
        />
        <SnapRow
          items={LABELS.map(l => ({ ...l, key: l.value }))}
          slideClass="basis-auto"
          renderItem={(l) => (
            <button
              onClick={() => setPostLabel(postLabel === l.value ? '' : l.value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                postLabel === l.value
                  ? `${l.color} ring-1 ring-current/20`
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {l.label}
            </button>
          )}
        />
        <Textarea
          placeholder="Description or details about the material..."
          value={postContent}
          onChange={e => setPostContent(e.target.value)}
          rows={3}
        />
        {postMedia.length > 0 && (
          <SnapRow
            items={postMedia.map((m, i) => ({ ...m, key: `${i}-${m.url}` }))}
            slideClass="basis-[72%]"
            showCounter
            renderItem={(m, _snapped, idx) => (
              <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2.5 text-xs">
                {m.type === 'image' && <ImageIcon className="size-4 shrink-0 text-blue-500" />}
                {m.type === 'video' && <Film className="size-4 shrink-0 text-purple-500" />}
                {m.type === 'audio' && <Music className="size-4 shrink-0 text-green-500" />}
                {m.type === 'pdf' && <FileText className="size-4 shrink-0 text-red-500" />}
                {m.type === 'file' && <File className="size-4 shrink-0" />}
                <span className="min-w-0 flex-1 truncate font-medium">{m.label}</span>
                <button aria-label="Remove attachment" onClick={() => setPostMedia(prev => prev.filter((_, j) => j !== idx))}>
                  <X className="size-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            )}
          />
        )}
        <div className="flex items-center gap-2">
          <label className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border text-xs font-bold hover:bg-muted">
            <Plus className="size-4 text-muted-foreground" /> Files
            <input type="file" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" />
          </label>
          <button
            onClick={() => setShowVoice(v => !v)} aria-label="Record voice note"
            className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border text-xs font-bold hover:bg-muted ${showVoice ? 'border-red-500 text-red-500' : ''}`}
          >
            <Mic className="size-4" /> Voice
          </button>
          <button
            onClick={openTagPicker} aria-label="Tag material"
            className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border text-xs font-bold hover:bg-muted ${showTag ? 'border-primary text-primary' : ''}`}
          >
            <Tag className="size-4" /> Tag
          </button>
        </div>
        {showTag && (
          <div className="space-y-2 rounded-2xl border p-3">
            <div className="flex gap-1.5">
              {[['course', 'Course'], ['quiz', 'Quiz'], ['material', 'Material']].map(([v, label]) => (
                <button
                  key={v} onClick={() => { setTagTab(v); setTagQuery('') }}
                  className={`flex-1 rounded-lg border py-1.5 text-xs font-bold ${tagTab === v ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {tagTab !== 'material' ? (
              <>
                <Input
                  value={tagQuery}
                  onChange={e => setTagQuery(e.target.value)}
                  placeholder="Search courses..."
                />
                <div className="max-h-44 space-y-1 overflow-y-auto">
                  {tagCourseHits.map(c => (
                    <button
                      key={c.code}
                      onClick={() => insertTag(tagTab, c.code)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold">{c.code}</span>
                        {c.title && <span className="block truncate text-[11px] text-muted-foreground">{c.title}</span>}
                      </span>
                      <Plus className="size-3.5 shrink-0 text-primary" />
                    </button>
                  ))}
                  {tagCourseHits.length === 0 && (
                    <p className="py-3 text-center text-xs text-muted-foreground">No courses found</p>
                  )}
                </div>
              </>
            ) : (
              <div className="max-h-44 space-y-1 overflow-y-auto">
                {posts.map(p => (
                  <button
                    key={p._id}
                    onClick={() => insertTag('material', p._id)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold">{p.title || (p.content || '').slice(0, 40) || 'Untitled'}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{p.authorName || ''}</span>
                    </span>
                    <Plus className="size-3.5 shrink-0 text-primary" />
                  </button>
                ))}
                {posts.length === 0 && (
                  <p className="py-3 text-center text-xs text-muted-foreground">No materials in this group yet</p>
                )}
              </div>
            )}
          </div>
        )}
        {showVoice && (
          <VoiceRecorder onSend={handleVoiceSend} onClose={() => setShowVoice(false)} />
        )}
      </div>
    </TikTokSheet>
  )
}
