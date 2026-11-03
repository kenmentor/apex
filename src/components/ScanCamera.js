'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Check, Trash2 } from 'lucide-react'

let shotSeq = 0

// Fullscreen multi-shot scanner: center the note inside the frame, take as
// many pages as needed, then Done processes them all. Captures are cropped
// to the guide frame so desk edges never reach the OCR.
export default function ScanCamera({ onDone, onClose, max = 10 }) {
  const videoRef = useRef(null)
  const stageRef = useRef(null)
  const guideRef = useRef(null)
  const streamRef = useRef(null)
  const [shots, setShots] = useState([]) // [{ id, url, file }]
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let dead = false
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1440 } },
        })
        if (dead) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
          setReady(true)
        }
      } catch {
        if (!dead) setError('Camera blocked. Allow access or choose images instead.')
      }
    })()
    return () => {
      dead = true
      try { streamRef.current?.getTracks().forEach(t => t.stop()) } catch {}
      setShots(prev => { prev.forEach(s => { try { URL.revokeObjectURL(s.url) } catch {} }); return [] })
    }
  }, [])

  function stopStream() {
    try { streamRef.current?.getTracks().forEach(t => t.stop()) } catch {}
  }

  const shoot = useCallback(async () => {
    const video = videoRef.current
    const stage = stageRef.current
    const guide = guideRef.current
    if (!video || !stage || video.videoWidth < 8 || busy) return
    setBusy(true)
    try {
      const vw = video.videoWidth
      const vh = video.videoHeight
      const stageBox = stage.getBoundingClientRect()
      // object-cover mapping: displayed video vs container.
      const s = Math.max(stageBox.width / vw, stageBox.height / vh)
      const dw = vw * s
      const dh = vh * s
      const ox = (dw - stageBox.width) / 2
      const oy = (dh - stageBox.height) / 2
      let cx = 0
      let cy = 0
      let cw = vw
      let ch = vh
      if (guide) {
        const g = guide.getBoundingClientRect()
        cx = Math.max(0, (g.left - stageBox.left + ox) / s)
        cy = Math.max(0, (g.top - stageBox.top + oy) / s)
        cw = Math.min(vw - cx, g.width / s)
        ch = Math.min(vh - cy, g.height / s)
      }
      if (cw < 50 || ch < 50) { cx = 0; cy = 0; cw = vw; ch = vh }
      const cv = document.createElement('canvas')
      cv.width = Math.round(cw)
      cv.height = Math.round(ch)
      cv.getContext('2d').drawImage(video, cx, cy, cw, ch, 0, 0, cv.width, cv.height)
      const blob = await new Promise((resolve, reject) => {
        cv.toBlob(b => (b ? resolve(b) : reject(new Error('capture failed'))), 'image/jpeg', 0.92)
      })
      const id = `shot-${Date.now()}-${shotSeq++}`
      const file = new File([blob], `note-page-${shots.length + 1}.jpg`, { type: 'image/jpeg' })
      const url = URL.createObjectURL(blob)
      setShots(prev => (prev.length >= max ? prev : [...prev, { id, url, file }]))
    } catch {} finally {
      setBusy(false)
    }
  }, [busy, max, shots.length])

  function removeShot(id) {
    setShots(prev => {
      const hit = prev.find(x => x.id === id)
      if (hit) { try { URL.revokeObjectURL(hit.url) } catch {} }
      return prev.filter(x => x.id !== id)
    })
  }

  function done() {
    stopStream()
    onDone?.(shots.map(s => s.file))
  }

  function close() {
    stopStream()
    onClose?.()
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/95 p-6">
        <div className="w-full max-w-xs rounded-2xl bg-background p-6 text-center">
          <p className="text-sm font-semibold">{error}</p>
          <button onClick={close} className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground">Close</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black">
      <div ref={stageRef} className="relative min-h-0 flex-1 overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="size-full object-cover" />
        {/* Centering guide: fit the page inside this frame */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <div ref={guideRef} className="h-[76%] w-full max-w-sm rounded-2xl border-2 border-dashed border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
        </div>
        <button onClick={close} aria-label="Close camera"
          className="absolute left-3 top-3 flex size-10 items-center justify-center rounded-full bg-black/60 text-white">
          <X className="size-5" />
        </button>
        <p className="absolute inset-x-0 top-3 mx-auto w-fit rounded-full bg-black/60 px-3 py-1 text-[11px] font-bold text-white">
          {shots.length > 0 ? `${shots.length} page${shots.length > 1 ? 's' : ''} taken` : 'Fit the note inside the frame'}
        </p>
      </div>

      {shots.length > 0 && (
        <div className="flex shrink-0 gap-2 overflow-x-auto bg-black px-3 py-2">
          {shots.map(s => (
            <span key={s.id} className="relative shrink-0">
              <img src={s.url} alt="" className="h-16 w-12 rounded-lg border border-white/30 object-cover" />
              <button onClick={() => removeShot(s.id)} aria-label="Remove page"
                className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-red-600 text-white">
                <Trash2 className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex shrink-0 items-center gap-3 bg-black p-4 pb-6">
        <span className="w-20 text-[11px] font-bold text-white/60">{shots.length}/{max}</span>
        <button onClick={shoot} disabled={!ready || busy || shots.length >= max} aria-label="Take page photo"
          className="mx-auto flex size-16 shrink-0 items-center justify-center rounded-full border-4 border-white bg-white/20 disabled:opacity-40">
          <span className="size-11 rounded-full bg-white" />
        </button>
        <button onClick={done} disabled={!shots.length}
          className="flex w-20 items-center justify-center gap-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white disabled:opacity-40">
          <Check className="size-4" /> Done
        </button>
      </div>
    </div>
  )
}
