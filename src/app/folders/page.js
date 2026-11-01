'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Search, Folder, FileText, Files, PlayCircle, Headphones, BookOpen, ClipboardList,
  ChevronRight, ChevronLeft, Plus, LayoutGrid, List, CheckSquare, X, Link as LinkIcon,
  Users, MoreVertical, Upload, Gamepad2, GraduationCap, Image as ImageIcon,
  ArrowLeft, ArrowUpDown, Info, Share2, Globe, Lock,
} from 'lucide-react'
import { getToken } from '@/lib/auth'
import BookGrid from '@/components/BookGrid'

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
    case 'folder': return 'text-amber-500'
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
  const [linkName, setLinkName] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [shareTarget, setShareTarget] = useState(null)
  const [shareRows, setShareRows] = useState([])
  const [shareEmail, setShareEmail] = useState('')
  const [shareRole, setShareRole] = useState('viewer')
  const [menuNode, setMenuNode] = useState(null)
  const [detailsNode, setDetailsNode] = useState(null)
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
      // Central public store for categories (best-effort).
      try {
        const m = await fetch('/api/materials?limit=50').then(r => r.json())
        if (Array.isArray(m)) setMaterials(m)
      } catch {}
    } catch (e) {
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

  const catCounts = {
    image: materials.filter(m => m.itemKind === 'image').length + files.filter(f => f.itemKind === 'image').length,
    video: materials.filter(m => m.itemKind === 'video').length + files.filter(f => f.itemKind === 'video').length,
    audio: materials.filter(m => m.itemKind === 'audio').length + files.filter(f => f.itemKind === 'audio').length,
    pdf: materials.filter(m => m.itemKind === 'pdf').length + files.filter(f => f.itemKind === 'pdf').length,
    quiz: files.filter(f => f.itemKind === 'quiz').length,
    theory: files.filter(f => f.itemKind === 'theory').length,
    notes: materials.filter(m => m.itemKind === 'notes').length + files.filter(f => f.itemKind === 'notes').length,
    link: files.filter(f => f.itemKind === 'link').length,
  }
  const catFiles = catFilter
    ? sortNodes([
        ...files.filter(f => f.itemKind === catFilter),
        ...materials
          .filter(m => m.itemKind === catFilter)
          .map(m => ({ id: `m-${m.id}`, kind: 'ref', name: m.title, itemKind: m.itemKind, href: m.url, url: m.url, size: m.size, courseCode: m.courseCode, subtitle: `${m.courseCode || 'Uploads'} · Public`, updatedAt: m.createdAt, isPublic: true, central: true })),
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

  async function createLink() {
    if (busy) return
    if (!linkUrl.trim()) { setError('Paste a URL first'); return }
    setBusy(true)
    try {
      await api('/api/library', {
        method: 'POST',
        body: JSON.stringify({ kind: 'ref', name: linkName.trim() || linkUrl.trim(), parentId: currentId, itemKind: 'link', href: linkUrl.trim(), url: linkUrl.trim() }),
      })
      setLinkName('')
      setLinkUrl('')
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
      const up = await fetch('/api/upload', { method: 'POST', headers: { ...authHeaders() }, body: form })
      const ud = await up.json()
      if (!up.ok) throw new Error(ud.error || 'Upload failed')
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

  // Visibility is per-user metadata: your toggle only ever flips YOUR copy.
  // The shared file goes public when anyone shares it, and stays public
  // while anyone still shares it — one user's toggle never hides or
  // exposes another user's copy.
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
        {data.breadcrumb.map(b => (
          <span key={b.id} className="flex shrink-0 items-center gap-1">
            <ChevronRight className="size-3 text-muted-foreground" />
            <Link href={`/folders?id=${b.id}`} className={`rounded px-1 py-0.5 ${String(b.id) === String(currentId) ? 'bg-muted font-semibold' : 'text-muted-foreground hover:bg-muted'}`}>{b.name}</Link>
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={catFilter ? 'Search in this category…' : 'Search in My Files…'} className="w-full bg-transparent text-sm outline-none" />
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-600">{error}</p>}
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
                <FileRow key={n.id} node={n} view={view} selectMode={false} checked={false}
                  onToggle={() => {}} onMenu={() => setMenuNode(n)} onDetails={() => setDetailsNode(n)} />
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
                <Folder className="mx-auto size-8 text-[#EDB600]" fill="currentColor" opacity={0.3} />
                <p className="mt-2 text-sm font-semibold">Empty folder</p>
                <p className="text-xs text-muted-foreground">{canWrite ? 'Create a folder, upload, or save study content here. Uploads are public by default and appear in Search.' : 'Nothing here yet.'}</p>
              </div>
            ) : (
              <div className={view === 'grid' ? 'grid grid-cols-2 gap-2' : 'divide-y divide-border'}>
                {[...folders, ...files].map(n => (
                  n.kind === 'folder' ? (
                    <FolderRow key={n.id} node={n} view={view} selectMode={selectMode} checked={selected.includes(n.id)}
                      onToggle={() => toggleSelect(n.id)} onOpen={() => (selectMode ? toggleSelect(n.id) : go(n.id))}
                      onMenu={() => setMenuNode(n)} onDetails={() => setDetailsNode(n)} />
                  ) : (
                    <FileRow key={n.id} node={n} view={view} selectMode={selectMode} checked={selected.includes(n.id)}
                      onToggle={() => toggleSelect(n.id)} onMenu={() => setMenuNode(n)} onDetails={() => setDetailsNode(n)} />
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
                    <Folder className="size-7 shrink-0 text-[#EDB600]" fill="currentColor" opacity={0.35} />
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
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button onClick={() => { setNewOpen(false); fileRef.current?.click() }} className="flex items-center gap-2 rounded-xl border p-3 text-sm font-semibold hover:bg-muted"><Upload className="size-4" /> Upload file</button>
              <button onClick={() => { setNewOpen(false); setLinkOpen(true) }} className="flex items-center gap-2 rounded-xl border p-3 text-sm font-semibold hover:bg-muted"><LinkIcon className="size-4" /> Add link</button>
              <Link href={quizHref} className="flex items-center gap-2 rounded-xl border p-3 text-sm font-semibold hover:bg-muted"><GraduationCap className="size-4" /> Make quiz</Link>
              <Link href={gamesHref} className="flex items-center gap-2 rounded-xl border p-3 text-sm font-semibold hover:bg-muted"><Gamepad2 className="size-4" /> Make game</Link>
            </div>
            <p className="text-xs text-muted-foreground">Uploads are public by default — they are stored centrally and appear in Search for everyone.</p>
          </div>
        </Sheet>
      )}

      {menuNode && !detailsNode && (
        <Sheet onClose={() => setMenuNode(null)} title={menuNode.name}>
          <div className="space-y-1">
            {menuNode.href && !String(menuNode.id).startsWith('m-') && <Link href={menuNode.href} className="block rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-muted">Open</Link>}
            {menuNode.href && String(menuNode.id).startsWith('m-') && <a href={menuNode.href} target="_blank" rel="noreferrer" className="block rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-muted">Open</a>}
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
          onShare={() => shareFile(detailsNode)}
          onTogglePublic={(sharedCount) => togglePublic(detailsNode, sharedCount)}
          onOpenShare={() => openShare(detailsNode)} />
        </Sheet>
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
                <Folder className="size-4 text-amber-500" /><span className="flex-1 truncate font-semibold">{f.name}</span><ChevronRight className="size-4 text-muted-foreground" />
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
        <Sheet onClose={() => setLinkOpen(false)} title="New link">
          <div className="space-y-2">
            <input value={linkName} onChange={e => setLinkName(e.target.value)} placeholder="Name (optional)" className="w-full rounded-xl border px-3 py-2 text-sm outline-none" />
            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://…" className="w-full rounded-xl border px-3 py-2 text-sm outline-none" />
            <button onClick={createLink} disabled={busy} className="w-full rounded-xl bg-primary py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">Save link</button>
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

function DetailsBody({ node, materials, canWrite, onShare, onTogglePublic, onOpenShare }) {
  const central = node.materialId ? materials.find(m => String(m.id) === String(node.materialId)) : null
  const sharedCount = central?.uploaders?.length || 1
  const shared = sharedCount > 1
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-muted">
          {(() => { const I = iconFor(node); return <I className={`size-6 ${tintFor(node)}`} /> })()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{node.name}</p>
          <p className="text-xs text-muted-foreground">{node.itemKind || node.kind}{node.courseCode ? ` · ${node.courseCode}` : ''}</p>
        </div>
        <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${node.isPublic === false ? 'bg-muted text-muted-foreground' : 'bg-emerald-100 text-emerald-700'}`}>
          {node.isPublic === false ? <><Lock className="size-3" /> Private</> : <><Globe className="size-3" /> Public</>}
        </span>
      </div>
      <dl className="space-y-1.5 rounded-xl border p-3 text-sm">
        {!!(node.size || central?.size) && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Size</dt><dd className="font-semibold">{formatSize(node.size || central?.size)}</dd></div>}
        {!!(node.updatedAt || node.createdAt || central?.createdAt) && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Modified</dt><dd className="font-semibold">{formatDate(node.updatedAt || node.createdAt || central?.createdAt)}</dd></div>}
        {!!(node.courseCode || central?.courseCode) && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Course</dt><dd className="font-semibold">{node.courseCode || central?.courseCode}</dd></div>}
        {!!central?.ownerEmail && <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Owner</dt><dd className="max-w-[60%] truncate font-semibold">{central.ownerEmail}</dd></div>}
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Visibility</dt><dd className="font-semibold">{node.isPublic === false ? 'Only people with access' : 'Everyone (in Search)'}</dd></div>
      </dl>
      <div className="grid grid-cols-2 gap-2">
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

function FolderRow({ node, view, selectMode, checked, onToggle, onOpen, onMenu, onDetails }) {
  if (view === 'grid') {
    return (
      <div className={`relative rounded-xl border p-3 ${checked ? 'border-primary bg-primary/5' : ''}`}>
        <button onClick={onOpen} className="flex w-full flex-col gap-2 text-left">
          <Folder className="size-8 text-amber-500" fill="currentColor" opacity={0.25} />
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
    <div className={`flex items-center gap-1 px-1 py-1 ${checked ? 'bg-primary/5' : ''}`}>
      {selectMode && <button onClick={onToggle} aria-label="Select" className="flex size-6 shrink-0 items-center justify-center rounded-md border">{checked && <span className="text-xs font-black">✓</span>}</button>}
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 px-1 py-2 text-left hover:bg-muted/50">
        <Folder className="size-7 shrink-0 text-[#EDB600]" fill="currentColor" opacity={0.35} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">{node.name}</span>
          <span className="block text-[11px] text-muted-foreground">{formatDate(node.updatedAt || node.createdAt)}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </button>
      {!selectMode && <button onClick={onMenu} aria-label="More" className="flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted"><MoreVertical className="size-4" /></button>}
    </div>
  )
}

function FileRow({ node, view, selectMode, checked, onToggle, onMenu, onDetails }) {
  const Icon = iconFor(node)
  const href = node.href || node.url || null
  const stale = !href && !String(node.id).startsWith('m-')
  const meta = metaLine(node)
  const inner = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted"><Icon className={`size-5 ${tintFor(node)}`} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{node.name}{stale && <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">missing</span>}</span>
        {!!meta && <span className="block truncate text-[11px] text-muted-foreground">{meta}{node.subtitle && node.subtitle !== meta ? ` · ${node.subtitle}` : ''}</span>}
        {!meta && node.subtitle && <span className="block truncate text-[11px] text-muted-foreground">{node.subtitle}</span>}
      </span>
    </>
  )
  if (view === 'grid') {
    return (
      <div className={`relative rounded-xl border p-3 ${checked ? 'border-primary bg-primary/5' : ''}`}>
        {href && !selectMode ? (
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
    <div className={`flex items-center gap-1 px-1 py-1 ${checked ? 'bg-primary/5' : ''}`}>
      {selectMode && <button onClick={onToggle} aria-label="Select" className="flex size-6 shrink-0 items-center justify-center rounded-md border">{checked && <span className="text-xs font-black">✓</span>}</button>}
      <button onClick={onDetails || (() => {})} className="flex min-w-0 flex-1 items-center gap-3 px-1 py-2 text-left hover:bg-muted/50" title="Details">
        {inner}
      </button>
      {href && !selectMode && (
        String(node.id).startsWith('m-') ? <a href={href} target="_blank" rel="noreferrer" className="shrink-0 px-1 py-1 text-[12px] font-semibold text-sky-600">Open</a>
        : <Link href={href} className="shrink-0 px-1 py-1 text-[12px] font-semibold text-sky-600">Open</Link>
      )}
      {!selectMode && <button onClick={onMenu} aria-label="More" className="flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted"><MoreVertical className="size-4" /></button>}
    </div>
  )
}
