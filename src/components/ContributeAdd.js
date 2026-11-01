'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ClipboardList, FileText, FolderOpen, Youtube, Link2, Upload, LibraryBig, CheckCircle2, Loader2, Paperclip, Plus } from 'lucide-react'
import { getToken } from '@/lib/auth'
import { uploadFile } from '@/lib/uploads'
import RichTextEditor from '@/components/RichTextEditor'
import { ytThumb, FolderBrowseInline, LibraryListInline } from '@/components/AttachPickers'
import { escHtml, convertFileToHtml, convertUrlToHtml } from '@/lib/file-to-html'
import { parseQuizFile } from '@/lib/quiz-types'
import QuestionRenderer from '@/components/exam/QuestionRenderer'

const MAX_PER_SHEET = 30

function api(path, opts = {}) {
  const t = getToken()
  return fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(opts.headers || {}) },
  }).then(async r => {
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d.error || `Failed (${r.status})`)
    return d
  })
}

export function Sheet({ title, onClose, children }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t bg-background p-4 pb-8">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
        <div className="mb-3 flex items-center gap-2">
          <h2 className="flex-1 truncate text-base font-black">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="flex size-8 items-center justify-center rounded-lg hover:bg-muted"><X className="size-4" /></button>
        </div>
        {children}
      </div>
    </>
  )
}

function ContextLine() {
  return null
}

const KIND_FOLDERS = { video: 'Videos', pdf: 'PDFs', audio: 'Audio', notes: 'Notes', text: 'Notes', image: 'Images', file: 'Files', link: 'Links', quiz: 'Quizzes', game: 'Games' }

async function ensureFolder(name, parentId) {
  const qs = parentId ? `?parentId=${encodeURIComponent(parentId)}` : ''
  const d = await api(`/api/library${qs}`)
  const hit = (d.children || []).find(c => c.kind === 'folder' && c.name === name)
  if (hit) return hit.id
  const c = await api('/api/library', { method: 'POST', body: JSON.stringify({ kind: 'folder', name, parentId: parentId || null }) })
  return c.node.id
}

// Every scope add drops a pointer ref into My Files under
// Contributions / {COURSE} / {media-kind} — same file, zero copies.
async function addPointerFor({ courseCode, kind, name, url, href, itemKind, materialId }) {
  try {
    const root = await ensureFolder('Contributions', null)
    const course = await ensureFolder(courseCode || 'General', root)
    const folder = await ensureFolder(KIND_FOLDERS[kind] || 'Files', course)
    await api('/api/library', {
      method: 'POST',
      body: JSON.stringify({
        kind: 'ref', name, parentId: folder,
        itemKind: kind === 'quiz' ? 'game' : (itemKind || kind || 'link'),
        href: href || url || null, url: url || null,
        courseCode: courseCode || null, materialId: materialId || null,
        subtitle: 'From contributions',
      }),
    })
  } catch {}
}

function acceptFor(kindKey) {
  switch (kindKey) {
    case 'video': return 'video/*,.mp4,.webm,.mov'
    case 'audio': return 'audio/*,.mp3,.wav,.m4a,.ogg'
    case 'pdf': return 'application/pdf,.pdf'
    case 'notes': return '.pdf,.txt,.md,.docx,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    default: return undefined
  }
}

function detectKind(file, fallback) {
  if (fallback && fallback !== 'notes') return fallback
  const mime = file.type || ''
  if (file.name?.endsWith('.pdf') || mime === 'application/pdf') return 'pdf'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('image/')) return 'image'
  return 'file'
}

let rowSeq = 0
const newRowKey = () => `q-${Date.now()}-${rowSeq++}`

// One screen: paste a link → Add (field clears, item jumps to top),
// or Upload fresh / From folder — everything piles into one list,
// one Upload sends it all. No menus, no extra steps.
export default function AddSheet({ courseCode, topic, programme, kind, onClose, onDone }) {
  const kindKey = kind === 'text' ? 'notes' : (kind || '')
  const lockedKind = ['video', 'pdf', 'audio', 'notes', 'quiz'].includes(kindKey) ? kindKey : ''
  const title = courseCode ? `Add to ${courseCode}` : 'Add content'
  const notesApi = useRef(null)
  const [exitOpen, setExitOpen] = useState(false)
  const [exitSaving, setExitSaving] = useState(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // System back button closes the sheet instead of leaving the page.
  useEffect(() => {
    try { window.history.pushState({ addSheet: true }, '') } catch {}
    const onPop = () => { try { onCloseRef.current() } catch {} }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  function close() {
    try {
      if (window.history.state && window.history.state.addSheet) { window.history.back(); return }
    } catch {}
    onClose()
  }

  // Misclick guard: closing with unsent text asks Save draft / Discard.
  async function exitSaveDraft() {
    setExitSaving(true)
    try { await notesApi.current?.saveDraft() } catch {}
    finally { setExitSaving(false); setExitOpen(false); close() }
  }

  if (lockedKind === 'quiz') {
    return (
      <Sheet title={title} onClose={close}>
        <ContextLine courseCode={courseCode} topic={topic} />
        <CreateQuiz courseCode={courseCode} topic={topic} onDone={onDone} onBack={close} />
      </Sheet>
    )
  }

  // Notes get a full page (not the bottom sheet) so the editor has room.
  if (lockedKind === 'notes') {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
        <div className="mx-auto w-full max-w-2xl px-4 pb-10 pt-4">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="flex-1 truncate text-base font-black">{title}</h2>
            <button onClick={() => { if (notesApi.current?.isDirty()) setExitOpen(true); else close() }} aria-label="Close" className="flex size-8 items-center justify-center rounded-lg hover:bg-muted"><X className="size-4" /></button>
          </div>
          <BatchAdd
            courseCode={courseCode}
            topic={topic}
            programme={programme}
            lockedKind={lockedKind}
            onDone={onDone}
            notesApiRef={notesApi}
          />
        </div>
        {exitOpen && (
          <>
            <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm" onClick={() => !exitSaving && setExitOpen(false)} />
            <div className="fixed inset-x-0 bottom-0 z-[71] mx-auto w-full max-w-md rounded-t-3xl border-t bg-background p-4 pb-8">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
              <h3 className="text-sm font-black">Save draft or discard?</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">You have unsent text. Save it to Drafts in your folders, or discard it.</p>
              <div className="mt-3 space-y-2">
                <button onClick={exitSaveDraft} disabled={exitSaving} className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
                  {exitSaving ? 'Saving…' : 'Save as draft'}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setExitOpen(false); close() }} disabled={exitSaving} className="rounded-xl border py-2 text-xs font-bold disabled:opacity-50">Discard</button>
                  <button onClick={() => setExitOpen(false)} disabled={exitSaving} className="rounded-xl bg-secondary py-2 text-xs font-bold disabled:opacity-50">Keep editing</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <Sheet title={title} onClose={close}>
      <BatchAdd
        courseCode={courseCode}
        topic={topic}
        programme={programme}
        lockedKind={lockedKind}
        onDone={onDone}
      />
    </Sheet>
  )
}

function BatchAdd({ courseCode, topic, programme, lockedKind, onDone, notesApiRef }) {
  const isAudio = lockedKind === 'audio'
  const isNotes = lockedKind === 'notes'
  const defaultNoteTitle = topic ? `Notes: ${topic}` : ''
  const showLink = lockedKind !== 'audio' && lockedKind !== 'notes'
  const linkLabel = lockedKind === 'video' ? 'video' : 'file'
  const [url, setUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [meta, setMeta] = useState(null)
  const [playlist, setPlaylist] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [folderOpen, setFolderOpen] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [queue, setQueue] = useState([])
  const [addedCount, setAddedCount] = useState(0)
  const [committing, setCommitting] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [noteTitle, setNoteTitle] = useState(topic ? `Notes: ${topic}` : '')
  const [noteHtml, setNoteHtml] = useState('')
  const [noteDone, setNoteDone] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [draftId, setDraftId] = useState(null)
  const [resumeCandidate, setResumeCandidate] = useState(null)
  const fileRef = useRef(null)
  const lastFetched = useRef('')
  const unloadOk = useRef(false)

  // Accidental refresh / tab close with unsent work → browser asks first.
  useEffect(() => {
    const textLen = noteHtml.replace(/<[^>]*>/g, '').trim().length
    const customTitle = noteTitle.trim() && noteTitle.trim() !== defaultNoteTitle
    if (!queue.length && !textLen && !customTitle) return
    const handler = (e) => {
      if (unloadOk.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [queue.length, noteHtml, noteTitle, defaultNoteTitle])

  // Drafts live in a "Drafts" folder in your app folders. Saved on
  // accidental exit, resumed here, deleted once published.
  function parseDraftContent(content) {
    try {
      const d = JSON.parse(String(content || ''))
      if (d && typeof d === 'object' && (d.html || d.staged)) return d
    } catch {}
    return { html: String(content || ''), staged: [] }
  }

  useEffect(() => {
    if (!isNotes) return
    let cancelled = false
    ;(async () => {
      try {
        const root = await api('/api/library')
        const drafts = (root.children || []).find(c => c.kind === 'folder' && String(c.name || '').toLowerCase() === 'drafts')
        if (!drafts || cancelled) return
        const d = await api(`/api/library?parentId=${encodeURIComponent(drafts.id)}`)
        const hits = (d.children || []).filter(c =>
          c.kind === 'ref' && (c.itemKind === 'draft' || c.itemKind === 'notes') && c.content &&
          String(c.courseCode || '') === String(courseCode || '') &&
          String(c.topic || '') === String(topic || ''))
          .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
        if (!cancelled && hits[0]) setResumeCandidate(hits[0])
      } catch {}
    })()
    return () => { cancelled = true }
  }, [isNotes, courseCode, topic])

  async function resumeDraft(node) {
    const d = parseDraftContent(node.content)
    if (d.html) setNoteHtml(prev => prev ? prev + d.html : d.html)
    if (Array.isArray(d.staged) && d.staged.length) {
      pushItems(d.staged.slice(0, MAX_PER_SHEET).map(s => ({
        title: s.title || 'Untitled', fileName: s.title || 'Untitled', html: s.html,
        itemKind: 'notes', courseCode: courseCode || null, source: 'write',
      })))
    }
    if (node.name) setNoteTitle(node.name)
    setDraftId(node.id)
    setResumeCandidate(null)
    setError('')
  }

  async function deleteDraft(id) {
    try { await api(`/api/library/${encodeURIComponent(id)}`, { method: 'DELETE' }) } catch {}
    if (id && id === draftId) setDraftId(null)
    setResumeCandidate(prev => (prev && String(prev.id) === String(id) ? null : prev))
  }

  async function saveDraft() {
    const stagedTexts = queue.filter(q => q.html).map(q => ({ title: q.title, html: q.html }))
    const html = noteHtml || ''
    if (!html.replace(/<[^>]*>/g, '').trim() && !stagedTexts.length) return
    const name = noteTitle.trim() || defaultNoteTitle || 'Untitled draft'
    const content = JSON.stringify({ html, staged: stagedTexts, savedAt: new Date().toISOString() })
    if (draftId) {
      try {
        await api(`/api/library/${encodeURIComponent(draftId)}`, { method: 'PATCH', body: JSON.stringify({ name, content }) })
        return
      } catch {}
    }
    const root = await ensureFolder('Drafts', null)
    const c = await api('/api/library', { method: 'POST', body: JSON.stringify({
      kind: 'ref', name, parentId: root, itemKind: 'draft', content,
      courseCode: courseCode || null, topic: topic || null, subtitle: 'Draft',
    }) })
    if (c?.node?.id) setDraftId(c.node.id)
  }

  function isDirty() {
    return noteHtml.replace(/<[^>]*>/g, '').trim().length > 0
      || queue.length > 0
      || (noteTitle.trim() && noteTitle.trim() !== defaultNoteTitle)
  }

  if (notesApiRef) {
    notesApiRef.current = { isDirty, saveDraft }
  }

  const [converting, setConverting] = useState(null)
  const editorHasContent = isNotes && (noteTitle.trim() !== defaultNoteTitle && !!noteTitle.trim() || noteHtml.replace(/<[^>]*>/g, '').trim().length > 0)

  // Editor → staged list (not published yet). Add as many texts as you want, one Upload sends all.
  // Returns true when there was nothing to stage or staging succeeded.
  function addTextToQueue(opts = {}) {
    const t = noteTitle.trim()
    const textLen = noteHtml.replace(/<[^>]*>/g, '').trim().length
    if (!t && textLen < 10) {
      if (!opts.silent) setError('Write something first')
      return !t && textLen === 0
    }
    if (!t) { if (!opts.silent) setError('Give the note a title'); return false }
    if (textLen < 10) { if (!opts.silent) setError('Write a little more first'); return false }
    pushItems({ title: t, fileName: t, html: noteHtml, itemKind: 'notes', courseCode: courseCode || null, source: 'write' })
    setNoteTitle(topic ? `Notes: ${topic}` : '')
    setNoteHtml('')
    setNoteDone(t)
    setError('')
    setTimeout(() => setNoteDone(''), 2500)
    return true
  }

  // Upload flushes any unsent editor text into the list first, so Upload
  // never looks dead when the text is still in the editor.
  function uploadPressed() {
    if (isNotes && !addTextToQueue({ silent: true })) return
    setConfirmOpen(true)
  }

  const accept = acceptFor(lockedKind)

  async function lookup(u) {
    const v = (u ?? url).trim()
    if (!v || v.length < 6) return
    if (lastFetched.current === v) return
    lastFetched.current = v
    setFetching(true)
    setError('')
    try {
      const d = await api(`/api/youtube-meta?url=${encodeURIComponent(v)}`)
      if (d.playlist && Array.isArray(d.videos)) {
        setPlaylist(d.videos)
        setMeta(null)
        setLinkTitle('')
      } else {
        setMeta(d)
        setPlaylist(null)
        setLinkTitle(prev => prev.trim() ? prev : (d.title || ''))
      }
    } catch (e) {
      setMeta({ url: v, title: '', direct: true })
      setPlaylist(null)
    } finally { setFetching(false) }
  }

  // Auto-fetch on paste/type.
  useEffect(() => {
    const v = url.trim()
    if (v.length < 8 || !/https?:\/\/|youtu\.?be|youtube|mp4|mp3|m4a|youtu/.test(v)) return
    if (lastFetched.current === v) return
    const t = setTimeout(() => { lookup(v) }, 500)
    return () => clearTimeout(t)
  }, [url])

  function pushItems(items) {
    const list = Array.isArray(items) ? items : [items]
    setQueue(prev => {
      const room = MAX_PER_SHEET - prev.length
      if (room <= 0) {
        setError(`List is full (${MAX_PER_SHEET}) — Upload first.`)
        return prev
      }
      return [...list.slice(0, room).map(it => ({ key: newRowKey(), ...it })), ...prev]
    })
  }

  function addLink() {
    const finalUrl = (meta?.url || url).trim()
    if (!finalUrl) { setError('Paste a link first'); return }
    // Playlist: one paste stages every video.
    if (playlist?.length) {
      pushItems(playlist.slice(0, MAX_PER_SHEET).map(v => ({
        title: v.title || 'YouTube video', fileName: v.title || 'YouTube video',
        url: v.url, thumb: v.thumb || null,
        itemKind: lockedKind === 'audio' ? 'audio' : 'video',
        courseCode: courseCode || null, source: 'link',
      })))
      setUrl(''); setMeta(null); setPlaylist(null); setLinkTitle('')
      lastFetched.current = ''
      setError('')
      return
    }
    const finalTitle = (linkTitle.trim() || meta?.title || '').trim()
    if (!finalTitle) { setError('Add a title'); return }
    pushItems({
      title: finalTitle, fileName: finalTitle, url: finalUrl,
      thumb: meta?.thumb || null,
      itemKind: lockedKind || 'file',
      courseCode: courseCode || null, source: 'link',
    })
    // Goes to the top, field is clean again for more.
    setUrl(''); setLinkTitle(''); setMeta(null)
    lastFetched.current = ''
    setError('')
  }

  async function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    if (fileRef.current) fileRef.current.value = ''
    if (!files.length) return
    // Notes: EVERYTHING converts to editable text in the editor (real
    // parsers: PDF.js for PDFs, mammoth for Word). Only files with no
    // extractable text stay as file attachments.
    if (isNotes) {
      const rest = []
      try {
        const parts = []
        const todo = files.slice(0, 8)
        for (const f of todo) {
          const name = String(f.name || 'Untitled')
          const convertible = /\.(txt|md|markdown|pdf|docx?)$/i.test(name)
            || /text\/(plain|markdown)/.test(f.type || '')
            || (f.type || '') === 'application/pdf'
            || (f.type || '') === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          if (!convertible) { rest.push(f); continue }
          try {
            setConverting(`Converting ${name.slice(0, 24)}…`)
            const out = await convertFileToHtml(f, { onProgress: (i, n) => setConverting(`Converting ${name.slice(0, 18)}… p${i}/${n}`) })
            if (out?.html) parts.push(out)
            else rest.push(f)
          } catch { rest.push(f) }
          finally { setConverting(null) }
        }
        if (parts.length) {
          const html = parts.map(p => `<h2>${escHtml(p.title)}</h2>${p.html}`).join('')
          setNoteHtml(prev => prev ? prev + html : html)
          if (!noteTitle.trim() && parts.length === 1) setNoteTitle(parts[0].title)
          setUploadOpen(false)
          setError(parts.length < files.length ? 'One file had no readable text — kept as attachment.' : '')
        }
      } catch (err) { setError('Could not read that file') }
      if (rest.length) {
        pushItems(rest.slice(0, MAX_PER_SHEET).map(f => ({
          title: f.name, fileName: f.name, file: f,
          mime: f.type || null, size: f.size || null,
          itemKind: detectKind(f, lockedKind),
          courseCode: courseCode || null, source: 'device',
        })))
        setError('')
      }
      return
    }
    pushItems(files.slice(0, MAX_PER_SHEET).map(f => ({
      title: f.name, fileName: f.name, file: f,
      mime: f.type || null, size: f.size || null,
      itemKind: detectKind(f, lockedKind),
      courseCode: courseCode || null, source: 'device',
    })))
    setError('')
  }

  async function pickFromFolder(node) {
    // Opening a saved draft loads it back into the editor.
    if (node.itemKind === 'draft' && node.content) {
      const d = parseDraftContent(node.content)
      if (d.html) setNoteHtml(prev => prev + d.html)
      if (Array.isArray(d.staged) && d.staged.length) {
        pushItems(d.staged.slice(0, MAX_PER_SHEET).map(s => ({
          title: s.title || 'Untitled', fileName: s.title || 'Untitled', html: s.html,
          itemKind: 'notes', courseCode: courseCode || null, source: 'write',
        })))
      }
      if (node.name) setNoteTitle(node.name)
      setDraftId(node.draftId || node.id)
      setUploadOpen(false)
      setError('')
      return
    }
    const href = node.url || node.href
    // Notes: convert remote txt/md/pdf/docx into the editor too; fall back
    // to staging the file link when it can't be read (e.g. blocked download).
    if (isNotes && href && (/\.(txt|md|markdown|pdf|docx?)(\?|$)/i.test(href) || ['notes', 'text'].includes(node.itemKind))) {
      try {
        setConverting(`Converting ${String(node.name || '').slice(0, 24)}…`)
        const out = await convertUrlToHtml(href, node.name, { onProgress: (i, n) => setConverting(`Converting… p${i}/${n}`) })
        if (out?.html) {
          setNoteHtml(prev => prev ? `${prev}<h2>${escHtml(out.title)}</h2>${out.html}` : `<h2>${escHtml(out.title)}</h2>${out.html}`)
          if (!noteTitle.trim()) setNoteTitle(out.title)
          setUploadOpen(false)
          setError('')
          return
        }
      } catch {}
      finally { setConverting(null) }
    }
    pushItems({
      title: node.name, fileName: node.name, url: href,
      itemKind: node.itemKind || lockedKind || 'file',
      courseCode: courseCode || node.courseCode || null, source: 'folder',
    })
  }

  function removeRow(key) {
    setQueue(prev => prev.filter(r => r.key !== key))
  }

  async function commitAll() {
    if (!queue.length || committing) return
    setCommitting(true)
    setError('')
    const batch = [...queue]
    let done = 0
    setProgress({ done: 0, total: batch.length })
    const failed = []
    for (const item of batch) {
      setProgress({ done, total: batch.length, current: item.title })
      try {
        // Staged editor texts publish as notes.
        if (item.html && !item.file) {
          const noteTitle = item.title || item.fileName || 'Untitled'
          await api('/api/contribute/readings', { method: 'POST', body: JSON.stringify({ title: noteTitle, courseCode: courseCode || null, content: item.html, topic: topic || null }) })
          await addPointerFor({ courseCode: courseCode || null, kind: 'notes', name: noteTitle, href: courseCode ? `/courses/${String(courseCode).toLowerCase().replace(/\s+/g, '')}/theory` : null, itemKind: 'notes' })
          done += 1
          setProgress({ done, total: batch.length, current: item.title })
          setQueue(prev => prev.filter(r => r.key !== item.key))
          setAddedCount(c => c + 1)
          continue
        }
        let finalUrl = item.url || null
        let publicId = item.publicId || null
        let mime = item.mime || null
        let size = item.size ?? null
        if (item.file) {
          const up = await uploadFile(item.file, { folder: 'gss-quiz/scopes', getToken })
          finalUrl = up.url
          publicId = up.publicId || null
          mime = item.file.type || mime
          size = item.file.size ?? size
        }
        if (!finalUrl) throw new Error('Missing file or link')
        const d = await api('/api/contribute/items', {
          method: 'POST',
          body: JSON.stringify({
            title: item.title || item.fileName || 'Untitled',
            fileName: item.fileName || item.title || 'Untitled',
            url: finalUrl, publicId, mime, size,
            itemKind: item.itemKind || lockedKind || 'file',
            courseCode: courseCode || item.courseCode || null,
            programme, topic: topic || null, isPublic: true,
          }),
        })
        await addPointerFor({
          courseCode: courseCode || item.courseCode || null,
          kind: item.itemKind || lockedKind || 'file',
          name: item.title || item.fileName || 'Untitled',
          url: finalUrl, itemKind: item.itemKind || lockedKind,
          materialId: d.id,
        })
        done += 1
        setProgress({ done, total: batch.length, current: item.title })
        setQueue(prev => prev.filter(r => r.key !== item.key))
        setAddedCount(c => c + 1)
      } catch (e) {
        failed.push(item.title)
      }
    }
    setCommitting(false)
    setProgress(null)
    if (failed.length === 0) {
      // Published — the draft served its purpose.
      if (draftId) deleteDraft(draftId)
      if (queue.length - done <= 0 && done > 0) { unloadOk.current = true; onDone() }
    } else {
      setError(`${failed.length} failed: ${failed.slice(0, 2).join(', ')}${failed.length > 2 ? '…' : ''}`)
    }
  }

  function ConfirmPublish() {
    if (!confirmOpen) return null
    return (
      <>
        <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm" onClick={() => !committing && setConfirmOpen(false)} />
        <div className="fixed inset-x-0 bottom-0 z-[71] mx-auto w-full max-w-md rounded-t-3xl border-t bg-background p-4 pb-8">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
          <h3 className="text-sm font-black">Publish {queue.length} item{queue.length === 1 ? '' : 's'}?</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">To {courseCode}{topic ? ` · ${topic}` : ''} — visible to everyone.</p>
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
            {queue.slice(0, 8).map(r => (
              <p key={r.key} className="truncate rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs font-semibold">{r.title}</p>
            ))}
            {queue.length > 8 && <p className="px-1 text-[11px] text-muted-foreground">…and {queue.length - 8} more</p>}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => setConfirmOpen(false)} disabled={committing} className="rounded-xl border py-2.5 text-sm font-bold disabled:opacity-50">Cancel</button>
            <button onClick={() => { setConfirmOpen(false); commitAll() }} disabled={committing} className="rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
              Publish
            </button>
          </div>
        </div>
      </>
    )
  }

  // Notes: notebook — everything lives in the top bar as icons so nothing
  // sits below the editor. Attach opens the file popup modal.
  if (isNotes) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <input value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="Title" className="min-w-0 flex-1 border-b bg-transparent px-1 py-1.5 text-base font-extrabold outline-none placeholder:text-muted-foreground/50 focus:border-primary" />
          <button onClick={() => { setUploadOpen(true); setFolderOpen(false); setLibraryOpen(false) }} title="Attach file" aria-label="Attach file" className="flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted">
            <Paperclip className="size-4 text-emerald-600" />
          </button>
          <button onClick={addTextToQueue} title="Add text to list" aria-label="Add text to list" className="flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted">
            <Plus className="size-5 text-primary" strokeWidth={2.5} />
          </button>
          <button onClick={uploadPressed} disabled={committing || (queue.length === 0 && !editorHasContent)} title={queue.length ? `Upload (${queue.length})` : 'Upload'} aria-label="Upload all" className="relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40">
            {committing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            {queue.length > 0 && <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white">{queue.length > 9 ? '9+' : queue.length}</span>}
          </button>
        </div>
        {resumeCandidate && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-xs">
            <span className="min-w-0 flex-1 truncate font-semibold">Draft: {resumeCandidate.name || 'Untitled'}</span>
            <button onClick={() => resumeDraft(resumeCandidate)} className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">Resume</button>
            <button onClick={() => deleteDraft(resumeCandidate.id)} aria-label="Delete draft" className="shrink-0 rounded-md p-1 hover:bg-muted"><X className="size-3.5 text-muted-foreground" /></button>
          </div>
        )}
        {queue.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {queue.map(r => (
              <span key={r.key} className="flex max-w-44 shrink-0 items-center gap-1 rounded-full border bg-card py-1 pl-2 pr-1 text-[11px] font-semibold">
                <span className="truncate">{r.title}</span>
                <button onClick={() => removeRow(r.key)} disabled={committing} aria-label="Remove" className="flex size-5 shrink-0 items-center justify-center rounded-full hover:bg-muted disabled:opacity-50">
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {noteDone && <p className="flex items-center gap-1 text-xs font-bold text-green-600"><CheckCircle2 className="size-3.5" /> Added “{noteDone.slice(0, 40)}”</p>}
        {converting && <p className="flex items-center gap-1.5 px-1 text-xs font-bold text-primary"><Loader2 className="size-3.5 animate-spin" /> {converting}</p>}
        <RichTextEditor tall value={noteHtml} onChange={setNoteHtml} placeholder="Start writing…" />
        {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
        {addedCount > 0 && !queue.length && (
          <button onClick={onDone} className="w-full rounded-xl border py-2 text-xs font-bold">Done — show my adds</button>
        )}
        {uploadOpen && (
          <>
            <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={() => setUploadOpen(false)} />
            <div className="fixed inset-x-0 bottom-0 z-[61] mx-auto max-h-[80dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t bg-background p-4 pb-8">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
              <div className="mb-3 flex items-center gap-2">
                <h3 className="flex-1 text-sm font-black">Attach a file</h3>
                <button onClick={() => setUploadOpen(false)} aria-label="Close" className="flex size-8 items-center justify-center rounded-lg hover:bg-muted"><X className="size-4" /></button>
              </div>
              <div className="space-y-2">
                <input ref={fileRef} type="file" multiple className="hidden" accept={accept} onChange={handleFiles} />
                <button onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground">
                  <Upload className="size-4" /> Choose PDF, txt or md
                </button>
                <p className="px-1 text-[11px] text-muted-foreground">PDF, Word, txt and md convert into the editor so you can edit. Only unreadable scans stay as files.</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setFolderOpen(o => !o); setLibraryOpen(false) }} className={'rounded-xl border py-2 text-xs font-bold hover:bg-muted/60 ' + (folderOpen ? 'border-primary bg-primary/5' : '')}>From folder</button>
                  <button onClick={() => { setLibraryOpen(o => !o); setFolderOpen(false) }} className={'rounded-xl border py-2 text-xs font-bold hover:bg-muted/60 ' + (libraryOpen ? 'border-primary bg-primary/5' : '')}>From library</button>
                </div>
                {folderOpen && <FolderBrowseInline kind={lockedKind} onPick={pickFromFolder} />}
                {libraryOpen && <LibraryListInline kind={lockedKind} onPick={pickFromFolder} />}
                <button onClick={() => setUploadOpen(false)} className="w-full rounded-xl border py-2 text-xs font-bold">Done</button>
              </div>
            </div>
          </>
        )}
        <ConfirmPublish />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <ContextLine courseCode={courseCode} topic={topic} />

      {/* Staged pile — newest on top, little thumbnails */}
      {queue.length > 0 && (
        <div className="space-y-1">
          {queue.slice(0, 10).map(r => {
            const thumb = r.thumb || ytThumb(r.url)
            return (
              <div key={r.key} className="flex items-center gap-2 rounded-xl border bg-card p-1.5 text-xs">
                {thumb
                  ? <img src={thumb} alt="" loading="lazy" className="size-10 shrink-0 rounded-lg object-cover" />
                  : <CheckCircle2 className="size-5 shrink-0 text-primary" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.title}</span>
                  <span className="block text-[10px] font-bold text-muted-foreground">{r.source === 'device' ? 'file' : r.source}</span>
                </span>
                <button onClick={() => removeRow(r.key)} disabled={committing} aria-label="Remove" className="shrink-0 rounded-md p-1 hover:bg-muted disabled:opacity-50">
                  <X className="size-3.5 text-muted-foreground" />
                </button>
              </div>
            )
          })}
          {queue.length > 10 && <p className="px-1 text-[11px] text-muted-foreground">…and {queue.length - 10} more</p>}
        </div>
      )}

      {/* 1 — link (not for audio: device → folder → library only) */}
      {showLink && (
      <div className="space-y-2 rounded-2xl border p-3">
        <div className="flex items-center gap-2 rounded-xl bg-background px-3 py-2 ring-1 ring-border focus-within:ring-primary">
          <Link2 className="size-4 shrink-0 text-muted-foreground" />
          <input value={url} autoFocus
            onChange={e => { const nv = e.target.value; setUrl(nv); if (meta?.url && nv.trim() !== meta.url) { setMeta(null); if (linkTitle === (meta.title || '')) setLinkTitle('') } if (playlist && !nv.trim()) setPlaylist(null) }}
            onPaste={e => { const v = (e.clipboardData?.getData('text') || '').trim(); if (v) setTimeout(() => lookup(v), 50) }}
            onKeyDown={e => { if (e.key === 'Enter') addLink() }}
            placeholder={lockedKind === 'video' ? 'Paste YouTube link or playlist…' : lockedKind === 'audio' ? 'Paste audio link…' : 'Paste a link…'}
            inputMode="url" className="w-full bg-transparent text-sm outline-none" />
          {fetching
            ? <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            : (meta || playlist) ? <CheckCircle2 className="size-4 shrink-0 text-green-600" /> : null}
        </div>
        {(meta || playlist || url.trim()) && (
          <div className="space-y-2">
            {playlist ? (
              <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-2">
                <div className="flex shrink-0 -space-x-2">
                  {playlist.slice(0, 3).map(v => (
                    <img key={v.id} src={v.thumb || ytThumb(v.url)} alt="" loading="lazy" className="size-10 rounded-lg border-2 border-background object-cover" />
                  ))}
                </div>
                <p className="min-w-0 flex-1 text-xs font-black">Playlist — {playlist.length} videos to {courseCode}{topic ? ` · ${topic}` : ''}</p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {(meta?.thumb || ytThumb(meta?.url || url)) && (
                  <img src={meta?.thumb || ytThumb(meta?.url || url)} alt="" loading="lazy" className="h-14 w-24 shrink-0 rounded-xl object-cover" />
                )}
                <input value={linkTitle} onChange={e => setLinkTitle(e.target.value)} placeholder={`${linkLabel} title… (auto-fills)`} className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-bold outline-none" />
              </div>
            )}
            {meta?.author && !playlist && <p className="truncate px-1 text-[11px] text-muted-foreground">by {meta.author}</p>}
            <button onClick={addLink} className="w-full rounded-xl bg-secondary py-2 text-sm font-bold">
              {playlist ? `Add all ${playlist.length} to list` : `Add ${linkLabel} to list`} {queue.length ? `(${queue.length}/${MAX_PER_SHEET})` : ''}
            </button>
          </div>
        )}
      </div>
      )}

      {/* 2 — device first, then digital folder, then library. No fresh video files: YouTube link only. */}
      {lockedKind !== 'video' && (
        <input ref={fileRef} type="file" multiple className="hidden" accept={accept} onChange={handleFiles} />
      )}
      {lockedKind === 'video' ? (
        <div className="grid grid-cols-1 gap-2">
          <button onClick={() => { setFolderOpen(o => !o); setLibraryOpen(false) }} className={'flex w-full items-center gap-3 rounded-2xl border p-3 text-left hover:bg-muted/60 ' + (folderOpen ? 'border-primary bg-primary/5' : '')}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted"><FolderOpen className="size-5 text-sky-600" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-bold">From folder</span><span className="block truncate text-xs text-muted-foreground">Your folders in the app</span></span>
          </button>
          <button onClick={() => { setLibraryOpen(o => !o); setFolderOpen(false) }} className={'flex w-full items-center gap-3 rounded-2xl border p-3 text-left hover:bg-muted/60 ' + (libraryOpen ? 'border-primary bg-primary/5' : '')}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted"><LibraryBig className="size-5 text-indigo-500" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-bold">From library</span><span className="block truncate text-xs text-muted-foreground">Everything you uploaded</span></span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          <button onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left hover:bg-muted/60">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted"><Upload className="size-5 text-emerald-600" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-bold">Upload fresh</span><span className="block truncate text-xs text-muted-foreground">{isNotes ? 'PDF, Word, txt or md' : 'From this device'}</span></span>
          </button>
          <button onClick={() => { setFolderOpen(o => !o); setLibraryOpen(false) }} className={'flex w-full items-center gap-3 rounded-2xl border p-3 text-left hover:bg-muted/60 ' + (folderOpen ? 'border-primary bg-primary/5' : '')}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted"><FolderOpen className="size-5 text-sky-600" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-bold">From folder</span><span className="block truncate text-xs text-muted-foreground">Your folders in the app</span></span>
          </button>
          <button onClick={() => { setLibraryOpen(o => !o); setFolderOpen(false) }} className={'flex w-full items-center gap-3 rounded-2xl border p-3 text-left hover:bg-muted/60 ' + (libraryOpen ? 'border-primary bg-primary/5' : '')}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted"><LibraryBig className="size-5 text-indigo-500" /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-bold">From library</span><span className="block truncate text-xs text-muted-foreground">Everything you uploaded</span></span>
          </button>
        </div>
      )}

      {folderOpen && (
        <FolderBrowseInline kind={lockedKind} onPick={pickFromFolder} />
      )}
      {libraryOpen && (
        <LibraryListInline kind={lockedKind} onPick={pickFromFolder} />
      )}

      {error && <p className="text-xs font-semibold text-red-500">{error}</p>}

      {/* 3 — one upload sends it all */}
      <button onClick={uploadPressed} disabled={committing || queue.length === 0} className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
        {committing ? `Uploading ${progress?.done ?? 0}/${progress?.total ?? queue.length}…` : queue.length ? `Upload (${queue.length})` : addedCount ? 'All uploaded ✓' : 'Upload'}
      </button>
      {!queue.length && !addedCount && !noteDone && <p className="text-center text-[11px] text-muted-foreground">{isAudio ? 'Add audio from your device, folders or library — they pile up top, one Upload sends all.' : 'Add links, fresh files and folder files — they pile up top, one Upload sends all.'}</p>}
      {addedCount > 0 && !queue.length && (
        <button onClick={onDone} className="w-full rounded-xl border py-2 text-xs font-bold">Done — show my adds</button>
      )}
      <ConfirmPublish />
    </div>
  )
}

function WriteText({ courseCode, topic, onDone, onBack }) {
  const [title, setTitle] = useState(topic ? `Notes: ${topic}` : '')
  const [html, setHtml] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save() {
    setBusy(true)
    setError('')
    try {
      await api('/api/contribute/readings', { method: 'POST', body: JSON.stringify({ title: title.trim(), courseCode: courseCode || null, content: html, topic: topic || null }) })
      addPointerFor({ courseCode: courseCode || null, kind: 'notes', name: title.trim(), href: courseCode ? `/courses/${String(courseCode).toLowerCase().replace(/\s+/g, '')}/theory` : null, itemKind: 'notes' })
      onDone()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return (
    <div className="space-y-2">
      <ContextLine courseCode={courseCode} topic={topic} />
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-bold outline-none" />
      <RichTextEditor value={html} onChange={setHtml} placeholder="Write the note…" />
      {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
      <button disabled={busy} onClick={save} className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
        {busy ? 'Publishing…' : 'Publish to library'}
      </button>
    </div>
  )
}

function CreateQuiz({ courseCode, topic, onDone, onBack }) {
  const [format, setFormat] = useState('sba')
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctIdx, setCorrectIdx] = useState(0)
  const [multiIdx, setMultiIdx] = useState([])
  const [fibAccept, setFibAccept] = useState('')
  const [matchOpts, setMatchOpts] = useState(['', '', '', ''])
  const [matchStems, setMatchStems] = useState([{ stem: '', answer: 0 }, { stem: '', answer: 1 }])
  const [mtfTruth, setMtfTruth] = useState([true, false, true, false, false])
  const [marks, setMarks] = useState('')
  const [caseVignette, setCaseVignette] = useState('')
  const [caseSubs, setCaseSubs] = useState([{ q: '', options: ['', '', '', ''], correct: 0 }])
  const [meqStages, setMeqStages] = useState([{ info: '', question: '' }, { info: '', question: '' }])
  const [spotImage, setSpotImage] = useState('')
  const [spotSubs, setSpotSubs] = useState([{ q: '', answers: '' }])
  const [osceInstr, setOsceInstr] = useState('')
  const [osceScenario, setOsceScenario] = useState('')
  const [osceTask, setOsceTask] = useState('')
  const [osceMins, setOsceMins] = useState('8')
  const [osceCheck, setOsceCheck] = useState([{ text: '', marks: '2' }, { text: '', marks: '1' }])
  const [audioUrl, setAudioUrl] = useState('')
  const [audioBusy, setAudioBusy] = useState(false)
  const [audioFollow, setAudioFollow] = useState('mcq')
  const [vivaModel, setVivaModel] = useState('')
  const [vivaFollowups, setVivaFollowups] = useState('')
  const [rubric, setRubric] = useState('')
  const [previewRev, setPreviewRev] = useState(false)
  const [previewVal, setPreviewVal] = useState(null)
  const [spotBusy, setSpotBusy] = useState(false)
  const audioRef = useRef(null)
  const spotRef = useRef(null)
  const [imageUrl, setImageUrl] = useState('')
  const [imgBusy, setImgBusy] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [doneMsg, setDoneMsg] = useState('')
  const [fileText, setFileText] = useState('')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkDone, setBulkDone] = useState('')
  const fileRef = useRef(null)
  const imgRef = useRef(null)

  const letters = ['A', 'B', 'C', 'D', 'E']
  const optCount = format === 'tf' ? 2 : options.length

  function setOpt(i, v) {
    setOptions(prev => prev.map((o, j) => (j === i ? v : o)))
  }

  function buildPayload() {
    const base = { courseCode: courseCode || null, section: topic || undefined, explanation: explanation.trim(), ...(marks ? { marks: Math.max(1, parseInt(marks, 10) || 1) } : {}) }
    if (format === 'tf') {
      if (question.trim().length < 10) throw new Error('Write the statement first')
      return { ...base, questionType: 'tf', question: question.trim(), options: { A: 'True', B: 'False' }, correctAnswer: correctIdx === 0 ? 'A' : 'B' }
    }
    if (format === 'mtf') {
      if (question.trim().length < 10) throw new Error('Write the stem first')
      const filled = options.map(s => s.trim())
      if (filled.filter(Boolean).length < 2) throw new Error('Add at least 2 options')
      const obj = {}
      const correct = {}
      filled.forEach((t, i) => { if (t) { obj[letters[i]] = t; correct[letters[i]] = mtfTruth[i] ? 'true' : 'false' } })
      if (Object.keys(obj).length < 2) throw new Error('Add at least 2 options')
      return { ...base, questionType: 'mtf', question: question.trim(), options: obj, correctAnswer: correct }
    }
    if (format === 'assertion') {
      if (question.trim().length < 10) throw new Error('Write the assertion + reason first')
      const filled = options.map(s => s.trim())
      const obj = {}
      const STD = ['Both are true, and the reason correctly explains the assertion.', 'Both are true, but the reason does not correctly explain the assertion.', 'Assertion is true, but reason is false.', 'Assertion is false, but reason is true.', 'Both are false.']
      filled.forEach((t, i) => { obj[letters[i]] = t || STD[i] })
      return { ...base, questionType: 'assertion', question: question.trim(), options: obj, correctAnswer: letters[correctIdx] }
    }
    if (format === 'case') {
      if (caseVignette.trim().length < 10) throw new Error('Write the vignette first')
      const subs = caseSubs.map(s => {
        const filled = s.options.map(o => String(o || '').trim())
        if (s.q.trim().length < 3 || filled.filter(Boolean).length < 2) return null
        const obj = {}
        filled.forEach((t, i) => { if (t) obj[letters[i]] = t })
        const c = letters[s.correct]
        if (!obj[c]) return null
        return { question: s.q.trim(), options: obj, correctAnswer: c }
      }).filter(Boolean)
      if (!subs.length) throw new Error('Add at least 1 valid sub-question')
      return { ...base, questionType: 'case', question: caseVignette.trim().split('\n')[0].slice(0, 140), vignette: caseVignette.trim(), subQuestions: subs }
    }
    if (format === 'saq') {
      if (question.trim().length < 10) throw new Error('Write the question first')
      const accept = fibAccept.split(/[|;]/).map(s => s.trim()).filter(Boolean)
      if (!accept.length) throw new Error('Add at least one model answer')
      return { ...base, questionType: 'saq', question: question.trim(), blankAnswers: accept }
    }
    if (format === 'essay') {
      if (question.trim().length < 10) throw new Error('Write the question first')
      return { ...base, questionType: 'essay', question: question.trim(), rubric: rubric.trim() || null }
    }
    if (format === 'meq') {
      const stages = meqStages.map(s => ({ info: s.info.trim(), question: s.question.trim() })).filter(s => s.question)
      if (stages.length < 2) throw new Error('Add at least 2 stages with questions')
      return { ...base, questionType: 'meq', question: stages[0].info.slice(0, 140) || 'Staged case', stages }
    }
    if (format === 'spotter') {
      if (!/^https?:\/\//.test(spotImage.trim())) throw new Error('Add the spotter image first')
      const subs = spotSubs.map(s => ({ q: s.q.trim(), answers: s.answers.split(/[|;]/).map(a => a.trim()).filter(Boolean) })).filter(s => s.q && s.answers.length)
      if (!subs.length) throw new Error('Add at least 1 station question with answer')
      return { ...base, questionType: 'spotter', question: `Spotter: ${subs.length} station question${subs.length === 1 ? '' : 's'}`, imageUrl: spotImage.trim(), subQuestions: subs }
    }
    if (format === 'osce') {
      const check = osceCheck.map(c => ({ text: c.text.trim(), marks: Math.max(1, parseInt(c.marks, 10) || 1) })).filter(c => c.text)
      if (!question.trim()) throw new Error('Name the station first')
      if (check.length < 2) throw new Error('Add at least 2 checklist items')
      return { ...base, questionType: 'osce', question: question.trim(), station: { instructions: osceInstr.trim() || null, scenario: osceScenario.trim() || null, task: osceTask.trim() || null, minutes: Math.max(1, parseInt(osceMins, 10) || 8) }, checklist: check }
    }
    if (format === 'audio') {
      if (!/^https?:\/\//.test(audioUrl.trim())) throw new Error('Add the audio first (upload or paste URL)')
      if (audioFollow === 'fib') {
        const accept = fibAccept.split(/[|;]/).map(s => s.trim()).filter(Boolean)
        if (!accept.length) throw new Error('Add accepted answers')
        return { ...base, questionType: 'audio', question: question.trim() || 'What do you hear?', audioUrl: audioUrl.trim(), followupKind: 'fib', blankAnswers: accept }
      }
      const filled = options.map(s => s.trim())
      if (filled.filter(Boolean).length < 2) throw new Error('Add at least 2 options')
      const obj = {}
      filled.forEach((t, i) => { if (t) obj[letters[i]] = t })
      return { ...base, questionType: 'audio', question: question.trim() || 'What does this show?', audioUrl: audioUrl.trim(), followupKind: 'sba', options: obj, correctAnswer: letters[correctIdx] }
    }
    if (format === 'viva') {
      if (question.trim().length < 10) throw new Error('Write the examiner question first')
      if (!vivaModel.trim()) throw new Error('Add a model answer')
      return { ...base, questionType: 'viva', question: question.trim(), modelAnswer: vivaModel.trim(), followups: vivaFollowups.split(';').map(s => s.trim()).filter(Boolean) }
    }
    if (format === 'fib') {
      if (question.trim().length < 3) throw new Error('Write the question with ___')
      const accept = fibAccept.split(/[|;]/).map(s => s.trim()).filter(Boolean)
      if (!accept.length) throw new Error('Add at least one accepted answer')
      return { ...base, questionType: 'fib', question: question.trim(), blankAnswers: accept }
    }
    if (format === 'match') {
      const opts = matchOpts.map(s => s.trim()).filter(Boolean)
      if (opts.length < 2) throw new Error('Add at least 2 options')
      const clean = matchStems.map(s => ({ stem: s.stem.trim(), answer: s.answer })).filter(s => s.stem)
      if (clean.length < 2) throw new Error('Add at least 2 stems')
      const options = {}
      opts.forEach((t, i) => { options[letters[i]] = t })
      for (const s of clean) {
        if (s.answer == null || !options[letters[s.answer]]) throw new Error('Point every stem at an option')
      }
      return { ...base, questionType: 'match', question: question.trim() || 'Match each stem', options, pairs: clean.map(s => ({ stem: s.stem, answer: letters[s.answer] })) }
    }
    const filled = options.slice(0, optCount).map(s => s.trim())
    if (question.trim().length < 10) throw new Error('Write the question first')
    if (filled.some(s => !s)) throw new Error('Fill every option (or remove extras)')
    const obj = {}
    filled.forEach((t, i) => { obj[letters[i]] = t })
    if (format === 'multi') {
      if (!multiIdx.length) throw new Error('Tick the correct options')
      return { ...base, questionType: 'multi', question: question.trim(), options: obj, correctAnswers: multiIdx.map(i => letters[i]) }
    }
    if (format === 'image') {
      if (!/^https?:\/\//.test(imageUrl.trim())) throw new Error('Add the image first (upload or paste URL)')
      return { ...base, questionType: 'image', question: question.trim(), options: obj, correctAnswer: letters[correctIdx], imageUrl: imageUrl.trim() }
    }
    return { ...base, questionType: 'sba', question: question.trim(), options: obj, correctAnswer: letters[correctIdx] }
  }

  async function save() {
    setBusy(true)
    setError('')
    setDoneMsg('')
    try {
      const payload = buildPayload()
      await api('/api/contribute/questions', { method: 'POST', body: JSON.stringify(payload) })
      if (courseCode) {
        addPointerFor({ courseCode, kind: 'quiz', name: `${courseCode} Quiz`, href: `/courses/${courseCode.toLowerCase().replace(/\s+/g, '')}/quiz`, itemKind: 'quiz' })
      }
      setDoneMsg('Added ✓ — write the next one')
      setQuestion('')
      setExplanation('')
      setFibAccept('')
      setImageUrl('')
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function uploadImage(e) {
    const f = e.target.files?.[0]
    if (imgRef.current) imgRef.current.value = ''
    if (!f) return
    setImgBusy(true)
    setError('')
    try {
      const up = await uploadFile(f, { folder: 'gss-quiz/questions', getToken })
      if (up?.url) setImageUrl(up.url)
    } catch (err) { setError(err.message || 'Image upload failed') } finally { setImgBusy(false) }
  }

  async function uploadAudio(e) {
    const f = e.target.files?.[0]
    if (audioRef.current) audioRef.current.value = ''
    if (!f) return
    setAudioBusy(true)
    setError('')
    try {
      const up = await uploadFile(f, { folder: 'gss-quiz/questions', getToken })
      if (up?.url) setAudioUrl(up.url)
    } catch (err) { setError(err.message || 'Audio upload failed') } finally { setAudioBusy(false) }
  }

  async function uploadSpot(e) {
    const f = e.target.files?.[0]
    if (spotRef.current) spotRef.current.value = ''
    if (!f) return
    setSpotBusy(true)
    setError('')
    try {
      const up = await uploadFile(f, { folder: 'gss-quiz/questions', getToken })
      if (up?.url) setSpotImage(up.url)
    } catch (err) { setError(err.message || 'Image upload failed') } finally { setSpotBusy(false) }
  }

  function handleBulkFile(e) {
    const f = e.target.files?.[0]
    if (fileRef.current) fileRef.current.value = ''
    if (!f) return
    f.text().then(t => setFileText(t)).catch(() => setError('Could not read that file'))
  }

  let bulk = null
  try { bulk = fileText.trim() ? parseQuizFile(fileText) : null } catch { bulk = null }

  async function uploadAll() {
    if (!bulk?.items.length) return
    setBulkBusy(true)
    setError('')
    setBulkDone('')
    let ok = 0
    const failed = []
    for (const item of bulk.items) {
      try {
        await api('/api/contribute/questions', { method: 'POST', body: JSON.stringify({ ...item, courseCode: courseCode || null, section: topic || undefined }) })
        ok += 1
      } catch (e) { failed.push(item.question?.slice(0, 30)) }
    }
    setBulkBusy(false)
    if (courseCode && ok) {
      addPointerFor({ courseCode, kind: 'quiz', name: `${courseCode} Quiz`, href: `/courses/${courseCode.toLowerCase().replace(/\s+/g, '')}/quiz`, itemKind: 'quiz' })
    }
    if (!failed.length) {
      setBulkDone(`${ok} questions added ✓`)
      setFileText('')
      setTimeout(() => onDone(), 1200)
    } else {
      setError(`${failed.length} failed: ${failed.slice(0, 2).join(', ')}`)
      setBulkDone(`${ok} added`)
    }
  }

  const FORMAT_TABS = [
    { id: 'sba', label: 'Single' },
    { id: 'mtf', label: 'T/F each' },
    { id: 'tf', label: 'T/F' },
    { id: 'multi', label: 'Multi' },
    { id: 'fib', label: 'Blank' },
    { id: 'match', label: 'Match' },
    { id: 'image', label: 'Image' },
    { id: 'assertion', label: 'Assert' },
    { id: 'case', label: 'Case' },
    { id: 'saq', label: 'SAQ' },
    { id: 'essay', label: 'Essay' },
    { id: 'meq', label: 'MEQ' },
    { id: 'spotter', label: 'Spot' },
    { id: 'osce', label: 'OSCE' },
    { id: 'audio', label: 'Audio' },
    { id: 'viva', label: 'Viva' },
    { id: 'upload', label: 'Upload file' },
  ]

  return (
    <div className="space-y-2">
      <ContextLine courseCode={courseCode} topic={topic} />
      <div className="flex flex-wrap gap-1.5">
        {FORMAT_TABS.map(t => (
          <button key={t.id} type="button" onClick={() => { setFormat(t.id); setError(''); setDoneMsg(''); setPreviewVal(null); setPreviewRev(false) }}
            className={'rounded-full border px-3 py-1 text-xs font-bold ' + (format === t.id ? 'bg-foreground text-background' : 'text-muted-foreground')}>
            {t.label}
          </button>
        ))}
      </div>

      {format === 'upload' ? (
        <div className="space-y-2">
          <p className="rounded-xl bg-muted/60 px-3 py-2 text-[11px] font-semibold text-muted-foreground">
            Paste or upload a file — one question per block, blocks split by <span className="font-black">---</span>. Formats: Q:, MTF:, TF:, MULTI:, FIB:, MATCH:, IMG:. The preview parses live.
          </p>
          <textarea value={fileText} onChange={e => setFileText(e.target.value)} rows={8} placeholder={'Q: Which chamber pumps blood to the body?\nA) Right atrium\nB) Left ventricle\nAnswer: B\n---\nTF: The aorta is an artery.\nAnswer: True'} className="w-full rounded-xl border bg-background px-3 py-2 font-mono text-xs outline-none" />
          <input ref={fileRef} type="file" accept=".txt,.md,.csv,text/plain,text/markdown" className="hidden" onChange={handleBulkFile} />
          <button onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold hover:bg-muted/60">
            <Upload className="size-4 text-emerald-600" /> Choose .txt / .md file
          </button>
          {bulk && (
            <div className="rounded-2xl border p-3 text-xs">
              <p className="font-black">{bulk.items.length} question{bulk.items.length === 1 ? '' : 's'} ready{bulk.errors.length ? ` · ${bulk.errors.length} block${bulk.errors.length === 1 ? '' : 's'} need fixing` : ''}</p>
              <div className="mt-1 max-h-40 space-y-1 overflow-y-auto">
                {bulk.items.slice(0, 8).map((it, i) => (
                  <p key={i} className="truncate text-muted-foreground">• [{it.questionType}] {it.question}</p>
                ))}
                {bulk.items.length > 8 && <p className="text-muted-foreground">…and {bulk.items.length - 8} more</p>}
                {bulk.errors.map((e, i) => (
                  <p key={'e' + i} className="font-semibold text-red-500">Block {e.block}: {e.error}</p>
                ))}
              </div>
            </div>
          )}
          {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
          {(bulkDone || doneMsg) && <p className="text-xs font-bold text-green-600">{bulkDone || doneMsg}</p>}
          <button disabled={bulkBusy || !bulk?.items.length} onClick={uploadAll} className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {bulkBusy ? 'Uploading…' : `Upload all (${bulk?.items.length ?? 0})`}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {format === 'image' && (
            <div className="space-y-2 overflow-hidden rounded-2xl border bg-card">
              {imageUrl ? <img src={imageUrl} alt="" loading="lazy" className="max-h-48 w-full object-contain bg-black/5" /> : null}
              <div className="flex gap-2 p-2">
                <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={uploadImage} />
                <button onClick={() => imgRef.current?.click()} disabled={imgBusy} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary py-2 text-xs font-bold disabled:opacity-50">
                  {imgBusy ? 'Uploading…' : 'Upload image'}
                </button>
                <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="…or paste image URL" className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-xs outline-none" />
              </div>
            </div>
          )}
          <textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder={format === 'tf' ? 'Statement… (e.g. The aorta is an artery)' : format === 'fib' ? 'Question with ___ for the blank…' : format === 'match' ? 'Theme (e.g. Match vitamin to deficiency)' : format === 'assertion' ? 'Assertion. Reason…' : format === 'case' ? 'Case title (vignette below)' : format === 'saq' ? 'Short-answer question…' : format === 'essay' ? 'Essay question…' : format === 'viva' ? 'Examiner question…' : 'Question…'} rows={3} className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
          {(format === 'sba' || format === 'image' || format === 'assertion') && (
            <>
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button type="button" onClick={() => setCorrectIdx(i)} aria-label={`Mark ${letters[i]} correct`}
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${correctIdx === i ? 'border-green-500 bg-green-500/10 text-green-600' : 'text-muted-foreground'}`}>{letters[i]}</button>
                  <input value={o} onChange={e => setOpt(i, e.target.value)} placeholder={`Option ${letters[i]}`} className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
                  {options.length > 2 && <button type="button" onClick={() => { setOptions(prev => prev.filter((_, j) => j !== i)); setCorrectIdx(c => Math.min(c, options.length - 2)) }} aria-label="Remove option" className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>}
                </div>
              ))}
              {options.length < 5 && <button type="button" onClick={() => setOptions(prev => [...prev, ''])} className="text-xs font-bold text-primary">+ Add option {letters[options.length]}</button>}
            </>
          )}
          {format === 'tf' && (
            <div className="grid grid-cols-2 gap-2">
              {['True', 'False'].map((t, i) => (
                <button key={t} type="button" onClick={() => setCorrectIdx(i)}
                  className={'rounded-xl border py-2.5 text-sm font-bold ' + (correctIdx === i ? 'border-green-500 bg-green-500/10 text-green-600' : 'text-muted-foreground')}>{t}</button>
              ))}
            </div>
          )}
          {format === 'mtf' && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-muted-foreground">Judge EACH option True or False — classic med-school style.</p>
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border text-xs font-black text-muted-foreground">{letters[i]}</span>
                  <input value={o} onChange={e => setOpt(i, e.target.value)} placeholder={`Option ${letters[i]}`} className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
                  <div className="flex shrink-0 gap-1">
                    {['T', 'F'].map(v => {
                      const isT = v === 'T'
                      const active = (mtfTruth[i] ?? false) === isT
                      return (
                        <button key={v} type="button" onClick={() => setMtfTruth(prev => prev.map((x, j) => (j === i ? isT : x)))}
                          className={'rounded-lg px-2.5 py-1.5 text-xs font-black ' + (active ? 'bg-primary text-primary-foreground' : 'border text-muted-foreground')}>{v}</button>
                      )
                    })}
                  </div>
                  {options.length > 2 && <button type="button" onClick={() => { setOptions(prev => prev.filter((_, j) => j !== i)); setMtfTruth(prev => prev.filter((_, j) => j !== i)) }} aria-label="Remove option" className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>}
                </div>
              ))}
              {options.length < 5 && <button type="button" onClick={() => { setOptions(prev => [...prev, '']); setMtfTruth(prev => [...prev, false]) }} className="text-xs font-bold text-primary">+ Add option {letters[options.length]}</button>}
            </div>
          )}
          {format === 'multi' && (
            <>
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button type="button" onClick={() => setMultiIdx(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])} aria-label={`Tick ${letters[i]}`}
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${multiIdx.includes(i) ? 'border-green-500 bg-green-500/10 text-green-600' : 'text-muted-foreground'}`}>{multiIdx.includes(i) ? '✓' : letters[i]}</button>
                  <input value={o} onChange={e => setOpt(i, e.target.value)} placeholder={`Option ${letters[i]}`} className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
                  {options.length > 2 && <button type="button" onClick={() => { setOptions(prev => prev.filter((_, j) => j !== i)); setMultiIdx(prev => prev.filter(x => x !== i).map(x => x > i ? x - 1 : x)) }} aria-label="Remove option" className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>}
                </div>
              ))}
              {options.length < 5 && <button type="button" onClick={() => setOptions(prev => [...prev, ''])} className="text-xs font-bold text-primary">+ Add option {letters[options.length]}</button>}
              <p className="text-[11px] text-muted-foreground">Tick every correct option — players must get the exact set.</p>
            </>
          )}
          {format === 'fib' && (
            <input value={fibAccept} onChange={e => setFibAccept(e.target.value)} placeholder="Accepted answers (| separates alternates)" className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
          )}
          {format === 'match' && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-muted-foreground">Options (shared list)</p>
              {matchOpts.map((o, i) => (
                <input key={i} value={o} onChange={e => setMatchOpts(prev => prev.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Option ${letters[i]}`} className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
              ))}
              <p className="pt-1 text-[11px] font-bold text-muted-foreground">Stems (point each at an option)</p>
              {matchStems.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={s.stem} onChange={e => setMatchStems(prev => prev.map((x, j) => (j === i ? { ...x, stem: e.target.value } : x)))} placeholder={`Stem ${i + 1}`} className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
                  <select value={s.answer} onChange={e => setMatchStems(prev => prev.map((x, j) => (j === i ? { ...x, answer: Number(e.target.value) } : x)))} className="shrink-0 rounded-xl border bg-background px-2 py-2 text-sm font-bold outline-none">
                    {matchOpts.map((_, k) => <option key={k} value={k}>{letters[k]}</option>)}
                  </select>
                </div>
              ))}
              <button type="button" onClick={() => setMatchStems(prev => [...prev, { stem: '', answer: 0 }])} className="text-xs font-bold text-primary">+ Add stem</button>
            </div>
          )}
          {format === 'assertion' && (
            <p className="rounded-xl bg-muted/60 px-3 py-2 text-[11px] font-semibold text-muted-foreground">Standard A–E logic options apply. Leave an option blank to use the standard wording.</p>
          )}
          {format === 'case' && (
            <div className="space-y-2">
              <textarea value={caseVignette} onChange={e => setCaseVignette(e.target.value)} placeholder="Vignette: age, sex, symptoms, findings, investigations…" rows={4} className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
              <p className="text-[11px] font-bold text-muted-foreground">Linked sub-questions (MCQ each)</p>
              {caseSubs.map((s, i) => (
                <div key={i} className="space-y-1.5 rounded-2xl border p-2">
                  <div className="flex items-center gap-2">
                    <input value={s.q} onChange={e => setCaseSubs(prev => prev.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} placeholder={`Sub-question ${i + 1}`} className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
                    {caseSubs.length > 1 && <button type="button" onClick={() => setCaseSubs(prev => prev.filter((_, j) => j !== i))} aria-label="Remove sub-question" className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {s.options.map((o, k) => (
                      <div key={k} className="flex items-center gap-1">
                        <button type="button" onClick={() => setCaseSubs(prev => prev.map((x, j) => (j === i ? { ...x, correct: k } : x)))} className={'flex size-7 shrink-0 items-center justify-center rounded-lg border text-[11px] font-black ' + (s.correct === k ? 'border-green-500 bg-green-500/10 text-green-600' : 'text-muted-foreground')}>{letters[k]}</button>
                        <input value={o} onChange={e => setCaseSubs(prev => prev.map((x, j) => (j === i ? { ...x, options: x.options.map((y, m) => (m === k ? e.target.value : y)) } : x)))} placeholder={letters[k]} className="min-w-0 flex-1 rounded-lg border bg-background px-2 py-1.5 text-xs outline-none" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setCaseSubs(prev => [...prev, { q: '', options: ['', '', '', ''], correct: 0 }])} className="text-xs font-bold text-primary">+ Add sub-question</button>
            </div>
          )}
          {(format === 'saq' || format === 'fib') && (
            <div className="flex gap-2">
              <input value={fibAccept} onChange={e => setFibAccept(e.target.value)} placeholder="Accepted answers (| separates alternates)" className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
              <input value={marks} onChange={e => setMarks(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} placeholder="Marks" inputMode="numeric" className="w-20 shrink-0 rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
            </div>
          )}
          {format === 'essay' && (
            <div className="flex gap-2">
              <textarea value={rubric} onChange={e => setRubric(e.target.value)} placeholder="Marking rubric (one point per line)" rows={3} className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
              <input value={marks} onChange={e => setMarks(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))} placeholder="Marks" inputMode="numeric" className="w-20 shrink-0 self-start rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
            </div>
          )}
          {format === 'meq' && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-muted-foreground">Stages unlock one at a time for the student.</p>
              {meqStages.map((s, i) => (
                <div key={i} className="space-y-1.5 rounded-2xl border p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black">Stage {i + 1}</span>
                    {meqStages.length > 2 && <button type="button" onClick={() => setMeqStages(prev => prev.filter((_, j) => j !== i))} aria-label="Remove stage" className="ml-auto rounded-lg p-1 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>}
                  </div>
                  <textarea value={s.info} onChange={e => setMeqStages(prev => prev.map((x, j) => (j === i ? { ...x, info: e.target.value } : x)))} placeholder="New clinical information revealed…" rows={2} className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
                  <input value={s.question} onChange={e => setMeqStages(prev => prev.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))} placeholder="Question for this stage…" className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
                </div>
              ))}
              <button type="button" onClick={() => setMeqStages(prev => [...prev, { info: '', question: '' }])} className="text-xs font-bold text-primary">+ Add stage</button>
            </div>
          )}
          {format === 'spotter' && (
            <div className="space-y-2">
              <div className="space-y-2 overflow-hidden rounded-2xl border bg-card">
                {spotImage ? <img src={spotImage} alt="" loading="lazy" className="max-h-48 w-full object-contain bg-black/5" /> : null}
                <div className="flex gap-2 p-2">
                  <input ref={spotRef} type="file" accept="image/*" className="hidden" onChange={uploadSpot} />
                  <button onClick={() => spotRef.current?.click()} disabled={spotBusy} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary py-2 text-xs font-bold disabled:opacity-50">
                    {spotBusy ? 'Uploading…' : 'Upload image'}
                  </button>
                  <input value={spotImage} onChange={e => setSpotImage(e.target.value)} placeholder="…or paste image URL" className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-xs outline-none" />
                </div>
              </div>
              {spotSubs.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={s.q} onChange={e => setSpotSubs(prev => prev.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} placeholder={`Station Q${i + 1} (e.g. Identify…)`} className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
                  <input value={s.answers} onChange={e => setSpotSubs(prev => prev.map((x, j) => (j === i ? { ...x, answers: e.target.value } : x)))} placeholder="Answer(s)" className="w-32 shrink-0 rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
                  {spotSubs.length > 1 && <button type="button" onClick={() => setSpotSubs(prev => prev.filter((_, j) => j !== i))} aria-label="Remove" className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>}
                </div>
              ))}
              <button type="button" onClick={() => setSpotSubs(prev => [...prev, { q: '', answers: '' }])} className="text-xs font-bold text-primary">+ Add station question</button>
            </div>
          )}
          {format === 'osce' && (
            <div className="space-y-2">
              <input value={osceInstr} onChange={e => setOsceInstr(e.target.value)} placeholder="Candidate instructions" className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
              <textarea value={osceScenario} onChange={e => setOsceScenario(e.target.value)} placeholder="Clinical scenario…" rows={2} className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
              <input value={osceTask} onChange={e => setOsceTask(e.target.value)} placeholder="Task (e.g. Perform a CV exam)" className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">Minutes</span>
                <input value={osceMins} onChange={e => setOsceMins(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} inputMode="numeric" className="w-16 rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
                <span className="text-xs font-bold text-muted-foreground">Marks</span>
                <input value={marks} onChange={e => setMarks(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} inputMode="numeric" className="w-16 rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
              </div>
              <p className="text-[11px] font-bold text-muted-foreground">Examiner checklist</p>
              {osceCheck.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={c.text} onChange={e => setOsceCheck(prev => prev.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} placeholder={`Step ${i + 1} (e.g. Introduces self)`} className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
                  <input value={c.marks} onChange={e => setOsceCheck(prev => prev.map((x, j) => (j === i ? { ...x, marks: e.target.value.replace(/[^0-9]/g, '').slice(0, 2) } : x)))} inputMode="numeric" className="w-14 shrink-0 rounded-xl border bg-background px-2 py-2 text-sm outline-none" />
                  {osceCheck.length > 2 && <button type="button" onClick={() => setOsceCheck(prev => prev.filter((_, j) => j !== i))} aria-label="Remove step" className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>}
                </div>
              ))}
              <button type="button" onClick={() => setOsceCheck(prev => [...prev, { text: '', marks: '1' }])} className="text-xs font-bold text-primary">+ Add checklist step</button>
            </div>
          )}
          {format === 'audio' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input ref={audioRef} type="file" accept="audio/*" className="hidden" onChange={uploadAudio} />
                <button onClick={() => audioRef.current?.click()} disabled={audioBusy} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary py-2 text-xs font-bold disabled:opacity-50">
                  {audioBusy ? 'Uploading…' : 'Upload audio'}
                </button>
                <input value={audioUrl} onChange={e => setAudioUrl(e.target.value)} placeholder="…or paste audio URL" className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-xs outline-none" />
              </div>
              {audioUrl ? <audio controls preload="none" src={audioUrl} className="w-full" style={{ height: 36 }} /> : null}
              <div className="grid grid-cols-2 gap-2">
                {['mcq', 'fib'].map(f => (
                  <button key={f} type="button" onClick={() => setAudioFollow(f)}
                    className={'rounded-xl border py-2 text-xs font-bold ' + (audioFollow === f ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground')}>{f === 'mcq' ? 'MCQ follow-up' : 'Typed follow-up'}</button>
                ))}
              </div>
              {audioFollow === 'fib'
                ? <input value={fibAccept} onChange={e => setFibAccept(e.target.value)} placeholder="Accepted answers (| separates alternates)" className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
                : (
                  <div className="space-y-1.5">
                    {options.map((o, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <button type="button" onClick={() => setCorrectIdx(i)}
                          className={`flex size-8 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${correctIdx === i ? 'border-green-500 bg-green-500/10 text-green-600' : 'text-muted-foreground'}`}>{letters[i]}</button>
                        <input value={o} onChange={e => setOpt(i, e.target.value)} placeholder={`Option ${letters[i]}`} className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}
          {format === 'viva' && (
            <div className="space-y-2">
              <textarea value={vivaModel} onChange={e => setVivaModel(e.target.value)} placeholder="Model answer…" rows={3} className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
              <input value={vivaFollowups} onChange={e => setVivaFollowups(e.target.value)} placeholder="Follow-up questions (; separated)" className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">Marks</span>
                <input value={marks} onChange={e => setMarks(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))} inputMode="numeric" className="w-16 rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
              </div>
            </div>
          )}
          <textarea value={explanation} onChange={e => setExplanation(e.target.value)} placeholder="Explanation (optional)" rows={2} className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
          {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
          {(doneMsg) && <p className="text-xs font-bold text-green-600">{doneMsg}</p>}
          <button disabled={busy} onClick={save} className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {busy ? 'Adding…' : 'Add question'}
          </button>
          {(() => { let pq = null; try { pq = buildPayload() } catch {} return pq ? (
            <div className="space-y-2 rounded-2xl border p-3">
              <div className="flex items-center gap-2">
                <p className="flex-1 text-xs font-black">Preview — exactly what students see</p>
                <button type="button" onClick={() => setPreviewRev(r => !r)} className="rounded-lg bg-muted px-2.5 py-1 text-[11px] font-bold">{previewRev ? 'Hide answers' : 'Reveal answers'}</button>
              </div>
              <QuestionRenderer key={format} q={pq} value={previewVal} onChange={setPreviewVal} revealed={previewRev} />
            </div>
          ) : null })()}
        </div>
      )}
    </div>
  )
}

export function NewCourseModal({ programme, onClose, onDone }) {
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [level, setLevel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function save() {
    setBusy(true)
    setError('')
    try {
      await api('/api/contribute/courses', { method: 'POST', body: JSON.stringify({
        code: code.trim(), title: title.trim(), level: level.trim() || undefined, programme,
      }) })
      onDone()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return (
    <Sheet title="New course" onClose={onClose}>
      <div className="space-y-2">
        <p className="rounded-lg bg-muted/60 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">Adds to {(programme || 'your programme') + ' — visible like every other course.'}</p>
        <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Course code (e.g. COS 204)" className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-bold outline-none" />
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Course title" className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
        <input value={level} onChange={e => setLevel(e.target.value)} placeholder="Level (e.g. 200 Level) — optional" className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
        {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
        <button disabled={busy} onClick={save} className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
          {busy ? 'Adding…' : 'Add course'}
        </button>
      </div>
    </Sheet>
  )
}
