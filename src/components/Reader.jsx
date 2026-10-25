'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'

export function stripHtml(html) {
  return String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

// Real audio from any text: browser text-to-speech, no backend needed.
// Exposes live progress (word boundaries where supported) + elapsed time.
export function useSpeech() {
  const [speaking, setSpeaking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [supported] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window)
  const startRef = useRef(null)
  const timerRef = useRef(null)
  const totalRef = useRef(1)

  function stop() {
    try { window.speechSynthesis?.cancel() } catch {}
    clearInterval(timerRef.current)
    setSpeaking(false)
    setProgress(0)
    setElapsed(0)
  }

  useEffect(() => () => {
    try { window.speechSynthesis?.cancel() } catch {}
    clearInterval(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggle(text) {
    try {
      const synth = window.speechSynthesis
      if (!synth) return
      if (speaking) { stop(); return }
      const clean = stripHtml(text).slice(0, 8000)
      if (!clean) return
      totalRef.current = Math.max(1, clean.length)
      startRef.current = Date.now()
      setElapsed(0)
      setProgress(0)
      const u = new SpeechSynthesisUtterance(clean)
      u.rate = 1
      u.onboundary = (e) => {
        if (typeof e.charIndex === 'number') setProgress(Math.min(1, e.charIndex / totalRef.current))
      }
      u.onend = () => { clearInterval(timerRef.current); setSpeaking(false); setProgress(1) }
      u.onerror = () => { clearInterval(timerRef.current); setSpeaking(false) }
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - (startRef.current || Date.now())) / 1000))
      }, 500)
      synth.cancel()
      synth.speak(u)
      setSpeaking(true)
    } catch {}
  }

  return { speaking, supported, toggle, stop, progress, elapsed }
}

// Fullscreen reading shell: slim header, scroll body. Used for text + PDF.
export function FullscreenReader({ title, subtitle, onClose, actions, children }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-background">
      <header className="flex shrink-0 items-center gap-2 border-b bg-background/95 px-3 py-2">
        <button onClick={onClose} aria-label="Back" className="flex size-8 items-center justify-center rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold">{title}</h2>
          {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
