'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Play, Pause, Trash2, Send, Loader2 } from 'lucide-react'

const MAX_SECONDS = 5 * 60

function fmt(secs) {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// Tap mic → record → stop → preview → send.
// Calls onSend({ blob, url, duration }) with a local object URL;
// the parent uploads it like any other audio file.
export default function VoiceRecorder({ onSend, onClose }) {
  const [phase, setPhase] = useState('idle') // idle | recording | preview | sending
  const [secs, setSecs] = useState(0)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState('')
  const recRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const audioRef = useRef(null)
  const durationRef = useRef(0)
  const secsRef = useRef(0)

  useEffect(() => () => {
    clearInterval(timerRef.current)
    try { recRef.current?.state !== 'inactive' && recRef.current?.stop() } catch {}
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function start() {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
      recRef.current = rec
      chunksRef.current = []
      rec.ondataavailable = e => { if (e.data?.size) chunksRef.current.push(e.data) }
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
        const url = URL.createObjectURL(blob)
        durationRef.current = Math.max(1, secsRef.current)
        setPreviewUrl(url)
        setPhase('preview')
        stream.getTracks().forEach(t => t.stop())
      }
      rec.start()
      secsRef.current = 0
      setSecs(0)
      setPhase('recording')
      timerRef.current = setInterval(() => {
        secsRef.current += 1
        setSecs(secsRef.current)
        if (secsRef.current >= MAX_SECONDS) stop()
      }, 1000)
    } catch {
      setError('Microphone blocked — allow mic access to record.')
    }
  }

  function stop() {
    clearInterval(timerRef.current)
    try { recRef.current?.state !== 'inactive' && recRef.current?.stop() } catch {}
  }

  function discard() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPlaying(false)
    secsRef.current = 0
    setSecs(0)
    setPhase('idle')
  }

  function togglePlay() {
    const a = audioRef.current
    if (!a) return
    if (playing) a.pause()
    else a.play()
  }

  async function send() {
    if (!previewUrl) return
    setPhase('sending')
    try {
      const blob = await fetch(previewUrl).then(r => r.blob())
      await onSend?.({ blob, url: previewUrl, duration: durationRef.current })
      discard()
      onClose?.()
    } catch {
      setError('Could not attach voice note.')
      setPhase('preview')
    }
  }

  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center gap-1">
        <button
          type="button" onClick={start} aria-label="Record voice note"
          className="flex size-10 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
        >
          <Mic className="size-4" />
        </button>
        {error && <p className="text-[11px] text-red-500">{error}</p>}
      </div>
    )
  }

  if (phase === 'recording') {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
        <span className="relative flex size-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex size-3 rounded-full bg-red-500" />
        </span>
        <span className="text-sm font-bold tabular-nums">{fmt(secs)}</span>
        <span className="flex-1 text-[11px] text-muted-foreground">Recording... tap stop when done</span>
        <button
          type="button" onClick={stop} aria-label="Stop recording"
          className="flex size-9 items-center justify-center rounded-full bg-foreground text-background"
        >
          <Square className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-2xl border p-3">
      <audio ref={audioRef} src={previewUrl} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} className="hidden" />
      <div className="flex items-center gap-2">
        <button
          type="button" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: '100%' }} />
        </div>
        <span className="text-xs font-bold tabular-nums">{fmt(durationRef.current)}</span>
      </div>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button" onClick={discard} disabled={phase === 'sending'}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold hover:bg-muted disabled:opacity-50"
        >
          <Trash2 className="size-3.5" /> Re-record
        </button>
        <button
          type="button" onClick={send} disabled={phase === 'sending'}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
        >
          {phase === 'sending' ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          Attach
        </button>
      </div>
    </div>
  )
}
