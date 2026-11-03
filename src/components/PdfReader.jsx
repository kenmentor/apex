'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Moon, Sun, Crop, ZoomIn, ZoomOut, ExternalLink, ArrowLeftRight } from 'lucide-react'

let pdfjsPromise = null
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then(m => {
      const lib = m.default || m
      try {
        if (lib?.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) {
          lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        }
      } catch {}
      return lib
    })
  }
  return pdfjsPromise
}

function hashStr(s) {
  let h = 5381
  for (let i = 0; i < String(s).length; i++) h = ((h << 5) + h + String(s).charCodeAt(i)) >>> 0
  return h.toString(36)
}

// Sample the first pages at tiny size, find the ink bounding box —
// ReadEra-style margin crop so text fills the phone width.
async function detectCrop(pdf, pages = 3) {
  let L = 1, T = 1, R = 0, B = 0, found = false
  const n = Math.min(pages, pdf.numPages)
  for (let i = 1; i <= n; i++) {
    let page = null
    try {
      page = await pdf.getPage(i)
      const v0 = page.getViewport({ scale: 1 })
      const W = 140
      const scale = W / v0.width
      const H = Math.max(1, Math.round(v0.height * scale))
      const cv = document.createElement('canvas')
      cv.width = W
      cv.height = H
      const ctx = cv.getContext('2d', { willReadFrequently: true })
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, W, H)
      await page.render({ canvasContext: ctx, viewport: page.getViewport({ scale }) }).promise
      const d = ctx.getImageData(0, 0, W, H).data
      let l = W, t = H, r = 0, b = 0, hit = false
      for (let y = 0; y < H; y += 2) {
        for (let x = 0; x < W; x += 2) {
          const o = (y * W + x) * 4
          if (d[o] < 235 || d[o + 1] < 235 || d[o + 2] < 235) {
            if (x < l) l = x
            if (y < t) t = y
            if (x > r) r = x
            if (y > b) b = y
            hit = true
          }
        }
      }
      if (!hit) continue
      found = true
      const pad = 0.015
      L = Math.min(L, Math.max(0, l / W - pad))
      T = Math.min(T, Math.max(0, t / H - pad))
      R = Math.max(R, Math.min(1, r / W + pad))
      B = Math.max(B, Math.min(1, b / H + pad))
    } catch {} finally {
      try { page?.cleanup() } catch {}
    }
  }
  if (!found || R - L < 0.3 || B - T < 0.3) return null
  return { l: L, t: T, r: R, b: B }
}

// ReadEra-style PDF reading: real pages (images, headers, colors intact),
// fit-to-width, margin crop, continuous scroll, night mode, position memory.
export default function PdfReader({ url, title, backHref = '/folders', bare = false }) {
  const router = useRouter()
  const scrollRef = useRef(null)
  const slotsRef = useRef({})
  const pdfRef = useRef(null)
  const dimsRef = useRef([])
  const doneRef = useRef(new Set())
  const ioRef = useRef(null)
  const tokenRef = useRef(0)
  const saveTimer = useRef(null)
  const restoredRef = useRef(false)

  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [numPages, setNumPages] = useState(0)
  const [dims, setDims] = useState([])
  const [crop, setCrop] = useState(null)
  const [cropOn, setCropOn] = useState(true)
  const [night, setNight] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [dir, setDir] = useState('v') // 'v' vertical scroll | 'h' horizontal pages
  const [page, setPage] = useState(1)

  const posKey = `pdfpos:${hashStr(url || '')}`

  function contentWidth() {
    const el = scrollRef.current
    return el ? el.clientWidth : 360
  }

  function pageScale(i) {
    const d = dimsRef.current[i]
    if (!d) return 1
    const box = cropOn && crop ? crop : null
    const w = box ? (box.r - box.l) * d.w : d.w
    return (contentWidth() / w) * zoom
  }

  function slotAspect(i) {
    const d = dimsRef.current[i]
    if (!d) return 1.4
    const box = cropOn && crop ? crop : null
    const w = box ? (box.r - box.l) * d.w : d.w
    const h = box ? (box.b - box.t) * d.h : d.h
    return h / Math.max(w, 1)
  }

  async function renderSlot(i) {
    const pdf = pdfRef.current
    if (!pdf) return
    const myToken = tokenRef.current
    const key = `${i}|${zoom}|${cropOn ? 'c' : 'f'}|${dir}`
    if (doneRef.current.has(key)) return
    doneRef.current.add(key)
    const slot = slotsRef.current[i]
    if (!slot) return
    let page = null
    try {
      page = await pdf.getPage(i + 1)
      if (tokenRef.current !== myToken) return
      const scale = pageScale(i)
      const vp = page.getViewport({ scale })
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const box = cropOn && crop ? crop : null
      let out
      if (box) {
        const fx = box.l * vp.width, fy = box.t * vp.height
        const cw = (box.r - box.l) * vp.width, ch = (box.b - box.t) * vp.height
        const off = document.createElement('canvas')
        off.width = Math.floor(vp.width * dpr)
        off.height = Math.floor(vp.height * dpr)
        const octx = off.getContext('2d')
        octx.scale(dpr, dpr)
        await page.render({ canvasContext: octx, viewport: vp }).promise
        if (tokenRef.current !== myToken) return
        out = document.createElement('canvas')
        out.width = Math.max(1, Math.floor(cw * dpr))
        out.height = Math.max(1, Math.floor(ch * dpr))
        const ctx = out.getContext('2d')
        ctx.drawImage(off, fx * dpr, fy * dpr, cw * dpr, ch * dpr, 0, 0, out.width, out.height)
      } else {
        out = document.createElement('canvas')
        out.width = Math.floor(vp.width * dpr)
        out.height = Math.floor(vp.height * dpr)
        const ctx = out.getContext('2d')
        ctx.scale(dpr, dpr)
        await page.render({ canvasContext: ctx, viewport: vp }).promise
        if (tokenRef.current !== myToken) return
      }
      out.className = 'm-auto block w-full shrink-0' + (night ? ' invert hue-rotate-180' : '')
      out.style.filter = night ? 'invert(1) hue-rotate(180deg)' : ''
      slot.innerHTML = ''
      slot.appendChild(out)
    } catch {} finally {
      try { page?.cleanup() } catch {}
    }
  }

  function observeAll() {
    try { ioRef.current?.disconnect() } catch {}
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const i = Number(e.target.dataset.page)
          if (Number.isFinite(i)) renderSlot(i)
        }
      }
    }, { root: scrollRef.current, rootMargin: '1200px 0px' })
    ioRef.current = io
    Object.values(slotsRef.current).forEach(el => { try { io.observe(el) } catch {} })
  }

  useEffect(() => {
    let dead = false
    tokenRef.current += 1
    setStatus('loading')
    setError('')
    setDims([])
    setNumPages(0)
    doneRef.current = new Set()
    slotsRef.current = {}
    restoredRef.current = false
    ;(async () => {
      try {
        const pdfjs = await loadPdfjs()
        const res = await fetch(`/api/pdf-proxy?url=${encodeURIComponent(url)}`)
        if (!res.ok) throw new Error(res.status === 413 ? 'File too large to read here' : 'Could not open this file')
        const buf = await res.arrayBuffer()
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise
        if (dead) { try { await pdf.destroy() } catch {} return }
        pdfRef.current = pdf
        const n = pdf.numPages
        const arr = []
        for (let i = 1; i <= n; i++) {
          const p = await pdf.getPage(i)
          const v = p.getViewport({ scale: 1 })
          arr.push({ w: v.width, h: v.height })
          try { p.cleanup() } catch {}
          if (dead) return
        }
        dimsRef.current = arr
        setDims(arr)
        setNumPages(n)
        setStatus('ready')
        detectCrop(pdf, 3).then(c => { if (!dead && c) setCrop(c) }).catch(() => {})
      } catch (e) {
        if (!dead) { setError(e.message || 'Could not open this file'); setStatus('error') }
      }
    })()
    return () => {
      dead = true
      try { ioRef.current?.disconnect() } catch {}
      try { pdfRef.current?.destroy() } catch {}
      pdfRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  // Re-render on zoom/crop toggle.
  useEffect(() => {
    if (status !== 'ready') return
    tokenRef.current += 1
    doneRef.current = new Set()
    Object.values(slotsRef.current).forEach(el => { try { el.innerHTML = '' } catch {} })
    observeAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, cropOn, crop, status, numPages, dir])

  function goBack() {
    try {
      if (window.history.length > 1) router.back()
      else router.push(backHref)
    } catch { router.push(backHref) }
  }

  function onScroll() {
    const el = scrollRef.current
    if (!el || !dimsRef.current.length) return
    if (dir === 'h') {
      const w = el.clientWidth || 1
      const cur = Math.max(1, Math.min(dimsRef.current.length, Math.floor(el.scrollLeft / w) + 1))
      setPage(p => (p === cur ? p : cur))
    } else {
      const top = el.scrollTop + 120
      let acc = 0, cur = 1
      for (let i = 0; i < dimsRef.current.length; i++) {
        const h = contentWidth() * slotAspect(i) + 6
        if (acc <= top) cur = i + 1
        acc += h
        if (acc > top) break
      }
      setPage(p => (p === cur ? p : cur))
    }
    try {
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        try { localStorage.setItem(posKey, JSON.stringify({ v: el.scrollTop, h: el.scrollLeft })) } catch {}
      }, 400)
    } catch {}
  }

  useEffect(() => {
    if (status === 'ready' && !restoredRef.current && dims.length) {
      restoredRef.current = true
      try {
        const raw = localStorage.getItem(posKey)
        let v = 0, h = 0
        if (raw) {
          try {
            const j = JSON.parse(raw)
            if (typeof j === 'number') v = j
            else { v = Number(j?.v) || 0; h = Number(j?.h) || 0 }
          } catch { v = Number(raw) || 0 }
        }
        if ((v > 0 || h > 0) && scrollRef.current) {
          requestAnimationFrame(() => {
            try {
              const el = scrollRef.current
              el.scrollTop = Math.min(v, el.scrollHeight)
              el.scrollLeft = Math.min(h, el.scrollWidth)
            } catch {}
          })
        }
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, dims])

  return (
    <div className={`flex ${bare ? 'h-full' : 'h-dvh'} flex-col overflow-hidden bg-background`}>
      {!bare && (
      <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex w-full items-center gap-1.5 px-3 py-2">
          <button onClick={goBack} aria-label="Go back" className="flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted">
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{title || 'Reading'}</p>
            <p className="text-[11px] tabular-nums text-muted-foreground">{numPages ? `${page} / ${numPages}` : '…'}</p>
          </div>
          <button onClick={() => setCropOn(v => !v)} aria-label="Toggle margin crop" title="Crop margins"
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted ${cropOn && crop ? 'text-primary' : 'text-muted-foreground'}`}>
            <Crop className="size-4" />
          </button>
          <button onClick={() => setZoom(z => Math.max(0.75, +(z - 0.25).toFixed(2)))} aria-label="Zoom out" className="flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted">
            <ZoomOut className="size-4" />
          </button>
          <button onClick={() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))} aria-label="Zoom in" className="flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted">
            <ZoomIn className="size-4" />
          </button>
          <button onClick={() => setNight(v => !v)} aria-label="Night mode" className="flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted">
            {night ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <button onClick={() => setDir(d => (d === 'h' ? 'v' : 'h'))} aria-label="Toggle page direction" title={dir === 'h' ? 'Vertical scroll' : 'Horizontal pages'}
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted ${dir === 'h' ? 'text-primary' : ''}`}>
            <ArrowLeftRight className="size-4" />
          </button>
        </div>
      </div>
      )}
      {bare && (
        <div className="sticky top-0 z-10 flex justify-end gap-1 bg-gradient-to-b from-background via-background/85 to-transparent px-2 pb-3 pt-2">
          <button onClick={() => setCropOn(v => !v)} aria-label="Toggle margin crop" title="Crop margins"
            className={`flex size-8 items-center justify-center rounded-lg bg-background/80 shadow-sm backdrop-blur hover:bg-muted ${cropOn && crop ? 'text-primary' : 'text-muted-foreground'}`}>
            <Crop className="size-4" />
          </button>
          <button onClick={() => setZoom(z => Math.max(0.75, +(z - 0.25).toFixed(2)))} aria-label="Zoom out" className="flex size-8 items-center justify-center rounded-lg bg-background/80 shadow-sm backdrop-blur hover:bg-muted">
            <ZoomOut className="size-4" />
          </button>
          <button onClick={() => setZoom(z => Math.min(3, +(z + 0.25).toFixed(2)))} aria-label="Zoom in" className="flex size-8 items-center justify-center rounded-lg bg-background/80 shadow-sm backdrop-blur hover:bg-muted">
            <ZoomIn className="size-4" />
          </button>
          <button onClick={() => setNight(v => !v)} aria-label="Night mode" className="flex size-8 items-center justify-center rounded-lg bg-background/80 shadow-sm backdrop-blur hover:bg-muted">
            {night ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <button onClick={() => setDir(d => (d === 'h' ? 'v' : 'h'))} aria-label="Toggle page direction" title={dir === 'h' ? 'Vertical scroll' : 'Horizontal pages'}
            className={`flex size-8 items-center justify-center rounded-lg bg-background/80 shadow-sm backdrop-blur hover:bg-muted ${dir === 'h' ? 'text-primary' : ''}`}>
            <ArrowLeftRight className="size-4" />
          </button>
        </div>
      )}

      <div ref={scrollRef} onScroll={onScroll} className={`min-h-0 w-full flex-1 overflow-y-auto ${night ? 'bg-black' : ''}`}>
        {status === 'loading' && (
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 py-24">
            <span className="size-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            <p className="text-sm text-muted-foreground">Opening book…</p>
          </div>
        )}
        {status === 'error' && (
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 py-24 text-center">
            <p className="text-sm font-bold">{error || 'Could not open this file'}</p>
            <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold">
              Open original <ExternalLink className="size-4" />
            </a>
          </div>
        )}
        {status === 'ready' && (
          <div className={dir === 'h' ? 'flex h-full overflow-x-auto snap-x snap-mandatory' : 'space-y-1.5'}>
            {dims.map((d, i) => (
              <div
                key={i}
                data-page={i}
                ref={el => { if (el) slotsRef.current[i] = el }}
                className={dir === 'h'
                  ? `flex h-full w-full shrink-0 snap-center flex-col overflow-y-auto ${night ? 'bg-black' : 'bg-white'}`
                  : 'w-full overflow-hidden bg-muted/40'}
                style={dir === 'h' ? undefined : { aspectRatio: `${1} / ${slotAspect(i)}` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
