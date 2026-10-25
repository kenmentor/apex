'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'

function fmt(secs) {
  if (!Number.isFinite(secs) || secs < 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

const RATES = [1, 1.25, 1.5, 2]

// Only one voice plays at a time across the page (Spotify behavior).
let activeWs = null

// Spotify-style audio: real waveform, green progress, play/time/speed.
export default function AudioPlayer({ src }) {
  const waveRef = useRef(null)
  const wsRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [dur, setDur] = useState(0)
  const [rate, setRate] = useState(1)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let ws = null
    let live = true
    ;(async () => {
      try {
        const { default: WaveSurfer } = await import('wavesurfer.js')
        if (!live || !waveRef.current) return
        ws = WaveSurfer.create({
          container: waveRef.current,
          url: src,
          height: 40,
          waveColor: '#a3a3a3',
          progressColor: '#22c55e',
          barWidth: 3,
          barGap: 3,
          barRadius: 2,
          normalize: true,
        })
        ws.on('ready', () => { if (live) setDur(ws.getDuration() || 0) })
        ws.on('timeupdate', (t) => { if (live) setTime(t || 0) })
        ws.on('play', () => {
          if (activeWs && activeWs !== ws) { try { activeWs.pause() } catch {} }
          activeWs = ws
          if (live) setPlaying(true)
        })
        ws.on('pause', () => { if (live) setPlaying(false) })
        ws.on('finish', () => { if (live) { setPlaying(false); setTime(0) } })
        ws.on('error', () => { if (live) setFailed(true) })
        wsRef.current = ws
      } catch {
        if (live) setFailed(true)
      }
    })()
    return () => {
      live = false
      try {
        if (activeWs === ws) activeWs = null
        ws?.destroy()
      } catch {}
      if (wsRef.current === ws) wsRef.current = null
    }
  }, [src])

  function toggle() {
    try { wsRef.current?.playPause() } catch {}
  }

  function cycleRate() {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length]
    setRate(next)
    try { wsRef.current?.setPlaybackRate(next) } catch {}
  }

  if (failed) {
    return <audio src={src} controls preload="metadata" className="w-full" style={{ height: 36 }} />
  }

  return (
    <div className="flex items-center gap-2.5">
      <button
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play'}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-500 text-white transition hover:bg-green-600"
      >
        {playing ? <Pause className="size-4" fill="white" /> : <Play className="size-4 translate-x-[1px]" fill="white" />}
      </button>
      <div ref={waveRef} className="min-w-0 flex-1 overflow-hidden" />
      <span className="shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
        {fmt(time)}{dur ? ` / ${fmt(dur)}` : ''}
      </span>
      <button
        onClick={cycleRate}
        aria-label="Playback speed"
        className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold text-muted-foreground hover:bg-muted"
      >
        {rate}x
      </button>
    </div>
  )
}
