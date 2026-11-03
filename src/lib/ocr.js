// On-device OCR for paper-note photos: Tesseract.js (no API, no cost).
// Client-only. Tesseract itself is dynamic-imported so the WASM engine
// never touches the initial bundle — only the scan flow downloads it.
export function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Plain text (OCR / AI output) → editor HTML: "# " heads, "- " bullets,
// blank-line paragraphs.
export function plainToHtml(text) {
  const lines = String(text || '').split('\n')
  let html = ''
  let list = []
  const flush = () => {
    if (list.length) {
      html += `<ul>${list.map(i => `<li>${escHtml(i)}</li>`).join('')}</ul>`
      list = []
    }
  }
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) { flush(); continue }
    if (/^#{1,3}\s+/.test(line)) {
      flush()
      html += `<h2>${escHtml(line.replace(/^#{1,3}\s+/, ''))}</h2>`
      continue
    }
    const m = line.match(/^[-*•]\s+(.*)/)
    if (m) { list.push(m[1]); continue }
    flush()
    html += `<p>${escHtml(line)}</p>`
  }
  flush()
  return html || '<p></p>'
}

// Editor HTML → visible text (for emptiness checks).
export function htmlToText(html) {
  return String(html || '')
    .replace(/<\s*br[^>]*>/gi, ' ')
    .replace(/<\/(p|div|h\d|li|ul|ol)>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function drawScaled(file, maxDim) {
  const bmp = await createImageBitmap(file)
  const w = bmp.width || 1
  const h = bmp.height || 1
  const scale = Math.min(1, maxDim / Math.max(w, h)) * (Math.max(w, h) < 1200 ? 2 : 1)
  const W = Math.max(1, Math.round(w * scale))
  const H = Math.max(1, Math.round(h * scale))
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const ctx = cv.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bmp, 0, 0, W, H)
  try { bmp.close() } catch {}
  return { cv, ctx, W, H }
}

// Grayscale + contrast stretch: the cheap step that buys most accuracy.
export async function enhanceForOcr(file, maxDim = 2000) {
  const { cv, ctx, W, H } = await drawScaled(file, maxDim)
  const img = ctx.getImageData(0, 0, W, H)
  const d = img.data
  let lo = 255
  let hi = 0
  for (let i = 0; i < d.length; i += 4) {
    const g = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000
    if (g < lo) lo = g
    if (g > hi) hi = g
  }
  const span = Math.max(1, hi - lo)
  for (let i = 0; i < d.length; i += 4) {
    const g = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000
    const v = Math.max(0, Math.min(255, ((g - lo) / span) * 255))
    d[i] = d[i + 1] = d[i + 2] = v
  }
  ctx.putImageData(img, 0, 0)
  return new Promise((resolve, reject) => {
    cv.toBlob(b => (b ? resolve(b) : reject(new Error('Could not process image'))), 'image/png')
  })
}

export function downscaleForAI(file, maxDim = 1280) {
  return drawScaled(file, maxDim).then(({ cv }) => cv.toDataURL('image/jpeg', 0.8))
}

export async function extractNoteText(file, { onProgress } = {}) {
  const { createWorker } = await import('tesseract.js')
  const clean = await enhanceForOcr(file).catch(() => file)
  let worker = null
  try {
    try {
      worker = await createWorker('eng', undefined, {
        logger: (m) => { try { onProgress?.(m) } catch {} },
      })
    } catch {
      worker = await createWorker('eng')
    }
    const { data } = await worker.recognize(clean)
    return { text: String(data?.text || '').trim(), confidence: Math.round(data?.confidence || 0) }
  } finally {
    try { await worker?.terminate() } catch {}
  }
}
