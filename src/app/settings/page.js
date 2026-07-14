'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getUser, setUser, clearUser, isAdmin, getToken } from '@/lib/auth'
import { ArrowLeft, User, Camera, LogOut, Shield, CheckCircle, Sun, Moon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'

function SettingsContent() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [user, setUserState] = useState(null)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [school, setSchool] = useState('')
  const [department, setDepartment] = useState('')
  const [level, setLevel] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [sendingVerify, setSendingVerify] = useState(false)

  useEffect(() => {
    const u = getUser()
    setUserState(u)
    setName(u?.name || '')
    setSchool(u?.school || '')
    setDepartment(u?.department || '')
    setLevel(u?.level || '')
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const body = { name: name.trim(), school: school.trim() }
      if (department.trim()) body.department = department.trim()
      if (level.trim()) body.level = level.trim()
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Save failed')
      const data = await res.json()
      const u = getUser()
      const updated = { ...u, name: data.name, school: data.school, department: data.department, level: data.level }
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
    } catch (err) { setMessage(err.message) }
    setUploading(false)
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
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="relative">
              <Avatar className="size-16">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                  {user.email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <label className="absolute -bottom-1 -right-1 flex size-7 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                <Camera className="size-3.5" />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
              </label>
            </div>
            {uploading && <span className="text-xs text-muted-foreground">Uploading...</span>}
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
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Department</label>
                  <Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="Department" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Level</label>
                  <Input value={level} onChange={e => setLevel(e.target.value)} placeholder="e.g. 200" />
                </div>
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
