'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Mic } from 'lucide-react'
import { getToken } from '@/lib/auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import VoiceRecorder from '@/components/VoiceRecorder'
import AudioPlayer from '@/components/AudioPlayer'
import TikTokSheet from '@/components/TikTokSheet'
import { toast } from 'sonner'

// Live session room: chat + voice notes, polling (no extra services).
export default function LiveRoom({ groupId, meeting, userEmail, onClose }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showVoice, setShowVoice] = useState(false)
  const [uploadingVoice, setUploadingVoice] = useState(false)
  const bottomRef = useRef(null)
  const lastRef = useRef(null)

  async function fetchNew() {
    try {
      const since = lastRef.current ? `&since=${encodeURIComponent(lastRef.current)}` : ''
      const res = await fetch(`/api/spaces/${groupId}/live?meetingId=${meeting._id}${since}`, {
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
    const t = setInterval(fetchNew, 4000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, meeting._id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  async function postMessage(body) {
    const res = await fetch(`/api/spaces/${groupId}/live`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ meetingId: meeting._id, ...body }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
  }

  async function sendText() {
    if (!text.trim() || sending) return
    const t = text.trim()
    setText('')
    setSending(true)
    try {
      await postMessage({ text: t })
      fetchNew()
    } catch (e) {
      toast.error(e.message || 'Could not send')
      setText(t)
    }
    setSending(false)
  }

  async function sendVoice({ blob, duration }) {
    setUploadingVoice(true)
    try {
      const form = new FormData()
      form.append('file', blob, `live-${Date.now()}.webm`)
      form.append('folder', 'gss-quiz/spaces/live')
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      })
      const data = await res.json()
      if (!data.url) throw new Error('Upload failed')
      await postMessage({ audioUrl: data.url, duration })
      setShowVoice(false)
      fetchNew()
    } catch {
      toast.error('Voice note failed to send')
      throw new Error('voice failed')
    } finally {
      setUploadingVoice(false)
    }
  }

  const endsAt = new Date(new Date(meeting.startsAt).getTime() + (Number(meeting.durationMin) || 60) * 60000)

  return (
    <TikTokSheet
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      tall
      wide
      title={
        <span className="inline-flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
          </span>
          {meeting.title} · LIVE
        </span>
      }
      subtitle={`Ends ${endsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
      footer={
        <div className="space-y-2">
          {showVoice && (
            <div>
              <VoiceRecorder onSend={sendVoice} onClose={() => setShowVoice(false)} />
              {uploadingVoice && <p className="mt-1 text-center text-[11px] text-muted-foreground">Sending voice note...</p>}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowVoice(v => !v)} aria-label="Voice note"
              className={`flex size-10 shrink-0 items-center justify-center rounded-full border hover:bg-muted ${showVoice ? 'border-red-500 text-red-500' : ''}`}
            >
              <Mic className="size-4" />
            </button>
            <Input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendText() }}
              placeholder="Message the session..."
              maxLength={1000}
            />
            <Button size="sm" onClick={sendText} disabled={sending || !text.trim()} className="shrink-0">
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-2">
        {messages.length === 0 && (
          <p className="py-10 text-center text-xs text-muted-foreground">Session is live — say hi or drop a voice note 👋</p>
        )}
        {messages.map(m => {
          const mine = m.authorEmail === userEmail
          return (
            <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {!mine && <p className="text-[10px] font-bold opacity-70">{m.authorName}</p>}
                {m.kind === 'audio' && m.audioUrl ? (
                  <div className="min-w-[200px]">
                    <AudioPlayer src={m.audioUrl} />
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm">{m.text}</p>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </TikTokSheet>
  )
}
