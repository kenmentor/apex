'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Plus, Send, Mic, Tag, X, Paperclip, Image as ImageIcon, Film, Music, FileText, File } from 'lucide-react'
import { getToken } from '@/lib/auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import VoiceRecorder from '@/components/VoiceRecorder'
import AudioPlayer from '@/components/AudioPlayer'
import { RichContent } from '@/components/TagCard'
import { toast } from 'sonner'

function timeOf(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

// Persistent group chat (WhatsApp-style): text + tags + voice + device files.
export default function GroupChat({ groupId, user }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [panel, setPanel] = useState(null) // null | 'attach' | 'voice' | 'tag'
  const [tagTab, setTagTab] = useState('course')
  const [attachMenu, setAttachMenu] = useState(false)
  const [courseList, setCourseList] = useState([])
  const [groupPosts, setGroupPosts] = useState([])
  const [uploading, setUploading] = useState(false)
  const bottomRef = useRef(null)
  const lastRef = useRef(null)
  const inputRef = useRef(null)
  const barRef = useRef(null)
  const spacerRef = useRef(null)
  const fileRef = useRef(null)

  async function fetchNew() {
    try {
      const since = lastRef.current ? `&since=${encodeURIComponent(lastRef.current)}` : ''
      const res = await fetch(`/api/spaces/${groupId}/chat?limit=50${since}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json()
      const list = Array.isArray(data.messages) ? data.messages : []
      if (list.length) {
        setMessages(prev => {
          const ids = new Set(prev.map(m => m._id))
          return [...prev, ...list.filter(m => !ids.has(m._id))]
        })
        lastRef.current = list[list.length - 1].createdAt
      }
    } catch {}
  }

  useEffect(() => {
    setMessages([])
    lastRef.current = null
    fetchNew()
    const t = setInterval(fetchNew, 5000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  // WhatsApp-style autogrow (up to ~5 rows, then it scrolls inside).
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [text])

  // The bar is fixed (sticky breaks inside overflow-x-hidden ancestors),
  // so keep a spacer exactly as tall as the bar.
  useEffect(() => {
    const bar = barRef.current
    const sp = spacerRef.current
    if (!bar || !sp || typeof ResizeObserver === 'undefined') return
    const sync = () => { sp.style.height = (bar.offsetHeight + 12) + 'px' }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(bar)
    return () => ro.disconnect()
  }, [])

  async function postMessage(body) {
    const res = await fetch(`/api/spaces/${groupId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
  }

  async function uploadFile(file, folder) {
    const form = new FormData()
    form.append('file', file)
    form.append('folder', folder)
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: form,
    })
    const data = await res.json()
    if (!data.url) throw new Error('Upload failed')
    return data
  }

  async function sendText() {
    if (!text.trim() || sending) return
    const t = text.trim()
    setText('')
    setSending(true)
    try {
      await postMessage({ kind: 'text', text: t })
      fetchNew()
    } catch (e) {
      toast.error(e.message || 'Could not send')
      setText(t)
    }
    setSending(false)
  }

  async function sendVoice({ blob, duration }) {
    setUploading(true)
    try {
      const data = await uploadFile(blob, 'gss-quiz/spaces/chat')
      await postMessage({ kind: 'audio', audioUrl: data.url, duration })
      setPanel(null)
      fetchNew()
    } catch {
      toast.error('Voice note failed to send')
      throw new Error('voice failed')
    } finally {
      setUploading(false)
    }
  }

  async function sendDeviceFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const data = await uploadFile(file, 'gss-quiz/spaces/chat')
      let fileType = 'file'
      if (file.type.startsWith('image/')) fileType = 'image'
      else if (file.type.startsWith('video/')) fileType = 'video'
      else if (file.type.startsWith('audio/')) fileType = 'audio'
      else if (file.name.endsWith('.pdf')) fileType = 'pdf'
      await postMessage({ kind: 'file', fileUrl: data.url, fileName: file.name, fileType })
      setPanel(null)
      fetchNew()
    } catch {
      toast.error('File upload failed')
    } finally {
      setUploading(false)
    }
  }

  function openTagger() {
    setPanel(panel === 'tag' ? null : 'tag')
    if (courseList.length === 0) {
      fetch('/api/courses').then(r => r.json()).then(d => {
        setCourseList(Array.isArray(d.docs) ? d.docs : [])
      }).catch(() => {})
    }
    if (groupPosts.length === 0) {
      fetch(`/api/spaces/${groupId}/posts?limit=30`).then(r => r.json()).then(d => {
        if (Array.isArray(d)) setGroupPosts(d)
      }).catch(() => {})
    }
  }

  function insertTag(kind, ref) {
    setText(prev => (prev ? prev.replace(/\s+$/, '') + ' ' : '') + `[${kind}:${ref}]` + ' ')
  }

  const tagCourseHits = tagQuery.trim()
    ? courseList.filter(c => (c.code || '').toLowerCase().includes(tagQuery.toLowerCase()) || (c.title || '').toLowerCase().includes(tagQuery.toLowerCase())).slice(0, 8)
    : courseList.slice(0, 8)

  function renderBody(m) {
    if (m.kind === 'audio' && m.audioUrl) {
      return (
        <div className="min-w-[200px]">
          <AudioPlayer src={m.audioUrl} />
        </div>
      )
    }
    if (m.kind === 'file' && m.fileUrl) {
      const isImage = m.fileType === 'image' || m.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)/i)
      if (isImage) {
        return (
          <span className="block space-y-1">
            <img src={m.fileUrl} alt={m.fileName || ''} className="max-h-56 rounded-lg object-cover" loading="lazy" />
            <span className="block truncate text-[11px] opacity-70">{m.fileName}</span>
          </span>
        )
      }
      return (
        <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-black/10">
            {m.fileType === 'audio' || m.fileUrl.match(/\.(mp3|wav|ogg|m4a)/i) ? <Music className="size-4" />
              : m.fileType === 'pdf' || m.fileUrl.match(/\.pdf/i) ? <FileText className="size-4" />
              : m.fileType === 'video' || m.fileUrl.match(/\.(mp4|webm|mov)/i) ? <Film className="size-4" />
              : <File className="size-4" />}
          </span>
          <span className="min-w-0">
            <span className="block max-w-[160px] truncate text-xs font-bold">{m.fileName || 'File'}</span>
            <span className="block text-[10px] opacity-70">Tap to open</span>
          </span>
        </a>
      )
    }
    return <RichContent text={m.text || ''} className="text-sm leading-relaxed" />
  }

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {messages.length === 0 && (
          <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
            No messages yet — say hi to the group 👋
          </p>
        )}
        {messages.map(m => {
          const mine = m.authorEmail === user?.email
          return (
            <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {!mine && <p className="text-[10px] font-bold opacity-70">{m.authorName}</p>}
                {renderBody(m)}
                <p className={`mt-0.5 text-right text-[9px] opacity-60`}>{timeOf(m.createdAt)}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
        <div ref={spacerRef} style={{ height: 96 }} />
      </div>

      <div ref={barRef} className="fixed inset-x-0 bottom-[calc(8px+env(safe-area-inset-bottom))] z-30">
        <div className="mx-auto w-full max-w-2xl px-5">
          <div className="rounded-2xl border bg-background/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
            {panel === 'tag' && (
              <div className="space-y-2 p-2.5 pb-1">
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
                    <Input value={tagQuery} onChange={e => setTagQuery(e.target.value)} placeholder="Search anything on the platform..." />
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
                        <p className="py-3 text-center text-xs text-muted-foreground">Nothing found</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="max-h-44 space-y-1 overflow-y-auto">
                    {groupPosts.map(p => (
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
                    {groupPosts.length === 0 && (
                      <p className="py-3 text-center text-xs text-muted-foreground">No materials in this group yet</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {panel === 'voice' && (
              <div className="p-2.5 pb-1">
                <VoiceRecorder onSend={sendVoice} onClose={() => setPanel(null)} />
              </div>
            )}
            {uploading && <p className="px-2 text-center text-[11px] text-muted-foreground">Sending...</p>}

            <div className="relative flex items-end gap-1.5 p-1.5">
              {attachMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setAttachMenu(false)} />
                  <div className="absolute bottom-full left-2 z-20 mb-2 w-48 overflow-hidden rounded-2xl border bg-background shadow-xl">
                    <button
                      onClick={() => { setAttachMenu(false); setPanel(null); fileRef.current?.click() }}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm font-medium hover:bg-muted"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                        <FileText className="size-4 text-blue-500" />
                      </span>
                      Files
                    </button>
                    <button
                      onClick={() => { setAttachMenu(false); setPanel('voice') }}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm font-medium hover:bg-muted"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                        <Mic className="size-4 text-red-500" />
                      </span>
                      Voice
                    </button>
                    <button
                      onClick={() => { setAttachMenu(false); openTagger() }}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm font-medium hover:bg-muted"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Tag className="size-4 text-primary" />
                      </span>
                      Tag
                    </button>
                  </div>
                </>
              )}
              <button
                onClick={() => {
                  if (panel) { setPanel(null); setAttachMenu(false) }
                  else setAttachMenu(v => !v)
                }}
                aria-label="Attach"
                className={`flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-muted ${(attachMenu || panel) ? 'text-primary' : ''}`}
              >
                <Paperclip className="size-5" />
              </button>
              <input ref={fileRef} type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx" onChange={sendDeviceFile} className="hidden" />
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText() } }}
                placeholder="Message..."
                rows={1}
                maxLength={1000}
                className="max-h-[120px] min-h-9 flex-1 resize-none rounded-2xl border-0 bg-muted/60 px-3 py-2 text-sm outline-none"
              />
              {text.trim() ? (
                <Button size="sm" onClick={sendText} disabled={sending} className="size-9 shrink-0 rounded-full bg-green-500 p-0 hover:bg-green-600">
                  <Send className="size-4" />
                </Button>
              ) : (
                <button
                  onClick={() => { setAttachMenu(false); setPanel('voice') }} aria-label="Record voice note"
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600 ${panel === 'voice' ? 'ring-2 ring-green-300' : ''}`}
                >
                  <Mic className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
