// File → clean HTML for the rich-text editor. Heavy parsers (PDF, Word)
// lazy-load so they only download when actually converting a file.
'use client'

export function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Plain text → clean paragraphs.
export function txtToHtml(src) {
  return String(src || '').replace(/\r\n?/g, '\n').split(/\n\s*\n/)
    .map(p => p.trim()).filter(Boolean)
    .map(p => `<p>${escHtml(p).replace(/\n/g, '<br/>')}</p>`).join('')
}

// Small markdown → HTML (headings, bold, italic, code, lists, paragraphs).
export function mdToHtml(src) {
  const inline = s => {
    let t = escHtml(s)
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>')
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    t = t.replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    return t
  }
  const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n')
  let html = '', inList = false, inCode = false
  const codeBuf = []
  for (const line of lines) {
    if (/^```/.test(line)) {
      if (inCode) { html += `<pre><code>${escHtml(codeBuf.join('\n'))}</code></pre>`; codeBuf.length = 0; inCode = false }
      else { if (inList) { html += '</ul>'; inList = false } inCode = true }
      continue
    }
    if (inCode) { codeBuf.push(line); continue }
    const h = line.match(/^(#{1,4})\s+(.*)/)
    if (h) { if (inList) { html += '</ul>'; inList = false } html += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`; continue }
    const li = line.match(/^[-*]\s+(.*)/)
    if (li) { if (!inList) { html += '<ul>'; inList = true } html += `<li>${inline(li[1])}</li>`; continue }
    if (inList) { html += '</ul>'; inList = false }
    if (!line.trim()) continue
    html += `<p>${inline(line.trim())}</p>`
  }
  if (inList) html += '</ul>'
  if (inCode) html += `<pre><code>${escHtml(codeBuf.join('\n'))}</code></pre>`
  return html
}

function sentencesToParas(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim()
  if (!clean) return ''
  const sentences = clean.match(/[^.!?]+[.!?]+["']?/g) || [clean]
  const paras = []
  for (let i = 0; i < sentences.length; i += 3) paras.push(sentences.slice(i, i + 3).join(' ').trim())
  return paras.filter(Boolean).map(p => `<p>${escHtml(p)}</p>`).join('')
}

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

// Real PDF text extraction (Mozilla PDF.js): the WHOLE book, proper reading
// order per page. Visual lines rebuilt via hasEOL, grouped into paragraphs;
// short standalone lines become sub-headings, pages clearly delimited.
export async function pdfToHtml(file, opts = {}) {
  const { maxPages = 2000, onProgress } = opts
  const pdfjs = await loadPdfjs()
  const buf = file instanceof ArrayBuffer ? file : await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise
  const n = Math.min(pdf.numPages, maxPages)
  const pagesHtml = []
  for (let i = 1; i <= n; i++) {
    if (onProgress) { try { onProgress(i, n) } catch {} }
    const page = await pdf.getPage(i)
    const tc = await page.getTextContent()
    const lines = []
    let cur = ''
    for (const it of tc.items || []) {
      if (!it.str) continue
      cur += it.str
      if (it.hasEOL) { lines.push(cur); cur = '' }
    }
    if (cur.trim()) lines.push(cur)
    const html = linesToHtml(lines)
    if (html.replace(/<[^>]*>/g, '').trim()) pagesHtml.push(html)
    try { page.cleanup() } catch {}
  }
  try { await pdf.destroy() } catch {}
  if (!pagesHtml.length) return ''
  if (pagesHtml.length === 1) return pagesHtml[0]
  return pagesHtml.map((h, i) => `<h2>Page ${i + 1}</h2>${h}`).join('')
}

function linesToHtml(lines) {
  const paras = []
  let cur = []
  const flush = () => { if (cur.length) { paras.push(cur.join(' ').trim()); cur = [] } }
  for (const raw of lines) {
    const line = String(raw || '').replace(/\s+/g, ' ').trim()
    if (!line) { flush(); continue }
    // A short line after flowing text is usually a heading — but a short
    // line continuing an unfinished sentence is just a wrapped body line.
    if (cur.length && line.length < 60 && !/[.!?:;]$/.test(cur[cur.length - 1])) {
      cur.push(line)
      if (/[.!?:;]$/.test(line) || line.length > 100) flush()
      continue
    }
    if (!cur.length && line.length < 60) { paras.push(line); continue }
    cur.push(line)
    if (/[.!?:;]$/.test(line) || line.length > 120) flush()
  }
  flush()
  return paras.map(p => {
    const t = String(p).trim()
    if (!t) return ''
    if (t.length < 80 && !/[.!?]$/.test(t)) return `<h3>${escHtml(t)}</h3>`
    return `<p>${escHtml(t)}</p>`
  }).join('')
}

// Word (.docx) → HTML via mammoth.
export async function docxToHtml(file) {
  const mammoth = await import('mammoth')
  const buf = file instanceof ArrayBuffer ? file : await file.arrayBuffer()
  const res = await mammoth.convertToHtml({ arrayBuffer: buf })
  return String(res?.value || '').trim()
}

export function baseName(name) {
  return String(name || 'Untitled').replace(/\.(txt|md|markdown|pdf|docx?)$/i, '') || String(name || 'Untitled')
}

// Convert an uploaded file to editor-ready HTML.
// Returns { title, html } or null when the file can't be converted to text
// (caller should then keep it as a file attachment instead).
export async function convertFileToHtml(file, opts = {}) {
  const name = String(file?.name || 'file')
  const lower = name.toLowerCase()
  const mime = String(file?.type || '')
  if (/\.md$|\.markdown$/i.test(lower)) {
    const raw = await file.text()
    if (!raw.trim()) return null
    return { title: baseName(name), html: mdToHtml(raw) }
  }
  if (/\.txt$/i.test(lower) || /text\/(plain|markdown)/.test(mime)) {
    const raw = await file.text()
    if (!raw.trim()) return null
    return { title: baseName(name), html: txtToHtml(raw) }
  }
  if (/\.pdf$/i.test(lower) || mime === 'application/pdf') {
    const html = await pdfToHtml(file, opts)
    if (!html || html.replace(/<[^>]*>/g, '').trim().length < 50) return null
    return { title: baseName(name), html }
  }
  if (/\.docx$/i.test(lower) || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const html = await docxToHtml(file)
    if (!html || html.replace(/<[^>]*>/g, '').trim().length < 10) return null
    return { title: baseName(name), html }
  }
  return null
}

// Same, but for an already-hosted URL (folder / library picks).
export async function convertUrlToHtml(url, fallbackName = 'Note', opts = {}) {
  const res = await fetch(url)
  if (!res.ok) return null
  const blob = await res.blob()
  const path = String(url).split('?')[0]
  const fromUrl = decodeURIComponent(path.substring(path.lastIndexOf('/') + 1) || '')
  const type = blob.type || (/\.pdf$/i.test(path) ? 'application/pdf' : /\.docx$/i.test(path) ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : /\.md$/i.test(path) ? 'text/markdown' : /\.txt$/i.test(path) ? 'text/plain' : '')
  const file = new File([blob], fromUrl || fallbackName, { type })
  return convertFileToHtml(file, opts)
}
