'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Search, Folder, FileText, Files, PlayCircle, Play, Headphones, BookOpen, ClipboardList,
  ChevronRight, ChevronLeft, Plus, LayoutGrid, List, CheckSquare, X, Link as LinkIcon,
  Users, MoreVertical, Upload, Gamepad2, GraduationCap, Image as ImageIcon,
  ArrowLeft, ArrowUpDown, Info, Share2, Globe, Lock, Download, CheckCircle2, WifiOff, Loader2,
  Youtube, MoreHorizontal, NotebookPen, ScanLine, Camera, Send,
  Mic, Palette, Check,
} from 'lucide-react'
import { getToken } from '@/lib/auth'
import BookGrid from '@/components/BookGrid'
import VideoModal from '@/components/VideoModal'
import NoteReader from '@/components/NoteReader'
import ScanCamera from '@/components/ScanCamera'
import { LiveLecture, formatElapsed } from '@/lib/live-lecture'
import RichTextEditor from '@/components/RichTextEditor'
import { extractNoteText, plainToHtml, htmlToText, escHtml } from '@/lib/ocr'
import { NOTE_TEMPLATES, nextTemplate, templateBgStyle } from '@/lib/note-template'
import { uploadFile } from '@/lib/uploads'
import { thumbFor, isYouTubeUrl, ytEmbedUrl, ytThumb } from '@/lib/youtube'
import {
  snapshotKey, saveSnapshot, getSnapshot, pinFile, getPinned, unpin, listPinnedKeys,
  objectUrlFor, queueOp, listOutbox, removeOutbox, isOnlineNow,
} from '@/lib/offline-files'

function isPlayableMedia(node) {
  const k = node?.itemKind || node?.kind
  const u = node?.url || node?.href || ''
  if (!u) return false
  if (k === 'video' || k === 'audio') return true
  if (isYouTubeUrl(u)) return true
  return /\.(mp4|webm|mov|mp3|wav|ogg|m4a)(\?|$)/i.test(u)
}

function readHref(url, name) {
  return `/read?url=${encodeURIComponent(url || '')}&title=${encodeURIComponent(name || 'Reading')}`
}

// Samsung My Files-inspired layout built with our own icons/components.
// Not a pixel copy of Samsung assets — same file-manager patterns:
// categories, internal-storage folders, sort, select, move/copy/share/delete, details.
const CATS = [
  { id: 'image', label: 'Images', Icon: ImageIcon, tint: 'bg-emerald-100 text-emerald-700' },
  { id: 'video', label: 'Videos', Icon: PlayCircle, tint: 'bg-rose-100 text-rose-700' },
  { id: 'audio', label: 'Audio', Icon: Headphones, tint: 'bg-amber-100 text-amber-700' },
  { id: 'pdf', label: 'PDFs', Icon: Files, tint: 'bg-red-100 text-red-600' },
  { id: 'quiz', label: 'Quizzes', Icon: ClipboardList, tint: 'bg-violet-100 text-violet-700' },
  { id: 'theory', label: 'Theory', Icon: BookOpen, tint: 'bg-indigo-100 text-indigo-700' },
  { id: 'notes', label: 'Texts', Icon: FileText, tint: 'bg-sky-100 text-sky-700' },
  { id: 'link', label: 'Links', Icon: LinkIcon, tint: 'bg-slate-200 text-slate-700' },
]

function iconFor(node) {
  const k = node?.itemKind || node?.kind
  switch (k) {
    case 'folder': return Folder
    case 'quiz': return ClipboardList
    case 'theory': return BookOpen
    case 'notes': return FileText
    case 'pdf': return Files
    case 'video': return PlayCircle
    case 'audio': return Headphones
    case 'image': return ImageIcon
    case 'course': return GraduationCap
    case 'group': return Users
    case 'game': return Gamepad2
    case 'link': return LinkIcon
    default: return FileText
  }
}

function tintFor(node) {
  const k = node?.itemKind || node?.kind
  switch (k) {
    case 'folder': return 'text-amber-500 dark:text-amber-300'
    case 'image': return 'text-emerald-600'
    case 'video': return 'text-rose-600'
    case 'audio': return 'text-amber-600'
    case 'pdf': return 'text-red-500'
    default: return 'text-sky-600'
  }
}

function courseSlug(code) {
  return String(code || '').toLowerCase().replace(/\s+/g, '')
}

function formatSize(bytes) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatDate(iso) {
  try {
    const d = new Date(iso)
    if (isNaN(d)) return ''
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return '' }
}

function metaLine(n) {
  const parts = []
  if (n.size) parts.push(formatSize(n.size))
  if (n.updatedAt || n.createdAt) parts.push(formatDate(n.updatedAt || n.createdAt))
  if (n.isPublic === true) parts.push('Public')
  if (n.isPublic === false) parts.push('Private')
  return parts.join(' · ')
}

function authHeaders() {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(opts.headers || {}) },
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    // Tokens live 7 days — after that the server stops recognizing us until
    // the next login. Say so plainly instead of a dead "Unauthorized".
    const err = new Error('Session expired — log in again to keep using your folders.')
    err.code = 401
    throw err
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export default function FoldersPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center pb-24"><p className="text-sm text-muted-foreground">Opening My Files…</p></div>}>
      <FoldersInner />
    </Suspense>
  )
}

function FoldersInner() {
  const params = useSearchParams()
  const router = useRouter()
  const currentId = params.get('id') || null
  const fileRef = useRef(null)

  const [data, setData] = useState({ node: null, breadcrumb: [], role: 'owner', children: [], shared: [] })
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [view, setView] = useState(() => {
    try { return localStorage.getItem('folders_view') || 'list' } catch { return 'list' }
  })
  const [sort, setSort] = useState(() => {
    try { return localStorage.getItem('folders_sort') || 'name' } catch { return 'name' }
  })
  const [sortOpen, setSortOpen] = useState(false)
  const [catFilter, setCatFilter] = useState(null)
  const [selected, setSelected] = useState([])
  const [selectMode, setSelectMode] = useState(false)
  const [error, setError] = useState('')
  const [sessionExpired, setSessionExpired] = useState(false)

  const [newOpen, setNewOpen] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [busy, setBusy] = useState(false)
  const [renameTarget, setRenameTarget] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTargets, setDeleteTargets] = useState([])
  const [moveTargets, setMoveTargets] = useState([])
  const [moveBrowseId, setMoveBrowseId] = useState(null)
  const [moveBrowse, setMoveBrowse] = useState(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkMode, setLinkMode] = useState('link') // 'video' (red YouTube) | 'link'
  const [linkName, setLinkName] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteTypeOpen, setNoteTypeOpen] = useState(false)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteHtml, setNoteHtml] = useState('')
  const [noteTemplate, setNoteTemplate] = useState('plain')
  // Draft autosave: every keystroke-safe snapshot lands in Drafts.
  const [noteDraftId, setNoteDraftId] = useState(null)
  const [noteResume, setNoteResume] = useState(null)
  const noteSavedRef = useRef(false)
  // Live lecture notes: lecturer speaks, Apex types. Cloud Whisper worker.
  const [liveStatus, setLiveStatus] = useState('idle') // idle|starting|listening|paused|stopping|error
  const [liveElapsed, setLiveElapsed] = useState(0)
  const [liveError, setLiveError] = useState('')
  const [liveLast, setLiveLast] = useState('')
  const [liveQuiet, setLiveQuiet] = useState(0)
  const liveCtl = useRef(null)
  const liveSegs = useRef([])
  const liveScrollRef = useRef(null)
  // Scan paper notes: multi-page camera + batch on-device OCR.
  const [scanOpen, setScanOpen] = useState(false)
  const [scanCamOpen, setScanCamOpen] = useState(false)
  const [scanFiles, setScanFiles] = useState([]) // [{ id, url, file }]
  const [scanBusy, setScanBusy] = useState(false)
  const [scanProg, setScanProg] = useState(null)
  const [scanError, setScanError] = useState('')
  const scanFileRef = useRef(null)
  const scanSeq = useRef(0)
  const [moreOpen, setMoreOpen] = useState(false)
  const [linkMeta, setLinkMeta] = useState(null) // { title, author, thumb } from /api/youtube-meta
  const [linkFetching, setLinkFetching] = useState(false)
  const [online, setOnline] = useState(true)
  const [offlineNote, setOfflineNote] = useState(false)
  const [pinnedIds, setPinnedIds] = useState([])
  const [pinBusy, setPinBusy] = useState(null)
  const [queuedCount, setQueuedCount] = useState(0)
  const lastLinkFetched = useRef('')
  const [shareTarget, setShareTarget] = useState(null)
  const [shareRows, setShareRows] = useState([])
  const [shareEmail, setShareEmail] = useState('')
  const [shareRole, setShareRole] = useState('viewer')
  const [menuNode, setMenuNode] = useState(null)
  const [detailsNode, setDetailsNode] = useState(null)
  const [readingNode, setReadingNode] = useState(null)
  const [playingNode, setPlayingNode] = useState(null)
  const [dragIds, setDragIds] = useState([])
  const [dropOver, setDropOver] = useState(null)

  const canWrite = data.role === 'owner' || data.role === 'editor'

  function go(id) {
    setSelected([])
    setSelectMode(false)
    setCatFilter(null)
    router.push(id ? `/folders?id=${id}` : '/folders')
  }

  async function load() {
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams()
      if (currentId) qs.set('parentId', currentId)
      if (q.trim()) qs.set('q', q.trim())
      const d = await api(`/api/library${qs.toString() ? `?${qs}` : ''}`)
      setData({ node: d.node || null, breadcrumb: d.breadcrumb || [], role: d.role || 'owner', children: d.children || [], shared: d.shared || [] })
      setOfflineNote(false)
      setSessionExpired(false)
      // Snapshot for offline browsing (no mobile data → still open folders).
      try { await saveSnapshot(snapshotKey(currentId, q.trim()), d) } catch {}
      // Central public store for categories (best-effort).
      try {
        const m = await fetch('/api/materials?limit=50').then(r => r.json())
        if (Array.isArray(m)) setMaterials(m)
      } catch {}
    } catch (e) {
      // Expired login must never masquerade as "offline" — say so plainly.
      if (e.code === 401) {
        setSessionExpired(true)
        setError('')
        return
      }
      // Offline? Fall back to the last good snapshot so folders still open.
      try {
        const snap = await getSnapshot(snapshotKey(currentId, q.trim()))
        if (snap) {
          setData({ node: snap.node || null, breadcrumb: snap.breadcrumb || [], role: snap.role || 'owner', children: snap.children || [], shared: snap.shared || [] })
          setOfflineNote(true)
          setError('')
          return
        }
      } catch {}
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [currentId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setTimeout(() => { if (!loading) load() }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  useEffect(() => {
    try {
      localStorage.setItem('folders_view', view)
      localStorage.setItem('folders_sort', sort)
    } catch {}
  }, [view, sort])

  // Online state + pinned ids + queued-op count.
  useEffect(() => {
    const sync = () => setOnline(isOnlineNow())
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    listPinnedKeys().then(keys => setPinnedIds(keys || [])).catch(() => {})
    listOutbox().then(rows => setQueuedCount((rows || []).length)).catch(() => {})
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  // Flush queued folder/link/note creates when back online.
  useEffect(() => {
    if (!online) return
    let dead = false
    ;(async () => {
      const rows = await listOutbox().catch(() => [])
      if (!rows?.length || dead) return
      for (const op of rows) {
        if (op.type === 'upload') continue // uploads flush via retry button (needs File)
        try {
          if (op.type === 'folder' || op.type === 'link' || op.type === 'note') {
            await api('/api/library', { method: 'POST', body: JSON.stringify(op.payload) })
          } else continue
          await removeOutbox(op.qid)
        } catch {}
      }
      if (!dead) {
        const left = await listOutbox().catch(() => [])
        setQueuedCount((left || []).length)
        load()
        // Then upload any queued file bytes.
        try { await retryQueuedUploads() } catch {}
      }
    })()
    return () => { dead = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  // Paste a YouTube link → auto-fetch title/thumb, editable before save.
  // (Same /api/youtube-meta the contribute flow uses.)
  async function lookupLink(u) {
    const v = (u ?? linkUrl).trim()
    if (!v || v.length < 8) return
    if (lastLinkFetched.current === v) return
    if (!isYouTubeUrl(v)) { setLinkMeta(null); return }
    lastLinkFetched.current = v
    setLinkFetching(true)
    try {
      const res = await fetch(`/api/youtube-meta?url=${encodeURIComponent(v)}`)
      const d = await res.json().catch(() => ({}))
      if (!res.ok || d.error) throw new Error(d.error || 'fetch failed')
      setLinkMeta(d.playlist ? null : d)
      setLinkName(prev => (prev.trim() ? prev : (d.title || '')))
      if (d.playlist) setError(`That's a playlist (${d.count} videos) — open it and add videos one link at a time for now.`)
    } catch {
      setLinkMeta({ url: v, title: '', author: null, thumb: ytThumb(v) })
    } finally {
      setLinkFetching(false)
    }
  }

  useEffect(() => {
    const v = linkUrl.trim()
    if (!linkOpen || v.length < 8 || !/youtu\.?be|youtube/.test(v)) return
    if (lastLinkFetched.current === v) return
    const t = setTimeout(() => { lookupLink(v) }, 500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkUrl, linkOpen])

  // Draft autosave: 2.5s after the last keystroke (or phrase), silent, online only.
  useEffect(() => {
    if (!noteOpen || noteSavedRef.current) return
    if (!htmlToText(liveFullHtml(noteHtml)) && !noteTitle.trim() && !noteDraftId) return
    const t = setTimeout(() => { saveNoteDraft().catch(() => {}) }, 2500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteHtml, noteTitle, noteOpen, liveLast])

  // Accidental refresh with unsent work → browser asks first.
  useEffect(() => {
    if (!noteOpen || noteSavedRef.current) return
    if (!htmlToText(noteHtml) && !noteTitle.trim()) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [noteOpen, noteHtml, noteTitle])

  // ---- Live lecture notes: speech lands in its own always-visible block
  // (tiptap eats foreign markers and won't sync while focused — so we never
  // merge mid-session). Save/draft time folds it into the note HTML. ----
  function liveBlockInner() {
    return liveSegs.current.map(s => `<p>${escHtml(s.text)}</p>`).join('')
  }

  function liveFullHtml(base) {
    const inner = liveBlockInner()
    const clean = String(base || '').replace(/<div id="live-transcript">[\s\S]*?<\/div>/, '')
    if (!inner) return clean
    return `${clean}${clean ? '<p></p>' : ''}<div id="live-transcript"><h2>Live transcript</h2>${inner}</div>`
  }

  // Pull a previously saved transcript back into live segments so a resumed
  // note keeps one continuous block instead of two.
  function seedLiveSegs(html) {
    liveSegs.current = []
    const src = String(html || '')
    const m = src.match(/<div id="live-transcript">([\s\S]*?)<\/div>/)
    if (m) {
      const paras = [...m[1].matchAll(/<p>([\s\S]*?)<\/p>/gi)]
        .map(x => x[1].replace(/<[^>]*>/g, '').trim())
        .filter(Boolean)
      liveSegs.current = paras.map(text => ({ text }))
    }
    return src.replace(/<div id="live-transcript">[\s\S]*?<\/div>/, '')
  }

  async function startLive() {
    if (liveCtl.current) return
    setLiveError('')
    setLiveLast('')
    setLiveQuiet(0)
    setLiveElapsed(0)
    liveSegs.current = []
    // Cloud engine: no signal, no session.
    if (!isOnlineNow()) {
      setLiveError('Live notes need internet.')
      setLiveStatus('error')
      return
    }
    const ctl = new LiveLecture({
      onResult: ({ text }) => {
        liveSegs.current.push({ text })
        setLiveLast(text)
      },
      onState: (st, msg) => {
        setLiveStatus(st)
        if (st === 'error') setLiveError(msg || 'Live notes failed.')
        if (st === 'idle') liveCtl.current = null
      },
      onTick: (s, q) => { setLiveElapsed(s); setLiveQuiet(q || 0) },
    })
    liveCtl.current = ctl
    setLiveStatus('starting')
    try {
      await ctl.start()
    } catch (e) {
      setLiveError(e.message || 'Could not start live notes.')
      setLiveStatus('error')
      liveCtl.current = null
    }
  }

  // Mic icon toggle: idle → start, listening → pause, paused → resume.
  function toggleLive() {
    const ctl = liveCtl.current
    if (!ctl) { startLive(); return }
    if (liveStatus === 'listening') ctl.pause()
    else if (liveStatus === 'paused') ctl.resume()
  }

  // "Take note for me": editor opens and the mic is already on.
  function openLiveNote() {
    openNoteEditor()
    startLive()
  }

  async function stopLive() {
    const ctl = liveCtl.current
    if (!ctl) return
    setLiveStatus('stopping')
    try { await ctl.stop() } catch {}
  }

  // Keep the flowing transcript pinned to the latest words.
  useEffect(() => {
    try {
      const el = liveScrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    } catch {}
  }, [liveLast])

  // Closing the editor mid-lecture stops capture; the transcript so far is
  // already in the note + draft, so nothing is lost.
  useEffect(() => {
    if (!noteOpen && liveCtl.current) {
      try { liveCtl.current.stop() } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteOpen])

  function sortNodes(list) {
    const arr = [...list]
    if (sort === 'newest') arr.sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))
    else if (sort === 'oldest') arr.sort((a, b) => String(a.updatedAt || a.createdAt || '').localeCompare(String(b.updatedAt || b.createdAt || '')))
    else if (sort === 'size') arr.sort((a, b) => (Number(b.size) || 0) - (Number(a.size) || 0))
    else if (sort === 'type') arr.sort((a, b) => String(a.itemKind || a.kind || '').localeCompare(String(b.itemKind || b.kind || '')) || String(a.name || '').localeCompare(String(b.name || '')))
    else arr.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
    return arr
  }

  const folders = sortNodes(data.children.filter(c => c.kind === 'folder'))
  const files = sortNodes(data.children.filter(c => c.kind !== 'folder'))

  const isVideoNode = (f) => (f?.itemKind === 'video') || isYouTubeUrl(f?.url || f?.href || '')
  const catCounts = {
    image: materials.filter(m => m.itemKind === 'image').length + files.filter(f => f.itemKind === 'image').length,
    video: materials.filter(m => m.itemKind === 'video').length + files.filter(isVideoNode).length,
    audio: materials.filter(m => m.itemKind === 'audio').length + files.filter(f => f.itemKind === 'audio').length,
    pdf: materials.filter(m => m.itemKind === 'pdf').length + files.filter(f => f.itemKind === 'pdf').length,
    quiz: files.filter(f => f.itemKind === 'quiz').length,
    theory: files.filter(f => f.itemKind === 'theory').length,
    notes: materials.filter(m => m.itemKind === 'notes').length + files.filter(f => f.itemKind === 'notes').length,
    link: files.filter(f => f.itemKind === 'link' && !isYouTubeUrl(f.url || f.href || '')).length,
  }
  const catFiles = catFilter
    ? sortNodes([
        ...files.filter(f => catFilter === 'video' ? isVideoNode(f) : catFilter === 'link' ? (f.itemKind === 'link' && !isYouTubeUrl(f.url || f.href || '')) : f.itemKind === catFilter),
        ...materials
          .filter(m => m.itemKind === catFilter)
          .map(m => ({ id: `m-${m.id}`, kind: 'ref', name: m.title, itemKind: m.itemKind, href: m.url, url: m.url, thumb: m.thumb || null, size: m.size, courseCode: m.courseCode, subtitle: `${m.courseCode || 'Uploads'} · Public`, updatedAt: m.createdAt, isPublic: true, central: true })),
      ])
    : []

  function toggleSelect(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function dragStart(e, node) {
    if (!canWrite || String(node.id).startsWith('m-')) { e.preventDefault(); return }
    const ids = selected.includes(node.id) && selected.length ? selected : [node.id]
    setDragIds(ids)
    try {
      e.dataTransfer.setData('text/plain', JSON.stringify(ids))
      e.dataTransfer.effectAllowed = 'move'
    } catch {}
  }

  async function dropOnFolder(e, folder) {
    e.preventDefault()
    e.stopPropagation()
    setDropOver(null)
    if (!canWrite) return
    let ids = dragIds
    if (!ids.length) {
      try {
        const raw = e.dataTransfer.getData('text/plain')
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) ids = parsed
      } catch {}
    }
    ids = (ids || []).filter(id => !String(id).startsWith('m-') && String(id) !== String(folder.id))
    if (!ids.length) { setDragIds([]); return }
    setBusy(true)
    try {
      for (const id of ids) {
        await api(`/api/library/${id}`, { method: 'PATCH', body: JSON.stringify({ parentId: folder.id }) })
      }
      setDragIds([])
      setSelected([])
      setSelectMode(false)
      load()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  async function createFolder() {
    if (busy) return
    const name = folderName.trim() || 'New folder'
    if (!isOnlineNow()) {
      await queueOp({ type: 'folder', payload: { kind: 'folder', name, parentId: currentId } })
      const left = await listOutbox().catch(() => [])
      setQueuedCount((left || []).length)
      setFolderName('')
      setNewOpen(false)
      setError('Offline — folder will be created when you’re back online.')
      return
    }
    setBusy(true)
    try {
      await api('/api/library', { method: 'POST', body: JSON.stringify({ kind: 'folder', name, parentId: currentId }) })
      setFolderName('')
      setNewOpen(false)
      load()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function doRename() {
    if (!renameTarget || busy || renameTarget.central) return
    setBusy(true)
    try {
      await api(`/api/library/${renameTarget.id}`, { method: 'PATCH', body: JSON.stringify({ name: renameValue }) })
      setRenameTarget(null)
      load()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function doDelete() {
    if (busy || !deleteTargets.length) return
    setBusy(true)
    try {
      for (const t of deleteTargets) {
        if (String(t.id).startsWith('m-')) continue
        await api(`/api/library/${t.id}`, { method: 'DELETE' })
      }
      setDeleteTargets([])
      setSelected([])
      setSelectMode(false)
      load()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function doCopy(ids) {
    if (busy) return
    setBusy(true)
    try {
      for (const id of ids) {
        if (String(id).startsWith('m-')) {
          const m = materials.find(x => `m-${x.id}` === String(id))
          if (!m) continue
          await api('/api/library', { method: 'POST', body: JSON.stringify({ kind: 'ref', name: m.title, parentId: currentId, itemKind: m.itemKind, href: m.url, url: m.url, refId: m.id, materialId: m.id, size: m.size, courseCode: m.courseCode, isPublic: true, subtitle: `${m.courseCode || 'Uploads'} · Public` }) })
        } else {
          await api(`/api/library/${id}/copy`, { method: 'POST', body: JSON.stringify({ parentId: currentId }) })
        }
      }
      setSelected([])
      setSelectMode(false)
      load()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function loadMoveBrowse(id) {
    try {
      const d = await api(id ? `/api/library?parentId=${id}` : '/api/library')
      setMoveBrowse(d)
      setMoveBrowseId(id)
    } catch (e) { setError(e.message) }
  }

  async function doMove() {
    if (busy || !moveTargets.length) return
    const dest = moveBrowseId
    setBusy(true)
    try {
      for (const t of moveTargets) {
        if (String(t.id).startsWith('m-')) continue
        await api(`/api/library/${t.id}`, { method: 'PATCH', body: JSON.stringify({ parentId: dest }) })
      }
      setMoveTargets([])
      setMoveBrowse(null)
      setMoveBrowseId(null)
      setSelected([])
      setSelectMode(false)
      load()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function createNote() {
    if (busy) return
    if (liveCtl.current) { try { await stopLive() } catch {} }
    const title = noteTitle.trim()
    const full = liveFullHtml(noteHtml)
    const textLen = htmlToText(full).length
    if (!title && !textLen) { setError('Write something first'); return }
    const payload = {
      kind: 'ref', name: title || 'Untitled note', parentId: currentId,
      itemKind: 'notes', content: full || null, subtitle: 'Note',
      ...(noteTemplate !== 'plain' ? { color: noteTemplate } : {}),
    }
    if (!isOnlineNow()) {
      // Offline: queue the note on-device, it saves when back online.
      try {
        await queueOp({ type: 'note', payload })
        const left = await listOutbox().catch(() => [])
        setQueuedCount((left || []).length)
        setNoteTitle('')
        setNoteHtml('')
        liveSegs.current = []
        setLiveLast('')
        noteSavedRef.current = true
        setNoteOpen(false)
        setError('Offline — note queued, it saves when you’re back online.')
      } catch {
        setError('Offline — could not queue that note.')
      }
      return
    }
    setBusy(true)
    try {
      await api('/api/library', { method: 'POST', body: JSON.stringify(payload) })
      setNoteTitle('')
      setNoteHtml('')
      liveSegs.current = []
      setLiveLast('')
      noteSavedRef.current = true
      await deleteNoteDraft(noteDraftId)
      setNoteDraftId(null)
      setNoteResume(null)
      setNoteOpen(false)
      load()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  function openNoteEditor({ title = '', html = '', template = 'plain' } = {}) {
    setNoteTitle(title)
    setNoteHtml(seedLiveSegs(html))
    setNoteTemplate(template || 'plain')
    setLiveLast('')
    setNoteTypeOpen(false)
    setScanOpen(false)
    setError('')
    noteSavedRef.current = false
    setNoteDraftId(null)
    setNoteResume(null)
    if (!title && !htmlToText(html)) {
      // Unfinished business? Offer the autosaved draft for this folder.
      findNoteDraft(currentId).then(hit => { if (hit) setNoteResume(hit) }).catch(() => {})
    }
    setNoteOpen(true)
  }

  function parseNoteDraft(content) {
    try {
      const d = JSON.parse(String(content || ''))
      if (d && typeof d === 'object' && d.kind === 'note-draft') return d
    } catch {}
    return null
  }

  async function ensureDraftsFolder() {
    const root = await api('/api/library')
    const hit = (root.children || []).find(c => c.kind === 'folder' && String(c.name || '').toLowerCase() === 'drafts')
    if (hit) return hit.id
    const c = await api('/api/library', { method: 'POST', body: JSON.stringify({ kind: 'folder', name: 'Drafts', parentId: null }) })
    return c.node.id
  }

  async function findNoteDraft(parentId) {
    try {
      const draftsId = await ensureDraftsFolder()
      const d = await api(`/api/library?parentId=${encodeURIComponent(draftsId)}`)
      const hits = (d.children || [])
        .filter(c => c.kind === 'ref' && c.itemKind === 'draft')
        .map(c => ({ node: c, draft: parseNoteDraft(c.content) }))
        .filter(x => x.draft && String(x.draft.parentId ?? '') === String(parentId ?? ''))
        .sort((a, b) => String(b.draft.savedAt || '').localeCompare(String(a.draft.savedAt || '')))
      return hits[0] || null
    } catch { return null }
  }

  async function saveNoteDraft() {
    const title = noteTitle.trim()
    const html = liveFullHtml(noteHtml)
    if (!htmlToText(html) && !title) return
    if (noteSavedRef.current || !isOnlineNow()) return
    try {
      const content = JSON.stringify({ kind: 'note-draft', title, html, template: noteTemplate, parentId: currentId, savedAt: new Date().toISOString() })
      const name = title || 'Untitled note'
      if (noteDraftId) {
        await api(`/api/library/${encodeURIComponent(noteDraftId)}`, { method: 'PATCH', body: JSON.stringify({ name, content }) })
      } else {
        const draftsId = await ensureDraftsFolder()
        const c = await api('/api/library', { method: 'POST', body: JSON.stringify({ kind: 'ref', name, parentId: draftsId, itemKind: 'draft', content, subtitle: 'Draft' }) })
        if (c?.node?.id) setNoteDraftId(c.node.id)
      }
    } catch {}
  }

  async function deleteNoteDraft(id) {
    if (!id) return
    try { await api(`/api/library/${encodeURIComponent(id)}`, { method: 'DELETE' }) } catch {}
  }

  function addScanFiles(files) {
    const list = Array.from(files || []).filter(f => /^image\//.test(f.type || ''))
    if (!list.length) return
    setScanFiles(prev => {
      const room = Math.max(0, 10 - prev.length)
      return [...prev, ...list.slice(0, room).map(file => {
        const id = `scan-${Date.now()}-${scanSeq.current++}`
        let url = null
        try { url = URL.createObjectURL(file) } catch {}
        return { id, url, file }
      })]
    })
    setScanError('')
    setScanProg(null)
  }

  function removeScanFile(id) {
    setScanFiles(prev => {
      const hit = prev.find(x => x.id === id)
      if (hit?.url) { try { URL.revokeObjectURL(hit.url) } catch {} }
      return prev.filter(x => x.id !== id)
    })
  }

  function clearScanFiles() {
    setScanFiles(prev => {
      prev.forEach(x => { if (x.url) { try { URL.revokeObjectURL(x.url) } catch {} } })
      return []
    })
  }

  async function runScan() {
    if (!scanFiles.length || scanBusy) return
    setScanBusy(true)
    setScanError('')
    const files = [...scanFiles]
    const total = files.length
    const parts = []
    let minConf = 100
    try {
      for (let i = 0; i < total; i++) {
        const label = total > 1 ? `Page ${i + 1}/${total}` : 'Reading…'
        setScanProg({ status: label, progress: Math.round((i / total) * 100) })
        const { text, confidence } = await extractNoteText(files[i].file, {
          onProgress: (m) => {
            const p = m && typeof m.progress === 'number' ? m.progress : 0
            const preparing = m?.status && m.status !== 'recognizing text'
            const phase = preparing ? 'Preparing reader (one-time)…' : label
            setScanProg({ status: `${phase} ${Math.round(p * 100)}%`, progress: Math.round(((i + p) / total) * 100) })
          },
        })
        if (typeof confidence === 'number') minConf = Math.min(minConf, confidence)
        const body = plainToHtml(text)
        parts.push(total > 1 ? `<h2>Page ${i + 1}</h2>${body}` : body)
      }
      const html = parts.join('')
      if (!htmlToText(html)) throw new Error('No text found — try better light and hold steady.')
      setScanProg({ status: 'Done', progress: 100 })
      openNoteEditor({ title: noteTitle.trim() || (total > 1 ? `Scanned note (${total} pages)` : 'Scanned note'), html: parts.join('') })
      setScanOpen(false)
      clearScanFiles()
      if (minConf < 60) setError(`Scanned with low confidence (${minConf}%) — skim and fix errors.`)
    } catch (e) {
      setScanError(e.message || 'Could not read those photos.')
    } finally {
      setScanBusy(false)
      setScanProg(null)
    }
  }

  function openLinkSheet(mode) {
    setLinkMode(mode)
    setLinkMeta(null)
    lastLinkFetched.current = ''
    setNewOpen(false)
    setMoreOpen(false)
    setLinkOpen(true)
  }

  async function createLink() {
    if (busy) return
    const rawUrl = linkUrl.trim()
    if (!rawUrl) { setError('Paste a URL first'); return }
    // We don't upload video files — a YouTube link IS the video. Save it as
    // itemKind video (with thumb) so it plays + shows under Videos.
    const yt = isYouTubeUrl(rawUrl)
    const metaUrl = linkMeta?.url || rawUrl
    const finalUrl = yt ? metaUrl : rawUrl
    const title = linkName.trim() || linkMeta?.title?.trim() || (yt ? 'YouTube video' : rawUrl)
    const thumb = linkMeta?.thumb || ytThumb(finalUrl) || null
    const payload = {
      kind: 'ref',
      name: title,
      parentId: currentId,
      itemKind: yt ? 'video' : 'link',
      href: finalUrl,
      url: finalUrl,
      thumb,
      subtitle: linkMeta?.author ? `YouTube · ${linkMeta.author}` : (yt ? 'YouTube' : null),
    }
    if (!isOnlineNow()) {
      await queueOp({ type: 'link', payload })
      const left = await listOutbox().catch(() => [])
      setQueuedCount((left || []).length)
      setLinkName('')
      setLinkUrl('')
      setLinkMeta(null)
      lastLinkFetched.current = ''
      setLinkOpen(false)
      setError('Offline — link will be saved when you’re back online.')
      return
    }
    setBusy(true)
    try {
      await api('/api/library', { method: 'POST', body: JSON.stringify(payload) })
      setLinkName('')
      setLinkUrl('')
      setLinkMeta(null)
      lastLinkFetched.current = ''
      setLinkOpen(false)
      load()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function hashFile(file) {
    try {
      const buf = await file.arrayBuffer()
      const digest = await crypto.subtle.digest('SHA-256', buf)
      return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
    } catch {
      return null
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    // No data? Queue the bytes on-device, upload when back online.
    if (!isOnlineNow()) {
      try {
        const buf = await file.arrayBuffer()
        await queueOp({
          type: 'upload', fileName: file.name, mime: file.type || null, size: file.size || null,
          parentId: currentId, courseCode: courseCode || null,
          blob: new Blob([buf], { type: file.type || 'application/octet-stream' }),
        })
        const left = await listOutbox().catch(() => [])
        setQueuedCount((left || []).length)
        setError(`Offline — “${file.name}” queued, it uploads when you’re back online.`)
      } catch {
        setError('Offline — could not queue that file.')
      } finally {
        if (fileRef.current) fileRef.current.value = ''
      }
      return
    }
    setBusy(true)
    setError('')
    try {
      const mime = file.type || ''
      const itemKind = file.name?.endsWith('.pdf') || mime === 'application/pdf' ? 'pdf'
        : mime.startsWith('video/') ? 'video'
        : mime.startsWith('audio/') ? 'audio'
        : mime.startsWith('image/') ? 'image' : 'file'
      // Dedupe: identical bytes uploaded before by ANYONE → reuse the one
      // stored file, skip Cloudinary. Join as an uploader via POST (no url).
      const sha256 = await hashFile(file)
      if (sha256) {
        try {
          const found = await api(`/api/materials?sha256=${sha256}`)
          const hit = Array.isArray(found) ? found[0] : null
          if (hit?.id) {
            const joined = await api('/api/materials', {
              method: 'POST',
              body: JSON.stringify({ sha256, isPublic: true }),
            }).catch(() => null)
            const doc = (joined && joined.id) ? joined : { id: hit.id, isPublic: hit.isPublic !== false }
            await api('/api/library', {
              method: 'POST',
              body: JSON.stringify({ kind: 'ref', name: file.name, parentId: currentId, itemKind, href: hit.url, url: hit.url, refId: doc.id, materialId: doc.id, size: file.size || hit.size || null, mime, isPublic: doc.isPublic !== false, courseCode: courseCode || hit.courseCode, sha256, subtitle: 'Already uploaded · reused' }),
            })
            setError('')
            load()
            return
          }
        } catch {}
      }
      const form = new FormData()
      form.append('file', file)
      form.append('folder', 'gss-quiz/library')
      // Background XHR: progress lives in the bar above the nav,
      // the user can keep browsing while this runs.
      const ud = await uploadFile(file, { folder: 'gss-quiz/library', getToken })
      if (!ud?.url) throw new Error(ud?.error || 'Upload failed')
      let materialId = null
      try {
        const m = await api('/api/materials', {
          method: 'POST',
          body: JSON.stringify({
            title: file.name, fileName: file.name, url: ud.url,
            publicId: ud.publicId || null, mime, size: file.size || null,
            itemKind, courseCode, isPublic: true, sha256,
          }),
        })
        materialId = m.id || null
      } catch {}
      await api('/api/library', {
        method: 'POST',
        body: JSON.stringify({ kind: 'ref', name: file.name, parentId: currentId, itemKind, href: ud.url, url: ud.url, refId: materialId || ud.publicId || null, materialId, size: file.size || null, mime, isPublic: true, courseCode, sha256, subtitle: `${formatSize(file.size)} · Public` }),
      })
      load()
    } catch (err) { setError(err.message) } finally { setBusy(false); if (fileRef.current) fileRef.current.value = '' }
  }

  // Upload queued file bytes (stored while offline) now that we're online.
  async function retryQueuedUploads() {
    if (busy || !isOnlineNow()) return
    const rows = await listOutbox().catch(() => [])
    const ups = (rows || []).filter(r => r.type === 'upload' && r.blob)
    if (!ups.length) return
    setBusy(true)
    try {
      for (const op of ups) {
        try {
          const file = new File([op.blob], op.fileName || 'upload', { type: op.mime || 'application/octet-stream' })
          const mime = op.mime || file.type || ''
          const itemKind = file.name?.endsWith('.pdf') || mime === 'application/pdf' ? 'pdf'
            : mime.startsWith('video/') ? 'video'
            : mime.startsWith('audio/') ? 'audio'
            : mime.startsWith('image/') ? 'image' : 'file'
          const ud = await uploadFile(file, { folder: 'gss-quiz/library', getToken })
          if (!ud?.url) throw new Error('Upload failed')
          let materialId = null
          try {
            const m = await api('/api/materials', {
              method: 'POST',
              body: JSON.stringify({
                title: file.name, fileName: file.name, url: ud.url,
                publicId: ud.publicId || null, mime, size: file.size || null,
                itemKind, courseCode: op.courseCode || courseCode, isPublic: true,
              }),
            })
            materialId = m.id || null
          } catch {}
          await api('/api/library', {
            method: 'POST',
            body: JSON.stringify({ kind: 'ref', name: file.name, parentId: op.parentId ?? currentId, itemKind, href: ud.url, url: ud.url, refId: materialId || ud.publicId || null, materialId, size: file.size || null, mime, isPublic: true, courseCode: op.courseCode || courseCode, subtitle: `${formatSize(file.size)} · Public` }),
          })
          await removeOutbox(op.qid)
        } catch {}
      }
      const left = await listOutbox().catch(() => [])
      setQueuedCount((left || []).length)
      load()
    } finally {
      setBusy(false)
    }
  }

  // Visibility is per-user metadata: your toggle only ever flips YOUR copy.
  // The shared file goes public when anyone shares it, and stays public
  // while anyone still shares it — one user's toggle never hides or
  // exposes another user's copy.
  const isPinned = (id) => pinnedIds.includes(String(id))

  // "Available offline": download the bytes to this device (PDFs, images,
  // audio, uploaded video files). YouTube links can't be pinned — streaming only.
  async function togglePin(node) {
    if (!node || String(node.id).startsWith('m-')) return
    const id = String(node.id)
    const url = node.url || node.href || ''
    if (isPinned(id)) {
      await unpin(id)
      setPinnedIds(prev => prev.filter(x => x !== id))
      return
    }
    if (isYouTubeUrl(url)) {
      setError('YouTube needs internet — only uploaded files can be saved offline.')
      return
    }
    if (!url) return
    setPinBusy(id)
    try {
      const r = await pinFile({ id, url, name: node.name, mime: node.mime, itemKind: node.itemKind, size: node.size })
      if (r?.error) setError(r.error)
      else {
        const keys = await listPinnedKeys().catch(() => [])
        setPinnedIds(keys || [])
        setError('')
      }
    } finally {
      setPinBusy(null)
    }
  }

  async function saveNoteContent(node, content) {
    if (!node || busy) return
    setBusy(true)
    try {
      const d = await api(`/api/library/${node.id}`, { method: 'PATCH', body: JSON.stringify({ content: content || null }) })
      if (d?.node) setDetailsNode(d.node)
      load()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  // Send a folder note into the course bank: same review pipeline as
  // contributions — appears in theory/search/plan after admin approval.
  // Returns a confirmation message for the Details sheet (null on failure).
  async function publishNote(node) {
    if (!node?.content || busy) return null
    const cc = node.courseCode || courseCode
    if (!cc) { setError('No course here — open a course folder to send this to its bank.'); return null }
    setBusy(true)
    try {
      await api('/api/contribute/readings', {
        method: 'POST',
        body: JSON.stringify({ title: node.name, courseCode: cc, content: node.content }),
      })
      setError('')
      return `Sent to the ${cc} bank — shows up after admin approval.`
    } catch (e) {
      setError(e.message)
      return null
    } finally { setBusy(false) }
  }

  // Play prefers the on-device copy (works with no data); else streams.
  async function playNode(node) {
    if (!node) return
    try {
      if (isPinned(node.id)) {
        const rec = await getPinned(node.id)
        const u = rec ? objectUrlFor(rec) : null
        if (u) {
          setPlayingNode({ ...node, url: u, href: u })
          return
        }
      }
    } catch {}
    setPlayingNode(node)
  }

  async function togglePublic(node, sharedCount = 0) {
    if (busy || !node || String(node.id).startsWith('m-')) return
    setBusy(true)
    try {
      const next = node.isPublic === false ? true : false
      if (node.materialId && sharedCount <= 1) {
        await api(`/api/materials/${node.materialId}`, { method: 'PATCH', body: JSON.stringify({ isPublic: next }) })
      }
      await api(`/api/library/${node.id}`, { method: 'PATCH', body: JSON.stringify({ isPublic: next }) })
      setDetailsNode({ ...node, isPublic: next })
      load()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function openShare(node) {
    setMenuNode(null)
    setShareTarget(node)
    setShareRows([])
    try {
      const d = await api(`/api/library/${node.id}/members`)
      setShareRows(d.members || [])
    } catch (e) { setError(e.message) }
  }

  async function addMember() {
    if (!shareTarget || busy) return
    setBusy(true)
    try {
      await api(`/api/library/${shareTarget.id}/members`, { method: 'POST', body: JSON.stringify({ email: shareEmail, role: shareRole }) })
      setShareEmail('')
      const d = await api(`/api/library/${shareTarget.id}/members`)
      setShareRows(d.members || [])
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function removeMember(email) {
    if (!shareTarget || busy) return
    setBusy(true)
    try {
      await api(`/api/library/${shareTarget.id}/members?email=${encodeURIComponent(email)}`, { method: 'DELETE' })
      setShareRows(prev => prev.filter(r => r.email !== email))
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  function shareFile(node) {
    const url = node.href || node.url
    if (!url) return
    try {
      const full = url.startsWith('http') ? url : `${window.location.origin}${url}`
      navigator.clipboard?.writeText(full)
      setError('')
      setMenuNode(null)
      setDetailsNode(null)
    } catch {}
  }

  const courseCode = data.node?.courseCode || data.children.find(c => c.courseCode)?.courseCode || null
  const quizHref = courseCode ? `/courses/${courseSlug(courseCode)}/quiz` : '/courses'
  const gamesHref = '/games'

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 px-4 pb-28 pt-6">
      <div className="flex items-center gap-2">
        {catFilter ? (
          <button onClick={() => setCatFilter(null)} aria-label="Back" className="flex size-9 items-center justify-center rounded-lg border hover:bg-muted"><ArrowLeft className="size-4" /></button>
        ) : null}
        <h1 className="flex-1 text-xl font-bold">{catFilter ? CATS.find(c => c.id === catFilter)?.label || 'Category' : 'My Files'}</h1>
        <button onClick={() => setSortOpen(true)} aria-label="Sort" className="flex size-9 items-center justify-center rounded-lg border hover:bg-muted"><ArrowUpDown className="size-4" /></button>
        <button onClick={() => setView(view === 'grid' ? 'list' : 'grid')} aria-label="Toggle view" className="flex size-9 items-center justify-center rounded-lg border hover:bg-muted">
          {view === 'grid' ? <List className="size-4" /> : <LayoutGrid className="size-4" />}
        </button>
        <button onClick={() => { setSelectMode(!selectMode); setSelected([]) }} aria-label="Select" className={`flex size-9 items-center justify-center rounded-lg border hover:bg-muted ${selectMode ? 'bg-foreground text-background' : ''}`}>
          <CheckSquare className="size-4" />
        </button>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto text-sm">
        <span
          onDragOver={canWrite ? (e) => { e.preventDefault(); setDropOver('__root__') } : undefined}
          onDragLeave={() => setDropOver(cur => cur === '__root__' ? null : cur)}
          onDrop={canWrite ? (e) => dropOnFolder(e, { id: null }) : undefined}
          className={`shrink-0 rounded px-1 py-0.5 font-semibold ${dropOver === '__root__' ? 'bg-primary/15 text-primary' : !currentId ? 'bg-muted' : 'text-muted-foreground hover:bg-muted'}`}
        >
          <Link href="/folders" onClick={() => setCatFilter(null)}>My Files</Link>
        </span>
        {data.breadcrumb.map(b => (
          <span key={b.id} className="flex shrink-0 items-center gap-1"
            onDragOver={canWrite ? (e) => { e.preventDefault(); setDropOver(b.id) } : undefined}
            onDragLeave={() => setDropOver(cur => cur === b.id ? null : cur)}
            onDrop={canWrite ? (e) => dropOnFolder(e, b) : undefined}>
            <ChevronRight className="size-3 text-muted-foreground" />
            <Link href={`/folders?id=${b.id}`} className={`rounded px-1 py-0.5 ${dropOver === b.id ? 'bg-primary/15 text-primary' : String(b.id) === String(currentId) ? 'bg-muted font-semibold' : 'text-muted-foreground hover:bg-muted'}`}>{b.name}</Link>
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={catFilter ? 'Search in this category…' : 'Search in My Files…'} className="w-full bg-transparent text-sm outline-none" />
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-600">{error}</p>}
      {sessionExpired && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5">
          <p className="min-w-0 flex-1 text-xs font-semibold text-amber-700">Session expired — your login lasted 7 days. Your files are safe.</p>
          <Link href="/auth" className="shrink-0 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white">Log in</Link>
        </div>
      )}
      {(!online || offlineNote) && (
        <p className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs font-semibold text-amber-700">
          <WifiOff className="size-3.5 shrink-0" />
          {!online ? 'Offline — showing your saved folders. Pinned files still open.' : 'Showing saved folders (couldn’t reach server). Pinned files still open.'}
        </p>
      )}
      {queuedCount > 0 && online && (
        <button onClick={retryQueuedUploads} className="flex items-center gap-1.5 rounded-xl border p-2.5 text-left text-xs font-semibold text-muted-foreground hover:bg-muted">
          <Upload className="size-3.5 shrink-0" />
          {queuedCount} change{queuedCount > 1 ? 's' : ''} waiting to sync — tap to retry now.
        </button>
      )}
      {!canWrite && !catFilter && <p className="rounded-xl border p-2.5 text-xs text-muted-foreground">Viewer access — you can open files but not change anything.</p>}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-muted" />)}</div>
      ) : catFilter ? (
        <section className="space-y-2">
          <h2 className="text-sm font-bold">{catFiles.length} items</h2>
          {catFilter === 'pdf' ? (
            <BookGrid items={catFiles.map(n => ({ ...n, kind: 'pdf' }))} />
          ) : (
            <div className={view === 'grid' ? 'grid grid-cols-2 gap-2' : 'divide-y divide-border'}>
              {catFiles.map(n => (
                <FileRow key={n.id} node={n} view={view} selectMode={false} checked={false} pinned={isPinned(n.id)}
                  onToggle={() => {}} onMenu={() => setMenuNode(n)} onDetails={() => setDetailsNode(n)} onPlay={playNode} onRead={(node) => setReadingNode(node)} />
              ))}
            </div>
          )}
          {catFiles.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No files in this category yet. Upload to add the first one.</p>}
        </section>
      ) : (
        <>
          {!currentId && !q.trim() && (
            <section className="space-y-2">
              <h2 className="px-1 text-sm font-bold text-muted-foreground">Categories</h2>
              <div className="rounded-2xl bg-muted/60 p-3">
                <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                  {CATS.map(c => (
                    <button key={c.id} onClick={() => setCatFilter(c.id)} className="flex flex-col items-center gap-1.5 text-center hover:opacity-80">
                      <span className={`flex size-12 shrink-0 items-center justify-center rounded-full ${c.tint}`}><c.Icon className="size-6" /></span>
                      <span className="block w-full truncate text-xs font-medium">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section className="space-y-1">
            <h2 className="px-1 text-sm font-bold text-muted-foreground">{currentId ? (data.node?.name || 'Folder') : 'Internal storage'} <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{folders.length + files.length}</span></h2>
            {folders.length + files.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center">
                <Folder className="mx-auto size-8 text-[#EDB600] dark:text-amber-300" fill="currentColor" stroke="currentColor" />
                <p className="mt-2 text-sm font-semibold">Empty folder</p>
                <p className="text-xs text-muted-foreground">{canWrite ? 'Create a folder, upload, or save study content here. Uploads are public by default and appear in Search.' : 'Nothing here yet.'}</p>
              </div>
            ) : (
              <div className={view === 'grid' ? 'grid grid-cols-2 gap-2' : 'divide-y divide-border'}>
                {[...folders, ...files].map(n => (
                  n.kind === 'folder' ? (
                    <FolderRow key={n.id} node={n} view={view} selectMode={selectMode} checked={selected.includes(n.id)}
                      onToggle={() => toggleSelect(n.id)} onOpen={() => (selectMode ? toggleSelect(n.id) : go(n.id))}
                      onMenu={() => setMenuNode(n)} onDetails={() => setDetailsNode(n)}
                      draggable={canWrite && !selectMode} onDragStart={(e) => dragStart(e, n)} onDragEnd={() => { setDragIds([]); setDropOver(null) }}
                      onDragOver={(e) => { e.preventDefault(); setDropOver(n.id) }} onDragLeave={() => setDropOver(cur => cur === n.id ? null : cur)}
                      onDrop={(e) => dropOnFolder(e, n)} isDropTarget={dropOver === n.id} isDragging={dragIds.includes(n.id)} />
                  ) : (
                    <FileRow key={n.id} node={n} view={view} selectMode={selectMode} checked={selected.includes(n.id)} pinned={isPinned(n.id)}
                      onToggle={() => toggleSelect(n.id)} onMenu={() => setMenuNode(n)} onDetails={() => setDetailsNode(n)} onPlay={playNode} onRead={(node) => setReadingNode(node)}
                      draggable={canWrite && !selectMode} onDragStart={(e) => dragStart(e, n)} onDragEnd={() => { setDragIds([]); setDropOver(null) }}
                      isDragging={dragIds.includes(n.id)} />
                  )
                ))}
              </div>
            )}
          </section>

          {!currentId && !!data.shared?.length && (
            <section className="space-y-1">
              <h2 className="flex items-center gap-1.5 px-1 text-sm font-bold"><Users className="size-4" /> Shared with me</h2>
              <div className="divide-y divide-border">
                {data.shared.map(s => (
                  <button key={s.id} onClick={() => go(s.id)} className="flex w-full items-center gap-3 px-1 py-2.5 text-left hover:bg-muted/50">
                    <Folder className="size-7 shrink-0 text-[#EDB600] dark:text-amber-300" fill="currentColor" stroke="currentColor" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">{s.name}</span>
                      <span className="block text-xs text-muted-foreground">{s.sharedRole === 'editor' ? 'Can edit' : 'Can view'}</span>
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-40 mx-auto flex w-full max-w-md items-center gap-2 px-4">
          <div className="flex w-full items-center gap-1.5 rounded-2xl border bg-background p-2 shadow-xl">
            <span className="px-1 text-xs font-bold">{selected.length}</span>
            {canWrite && <button onClick={() => { setMoveTargets(data.children.filter(c => selected.includes(c.id))); setMoveBrowseId(currentId); loadMoveBrowse(currentId) }} className="rounded-lg bg-muted px-2.5 py-1.5 text-xs font-bold">Move</button>}
            {canWrite && <button onClick={() => doCopy(selected)} className="rounded-lg bg-muted px-2.5 py-1.5 text-xs font-bold">Copy</button>}
            <button onClick={() => { const n = data.children.find(c => selected.includes(c.id)); if (n) shareFile(n) }} className="rounded-lg bg-muted px-2.5 py-1.5 text-xs font-bold">Share</button>
            {canWrite && <button onClick={() => setDeleteTargets(data.children.filter(c => selected.includes(c.id)))} className="rounded-lg bg-red-100 px-2.5 py-1.5 text-xs font-bold text-red-700">Delete</button>}
            <button onClick={() => { setSelected([]); setSelectMode(false) }} className="ml-auto rounded-lg px-2 py-1.5 text-xs text-muted-foreground">Clear</button>
          </div>
        </div>
      )}

      {canWrite && !catFilter && (
        <div className="fixed inset-x-0 bottom-36 z-40 mx-auto flex w-full max-w-md justify-end px-4">
          <button onClick={() => setNewOpen(true)} aria-label="New" className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90">
            <Plus className="size-5" />
          </button>
        </div>
      )}
      <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />

      {sortOpen && (
        <Sheet onClose={() => setSortOpen(false)} title="Sort by">
          <div className="space-y-1">
            {[['name', 'Name (A–Z)'], ['newest', 'Date (newest)'], ['oldest', 'Date (oldest)'], ['size', 'Size (largest)'], ['type', 'Type']].map(([v, label]) => (
              <button key={v} onClick={() => { setSort(v); setSortOpen(false) }} className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm ${sort === v ? 'bg-muted font-bold' : 'hover:bg-muted'}`}>{label}</button>
            ))}
          </div>
        </Sheet>
      )}

      {newOpen && (
        <Sheet onClose={() => setNewOpen(false)} title="Create new">
          <div className="space-y-2">
            <div className="flex gap-2">
              <input value={folderName} onChange={e => setFolderName(e.target.value)} placeholder="Folder name" className="w-full rounded-xl border px-3 py-2 text-sm outline-none" />
              <button onClick={createFolder} disabled={busy} className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">Create</button>
            </div>
            <div className="space-y-1 pt-1">
              <button onClick={() => openLinkSheet('video')} className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left hover:bg-muted/60">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100"><Youtube className="size-5 text-red-600" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold">Add video</span><span className="block truncate text-xs text-muted-foreground">Paste a YouTube link</span></span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
              <button onClick={() => { setNewOpen(false); fileRef.current?.click() }} className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left hover:bg-muted/60">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100"><Upload className="size-5 text-emerald-600" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold">Upload file</span><span className="block truncate text-xs text-muted-foreground">PDF, photo, audio from this device</span></span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
              <button onClick={() => { setNewOpen(false); setNoteTypeOpen(true) }} className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left hover:bg-muted/60">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100"><NotebookPen className="size-5 text-amber-600" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold">Make note</span><span className="block truncate text-xs text-muted-foreground">Write, scan paper, or AI-draft</span></span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
              <Link href={quizHref} className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left hover:bg-muted/60">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100"><GraduationCap className="size-5 text-violet-600" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold">Make quiz</span><span className="block truncate text-xs text-muted-foreground">{courseCode ? `For ${courseCode}` : 'Pick a course first'}</span></span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
              <Link href={gamesHref} className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left hover:bg-muted/60">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-100"><Gamepad2 className="size-5 text-sky-600" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold">Make game</span><span className="block truncate text-xs text-muted-foreground">Turn study into play</span></span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
              <button onClick={() => openLinkSheet('link')} className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left hover:bg-muted/60">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-200"><LinkIcon className="size-5 text-slate-600" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold">Add link</span><span className="block truncate text-xs text-muted-foreground">Save any URL here</span></span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
              <button onClick={() => { setNewOpen(false); setMoreOpen(true) }} className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left hover:bg-muted/60">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted"><MoreHorizontal className="size-5 text-muted-foreground" /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold">More</span><span className="block truncate text-xs text-muted-foreground">Contribute, browse uploads…</span></span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Uploads are public by default — they are stored centrally and appear in Search for everyone.</p>
          </div>
        </Sheet>
      )}

      {menuNode && !detailsNode && (
        <Sheet onClose={() => setMenuNode(null)} title={menuNode.name}>
          <div className="space-y-1">
            {menuNode && isPlayableMedia(menuNode) && <button onClick={() => { playNode(menuNode); setMenuNode(null) }} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-sky-600">Play</button>}
            {(menuNode.itemKind || menuNode.kind) === 'pdf' && (menuNode.href || menuNode.url) && <Link href={readHref(menuNode.href || menuNode.url, menuNode.name)} className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-sky-600">Read</Link>}
            {menuNode.href && !isPlayableMedia(menuNode) && (menuNode.itemKind || menuNode.kind) !== 'pdf' && !String(menuNode.id).startsWith('m-') && <Link href={menuNode.href} className="block rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-muted">Open</Link>}
            {menuNode.href && !isPlayableMedia(menuNode) && (menuNode.itemKind || menuNode.kind) !== 'pdf' && String(menuNode.id).startsWith('m-') && <a href={menuNode.href} target="_blank" rel="noreferrer" className="block rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-muted">Open</a>}
            {menuNode.kind === 'folder' && <button onClick={() => { go(menuNode.id); setMenuNode(null) }} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-muted">Open folder</button>}
            <button onClick={() => { setDetailsNode(menuNode); setMenuNode(null) }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-muted"><Info className="size-4" /> Details</button>
            {(menuNode.href || menuNode.url) && <button onClick={() => shareFile(menuNode)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-muted"><Share2 className="size-4" /> Share (copy link)</button>}
            {canWrite && !String(menuNode.id).startsWith('m-') && <button onClick={() => { setRenameTarget(menuNode); setRenameValue(menuNode.name); setMenuNode(null) }} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-muted">Rename</button>}
            {canWrite && <button onClick={() => { const id = menuNode.id; setMenuNode(null); doCopy([id]) }} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-muted">Make a copy</button>}
            {canWrite && !String(menuNode.id).startsWith('m-') && <button onClick={() => { setMoveTargets([menuNode]); setMenuNode(null); setMoveBrowseId(currentId); loadMoveBrowse(currentId) }} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-muted">Move</button>}
            {menuNode.kind === 'folder' && !String(menuNode.id).startsWith('m-') && <button onClick={() => openShare(menuNode)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-muted"><Users className="size-4" /> Share folder</button>}
            {canWrite && <button onClick={() => { setDeleteTargets([menuNode]); setMenuNode(null) }} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50">Delete</button>}
          </div>
        </Sheet>
      )}

      {detailsNode && (
        <Sheet onClose={() => setDetailsNode(null)} title="Details">
        <DetailsBody node={detailsNode} materials={materials} canWrite={canWrite}
          pinned={isPinned(detailsNode.id)} pinBusy={pinBusy === String(detailsNode.id)}
          onTogglePin={() => togglePin(detailsNode)}
          onSaveNote={(content) => saveNoteContent(detailsNode, content)}
          onRead={(node) => { setDetailsNode(null); setReadingNode(node) }}
          onPublish={() => publishNote(detailsNode)}
          courseCode={courseCode}
          onShare={() => shareFile(detailsNode)}
          onTogglePublic={(sharedCount) => togglePublic(detailsNode, sharedCount)}
          onOpenShare={() => openShare(detailsNode)} />
        </Sheet>
      )}

      {playingNode && (
        <VideoModal
          item={{
            url: playingNode.url || playingNode.href || null,
            title: playingNode.name || 'Video',
            subtitle: playingNode.courseCode || playingNode.subtitle || null,
            kind: (playingNode.itemKind || playingNode.kind) === 'audio' ? 'audio' : 'video',
            id: playingNode.id,
            href: playingNode.href || playingNode.url || null,
            courseCode: playingNode.courseCode || null,
          }}
          onClose={() => setPlayingNode(null)}
        />
      )}

      {readingNode && (
        <NoteReader
          title={readingNode.name || 'Note'}
          subtitle={readingNode.courseCode || readingNode.subtitle || null}
          html={readingNode.content}
          template={readingNode.color}
          savePayload={{
            name: readingNode.name, itemKind: 'notes',
            refId: String(readingNode.id || ''),
            href: null, url: null,
            courseCode: readingNode.courseCode || null, subtitle: readingNode.subtitle || null,
          }}
          extraActions={(readingNode.courseCode || courseCode) && !!readingNode.content && (
            <button onClick={() => publishNote(readingNode)} aria-label="Send to course bank" title={`Send to ${readingNode.courseCode || courseCode} bank`}
              className="flex size-8 items-center justify-center rounded-lg hover:bg-muted">
              <Send className="size-4" />
            </button>
          )}
          onClose={() => setReadingNode(null)}
        />
      )}

      {renameTarget && (
        <Sheet onClose={() => setRenameTarget(null)} title="Rename">
          <div className="flex gap-2">
            <input value={renameValue} onChange={e => setRenameValue(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm outline-none" />
            <button onClick={doRename} disabled={busy} className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">Save</button>
          </div>
        </Sheet>
      )}

      {deleteTargets.length > 0 && (
        <Sheet onClose={() => setDeleteTargets([])} title="Delete?">
          <p className="text-sm text-muted-foreground">This will permanently delete {deleteTargets.length} item{deleteTargets.length > 1 ? 's' : ''}{deleteTargets.some(t => t.kind === 'folder') ? ' including everything inside folders' : ''}. Central public files stay in Search until their owner deletes the upload. This cannot be undone.</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setDeleteTargets([])} className="flex-1 rounded-xl border py-2 text-sm font-semibold">Cancel</button>
            <button onClick={doDelete} disabled={busy} className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-bold text-white disabled:opacity-50">Delete</button>
          </div>
        </Sheet>
      )}

      {moveTargets.length > 0 && (
        <Sheet onClose={() => { setMoveTargets([]); setMoveBrowse(null) }} title={`Move ${moveTargets.length} item${moveTargets.length > 1 ? 's' : ''}`}>
          <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
            <button onClick={() => loadMoveBrowse(null)} className="font-bold text-foreground">My Files</button>
            {(moveBrowse?.breadcrumb || []).map(b => (
              <span key={b.id} className="flex items-center gap-1"><ChevronRight className="size-3" /><button onClick={() => loadMoveBrowse(b.id)}>{b.name}</button></span>
            ))}
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {(moveBrowse?.children || []).filter(c => c.kind === 'folder' && !moveTargets.some(t => String(t.id) === String(c.id))).map(f => (
              <button key={f.id} onClick={() => loadMoveBrowse(f.id)} className="flex w-full items-center gap-2 rounded-xl border p-2.5 text-left text-sm hover:bg-muted">
                <Folder className="size-4 text-amber-500 dark:text-amber-300" fill="currentColor" stroke="currentColor" /><span className="flex-1 truncate font-semibold">{f.name}</span><ChevronRight className="size-4 text-muted-foreground" />
              </button>
            ))}
            {((moveBrowse?.children || []).filter(c => c.kind === 'folder').length === 0) && <p className="py-3 text-center text-xs text-muted-foreground">No subfolders here.</p>}
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => loadMoveBrowse(moveBrowse?.node?.parentId || null)} className="flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold"><ChevronLeft className="size-3" /> Up</button>
            <button onClick={doMove} disabled={busy} className="flex-1 rounded-xl bg-primary py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">Move here</button>
          </div>
        </Sheet>
      )}

      {linkOpen && (
        <Sheet onClose={() => { setLinkOpen(false); setLinkMeta(null); lastLinkFetched.current = '' }} title={linkMode === 'video' ? 'Add video' : 'New link'}>
          <div className="space-y-2">
            {linkMode === 'video' && (
              <p className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                <Youtube className="size-4 shrink-0" /> Videos are YouTube links — paste one below, no file upload needed.
              </p>
            )}
            <input value={linkUrl}
              onChange={e => { const nv = e.target.value; setLinkUrl(nv); if (linkMeta && nv.trim() !== (linkMeta.url || '')) { setLinkMeta(null); if (linkName === (linkMeta.title || '')) setLinkName('') } }}
              onPaste={e => { const v = (e.clipboardData?.getData('text') || '').trim(); if (v) setTimeout(() => lookupLink(v), 50) }}
              placeholder={linkMode === 'video' ? 'Paste YouTube link…' : 'Paste YouTube link or https://…'}
              inputMode="url" className="w-full rounded-xl border px-3 py-2 text-sm outline-none" />
            {(linkFetching || linkMeta) && (
              <div className="flex items-center gap-2 rounded-xl bg-muted/60 p-2">
                {linkFetching ? (
                  <span className="flex items-center gap-1.5 px-1 text-xs font-semibold text-muted-foreground"><Loader2 className="size-3.5 animate-spin" /> Reading title…</span>
                ) : (
                  <>
                    {(linkMeta.thumb || ytThumb(linkMeta.url || linkUrl)) && (
                      <img src={linkMeta.thumb || ytThumb(linkMeta.url || linkUrl)} alt="" loading="lazy" className="h-12 w-20 shrink-0 rounded-lg object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold">{linkMeta.title || 'YouTube video'}</p>
                      {linkMeta.author && <p className="truncate text-[11px] text-muted-foreground">by {linkMeta.author}</p>}
                      <p className="text-[11px] font-bold text-emerald-600">Saves under Videos ✓</p>
                    </div>
                  </>
                )}
              </div>
            )}
            <input value={linkName} onChange={e => setLinkName(e.target.value)} placeholder={isYouTubeUrl(linkUrl) ? 'Video title… (auto-filled, editable)' : 'Name (optional)'} className="w-full rounded-xl border px-3 py-2 text-sm outline-none" />
            <button onClick={createLink} disabled={busy} className="w-full rounded-xl bg-primary py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">Save {isYouTubeUrl(linkUrl) ? 'video' : 'link'}</button>
            {isYouTubeUrl(linkUrl) && <p className="text-[11px] text-muted-foreground">YouTube videos stream — they need internet and can’t be saved offline.</p>}
          </div>
        </Sheet>
      )}

      {noteTypeOpen && (
        <Sheet onClose={() => setNoteTypeOpen(false)} title="Make note">
          <div className="space-y-1">
            <button onClick={() => openNoteEditor()} className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left hover:bg-muted/60">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100"><NotebookPen className="size-5 text-amber-600" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold">Write it yourself</span><span className="block truncate text-xs text-muted-foreground">Full editor, your words</span></span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
            <button disabled className="flex w-full cursor-not-allowed items-center gap-3 rounded-2xl border p-3 text-left opacity-50">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100"><ScanLine className="size-5 text-emerald-600" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold">Scan paper note</span><span className="block truncate text-xs text-muted-foreground">Paused — accuracy isn’t good enough yet</span></span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
            <button disabled className="flex w-full cursor-not-allowed items-center gap-3 rounded-2xl border p-3 text-left opacity-50">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100"><Mic className="size-5 text-red-600" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold">Take note for me <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">Coming soon</span></span><span className="block truncate text-xs text-muted-foreground">Listens and types as they speak</span></span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </div>
        </Sheet>
      )}

      {noteOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-background">
          <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 pb-4 pt-4">
            <div className="mb-3 flex items-center gap-1">
              <button onClick={() => setNoteOpen(false)} aria-label="Close" className="flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-muted"><X className="size-4" /></button>
              <h2 className="min-w-0 flex-1 truncate text-base font-black">New note</h2>
              {(liveStatus === 'listening' || liveStatus === 'paused') && (
                <span className="shrink-0 text-[11px] font-bold text-muted-foreground">
                  {liveStatus === 'listening' && <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-red-500" />}{formatElapsed(liveElapsed)}
                </span>
              )}
              {noteDraftId && liveStatus === 'idle' && <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">Draft saved ✓</span>}
              <button onClick={() => setNoteTemplate(t => nextTemplate(t))} aria-label="Page template"
                title={`Page: ${NOTE_TEMPLATES.find(t => t.id === noteTemplate)?.label || 'Plain'}`}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-muted">
                <Palette className="size-4" />
              </button>
              {/* Live mic hidden while Take-note-for-me is Coming soon. Logic stays for relaunch. */}
              <button onClick={createNote} disabled={busy} aria-label="Save note" title="Save note"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" strokeWidth={3} />}
              </button>
            </div>
            {liveStatus === 'starting' && <p className="mb-2 text-[11px] text-muted-foreground">Connecting…</p>}
            {liveError && <p className="mb-2 text-xs font-semibold text-red-500">{liveError}</p>}
            {(liveSegs.current.length > 0 || liveStatus === 'listening') && (
              <div className="mb-2 rounded-2xl border bg-muted/40 p-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Live transcript{liveStatus === 'listening' ? ' · listening' : ''}
                </p>
                <div ref={liveScrollRef} className="max-h-44 overflow-y-auto">
                  <p className="text-[13px] leading-relaxed">
                    {liveSegs.current.map(s => s.text).join(' ')}
                    {liveStatus === 'listening' && !liveSegs.current.length && (
                      <span className="text-muted-foreground">Listening… words appear here as they speak.</span>
                    )}
                  </p>
                </div>
              </div>
            )}
            {liveStatus === 'listening' && liveQuiet > 10 && (
              <p className="mb-2 text-[11px] font-semibold text-amber-600">Mic sounds quiet — move closer or uncover it.</p>
            )}
            {noteResume && !htmlToText(noteHtml) && !noteTitle.trim() && (
              <div className="mb-2 flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-xs">
                <span className="min-w-0 flex-1 truncate font-semibold">Unfinished: {noteResume.node.name || 'Untitled'}</span>
                <button
                  onClick={() => {
                    setNoteTitle(noteResume.draft.title || '')
                    setNoteHtml(seedLiveSegs(noteResume.draft.html || ''))
                    setNoteTemplate(noteResume.draft.template || 'plain')
                    setLiveLast('')
                    setNoteDraftId(noteResume.node.id)
                    setNoteResume(null)
                  }}
                  className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground">Resume</button>
                <button
                  onClick={() => { deleteNoteDraft(noteResume.node.id); setNoteResume(null) }}
                  aria-label="Discard draft" className="shrink-0 rounded-md p-1 hover:bg-muted"><X className="size-3.5 text-muted-foreground" /></button>
              </div>
            )}
            <input value={noteTitle} onChange={e => setNoteTitle(e.target.value)} placeholder="Title" className="mb-2 w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none" />
            <div className="min-h-0 flex-1">
              <RichTextEditor tall toolbar="bottom" template={noteTemplate} value={noteHtml} onChange={setNoteHtml} placeholder="Start writing…" />
            </div>
          </div>
        </div>
      )}

      {scanOpen && (
        <Sheet onClose={() => setScanOpen(false)} title="Scan paper note">
          <div className="space-y-2">
            <input ref={scanFileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { addScanFiles(e.target.files); e.target.value = '' }} />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setScanOpen(false); setScanCamOpen(true) }} className="flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground">
                <Camera className="size-4" /> Camera
              </button>
              <button onClick={() => scanFileRef.current?.click()} className="flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-bold">
                Choose images
              </button>
            </div>
            {scanFiles.length > 0 && (
              <div className="grid grid-cols-4 gap-1.5">
                {scanFiles.map(f => (
                  <span key={f.id} className="relative">
                    {f.url && <img src={f.url} alt="" className="h-20 w-full rounded-lg border object-cover" />}
                    <button onClick={() => removeScanFile(f.id)} aria-label="Remove page"
                      className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/70 text-white">
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {scanProg && (
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground">{scanProg.status}</p>
                {scanProg.progress != null && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${scanProg.progress}%` }} />
                  </div>
                )}
              </div>
            )}
            {scanError && <p className="text-xs font-semibold text-red-500">{scanError}</p>}
            <button onClick={runScan} disabled={scanBusy || !scanFiles.length} className="w-full rounded-xl bg-emerald-600 py-2 text-sm font-bold text-white disabled:opacity-50">
              {scanBusy ? 'Reading…' : scanFiles.length > 1 ? `Extract ${scanFiles.length} pages` : 'Extract text'}
            </button>
            <p className="text-[11px] text-muted-foreground">Reads on this phone — no upload, no cost. First run downloads the reader (once), then it works offline. Fit each page in the frame; you review before saving.</p>
          </div>
        </Sheet>
      )}

      {scanCamOpen && (
        <ScanCamera
          onDone={(files) => { setScanCamOpen(false); addScanFiles(files); setScanOpen(true) }}
          onClose={() => { setScanCamOpen(false); setScanOpen(true) }}
        />
      )}

      {moreOpen && (
        <Sheet onClose={() => setMoreOpen(false)} title="More">
          <div className="space-y-1">
            <Link href="/contribute" className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left hover:bg-muted/60">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100"><Users className="size-5 text-indigo-600" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold">Contribute to a course</span><span className="block truncate text-xs text-muted-foreground">Videos, PDFs, quizzes for review</span></span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
            <Link href="/search" className="flex w-full items-center gap-3 rounded-2xl border p-3 text-left hover:bg-muted/60">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-100"><Search className="size-5 text-teal-600" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-bold">Browse uploads</span><span className="block truncate text-xs text-muted-foreground">Everything public in Search</span></span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </div>
        </Sheet>
      )}

      {shareTarget && (
        <Sheet onClose={() => setShareTarget(null)} title={`Share “${shareTarget.name}”`}>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input value={shareEmail} onChange={e => setShareEmail(e.target.value)} placeholder="email@example.com" className="w-full rounded-xl border px-3 py-2 text-sm outline-none" />
              <select value={shareRole} onChange={e => setShareRole(e.target.value)} className="rounded-xl border px-2 py-2 text-sm">
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
            </div>
            <button onClick={addMember} disabled={busy} className="w-full rounded-xl bg-primary py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">Add</button>
            <div className="space-y-1">
              {shareRows.map(r => (
                <div key={r.email} className="flex items-center gap-2 rounded-xl border p-2.5">
                  <span className="min-w-0 flex-1 truncate text-sm">{r.email} <span className="text-xs text-muted-foreground">· {r.role}</span></span>
                  <button onClick={() => removeMember(r.email)} className="text-xs font-bold text-red-600">Remove</button>
                </div>
              ))}
              {shareRows.length === 0 && <p className="text-xs text-muted-foreground">Only you have access.</p>}
            </div>
          </div>
        </Sheet>
      )}
    </div>
  )
}

function DetailsBody({ node, materials, canWrite, onShare, onTogglePublic, onOpenShare, pinned, pinBusy, onTogglePin, onSaveNote, onRead, onPublish, courseCode }) {
  const [editingNote, setEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [pubMsg, setPubMsg] = useState('')
  const [pubBusy, setPubBusy] = useState(false)
  useEffect(() => { setPubMsg('') }, [node.id])
  const central = node.materialId ? materials.find(m => String(m.id) === String(node.materialId)) : null
  const sharedCount = central?.uploaders?.length || 1
  const shared = sharedCount > 1
  const mediaUrl = node.url || node.href || central?.url || null
  const mediaKind = node.itemKind || node.kind || central?.itemKind || null
  const isVideo = mediaKind === 'video' || isYouTubeUrl(mediaUrl)
  const isYT = isYouTubeUrl(mediaUrl)
  const pinnable = !String(node.id).startsWith('m-') && node.kind === 'ref' && !!mediaUrl && !isYT && ['pdf', 'image', 'audio', 'video', 'file'].includes(mediaKind || 'file')
  const embed = isVideo ? ytEmbedUrl(mediaUrl) : null
  const thumb = thumbFor({ ...node, url: mediaUrl })
  return (
    <div className="space-y-3">
      {isVideo && mediaUrl && (
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
          {embed ? (
            <iframe
              src={embed}
              title={node.name || 'Video'}
              className="size-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video src={mediaUrl} controls playsInline preload="metadata" poster={thumb || undefined} className="size-full" />
          )}
        </div>
      )}
      <div className="flex items-center gap-3">
        {thumb ? (
          <span className="relative size-12 shrink-0 overflow-hidden rounded-2xl bg-black/80">
            <img src={thumb} alt="" loading="lazy" className="size-full object-cover" />
            {isVideo && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                <Play className="size-5 text-white" fill="currentColor" />
              </span>
            )}
          </span>
        ) : (
          <span className="flex size-12 items-center justify-center rounded-2xl bg-muted">
            {(() => { const I = iconFor(node); return <I className={`size-6 ${tintFor(node)}`} /> })()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{node.name}</p>
          <p className="text-xs text-muted-foreground">{node.itemKind || node.kind}{node.courseCode ? ` · ${node.courseCode}` : ''}</p>
        </div>
        <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${node.isPublic === false ? 'bg-muted text-muted-foreground' : 'bg-emerald-100 text-emerald-700'}`}>
          {node.isPublic === false ? <><Lock className="size-3" /> Private</> : <><Globe className="size-3" /> Public</>}
        </span>
      </div>
      {node.itemKind === 'notes' && (
        <div className="space-y-2">
          {!editingNote && !!node.content && (
            <div className="prose max-h-64 max-w-none overflow-y-auto rounded-xl bg-muted/60 p-3 text-sm dark:prose-invert" style={templateBgStyle(node.color)} dangerouslySetInnerHTML={{ __html: node.content }} />
          )}
          {!editingNote && !node.content && canWrite && (
            <button onClick={() => { setNoteDraft(''); setEditingNote(true) }} className="w-full rounded-xl border border-dashed py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted">
              Write something…
            </button>
          )}
          {!editingNote && !!node.content && canWrite && (
            <button onClick={() => { setNoteDraft(node.content || ''); setEditingNote(true) }} className="w-full rounded-xl border py-2 text-sm font-semibold hover:bg-muted">
              Edit note
            </button>
          )}
          {editingNote && (
            <>
              <RichTextEditor value={noteDraft} onChange={setNoteDraft} placeholder="Write here…" />
              <div className="flex gap-2">
                <button onClick={() => setEditingNote(false)} disabled={noteSaving} className="flex-1 rounded-xl border py-2 text-sm font-semibold disabled:opacity-50">Cancel</button>
                <button
                  onClick={async () => { setNoteSaving(true); try { await onSaveNote?.(noteDraft); setEditingNote(false) } finally { setNoteSaving(false) } }}
                  disabled={noteSaving || !htmlToText(noteDraft)} className="flex-1 rounded-xl bg-primary py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
                  {noteSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {node.itemKind === 'draft' && (
        <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700">
          Unfinished draft — resume it from Make note in its folder.
        </p>
      )}
      <dl className="space-y-1.5 rounded-xl border p-3 text-sm">        {!!(node.size || central?.size) && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Size</dt><dd className="font-semibold">{formatSize(node.size || central?.size)}</dd></div>}
        {!!(node.updatedAt || node.createdAt || central?.createdAt) && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Modified</dt><dd className="font-semibold">{formatDate(node.updatedAt || node.createdAt || central?.createdAt)}</dd></div>}
        {!!(node.courseCode || central?.courseCode) && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Course</dt><dd className="font-semibold">{node.courseCode || central?.courseCode}</dd></div>}
        {!!central?.ownerEmail && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Owner</dt><dd className="max-w-[60%] truncate font-semibold">{central.ownerEmail}</dd></div>}
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Visibility</dt><dd className="font-semibold">{node.isPublic === false ? 'Only people with access' : 'Everyone (in Search)'}</dd></div>
      </dl>
      <div className="grid grid-cols-2 gap-2">
        {(node.itemKind || node.kind) === 'pdf' && mediaUrl && (
          <Link href={readHref(mediaUrl, node.name)} className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-sm font-bold text-primary-foreground">
            <BookOpen className="size-4" /> Read
          </Link>
        )}
        {node.itemKind === 'notes' && node.content && (
          <button onClick={() => onRead?.(node)} className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-sm font-bold text-primary-foreground">
            <BookOpen className="size-4" /> Read
          </button>
        )}
        {node.itemKind === 'notes' && node.content && (node.courseCode || courseCode) && (
          <button
            onClick={async () => { setPubBusy(true); try { const m = await onPublish?.(); if (m) setPubMsg(m) } finally { setPubBusy(false) } }}
            disabled={pubBusy} className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50">
            <Send className="size-4" /> {pubBusy ? 'Sending…' : `Send to ${node.courseCode || courseCode} bank`}
          </button>
        )}
        {pubMsg && <p className="col-span-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">{pubMsg}</p>}
        {(node.href || node.url) && <button onClick={onShare} className="flex items-center justify-center gap-1.5 rounded-xl border py-2 text-sm font-semibold hover:bg-muted"><Share2 className="size-4" /> Copy link</button>}
        {node.kind === 'folder' && canWrite && <button onClick={onOpenShare} className="flex items-center justify-center gap-1.5 rounded-xl border py-2 text-sm font-semibold hover:bg-muted"><Users className="size-4" /> Share</button>}
      </div>
      {node.materialId ? (
        canWrite && (
          <>
            <button onClick={() => onTogglePublic(sharedCount)} className="w-full rounded-xl border py-2 text-sm font-semibold hover:bg-muted">
              {node.isPublic === false ? 'Make public (show in Search)' : 'Make private (hide from Search)'}
            </button>
            {shared && <p className="text-xs text-muted-foreground">Shared file · {sharedCount} people hold a copy. Your rename, move and delete only touch your copy — visibility stays shared while anyone shares it.</p>}
          </>
        )
      ) : (
        node.kind !== 'folder' && canWrite && (
          <button onClick={onTogglePublic} className="w-full rounded-xl border py-2 text-sm font-semibold hover:bg-muted">
            {node.isPublic === false ? 'Make public' : 'Make private'}
          </button>
        )
      )}
      {!node.materialId && node.kind !== 'folder' && <p className="text-xs text-muted-foreground">Visibility for links applies to this folder copy. Central uploads can be toggled from Details.</p>}
      {pinnable && (
        <button onClick={onTogglePin} disabled={pinBusy} className={`flex w-full items-center justify-center gap-1.5 rounded-xl border py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50 ${pinned ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : ''}`}>
          {pinBusy ? <Loader2 className="size-4 animate-spin" /> : pinned ? <CheckCircle2 className="size-4" /> : <Download className="size-4" />}
          {pinned ? 'Available offline ✓ (tap to remove)' : 'Make available offline'}
        </button>
      )}
      {isYT && <p className="text-xs text-muted-foreground">YouTube streams need internet — it can’t be saved offline, but the link itself is always in your folders.</p>}
      {pinned && <p className="text-xs text-muted-foreground">Saved on this device — opens with no mobile data.</p>}
    </div>
  )
}

function Sheet({ title, onClose, children }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-3xl border-t bg-background p-4 pb-8">
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

function FolderRow({ node, view, selectMode, checked, onToggle, onOpen, onMenu, onDetails, draggable, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, isDropTarget, isDragging }) {
  const dropCls = isDropTarget ? 'ring-2 ring-primary bg-primary/10 rounded-xl' : ''
  const dragCls = isDragging ? 'opacity-40' : ''
  if (view === 'grid') {
    return (
      <div draggable={draggable} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
        className={`relative rounded-xl border p-3 ${checked ? 'border-primary bg-primary/5' : ''} ${dropCls} ${dragCls}`}>
        <button onClick={onOpen} className="flex w-full flex-col gap-2 text-left">
          <Folder className="size-8 text-amber-500 dark:text-amber-300" fill="currentColor" stroke="currentColor" />
          <span className="line-clamp-2 text-sm font-semibold">{node.name}</span>
          <span className="text-[11px] text-muted-foreground">{formatDate(node.updatedAt || node.createdAt)}</span>
        </button>
        {selectMode ? (
          <button onClick={onToggle} aria-label="Select" className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-md border bg-background">
            {checked && <span className="text-xs font-black">✓</span>}
          </button>
        ) : (
          <button onClick={onMenu} aria-label="More" className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-lg hover:bg-muted"><MoreVertical className="size-4" /></button>
        )}
      </div>
    )
  }
  return (
    <div draggable={draggable} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      className={`flex items-center gap-1 px-1 py-1 ${checked ? 'bg-primary/5' : ''} ${dropCls} ${dragCls} ${isDropTarget ? 'rounded-xl' : ''}`}>
      {selectMode && <button onClick={onToggle} aria-label="Select" className="flex size-6 shrink-0 items-center justify-center rounded-md border">{checked && <span className="text-xs font-black">✓</span>}</button>}
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 px-1 py-2 text-left hover:bg-muted/50">
        <Folder className="size-7 shrink-0 text-[#EDB600] dark:text-amber-300" fill="currentColor" stroke="currentColor" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">{node.name}{isDropTarget && <span className="ml-1.5 text-[11px] font-bold text-primary">· drop to move here</span>}</span>
          <span className="block text-[11px] text-muted-foreground">{formatDate(node.updatedAt || node.createdAt)}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </button>
      {!selectMode && <button onClick={onMenu} aria-label="More" className="flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted"><MoreVertical className="size-4" /></button>}
    </div>
  )
}

function FileRow({ node, view, selectMode, checked, pinned, onToggle, onMenu, onDetails, onPlay, onRead, draggable, onDragStart, onDragEnd, isDragging }) {
  const Icon = iconFor(node)
  const href = node.href || node.url || null
  const stale = !href && !String(node.id).startsWith('m-')
  const meta = metaLine(node)
  const thumb = thumbFor(node)
  const kind = node?.itemKind || node?.kind
  const isVideo = kind === 'video' || isYouTubeUrl(href)
  const playable = !selectMode && !!onPlay && isPlayableMedia(node)
  const readable = kind === 'pdf' && !!href && !selectMode
  const noteReadable = kind === 'notes' && !!node.content && !selectMode && !!onRead
  const inner = (
    <>
      {thumb ? (
        <span className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-black/80">
          <img src={thumb} alt="" loading="lazy" className="size-full object-cover" />
          {isVideo && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/25">
              <Play className="size-4 text-white" fill="currentColor" />
            </span>
          )}
        </span>
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted"><Icon className={`size-5 ${tintFor(node)}`} /></span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{node.name}{stale && <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">missing</span>}{pinned && <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">offline</span>}</span>
        {!!meta && <span className="block truncate text-[11px] text-muted-foreground">{meta}{node.subtitle && node.subtitle !== meta ? ` · ${node.subtitle}` : ''}</span>}
        {!meta && node.subtitle && <span className="block truncate text-[11px] text-muted-foreground">{node.subtitle}</span>}
      </span>
    </>
  )
  if (view === 'grid') {
    return (
      <div draggable={draggable} onDragStart={onDragStart} onDragEnd={onDragEnd}
        className={`relative rounded-xl border p-3 ${checked ? 'border-primary bg-primary/5' : ''} ${isDragging ? 'opacity-40' : ''}`}>
        {playable ? (
          <button onClick={() => onPlay(node)} className="flex w-full flex-col gap-2 text-left">{inner}</button>
        ) : readable ? (
          <Link href={readHref(href, node.name)} className="flex w-full flex-col gap-2 text-left">{inner}</Link>
        ) : noteReadable ? (
          <button onClick={() => onRead(node)} className="flex w-full flex-col gap-2 text-left">{inner}</button>
        ) : href && !selectMode ? (
          String(node.id).startsWith('m-') ? <a href={href} target="_blank" rel="noreferrer" className="flex flex-col gap-2">{inner}</a>
          : <Link href={href} className="flex flex-col gap-2">{inner}</Link>
        ) : (
          <button onClick={onDetails || onToggle} className="flex w-full flex-col gap-2 text-left">{inner}</button>
        )}
        {selectMode ? (
          <button onClick={onToggle} aria-label="Select" className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-md border bg-background">{checked && <span className="text-xs font-black">✓</span>}</button>
        ) : (
          <button onClick={onMenu} aria-label="More" className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-lg hover:bg-muted"><MoreVertical className="size-4" /></button>
        )}
      </div>
    )
  }
  return (
    <div draggable={draggable} onDragStart={onDragStart} onDragEnd={onDragEnd}
      className={`flex items-center gap-1 px-1 py-1 ${checked ? 'bg-primary/5' : ''} ${isDragging ? 'opacity-40' : ''}`}>
      {selectMode && <button onClick={onToggle} aria-label="Select" className="flex size-6 shrink-0 items-center justify-center rounded-md border">{checked && <span className="text-xs font-black">✓</span>}</button>}
      <button onClick={onDetails || (() => {})} className="flex min-w-0 flex-1 items-center gap-3 px-1 py-2 text-left hover:bg-muted/50" title="Details">
        {inner}
      </button>
      {playable ? (
        <button onClick={() => onPlay(node)} className="shrink-0 px-1 py-1 text-[12px] font-semibold text-sky-600">Play</button>
      ) : readable ? (
        <Link href={readHref(href, node.name)} className="shrink-0 px-1 py-1 text-[12px] font-semibold text-sky-600">Read</Link>
      ) : noteReadable ? (
        <button onClick={() => onRead(node)} className="shrink-0 px-1 py-1 text-[12px] font-semibold text-sky-600">Read</button>
      ) : href && !selectMode && (
        String(node.id).startsWith('m-') ? <a href={href} target="_blank" rel="noreferrer" className="shrink-0 px-1 py-1 text-[12px] font-semibold text-sky-600">Open</a>
        : <Link href={href} className="shrink-0 px-1 py-1 text-[12px] font-semibold text-sky-600">Open</Link>
      )}
      {!selectMode && <button onClick={onMenu} aria-label="More" className="flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted"><MoreVertical className="size-4" /></button>}
    </div>
  )
}
