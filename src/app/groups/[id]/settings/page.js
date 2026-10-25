'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Palette, Upload, X, Plus, Check, Copy, UserPlus, ShieldCheck, Lock, Globe, Trash2 } from 'lucide-react'
import { getUser, getToken } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import TikTokSheet from '@/components/TikTokSheet'
import GroupProgress from '@/components/GroupProgress'
import LiveRoom from '@/components/LiveRoom'
import ComposerSheet from '@/components/group/ComposerSheet'
import { PostCard } from '../page'
import { toast } from 'sonner'

const COLORS = ['#130f40', '#1a5276', '#7d3c98', '#c0392b', '#27ae60', '#e67e22', '#2c3e50', '#8e44ad', '#1e272e', '#4834d4']

function SettingsContent({ id }) {
  const [user, setUser] = useState(null)
  const [space, setSpace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hubTab, setHubTab] = useState('edit')

  // Edit states
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editColor, setEditColor] = useState(COLORS[0])
  const [editCover, setEditCover] = useState(null)
  const [editCoverPublicId, setEditCoverPublicId] = useState(null)
  const [editPostingPermission, setEditPostingPermission] = useState('everyone')
  const [editVisibility, setEditVisibility] = useState('open')
  const [editMaxSeats, setEditMaxSeats] = useState(8)
  const [editRules, setEditRules] = useState('')
  const [editWhoCanInvite, setEditWhoCanInvite] = useState('members')
  const [editAdmins, setEditAdmins] = useState([])
  const [editSurvey, setEditSurvey] = useState([])
  const [newSurveyQ, setNewSurveyQ] = useState('')
  const [uploadingCover, setUploadingCover] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  // Requests + invites
  const [requests, setRequests] = useState([])
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [invites, setInvites] = useState([])
  const [sendingInvite, setSendingInvite] = useState(false)
  const [copiedCode, setCopiedCode] = useState(null)

  // Reading plan
  const [schedules, setSchedules] = useState([])
  const [showSchedForm, setShowSchedForm] = useState(false)
  const [schedTitle, setSchedTitle] = useState('')
  const [schedAssignee, setSchedAssignee] = useState('all')
  const [schedDue, setSchedDue] = useState('')
  const [savingSched, setSavingSched] = useState(false)

  // Sessions
  const [meetings, setMeetings] = useState([])
  const [showMeetForm, setShowMeetForm] = useState(false)
  const [meetTitle, setMeetTitle] = useState('')
  const [meetAt, setMeetAt] = useState('')
  const [meetDur, setMeetDur] = useState(60)
  const [savingMeet, setSavingMeet] = useState(false)
  const [nowTs, setNowTs] = useState(() => Date.now())

  // Materials
  const [posts, setPosts] = useState([])
  const [showComposer, setShowComposer] = useState(false)
  const [liveOpen, setLiveOpen] = useState(false)

  useEffect(() => {
    const u = getUser()
    setUser(u)
    fetch(`/api/spaces?id=${id}`)
      .then(r => r.json())
      .then(data => {
        setSpace(data)
        if (data && !data.error) initEdits(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!user || !space) return
    const admin = user.email === space.creatorEmail || (space.admins || []).includes(user.email)
    if (admin) loadRequests()
    loadSchedules()
    loadMeetings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space?._id, user?.email])

  useEffect(() => {
    if (hubTab === 'requests') loadRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubTab])

  function initEdits(s) {
    setEditName(s.name || '')
    setEditDescription(s.description || '')
    setEditColor(s.color || COLORS[0])
    setEditCover(s.cover || null)
    setEditCoverPublicId(s.coverPublicId || null)
    setEditPostingPermission(s.postingPermission || 'everyone')
    setEditVisibility(s.visibility || 'open')
    setEditMaxSeats(Math.min(50, Math.max(2, Number(s.maxSeats) || 8)))
    setEditRules(s.rules || '')
    setEditWhoCanInvite(s.whoCanInvite || 'members')
    setEditAdmins(s.admins?.length ? s.admins : [s.creatorEmail].filter(Boolean))
    setEditSurvey(Array.isArray(s.survey) ? s.survey : [])
    setNewSurveyQ('')
    const u = getUser()
    const admin = u && (s.creatorEmail === u.email || (s.admins || []).includes(u.email))
    setHubTab('materials')
    if (u && (s.members || []).includes(u.email)) {
      loadPosts()
    }
  }

  const isMember = !!user && (space?.members || []).includes(user.email)
  const isGroupAdmin = !!user && (user.email === space?.creatorEmail || (space?.admins || []).includes(user.email))
  const canInvite = isMember && (isGroupAdmin || (space?.whoCanInvite || 'members') === 'members')
  const hubTabs = [
    { id: 'materials', label: 'Materials' },
    ...(isGroupAdmin ? [{ id: 'edit', label: 'Edit' }] : []),
    { id: 'members', label: `Members (${(space?.members || []).length})` },
    ...(isGroupAdmin ? [{ id: 'requests', label: `Requests${requests.length ? ` (${requests.length})` : ''}` }] : []),
    { id: 'plan', label: 'Plan' },
    { id: 'sessions', label: 'Sessions' },
  ]

  async function loadPosts() {
    try {
      const res = await fetch(`/api/spaces/${id}/posts`)
      const data = await res.json()
      if (Array.isArray(data)) setPosts(data)
    } catch {}
  }

  async function handleDeletePost(postId) {
    setPosts(prev => prev.filter(p => p._id !== postId))
    try {
      const res = await fetch(`/api/spaces/${id}/posts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ postId }),
      })
      const data = await res.json()
      if (!data.success) loadPosts()
    } catch {
      loadPosts()
    }
  }

  function meetStatus(m) {
    if (!m || m.status === 'ended' || m.status === 'cancelled') return 'ended'
    const start = new Date(m.startsAt).getTime()
    const end = start + (Number(m.durationMin) || 60) * 60000
    if (nowTs < start) return 'upcoming'
    if (nowTs <= end) return 'live'
    return 'ended'
  }

  function countdownTo(m) {
    const diff = new Date(m.startsAt).getTime() - nowTs
    if (diff <= 0) return 'starting...'
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `in ${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `in ${hrs}h${mins % 60 ? ` ${mins % 60}m` : ''}`
    return `in ${Math.floor(hrs / 24)}d ${hrs % 24}h`
  }

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingCover(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('folder', 'gss-quiz/spaces/covers')
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      })
      const data = await res.json()
      if (data.url) {
        setEditCover(data.url)
        setEditCoverPublicId(data.publicId || null)
      }
    } catch {}
    setUploadingCover(false)
  }

  async function handleSaveSettings() {
    if (!editName.trim()) return
    setSavingSettings(true)
    try {
      const res = await fetch('/api/spaces', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ id, name: editName, description: editDescription, cover: editCover, coverPublicId: editCoverPublicId, color: editColor, postingPermission: editPostingPermission, visibility: editVisibility, maxSeats: editMaxSeats, rules: editRules, whoCanInvite: editWhoCanInvite, admins: editAdmins, survey: editSurvey }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Could not save settings')
      const updated = {
        ...space,
        name: editName.trim(), description: editDescription.trim(), cover: editCover,
        color: editColor, postingPermission: editPostingPermission, visibility: editVisibility,
        maxSeats: editMaxSeats, maxSeatsEnforced: true, rules: editRules.trim(),
        whoCanInvite: editWhoCanInvite, admins: editAdmins, survey: editSurvey,
      }
      setSpace(updated)
      toast.success('Group updated!')
    } catch (e) {
      toast.error(e.message || 'Could not save settings')
    }
    setSavingSettings(false)
  }

  async function loadRequests() {
    try {
      const res = await fetch(`/api/spaces/${id}/requests`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json()
      if (Array.isArray(data)) setRequests(data)
    } catch {}
  }

  async function resolveRequest(email, action) {
    try {
      const res = await fetch(`/api/spaces/${id}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ email, action }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setRequests(prev => prev.filter(r => r.email !== email))
      toast.success(action === 'approve' ? 'Member approved!' : 'Request declined')
    } catch (e) {
      toast.error(e.message || 'Could not resolve request')
    }
  }

  async function loadInvites() {
    try {
      const res = await fetch(`/api/spaces/${id}/invites`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json()
      if (Array.isArray(data)) setInvites(data)
    } catch {}
  }

  async function sendInvite() {
    if (!inviteEmail.includes('@')) { toast.error('Enter a valid email'); return }
    setSendingInvite(true)
    try {
      const res = await fetch(`/api/spaces/${id}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setInviteEmail('')
      loadInvites()
      toast.success('Invite sent!')
    } catch (e) {
      toast.error(e.message || 'Could not send invite')
    }
    setSendingInvite(false)
  }

  async function revokeInvite(code) {
    try {
      const res = await fetch(`/api/spaces/${id}/invites`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      loadInvites()
    } catch (e) {
      toast.error(e.message || 'Could not revoke invite')
    }
  }

  function copyInviteLink(code) {
    const link = `${window.location.origin}/groups/${id}?invite=${code}`
    navigator.clipboard?.writeText(link).then(
      () => { setCopiedCode(code); setTimeout(() => setCopiedCode(null), 2000) },
      () => toast.error('Copy failed')
    )
  }

  async function loadSchedules() {
    try {
      const res = await fetch(`/api/spaces/${id}/schedules`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json()
      if (Array.isArray(data)) setSchedules(data)
    } catch {}
  }

  async function saveSchedule() {
    if (!schedTitle.trim()) { toast.error('Give the reading a title'); return }
    setSavingSched(true)
    try {
      const res = await fetch(`/api/spaces/${id}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ title: schedTitle.trim(), assignee: schedAssignee, dueAt: schedDue || null }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setSchedTitle(''); setSchedAssignee('all'); setSchedDue(''); setShowSchedForm(false)
      loadSchedules()
      toast.success('Reading assigned!')
    } catch (e) {
      toast.error(e.message || 'Could not assign reading')
    }
    setSavingSched(false)
  }

  async function toggleSchedule(scheduleId, done) {
    setSchedules(prev => prev.map(s => s._id === scheduleId
      ? { ...s, doneBy: done ? [...(s.doneBy || []), user.email] : (s.doneBy || []).filter(e => e !== user.email) }
      : s))
    try {
      await fetch(`/api/spaces/${id}/schedules`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ scheduleId, action: done ? 'done' : 'undone' }),
      })
    } catch {}
  }

  async function deleteSchedule(scheduleId) {
    setSchedules(prev => prev.filter(s => s._id !== scheduleId))
    try {
      await fetch(`/api/spaces/${id}/schedules`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ scheduleId, action: 'delete' }),
      })
    } catch {}
  }

  async function loadMeetings() {
    try {
      const res = await fetch(`/api/spaces/${id}/meetings`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json()
      if (Array.isArray(data)) setMeetings(data)
    } catch {}
  }

  async function saveMeeting(startNow = false) {
    const startsAt = startNow ? new Date().toISOString() : (meetAt ? new Date(meetAt).toISOString() : null)
    if (!startsAt) { toast.error('Pick a date and time'); return }
    setSavingMeet(true)
    try {
      const res = await fetch(`/api/spaces/${id}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ title: meetTitle.trim() || 'Study session', startsAt, durationMin: meetDur }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMeetTitle(''); setMeetAt(''); setMeetDur(60); setShowMeetForm(false)
      loadMeetings()
      toast.success(startNow ? 'Live session started!' : 'Session scheduled!')
    } catch (e) {
      toast.error(e.message || 'Could not schedule session')
    }
    setSavingMeet(false)
  }

  async function closeMeeting(meetingId, action) {
    setMeetings(prev => prev.map(m => m._id === meetingId ? { ...m, status: 'ended' } : m))
    try {
      await fetch(`/api/spaces/${id}/meetings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ meetingId, action }),
      })
      loadMeetings()
    } catch {}
  }

  const upcomingMeetings = meetings.map(m => ({ ...m, _s: meetStatus(m) })).filter(m => m._s !== 'ended')
  const liveMeeting = meetings.map(m => ({ ...m, _s: meetStatus(m) })).find(m => m._s === 'live')

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col bg-background pb-4">
        <header className="sticky top-0 z-50 flex items-center gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur">
          <Link href={`/groups/${id}`} className="flex size-8 items-center justify-center rounded-lg hover:bg-muted">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="flex-1 text-base font-bold">Group settings</h1>
        </header>
        <div className="mx-auto w-full max-w-2xl space-y-4 px-5 pt-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <header className="sticky top-0 z-50 flex items-center gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur">
          <Link href={`/groups/${id}`} className="flex size-8 items-center justify-center rounded-lg hover:bg-muted">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="flex-1 text-base font-bold">Group settings</h1>
        </header>
        <div className="flex flex-col items-center gap-4 py-16">
          <p className="text-muted-foreground">Not signed in</p>
          <Link href="/auth" className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Sign In</Link>
        </div>
      </div>
    )
  }

  if (!space || space.error || !isMember) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <header className="sticky top-0 z-50 flex items-center gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur">
          <Link href={`/groups/${id}`} className="flex size-8 items-center justify-center rounded-lg hover:bg-muted">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="flex-1 text-base font-bold">Group settings</h1>
        </header>
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-muted-foreground">{!space || space.error ? 'Group not found' : 'Members only'}</p>
          <Link href={`/groups/${id}`} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Back to group</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-4">
      <header className="sticky top-0 z-50 flex items-center gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link href={`/groups/${id}`} className="flex size-8 items-center justify-center rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="flex-1 truncate text-sm font-bold">{isGroupAdmin ? 'Customize Group' : space.name}</h1>
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-4 px-5 pt-4">
        <div className="relative overflow-hidden rounded-xl p-4 text-white"
          style={{ background: `linear-gradient(135deg, ${space.color || '#130f40'}, ${space.color || '#130f40'}cc)` }}
        >
          {space.cover && (
            <div className="absolute inset-0" style={{ background: `url(${space.cover}) center/cover` }} />
          )}
          {space.cover && <div className="absolute inset-0 bg-black/30" />}
          <div className="relative flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/20 text-lg font-bold backdrop-blur-sm">
              {space.name?.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold">{space.name}</h2>
              <p className="text-xs text-white/70">{space.description || 'Study group'}</p>
              {(space.visibility || 'open') !== 'open' && (
                <span className="mt-1 inline-block rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-bold">
                  {space.visibility === 'invite' ? 'Invite only' : 'Approval to join'}
                </span>
              )}
            </div>
            <div className="shrink-0 text-right">
              <div className="text-lg font-bold">{space.memberCount || 0}{space.maxSeatsEnforced ? <span className="text-xs font-medium text-white/60">/{space.maxSeats || 50}</span> : null}</div>
              <div className="text-[10px] text-white/60">members</div>
            </div>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {hubTabs.map(t => (
            <button
              key={t.id}
              onClick={() => setHubTab(t.id)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${hubTab === t.id ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {hubTab === 'materials' && (
        <div className="space-y-3">
          {((space.postingPermission !== 'creator_only') || isGroupAdmin) && (
            <Button className="w-full" onClick={() => setShowComposer(true)}>
              <Plus className="size-4 mr-2" /> Share material
            </Button>
          )}
          {posts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <p className="text-sm">No materials shared yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-xl border overflow-hidden">
              {posts.map(post => (
                <PostCard key={post._id} post={post} user={user} spaceCreator={space.creatorEmail} onDelete={handleDeletePost} />
              ))}
            </div>
          )}
        </div>
        )}

        {hubTab === 'edit' && isGroupAdmin && (
        <div className="space-y-5">
          {/* Cover Preview */}
          <div className="relative h-36 w-full overflow-hidden rounded-xl">
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${editColor}, ${editColor}88)` }}
            />
            {editCover && (
              <div className="absolute inset-0" style={{ background: `url(${editCover}) center/cover` }} />
            )}
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
              <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-white/20 text-lg font-bold backdrop-blur-sm">
                {editName ? editName.slice(0, 2).toUpperCase() : '??'}
              </div>
              <div className="text-sm font-bold">{editName || 'Group Name'}</div>
            </div>
            <label className="absolute bottom-2 right-2 flex size-8 cursor-pointer items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60">
              <Upload className="size-4" />
              <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
            </label>
            {editCover && (
              <button
                onClick={() => setEditCover(null)}
                className="absolute bottom-2 right-12 flex size-8 items-center justify-center rounded-lg bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
              >
                <X className="size-4" />
              </button>
            )}
            {uploadingCover && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                <span className="text-sm text-white font-medium">Uploading...</span>
              </div>
            )}
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Palette className="size-4 text-muted-foreground" />
              Backdrop Color
            </div>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setEditColor(c)}
                  className={`size-8 rounded-full transition-all ${editColor === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Group Name</label>
            <Input
              placeholder="Group name"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              maxLength={60}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="What kind of materials will be shared here?"
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
              rows={3}
              maxLength={300}
            />
          </div>

          {/* Posting Permission */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Who can post</label>
            <div className="flex gap-2">
              <button
                onClick={() => setEditPostingPermission('everyone')}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                  editPostingPermission === 'everyone'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                Everyone
              </button>
              <button
                onClick={() => setEditPostingPermission('creator_only')}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                  editPostingPermission === 'creator_only'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                Only me
              </button>
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Who can join</label>
            {[
              { v: 'open', icon: Globe, title: 'Open', desc: 'Listed publicly, anyone can join instantly' },
              { v: 'approval', icon: ShieldCheck, title: 'Approval', desc: 'Listed publicly, you approve each request' },
              { v: 'invite', icon: Lock, title: 'Invite only', desc: 'Hidden from lists, members join by invite' },
            ].map(opt => {
              const Icon = opt.icon
              const selected = editVisibility === opt.v
              return (
                <button
                  key={opt.v}
                  onClick={() => setEditVisibility(opt.v)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    selected ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                  }`}
                >
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{opt.title}</span>
                    <span className="block text-xs text-muted-foreground">{opt.desc}</span>
                  </span>
                </button>
              )
            })}
          </div>

          {/* Group size */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Group size limit</label>
            <div className="flex items-center justify-between rounded-xl border px-4 py-2.5">
              <span className="text-xs text-muted-foreground">{(space.members || []).length} members now</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setEditMaxSeats(Math.max(2, editMaxSeats - 1))} className="flex size-8 items-center justify-center rounded-full border text-lg font-bold hover:bg-muted">−</button>
                <span className="w-8 text-center text-base font-bold">{editMaxSeats}</span>
                <button onClick={() => setEditMaxSeats(Math.min(50, editMaxSeats + 1))} className="flex size-8 items-center justify-center rounded-full border text-lg font-bold hover:bg-muted">+</button>
              </div>
            </div>
          </div>

          {/* Rules */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Group rules</label>
            <Textarea
              placeholder="e.g. No spam. Share notes every Friday. Be kind."
              value={editRules}
              onChange={e => setEditRules(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Who can invite */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Who can invite others</label>
            <div className="flex gap-2">
              {[
                ['members', 'All members'],
                ['admins', 'Admins only'],
              ].map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setEditWhoCanInvite(v)}
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-xs font-bold transition-all ${
                    editWhoCanInvite === v
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Admins */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Admins</label>
            <div className="divide-y divide-border rounded-xl border">
              {(space.members || []).map(email => {
                const isCreatorRow = email === space.creatorEmail
                const isAdminRow = isCreatorRow || editAdmins.includes(email)
                const isCreator = user?.email === space.creatorEmail
                return (
                  <div key={email} className="flex items-center gap-2 px-3 py-2.5">
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">
                      {email}
                      {email === user?.email && <span className="text-muted-foreground"> (you)</span>}
                    </span>
                    {isCreatorRow
                      ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Creator</span>
                      : isAdminRow
                        ? <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-600">Admin</span>
                        : null}
                    {isCreator && !isCreatorRow && (
                      <button
                        onClick={() => setEditAdmins(prev => isAdminRow ? prev.filter(e => e !== email) : [...prev, email])}
                        className="shrink-0 rounded-lg border px-2 py-1 text-[11px] font-bold hover:bg-muted"
                      >
                        {isAdminRow ? 'Remove' : 'Make admin'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
            {user?.email !== space.creatorEmail && (
              <p className="text-[11px] text-muted-foreground">Only the creator can change admins.</p>
            )}
          </div>

          {/* Entry survey */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Entry survey <span className="font-normal text-muted-foreground">(shown before approval join)</span></label>
            {editSurvey.map((q, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={q}
                  onChange={e => setEditSurvey(prev => prev.map((v, j) => j === i ? e.target.value : v))}
                  placeholder={`Question ${i + 1}`}
                  maxLength={140}
                />
                <button onClick={() => setEditSurvey(prev => prev.filter((_, j) => j !== i))} aria-label="Remove question" className="flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted">
                  <X className="size-4" />
                </button>
              </div>
            ))}
            {editSurvey.length < 5 && (
              <div className="flex items-center gap-2">
                <Input
                  value={newSurveyQ}
                  onChange={e => setNewSurveyQ(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && newSurveyQ.trim()) { setEditSurvey(prev => [...prev, newSurveyQ.trim()]); setNewSurveyQ('') } }}
                  placeholder="Add a question..."
                  maxLength={140}
                />
                <Button
                  variant="outline"
                  disabled={!newSurveyQ.trim()}
                  onClick={() => { setEditSurvey(prev => [...prev, newSurveyQ.trim()]); setNewSurveyQ('') }}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="sticky bottom-20 flex gap-2 pb-1">
            <Button onClick={handleSaveSettings} disabled={!editName.trim() || savingSettings} className="h-12 flex-1 text-base shadow-lg">
              {savingSettings ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
        )}

        {hubTab === 'members' && (
        <div className="space-y-3">
          {space.rules && (
            <div className="rounded-xl border bg-muted/40 p-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Group rules</p>
              <p className="whitespace-pre-wrap text-xs leading-relaxed">{space.rules}</p>
            </div>
          )}
          <GroupProgress spaceId={id} isMember={true} />
          {canInvite && (
            <Button variant="outline" className="w-full" onClick={() => { loadInvites(); setShowInvite(true) }}>
              <UserPlus className="size-4 mr-2" /> Invite people
            </Button>
          )}
          <div className="divide-y divide-border rounded-xl border">
            {(space.members || []).map(email => {
              const isCreatorRow = email === space.creatorEmail
              const isAdminRow = isCreatorRow || (space.admins || []).includes(email)
              return (
                <Link key={email} href={`/profile/${encodeURIComponent(email)}`} className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/50">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {email[0].toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">
                    {email}
                    {email === user?.email && <span className="text-muted-foreground"> (you)</span>}
                  </span>
                  {isCreatorRow
                    ? <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Creator</span>
                    : isAdminRow
                      ? <span className="shrink-0 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-600">Admin</span>
                      : null}
                </Link>
              )
            })}
          </div>
        </div>
        )}

        {hubTab === 'requests' && isGroupAdmin && (
        <div className="space-y-3">
          {requests.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No pending requests</p>
          ) : requests.map(r => (
            <div key={r.email} className="rounded-xl border p-3 space-y-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{r.name || r.email}</p>
                <p className="truncate text-xs text-muted-foreground">{r.email}</p>
              </div>
              {(r.answers || []).filter(a => a).length > 0 && (
                <div className="space-y-1.5 rounded-lg bg-muted/50 p-2.5">
                  {(r.answers || []).map((a, i) => a ? (
                    <div key={i}>
                      <p className="text-[11px] font-semibold text-muted-foreground">{(space.survey || [])[i] || `Q${i + 1}`}</p>
                      <p className="text-xs">{a}</p>
                    </div>
                  ) : null)}
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => resolveRequest(r.email, 'approve')}>Approve</Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => resolveRequest(r.email, 'decline')}>Decline</Button>
              </div>
            </div>
          ))}
        </div>
        )}

        {hubTab === 'plan' && (
        <div className="space-y-2">
          {isGroupAdmin && (
            showSchedForm ? (
              <div className="space-y-2 rounded-xl bg-muted/40 p-2.5">
                <Input
                  value={schedTitle}
                  onChange={e => setSchedTitle(e.target.value)}
                  placeholder="What should they read? e.g. COS 202 Ch. 4"
                  maxLength={120}
                />
                <div className="flex gap-2">
                  <select
                    value={schedAssignee}
                    onChange={e => setSchedAssignee(e.target.value)}
                    className="h-10 flex-1 rounded-xl border bg-background px-3 text-xs outline-none focus:border-primary"
                  >
                    <option value="all">Everyone</option>
                    {(space.members || []).map(m => (
                      <option key={m} value={m}>{m === user?.email ? 'Me (' + m + ')' : m}</option>
                    ))}
                  </select>
                  <Input
                    type="date"
                    value={schedDue}
                    onChange={e => setSchedDue(e.target.value)}
                    className="w-36"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={saveSchedule} disabled={savingSched}>
                    {savingSched ? 'Assigning...' : 'Assign reading'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowSchedForm(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" className="w-full" onClick={() => setShowSchedForm(true)}>
                <Plus className="size-4 mr-2" /> Assign reading
              </Button>
            )
          )}
          {schedules.length === 0 && !showSchedForm && (
            <p className="py-4 text-center text-xs text-muted-foreground">No reading assigned yet</p>
          )}
          {schedules.map(s => {
            const done = (s.doneBy || []).includes(user?.email)
            const overdue = s.dueAt && new Date(s.dueAt) < new Date() && !done
            const forMe = s.assignee === 'all' || s.assignee === user?.email
            return (
              <div key={s._id} className="flex items-start gap-2.5 rounded-xl bg-muted/40 px-3 py-2.5">
                <button
                  onClick={() => (forMe || isGroupAdmin) && toggleSchedule(s._id, !done)}
                  disabled={!(forMe || isGroupAdmin)}
                  aria-label={done ? 'Mark not done' : 'Mark done'}
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 ${done ? 'border-green-500 bg-green-500 text-white' : 'border-muted-foreground/40'}`}
                >
                  {done && <Check className="size-3.5" strokeWidth={3} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-xs font-bold ${done ? 'line-through text-muted-foreground' : ''}`}>{s.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                    <span>{s.assignee === 'all' ? `Everyone (${(s.doneBy || []).length}/${space.memberCount || 0})` : s.assignee === user?.email ? 'You' : s.assignee}</span>
                    {s.dueAt && (
                      <span className={overdue ? 'font-bold text-red-500' : ''}>
                        Due {new Date(s.dueAt).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
                {isGroupAdmin && (
                  <button onClick={() => deleteSchedule(s._id)} aria-label="Delete" className="flex size-7 shrink-0 items-center justify-center rounded-lg hover:bg-muted">
                    <Trash2 className="size-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
        )}

        {hubTab === 'sessions' && (
        <div className="space-y-2">
          {isGroupAdmin && (
            showMeetForm ? (
              <div className="space-y-2 rounded-xl bg-muted/40 p-2.5">
                <Input
                  value={meetTitle}
                  onChange={e => setMeetTitle(e.target.value)}
                  placeholder="Session title e.g. COS 202 cram"
                  maxLength={120}
                />
                <div className="flex gap-2">
                  <Input
                    type="datetime-local"
                    value={meetAt}
                    onChange={e => setMeetAt(e.target.value)}
                    className="flex-1"
                  />
                  <select
                    value={meetDur}
                    onChange={e => setMeetDur(Number(e.target.value))}
                    className="h-10 rounded-xl border bg-background px-2 text-xs outline-none focus:border-primary"
                  >
                    {[30, 60, 90, 120].map(d => <option key={d} value={d}>{d}m</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => saveMeeting(false)} disabled={savingMeet}>
                    {savingMeet ? 'Scheduling...' : 'Schedule session'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowMeetForm(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 bg-red-500 hover:bg-red-600" onClick={() => saveMeeting(true)} disabled={savingMeet}>
                  Start live now
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowMeetForm(true)}>
                  Schedule
                </Button>
              </div>
            )
          )}
          {upcomingMeetings.length === 0 && !showMeetForm && (
            <p className="py-4 text-center text-xs text-muted-foreground">No sessions scheduled</p>
          )}
          {upcomingMeetings.map(m => (
            <div key={m._id} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ${m._s === 'live' ? 'bg-red-500/10' : 'bg-muted/40'}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold">{m.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {m._s === 'live'
                    ? 'Live now'
                    : `${new Date(m.startsAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · ${countdownTo(m)}`}
                </p>
              </div>
              {m._s === 'live' ? (
                <Button size="sm" className="bg-red-500 hover:bg-red-600" onClick={() => setLiveOpen(true)}>
                  Join
                </Button>
              ) : isGroupAdmin && (
                <button onClick={() => closeMeeting(m._id, 'cancel')} aria-label="Cancel session" className="flex size-7 shrink-0 items-center justify-center rounded-lg hover:bg-muted">
                  <X className="size-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Invite sheet */}
      <TikTokSheet
        open={showInvite}
        onOpenChange={setShowInvite}
        title={`Invite to ${space.name}`}
        subtitle="They'll get a notification with a join link"
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendInvite() }}
              placeholder="Member email..."
              type="email"
            />
            <Button onClick={sendInvite} disabled={sendingInvite}>
              {sendingInvite ? '...' : 'Send'}
            </Button>
          </div>
          {invites.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Pending invites</p>
              {invites.map(inv => (
                <div key={inv.code} className="flex items-center gap-2 rounded-xl border px-3 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">{inv.email}</span>
                  <button
                    onClick={() => copyInviteLink(inv.code)}
                    aria-label="Copy invite link"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-muted"
                  >
                    {copiedCode === inv.code ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                  </button>
                  <button
                    onClick={() => revokeInvite(inv.code)}
                    aria-label="Revoke invite"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-muted"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </TikTokSheet>

      <ComposerSheet
        open={showComposer}
        onOpenChange={setShowComposer}
        groupId={id}
        user={user}
        posts={posts}
        onPosted={loadPosts}
      />

      {liveOpen && liveMeeting && (
        <LiveRoom
          groupId={id}
          meeting={liveMeeting}
          userEmail={user?.email}
          onClose={() => setLiveOpen(false)}
        />
      )}
    </div>
  )
}

export default function GroupSettingsPage({ params }) {
  const { id } = use(params)
  return <SettingsContent id={id} />
}
