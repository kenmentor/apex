'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import useEmblaCarousel from 'embla-carousel-react'
import { FileText, Image as ImageIcon, Film, Music, File, Download, Send, Check } from 'lucide-react'
import { getToken } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import TikTokSheet from '@/components/TikTokSheet'
import SnapRow from '@/components/SnapRow'
import { toast } from 'sonner'
import { pdfReadHref } from '@/lib/reader'

const DESTS = [
  { id: 'clipboard', icon: '📋', label: 'Copy', tint: 'bg-muted' },
  { id: 'whatsapp', icon: '💬', label: 'WhatsApp', tint: 'bg-green-500/10' },
  { id: 'telegram', icon: '✈️', label: 'Telegram', tint: 'bg-blue-500/10' },
  { id: 'twitter', icon: '🐦', label: 'Twitter', tint: 'bg-sky-500/10' },
  { id: 'facebook', icon: '📘', label: 'Facebook', tint: 'bg-blue-600/10' },
  { id: 'email', icon: '✉️', label: 'Email', tint: 'bg-orange-500/10' },
]

// WhatsApp/X-style forward sheet: message box + destinations,
// swipe left for a files-only view (attachments + text, no comments).
export default function ShareSheet({ open, onOpenChange, post, user, currentGroupId }) {
  const [tab, setTab] = useState(0)
  const [viewportRef, api] = useEmblaCarousel({ loop: false, align: 'start' })
  const [message, setMessage] = useState('')
  const [dest, setDest] = useState(null)
  const [groups, setGroups] = useState([])
  const [forwardTo, setForwardTo] = useState(null)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) return
    setTab(0)
    setMessage('')
    setDest(null)
    setForwardTo(null)
    api?.scrollTo(0, true)
    const token = getToken()
    fetch('/api/spaces', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : []
        setGroups(list.filter(g => (g.members || []).includes(user?.email) && g._id !== (currentGroupId || post.spaceId)))
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!api) return
    const onSelect = () => setTab(api.selectedScrollSnap())
    api.on('select', onSelect)
    return () => { api.off('select', onSelect) }
  }, [api])

  function go(i) {
    setTab(i)
    api?.scrollTo(i)
  }

  async function trackShare(platform) {
    try { (await import('@/lib/tracking')).trackEvent('share_completed', { platform, source: 'sheet' }) } catch {}
    try {
      await fetch(`/api/space-posts/${post._id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ platform }),
      })
    } catch {}
  }

  function shareText() {
    const link = `${window.location.origin}/feed/${post._id}`
    const body = `${post.title || post.content || 'Check out this material'}\n\nShared from Apex Groups\n${link}`
    return message.trim() ? `${message.trim()}\n\n${body}` : body
  }

  async function runDest(id) {
    const text = encodeURIComponent(shareText())
    if (id === 'clipboard') {
      try {
        await navigator.clipboard.writeText(decodeURIComponent(text))
        toast.success('Link copied!')
      } catch { toast.error('Copy failed') }
      await trackShare('clipboard')
      onOpenChange(false)
      return
    }
    const urls = {
      whatsapp: `https://wa.me/?text=${text}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}`,
      telegram: `https://t.me/share/url?text=${text}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?quote=${text}`,
      email: `mailto:?subject=${encodeURIComponent(post.title || 'Shared from Apex')}&body=${text}`,
    }
    if (urls[id]) window.open(urls[id], '_blank', 'noopener,noreferrer,width=600,height=500')
    await trackShare(id)
    onOpenChange(false)
  }

  async function forward() {
    if (!forwardTo || sending) return
    setSending(true)
    try {
      const content = (message.trim() ? message.trim() + '\n' : '') + `[material:${post._id}]`
      const res = await fetch(`/api/spaces/${forwardTo._id}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      toast.success(`Forwarded to ${forwardTo.name}!`)
      await trackShare('forward')
      onOpenChange(false)
    } catch (e) {
      toast.error(e.message || 'Could not forward')
    }
    setSending(false)
  }

  const media = post.media || []
  const footerAction = forwardTo ? forward : dest && dest !== 'clipboard' ? () => runDest(dest) : null
  const footerLabel = forwardTo
    ? `Forward to ${forwardTo.name}`
    : dest && dest !== 'clipboard'
      ? `Continue to ${DESTS.find(d => d.id === dest)?.label}`
      : 'Choose where to send'

  return (
    <TikTokSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Share"
      subtitle={post.title || 'This material'}
      wide
      footer={tab === 0 ? (
        <Button onClick={footerAction || undefined} disabled={!footerAction || sending} className="h-12 w-full text-base">
          <Send className="size-4 mr-2" />
          {sending ? 'Forwarding...' : footerLabel}
        </Button>
      ) : null}
    >
      <div className="mb-2 flex gap-1.5">
        {['Share', 'Files'].map((label, i) => (
          <button
            key={label}
            onClick={() => go(i)}
            className={`flex-1 rounded-full border py-1.5 text-xs font-bold ${tab === i ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          >
            {label}{i === 1 && media.length > 0 ? ` (${media.length})` : ''}
          </button>
        ))}
      </div>

      <div ref={viewportRef} className="overflow-hidden">
        <div className="flex">
          {/* Share slide */}
          <div className="min-w-0 shrink-0 grow-0 basis-full space-y-3 pr-1">
            <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                {(post.title || post.content || '?').slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{post.title || (post.content || '').slice(0, 50) || 'Untitled'}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {post.authorName || ''}{media.length ? ` · ${media.length} file${media.length > 1 ? 's' : ''}` : ''}
                </span>
              </span>
            </div>

            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Add a message... (optional)"
            />

            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Send via</p>
              <SnapRow
                items={DESTS.map(d => ({ ...d, key: d.id }))}
                slideClass="basis-auto"
                renderItem={(d) => (
                  <button
                    onClick={() => { setForwardTo(null); d.id === 'clipboard' ? runDest('clipboard') : setDest(dest === d.id ? null : d.id) }}
                    className={`flex w-16 flex-col items-center gap-1 rounded-2xl border p-2 transition ${dest === d.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                  >
                    <span className={`flex size-10 items-center justify-center rounded-full ${d.tint} text-base`}>{d.icon}</span>
                    <span className={`text-[10px] font-semibold ${dest === d.id ? 'text-primary' : ''}`}>{d.label}</span>
                  </button>
                )}
              />
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Forward to a group</p>
              {groups.length === 0 ? (
                <p className="rounded-xl bg-muted/40 p-3 text-center text-xs text-muted-foreground">No other groups yet</p>
              ) : (
                <div className="max-h-44 space-y-1 overflow-y-auto">
                  {groups.map(g => (
                    <button
                      key={g._id}
                      onClick={() => { setDest(null); setForwardTo(forwardTo?._id === g._id ? null : g) }}
                      className={`flex w-full items-center gap-2.5 rounded-xl border p-2.5 text-left ${forwardTo?._id === g._id ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}
                    >
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white"
                        style={{ background: `linear-gradient(135deg, ${g.color || '#130f40'}, ${g.color || '#130f40'}cc)` }}
                      >
                        {g.name?.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold">{g.name}</span>
                        <span className="block text-[11px] text-muted-foreground">{g.memberCount || 0} members</span>
                      </span>
                      {forwardTo?._id === g._id && <Check className="size-4 shrink-0 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Files slide — attachments + text only, no comments */}
          <div className="min-w-0 shrink-0 grow-0 basis-full space-y-2 pl-1">
            {post.content && (
              <p className="whitespace-pre-wrap rounded-xl bg-muted/40 p-3 text-xs leading-relaxed">{post.content.replace(/\[(course|quiz|material):[^\]]+\]/g, '').trim() || post.content}</p>
            )}
            {media.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">No files attached</p>
            )}
            {media.map((m, i) => {
              const isImage = m.type === 'image' || m.url?.match(/\.(jpg|jpeg|png|gif|webp)/i)
              const readerHref = !isImage ? pdfReadHref({ url: m.url, title: m.label }) : null
              const Row = readerHref ? Link : 'a'
              const rowProps = readerHref
                ? { href: readerHref }
                : { href: m.url, target: '_blank', rel: 'noopener noreferrer' }
              return (
                <Row
                  key={i}
                  {...rowProps}
                  className="flex items-center gap-3 rounded-xl border p-2.5 hover:bg-muted/50"
                >
                  {isImage ? (
                    <img src={m.url} alt={m.label || ''} className="size-11 shrink-0 rounded-lg object-cover" loading="lazy" />
                  ) : (
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
                      {m.type === 'video' || m.url?.match(/\.(mp4|webm|mov)/i) ? <Film className="size-4 text-purple-500" />
                        : m.type === 'audio' || m.url?.match(/\.(mp3|wav|ogg|m4a)/i) ? <Music className="size-4 text-green-500" />
                        : m.type === 'pdf' || m.url?.match(/\.pdf/i) ? <FileText className="size-4 text-red-500" />
                        : <File className="size-4 text-muted-foreground" />}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold">{m.label || 'File'}</span>
                    <span className="block text-[11px] text-muted-foreground">{readerHref ? 'Tap to read' : 'Tap to open'}</span>
                  </span>
                  <Download className="size-4 shrink-0 text-muted-foreground" />
                </Row>
              )
            })}
          </div>
        </div>
      </div>
    </TikTokSheet>
  )
}
