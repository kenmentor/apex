'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Send } from 'lucide-react'
import { getUser, getToken } from '@/lib/auth'

function timeOf(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

export default function DmThreadPage() {
  const { id } = useParams()
  const [user, setUser] = useState(null)
  const [peer, setPeer] = useState('')
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const bottomRef = useRef(null)

  async function load(silent = false) {
    try {
      const res = await fetch(`/api/dm/threads/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) { if (!silent) setMissing(true); return }
      setPeer(data.peerName || data.peerEmail || '')
      setMessages(data.messages || [])
    } catch {}
    if (!silent) setLoading(false)
  }

  useEffect(() => {
    setUser(getUser())
    load()
    const t = setInterval(() => load(true), 4000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  async function send() {
    const clean = text.trim()
    if (!clean || sending) return
    setText('')
    setSending(true)
    // Visual first: show instantly, reconcile after.
    const temp = { _id: `tmp-${Date.now()}`, from: user?.email, text: clean, createdAt: new Date().toISOString(), mine: true, pending: true }
    setMessages(prev => [...prev, temp])
    try {
      const res = await fetch(`/api/dm/threads/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ text: clean }),
      })
      if (!res.ok) throw new Error('Send failed')
      load(true)
    } catch {
      setMessages(prev => prev.filter(m => m._id !== temp._id))
      setText(clean)
    }
    setSending(false)
  }

  if (loading) return <div className="flex min-h-dvh items-center justify-center pb-24"><p className="text-sm text-muted-foreground">Opening chat…</p></div>

  if (!user) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-24 pt-6">
        <p className="text-sm text-muted-foreground">Sign in to chat.</p>
        <Link href="/auth" className="rounded-xl bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground">Sign In</Link>
      </div>
    )
  }

  if (missing) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-24 pt-6">
        <p className="text-sm text-muted-foreground">Chat not found.</p>
        <Link href="/groups?tab=inbox" className="rounded-xl bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground">Back to inbox</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link href="/groups?tab=inbox" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-black">
          {(peer || '?').charAt(0).toUpperCase()}
        </span>
        <h1 className="flex-1 truncate text-base font-bold">{peer || 'Chat'}</h1>
      </header>

      <div className="flex-1 space-y-1.5 px-4 py-4 pb-4">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Say hi 👋 — messages land in their inbox too.</p>
        )}
        {messages.map(m => (
          <div key={m._id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${m.mine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-muted'}`}>
              <p>{m.text}</p>
              <p className={`mt-0.5 text-right text-[10px] ${m.mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {m.pending ? 'sending…' : timeOf(m.createdAt)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 border-t bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send() }}
            placeholder="Message..."
            className="w-full rounded-full border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button onClick={send} disabled={!text.trim() || sending} aria-label="Send" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40">
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
