'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Play, Pause, Maximize, Minimize, RotateCcw } from 'lucide-react'

let apiPromise = null
function loadApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!apiPromise) {
    apiPromise = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => { try { prev?.() } catch {} resolve(window.YT) }
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      s.async = true
      s.onerror = () => { apiPromise = null; reject(new Error('yt api failed')) }
      document.head.appendChild(s)
      setTimeout(() => reject(new Error('yt api timeout')), 15000)
    }).catch(e => { apiPromise = null; throw e })
  }
  return apiPromise
}

const SPEEDS = [1, 1.25, 1.5, 2, 0.5]

function fmt(s) {
  s = Math.max(0, Math.floor(s || 0))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    : `${m}:${String(sec).padStart(2, '0')}`
}

// Chromeless YouTube: our thumbnail + play button, then a controls=0 embed
// driven through the IFrame API with fully custom Apex controls. Looks
// native, adapts to light/dark, fills any screen via the Fullscreen API.
export default function YouTubePlayer({ videoId, title, thumb, autoPlay = true, className = '' }) {
  const wrapRef = useRef(null)
  const mountRef = useRef(null)
  const playerRef = useRef(null)
  const tickRef = useRef(null)
  const hideRef = useRef(null)
  const [started, setStarted] = useState(false)
  const [failed, setFailed] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [ended, setEnded] = useState(false)
  const [ready, setReady] = useState(false)
  const [time, setTime] = useState(0)
  const [dur, setDur] = useState(0)
  const [showUi, setShowUi] = useState(true)
  const [isFs, setIsFs] = useState(false)
  const [speedIx, setSpeedIx] = useState(0)

  const poke = useCallback(() => {
    setShowUi(true)
    try { clearTimeout(hideRef.current) } catch {}
    hideRef.current = setTimeout(() => {
      if (playerRef.current?.getPlayerState?.() === 1) setShowUi(false)
    }, 3000)
  }, [])

  const startTick = useCallback(() => {
    try { clearInterval(tickRef.current) } catch {}
    tickRef.current = setInterval(() => {
      try {
        const p = playerRef.current
        if (!p?.getCurrentTime) return
        setTime(p.getCurrentTime())
        const d = p.getDuration?.() || 0
        if (d) setDur(d)
      } catch {}
    }, 500)
  }, [])

  const stopTick = useCallback(() => {
    try { clearInterval(tickRef.current) } catch {}
  }, [])

  // Boot the embed on demand (tap) or immediately when autoPlay.
  useEffect(() => {
    if (!videoId || !autoPlay) return
    boot()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId])

  useEffect(() => () => {
    stopTick()
    try { clearTimeout(hideRef.current) } catch {}
    try { playerRef.current?.destroy?.() } catch {}
    playerRef.current = null
  }, [stopTick])

  useEffect(() => {
    const sync = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  async function boot() {
    if (playerRef.current || !videoId || !mountRef.current) return
    setStarted(true)
    setFailed(false)
    try {
      const YT = await loadApi()
      if (!mountRef.current) return
      playerRef.current = new YT.Player(mountRef.current, {
        videoId,
        playerVars: {
          controls: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          playsinline: 1,
          fs: 0,
          disablekb: 1,
        },
        events: {
          onReady: (e) => {
            setReady(true)
            setDur(e.target.getDuration?.() || 0)
            try { e.target.playVideo() } catch {}
          },
          onStateChange: (e) => {
            const st = e.data
            setPlaying(st === 1)
            setEnded(st === 0)
            if (st === 1) { startTick(); poke() }
            else { stopTick(); setShowUi(true); setTime(e.target.getCurrentTime?.() || 0) }
          },
          onError: () => { setFailed(true); stopTick() },
        },
      })
    } catch {
      setFailed(true)
    }
  }

  function toggle() {
    const p = playerRef.current
    if (!p) return
    poke()
    try {
      if (p.getPlayerState() === 1) p.pauseVideo()
      else { setEnded(false); p.playVideo() }
    } catch {}
  }

  function seek(v) {
    const p = playerRef.current
    if (!p) return
    try { p.seekTo(Number(v), true); setTime(Number(v)) } catch {}
    poke()
  }

  function cycleSpeed() {
    const p = playerRef.current
    const next = (speedIx + 1) % SPEEDS.length
    setSpeedIx(next)
    try { p?.setPlaybackRate?.(SPEEDS[next]) } catch {}
    poke()
  }

  async function toggleFs() {
    try {
      if (!document.fullscreenElement) await wrapRef.current?.requestFullscreen?.()
      else await document.exitFullscreen()
    } catch {}
    poke()
  }

  if (!videoId) return null

  return (
    <div ref={wrapRef} className={`group relative select-none overflow-hidden bg-black ${className}`}>
      {/* Poster */}
      {!started && (
        <button onClick={boot} aria-label={`Play ${title || 'video'}`} className="absolute inset-0 block h-full w-full text-left">
          {thumb && <img src={thumb} alt={title || ''} className="size-full object-cover" loading="lazy" draggable={false} />}
          <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-white text-black shadow-2xl transition-transform group-hover:scale-105">
              <Play className="ml-1 size-7" fill="currentColor" />
            </span>
          </span>
          {!!title && (
            <span className="absolute inset-x-0 bottom-0 truncate px-4 pb-3 text-left text-sm font-bold text-white drop-shadow">
              {title}
            </span>
          )}
        </button>
      )}

      {/* Embed mount (chromeless) */}
      <div className={`absolute inset-0 ${started ? '' : 'pointer-events-none opacity-0'}`}>
        <div ref={mountRef} className="size-full [&>iframe]:size-full [&>iframe]:border-0" />
      </div>

      {/* Failed fallback */}
      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black p-6 text-center">
          <p className="text-sm font-bold text-white/80">This video won&apos;t play here</p>
          <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noreferrer"
            className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-black">
            Watch on YouTube
          </a>
        </div>
      )}

      {/* Tap layer: toggles UI, double duty as big pause hit-area */}
      {started && !failed && (
        <button aria-label={playing ? 'Pause' : 'Play'} onClick={() => (showUi ? toggle() : poke())}
          className="absolute inset-0 block h-full w-full cursor-pointer" style={{ background: 'transparent' }} />
      )}

      {/* Center state */}
      {started && !failed && !playing && !ended && ready && showUi && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-white/95 text-black shadow-2xl">
            <Play className="ml-1 size-7" fill="currentColor" />
          </span>
        </span>
      )}
      {ended && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
          <button onClick={() => { setEnded(false); try { playerRef.current?.seekTo?.(0, true); playerRef.current?.playVideo?.() } catch {} }}
            className="flex size-16 items-center justify-center rounded-full bg-white text-black shadow-2xl">
            <RotateCcw className="size-7" />
          </button>
          <span className="text-xs font-bold text-white/80">Replay</span>
        </span>
      )}

      {/* Control bar */}
      {started && !failed && (
        <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-2.5 pt-8 transition-opacity ${showUi || !playing ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
          <input
            type="range" min={0} max={Math.max(dur, 1)} step={0.5} value={Math.min(time, dur || time)}
            onChange={e => seek(e.target.value)}
            aria-label="Seek"
            className="w-full accent-white"
          />
          <div className="mt-1 flex items-center gap-1.5 text-white">
            <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}
              className="flex size-9 items-center justify-center rounded-full hover:bg-white/15">
              {playing ? <Pause className="size-5" fill="currentColor" /> : <Play className="ml-0.5 size-5" fill="currentColor" />}
            </button>
            <span className="text-[11px] font-bold tabular-nums text-white/90">{fmt(time)} / {fmt(dur)}</span>
            <span className="flex-1" />
            <button onClick={cycleSpeed} aria-label="Playback speed"
              className="flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-[11px] font-black hover:bg-white/15">
              {SPEEDS[speedIx]}x
            </button>
            <button onClick={toggleFs} aria-label="Fullscreen"
              className="flex size-9 items-center justify-center rounded-full hover:bg-white/15">
              {isFs ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
