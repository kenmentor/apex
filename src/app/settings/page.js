'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getUser, setUser, clearUser, isAdmin, getToken } from '@/lib/auth'
import { ArrowLeft, Camera, LogOut, Shield, CheckCircle, Sun, Moon, ImagePlus, Smile, ChevronLeft } from 'lucide-react'
import { Drawer } from 'vaul'
import { Card, CardContent } from '@/components/ui/card'
import { UserAvatar } from '@/components/UserAvatar'
import AvatarCustomizer from '@/components/AvatarCustomizer'
import { defaultDiceConfig, normalizeAvatarConfig } from '@/lib/dice-avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import { DEPARTMENTS, LEVELS } from '@/lib/departments'
import SearchableField from '@/components/SearchableField'

const OTHERS = 'Others… (type it yourself)'

function SettingsContent() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [user, setUserState] = useState(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [school, setSchool] = useState('')
  const [department, setDepartment] = useState('')
  const [deptInput, setDeptInput] = useState('')
  const [customDepartment, setCustomDepartment] = useState('')
  const [deptOptions, setDeptOptions] = useState(DEPARTMENTS)
  const [level, setLevel] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [sendingVerify, setSendingVerify] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetView, setSheetView] = useState('choose') // choose | avatar
  const [avatarConfig, setAvatarConfig] = useState(null)
  const [savingAvatar, setSavingAvatar] = useState(false)
  const fileRef = useRef(null)

  function openSheet() {
    setSheetView('choose')
    setSheetOpen(true)
  }

  function currentDeptOptions() {
    const base = [...deptOptions]
    if (department && department !== OTHERS && !base.includes(department)) base.push(department)
    return [...base, OTHERS]
  }

  useEffect(() => {
    const u = getUser()
    setUserState(u)
    setName(u?.name || '')
    setSchool(u?.school || '')
    setDepartment(u?.department || '')
    setLevel(u?.level || '')
    setAvatarConfig(normalizeAvatarConfig(u?.avatarConfig) || defaultDiceConfig())
    // Departments = programmes (what students actually identify with).
    // Falls back to the static list offline.
    fetch('/api/programmes', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        const docs = Array.isArray(d.docs) ? d.docs : []
        if (docs.length) setDeptOptions(docs.map(x => x.label || x.name).filter(Boolean))
      })
      .catch(() => {})
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      // If the user typed an exact option name but never tapped it,
      // honor the text instead of silently keeping the old value.
      const deptOptions = currentDeptOptions()
      const typed = deptInput.trim().toLowerCase()
      const exact = typed && deptOptions.find(o => o.toLowerCase() === typed && o !== OTHERS)
      const dept = department === OTHERS
        ? customDepartment.trim()
        : (exact || department.trim())
      if (department === OTHERS && !dept) throw new Error('Type your department')
      const body = { name: name.trim(), school: school.trim() }
      if (dept) body.department = dept
      if (level.trim()) body.level = level.trim()
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Save failed')
      const data = await res.json()
      const u = getUser()
      const updated = { ...u, name: data.name, school: data.school, department: data.department, level: data.level, role: data.role || u?.role }
      setUser(updated)
      setUserState(updated)
      setEditing(false)
      setMessage('Saved!')
    } catch (err) { setMessage(err.message) }
    setSaving(false)
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setMessage('')
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      })
      if (!res.ok) throw new Error('Upload failed')
      const { url } = await res.json()
      const profileRes = await fetch('/api/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: url }),
      })
      if (!profileRes.ok) throw new Error('Profile update failed')
      const u = getUser()
      setUser({ ...u, avatar: url })
      setUserState({ ...u, avatar: url })
      setMessage('Avatar updated!')
      setSheetOpen(false)
      e.target.value = ''
    } catch (err) { setMessage(err.message) }
    setUploading(false)
  }

  async function handleSaveAvatarConfig() {
    if (!avatarConfig) return
    setSavingAvatar(true)
    setMessage('')
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarConfig }),
      })
      if (!res.ok) throw new Error('Avatar save failed')
      const data = await res.json()
      const u = getUser()
      const updated = { ...u, avatarConfig: data.avatarConfig || avatarConfig }
      setUser(updated)
      setUserState(updated)
      setMessage('Avatar updated!')
      setSheetOpen(false)
    } catch (err) { setMessage(err.message) }
    setSavingAvatar(false)
  }

  async function handleSendVerification() {
    setSendingVerify(true)
    setMessage('')
    try {
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error('Failed to send')
      setMessage('Verification email sent!')
    } catch (err) { setMessage(err.message) }
    setSendingVerify(false)
  }

  function handleLogout() {
    const u = getUser()
    if (u?.email) localStorage.setItem('apex_last_email', u.email)
    clearUser()
    router.push('/auth')
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
          <Link href="/profile" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="flex-1 text-base font-bold">Settings</h1>
        </header>
        <div className="flex flex-col items-center gap-4 py-16">
          <p className="text-muted-foreground">Not signed in</p>
          <Button asChild><Link href="/auth">Sign In</Link></Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-24">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link href="/profile" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="flex-1 text-base font-bold">Settings</h1>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </header>

      <div className="mx-auto w-full max-w-lg space-y-3 px-3 pt-3">
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
            <button type="button" onClick={openSheet} aria-label="Change profile photo" className="relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <UserAvatar user={user} className="size-20" />
              <span className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Camera className="size-3.5" />
              </span>
            </button>
            <p className="text-xs font-medium text-muted-foreground">Tap photo to change</p>
            {(uploading || savingAvatar) && <span className="text-xs text-muted-foreground">Saving...</span>}
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </CardContent>
        </Card>

        {message && (
          <div className={`text-center text-sm ${message.includes('fail') || message.includes('error') || message.includes('Failed') ? 'text-red-500' : 'text-green-600'}`}>
            {message}
          </div>
        )}

        <Card>
          <CardContent className="p-4 space-y-4">
            <h3 className="text-sm font-semibold">Profile Info</h3>
            {editing ? (
              <form onSubmit={handleSave} className="space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Name</label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">University</label>
                  <Input value={school} onChange={e => setSchool(e.target.value)} placeholder="University" />
                </div>
                <SearchableField
                  id="department"
                  label="Department"
                  value={department}
                  onChange={(v) => { setDepartment(v); if (v !== OTHERS) setCustomDepartment('') }}
                  onInputChange={setDeptInput}
                  options={currentDeptOptions()}
                  placeholder="Type to search departments…"
                />
                {department === OTHERS && (
                  <div className="mt-2">
                    <Input
                      value={customDepartment}
                      onChange={e => setCustomDepartment(e.target.value)}
                      placeholder="Type your department"
                    />
                  </div>
                )}
                <SearchableField
                  id="level"
                  label="Level"
                  value={level}
                  onChange={setLevel}
                  options={LEVELS.includes(level) || !level ? LEVELS : [...LEVELS, level]}
                  placeholder="Type to search levels…"
                />
                <div className="flex gap-2 pt-1">
                  <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving...' : 'Save'}</Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
                  <span className="text-xs text-muted-foreground">Name</span>
                  <span className="text-sm font-medium">{user.name || '—'}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
                  <span className="text-xs text-muted-foreground">University</span>
                  <span className="text-sm font-medium">{user.school || '—'}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
                  <span className="text-xs text-muted-foreground">Department</span>
                  <span className="text-sm font-medium">{user.department || '—'}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2.5">
                  <span className="text-xs text-muted-foreground">Level</span>
                  <span className="text-sm font-medium">{user.level || '—'}</span>
                </div>
                <Button onClick={() => setEditing(true)} className="w-full">Edit Profile</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">Account</h3>
            {!user.verified && (
              <Button variant="outline" className="w-full" onClick={handleSendVerification} disabled={sendingVerify}>
                <CheckCircle className="mr-1.5 size-4" />
                {sendingVerify ? 'Sending...' : 'Verify Email'}
              </Button>
            )}
            {isAdmin() && (
              <Button variant="outline" className="w-full" asChild>
                <Link href="/admin"><Shield className="mr-1.5 size-4" />Admin Dashboard</Link>
              </Button>
            )}
            <Button variant="destructive" className="w-full" onClick={handleLogout}>
              <LogOut className="mr-2 size-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />

      <Drawer.Root open={sheetOpen} onOpenChange={(o) => { setSheetOpen(o); if (o) setSheetView('choose') }}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-[70] bg-black/50" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-[70] mx-auto flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-3xl bg-background outline-none">
            <div className="mx-auto mb-1 mt-3 h-1 w-10 shrink-0 rounded-full bg-muted" />
            {sheetView === 'choose' ? (
              <div className="p-5 pb-8">
                <h2 className="text-center text-base font-bold">Change profile photo</h2>
                <p className="mt-1 text-center text-xs text-muted-foreground">Use a photo or build an avatar</p>
                <div className="mt-4 space-y-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex w-full items-center gap-3 rounded-2xl border p-4 text-left hover:bg-muted disabled:opacity-50"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                      <ImagePlus className="size-5 text-primary" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">Upload a photo</span>
                      <span className="block text-xs text-muted-foreground">{uploading ? 'Uploading...' : 'From your gallery or camera'}</span>
                    </span>
                  </button>
                  <button
                    onClick={() => setSheetView('avatar')}
                    className="flex w-full items-center gap-3 rounded-2xl border p-4 text-left hover:bg-muted"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                      <Smile className="size-5 text-primary" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">Create an avatar</span>
                      <span className="block text-xs text-muted-foreground">Hair, skin, eyes, outfit and more</span>
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-col">
                <div className="flex shrink-0 items-center gap-2 px-4 pt-2">
                  <button onClick={() => setSheetView('choose')} aria-label="Back" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
                    <ChevronLeft className="size-5" />
                  </button>
                  <h2 className="flex-1 text-center text-base font-bold">Create an avatar</h2>
                  <span className="w-9" />
                </div>
                <div className="min-h-0 overflow-y-auto px-4 pb-2">
                  <AvatarCustomizer value={avatarConfig || normalizeAvatarConfig(user.avatarConfig) || defaultDiceConfig()} onChange={setAvatarConfig} size={96} />
                </div>
                <div className="shrink-0 p-4 pt-2">
                  <Button onClick={handleSaveAvatarConfig} disabled={savingAvatar} className="h-12 w-full text-base">
                    {savingAvatar ? 'Saving...' : 'Save avatar'}
                  </Button>
                </div>
              </div>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  )
}
