'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { getUser, setUser, clearUser, isAdmin, getToken } from '@/lib/auth'
import { ArrowLeft, User, Camera, LogOut, Shield, CheckCircle, Send, Medal, Clock, Target, GraduationCap, Sun, Moon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'

function formatTime(secs) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}m ${s}s`
}

function ProfileContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { theme, setTheme } = useTheme()
  const [user, setUserState] = useState(null)
  const [scores, setScores] = useState([])
  const [followStats, setFollowStats] = useState({ followersCount: 0, followingCount: 0, isFollowing: false })
  const [loading, setLoading] = useState(true)
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
    if (u?.email) {
      Promise.all([
        fetch(`/api/scores?email=${encodeURIComponent(u.email)}`).then(r => r.json()),
        fetch(`/api/follow?email=${encodeURIComponent(u.email)}`, {
          headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
        }).then(r => r.ok ? r.json() : { followersCount: 0, followingCount: 0, isFollowing: false }),
      ])
        .then(([myScores, fStats]) => {
          setScores(Array.isArray(myScores) ? myScores : [])
          setFollowStats(fStats)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setMessage('Email verified!')
      const u = getUser()
      if (u) { u.verified = true; setUser(u) }
    }
  }, [searchParams])

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

  const totalAttempts = scores.length
  const bestPct = scores.length > 0 ? Math.max(...scores.map(s => s.percentage || 0)) : 0
  const avgPct = scores.length > 0 ? Math.round(scores.reduce((s, e) => s + (e.percentage || 0), 0) / scores.length) : 0
  const totalTime = scores.reduce((s, e) => s + (e.timeSpent || 0), 0)

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-24">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link href="/leaderboard" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="flex-1 text-base font-bold truncate">{user?.name || 'Profile'}</h1>
        <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </header>

      <div className="mx-auto w-full max-w-lg space-y-3 px-3 pt-3">
        {loading ? (
          <>
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </>
        ) : !user ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <Avatar className="size-16">
                <AvatarFallback className="bg-muted">
                  <User className="size-8 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <p className="text-muted-foreground">Not signed in</p>
              <Button asChild>
                <Link href="/auth">Sign In</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* ── Public Profile Card ── */}
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                <Avatar className="size-16">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                    {user.email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-lg font-bold">{user.name || 'Anonymous'}</h2>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                {user.school && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <GraduationCap className="size-3.5" />
                    {user.school}
                    {user.department && <span>· {user.department}</span>}
                    {user.level && <span>· {user.level} Level</span>}
                  </div>
                )}
                {user.verified && (
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    ✓ Verified
                  </span>
                )}
              </CardContent>
            </Card>

            {/* ── Followers / Following / Quizzes ── */}
            <div className="grid grid-cols-3 gap-2">
              <Card>
                <CardContent className="flex flex-col items-center py-3 text-center">
                  <div className="text-lg font-bold text-primary">{followStats.followersCount}</div>
                  <div className="text-[10px] text-muted-foreground">Followers</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-center py-3 text-center">
                  <div className="text-lg font-bold text-primary">{followStats.followingCount}</div>
                  <div className="text-[10px] text-muted-foreground">Following</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-center py-3 text-center">
                  <div className="text-lg font-bold text-primary">{totalAttempts}</div>
                  <div className="text-[10px] text-muted-foreground">Quizzes</div>
                </CardContent>
              </Card>
            </div>

            {/* ── Stats ── */}
            <Card>
              <CardContent className="divide-y p-0">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Medal className="size-4 text-yellow-500" />
                    <span className="text-xs text-muted-foreground">Best Score</span>
                  </div>
                  <span className="text-sm font-bold text-green-500">{bestPct}%</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Target className="size-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground">Average</span>
                  </div>
                  <span className="text-sm font-bold">{avgPct}%</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-orange-500" />
                    <span className="text-xs text-muted-foreground">Total Time</span>
                  </div>
                  <span className="text-sm font-bold">{Math.round(totalTime / 60)}m</span>
                </div>
              </CardContent>
            </Card>

            {/* ── Separator ── */}
            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-border" />
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Settings</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* ── Settings / Editing ── */}
            {editing ? (
              <Card>
                <CardContent className="p-4">
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
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <User className="mr-1.5 size-3.5" />
                  Edit Profile
                </Button>
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Camera className="mr-1.5 size-3.5" />
                      {uploading ? 'Uploading...' : 'Change Photo'}
                    </span>
                  </Button>
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
                </label>
                {!user.verified && (
                  <Button variant="outline" size="sm" onClick={handleSendVerification} disabled={sendingVerify}>
                    <CheckCircle className="mr-1.5 size-3.5" />
                    {sendingVerify ? 'Sending...' : 'Verify Email'}
                  </Button>
                )}
                {isAdmin() && (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/admin"><Shield className="mr-1.5 size-3.5" />Admin</Link>
                  </Button>
                )}
              </div>
            )}

            {message && (
              <div className={`text-center text-sm ${message.includes('fail') || message.includes('error') || message.includes('Failed') ? 'text-red-500' : 'text-green-600'}`}>
                {message}
              </div>
            )}

            {/* ── Separator ── */}
            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-border" />
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">History</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* ── Score History ── */}
            {scores.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No scores yet. Take a quiz to see your results here.
              </div>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {scores.map((s, i) => (
                    <Card key={`${i}-${s.course || 'unknown'}`}>
                      <CardContent className="flex items-center justify-between p-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{s.course}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatTime(s.timeSpent)} · {new Date(s.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{s.score}/{s.total}</span>
                          <span className={`text-base font-bold ${s.percentage >= 50 ? 'text-green-600' : 'text-red-500'}`}>
                            {s.percentage}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* ── Separator ── */}
            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-border" />
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Account</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Button variant="destructive" className="w-full" onClick={handleLogout}>
              <LogOut className="mr-2 size-4" />
              Sign Out
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileContent />
    </Suspense>
  )
}
