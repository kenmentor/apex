'use client'

import { useState, useEffect } from 'react'
import { X, Share2, Download, Link2, Check } from 'lucide-react'
import { trackEvent } from '@/lib/tracking'

function shade(hex, amt) {
  try {
    let h = String(hex || '#130f40').replace('#', '')
    if (h.length === 3) h = h.split('').map(c => c + c).join('')
    const n = (i) => Math.max(0, Math.min(255, parseInt(h.slice(i, i + 2), 16) + amt))
    return `rgb(${n(0)},${n(2)},${n(4)})`
  } catch { return '#130f40' }
}

function wrap(ctx, text, maxW) {
  const words = String(text || '').split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    const t = line ? line + ' ' + w : w
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w }
    else line = t
  }
  if (line) lines.push(line)
  return lines.slice(0, 3)
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function buildCourseCard({ code, title, color, questions, videos, notes }) {
  const W = 1080
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const grad = ctx.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, shade(color, 10))
  grad.addColorStop(1, shade(color, -70))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Watermark ring.
  ctx.beginPath()
  ctx.arc(W - 120, 240, 300, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 60
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(W - 120, 240, 180, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 30
  ctx.stroke()

  // Top accent bar.
  ctx.fillStyle = '#ff9f43'
  ctx.fillRect(0, 0, W, 14)

  // Brand.
  ctx.textAlign = 'center'
  ctx.font = '900 64px Poppins, Inter, sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.fillText('APEX', W / 2, 190)
  ctx.font = '500 30px Inter, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.fillText('Study past questions · Theory · Videos', W / 2, 240)

  // Course code + title.
  ctx.font = '900 54px Poppins, Inter, sans-serif'
  ctx.fillStyle = '#ff9f43'
  ctx.fillText(String(code || '').toUpperCase(), W / 2, 400)
  ctx.font = '800 72px Poppins, Inter, sans-serif'
  ctx.fillStyle = '#ffffff'
  const lines = wrap(ctx, title || code || 'Course', W - 200)
  lines.forEach((ln, i) => ctx.fillText(ln, W / 2, 500 + i * 88))

  // Stats card — only non-null stats render (callers may omit unknowns).
  const cardY = 500 + lines.length * 88 + 60
  const cardH = 220
  roundRect(ctx, 110, cardY, W - 220, cardH, 36)
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.fill()
  const stats = [
    [questions, String(questions ?? 0), 'questions'],
    [videos, String(videos ?? 0), 'videos'],
    [notes, String(notes ?? 0), 'notes'],
  ].filter(([raw]) => raw !== null && raw !== undefined)
  ctx.textAlign = 'center'
  const slots = Math.max(stats.length, 1)
  stats.forEach(([, v, l], i) => {
    const x = 110 + ((W - 220) * (i * 2 + 1)) / (slots * 2)
    if (i > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      ctx.fillRect(110 + ((W - 220) * i * 2) / (slots * 2) - 1, cardY + 40, 2, cardH - 80)
    }
    ctx.font = '900 76px Poppins, Inter, sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(v, x, cardY + 110)
    ctx.font = '600 28px Inter, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fillText(l.toUpperCase(), x, cardY + 158)
  })

  // CTA pill.
  const pillY = cardY + cardH + 70
  roundRect(ctx, 190, pillY, W - 380, 110, 55)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.font = '900 44px Poppins, Inter, sans-serif'
  ctx.fillStyle = '#111111'
  ctx.fillText('Study free  →  quiz.apex.app', W / 2, pillY + 71)

  ctx.font = '500 26px Inter, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.fillText('Shared from Apex · Ace your exams', W / 2, H - 60)

  return canvas.toDataURL('image/png')
}

// Bottom sheet: preview the course graphic, then share / download / copy link.
export default function CourseShareCard({ open, onClose, course, stats }) {
  const [img, setImg] = useState('')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  const code = course?.code || ''
  const pageUrl = typeof window !== 'undefined' ? window.location.href : ''

  useEffect(() => {
    if (!open) { setImg(''); setCopied(false); return }
    try {
      setImg(buildCourseCard({
        code,
        title: course?.title || code,
        color: course?.color || '#130f40',
        questions: stats?.questions ?? 0,
        videos: stats?.videos ?? 0,
        notes: stats?.notes ?? 0,
      }))
    } catch { setImg('') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null
  const filename = `apex-${String(code || 'course').toLowerCase().replace(/\s+/g, '')}.png`

  async function toFile() {
    const blob = await (await fetch(img)).blob()
    return new File([blob], filename, { type: 'image/png' })
  }

  async function handleShare() {
    if (!img || busy) return
    setBusy(true)
    const text = `${code} — ${course?.title || ''} on Apex: past questions, theory & videos.\n\nStudy free 👉 ${pageUrl}`
    try {
      const file = await toFile()
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `${code} on Apex`, text })
        try { trackEvent('share_completed', { platform: 'image', source: 'course-card', course: code }) } catch {}
        onClose?.()
        return
      }
      throw new Error('no-file-share')
    } catch {
      // Fallbacks: WhatsApp with link, then clipboard.
      try {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank')
        try { trackEvent('share_completed', { platform: 'whatsapp', source: 'course-card', course: code }) } catch {}
        onClose?.()
      } catch {
        try {
          await navigator.clipboard.writeText(pageUrl)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch {}
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleDownload() {
    if (!img) return
    const a = document.createElement('a')
    a.href = img
    a.download = filename
    a.click()
    try { trackEvent('download_click', { filename, source: 'course-card', course: code }) } catch {}
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(pageUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <h2 className="flex-1 text-sm font-extrabold">Share {code || 'course'}</h2>
          <button onClick={onClose} aria-label="Close" className="flex size-9 items-center justify-center rounded-full hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[70dvh] space-y-3 overflow-y-auto p-4">
          {img ? (
            <img src={img} alt={`${code} share card`} className="mx-auto w-full max-w-[280px] rounded-2xl shadow-lg" />
          ) : (
            <div className="mx-auto h-64 w-full max-w-[280px] animate-pulse rounded-2xl bg-muted" />
          )}
          <button
            onClick={handleShare}
            disabled={!img || busy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-extrabold text-primary-foreground disabled:opacity-50"
          >
            <Share2 className="size-4" /> {busy ? 'Preparing…' : 'Share graphic'}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleDownload}
              disabled={!img}
              className="flex items-center justify-center gap-1.5 rounded-2xl border py-2.5 text-xs font-bold hover:bg-muted disabled:opacity-50"
            >
              <Download className="size-3.5" /> Download
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-1.5 rounded-2xl border py-2.5 text-xs font-bold hover:bg-muted"
            >
              {copied ? <Check className="size-3.5 text-green-600" /> : <Link2 className="size-3.5" />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
          <p className="text-center text-[11px] text-muted-foreground">The graphic carries the course stats — great for WhatsApp & status.</p>
        </div>
      </div>
    </div>
  )
}
