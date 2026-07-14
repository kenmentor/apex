'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getUser, getToken } from '@/lib/auth'
import { ArrowLeft, Medal, Clock, Target, GraduationCap, Settings, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  const searchParams = useSearchParams()
  const [user, setUserState] = useState(null)
  const [scores, setScores] = useState([])
  const [followStats, setFollowStats] = useState({ followersCount: 0, followingCount: 0, isFollowing: false })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const u = getUser()
    setUserState(u)
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
        <Link href="/settings" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
          <Settings className="size-4" />
        </Link>
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
                  <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                    <GraduationCap className="size-3.5 shrink-0" />
                    <span>{user.school}</span>
                    {user.department && <span className="opacity-50">·</span>}
                    {user.department && <span>{user.department}</span>}
                    {user.level && <span className="opacity-50">·</span>}
                    {user.level && <span>{user.level}</span>}
                  </div>
                )}
                {user.verified && (
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    ✓ Verified
                  </span>
                )}
              </CardContent>
            </Card>

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

            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-border" />
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">History</span>
              <div className="h-px flex-1 bg-border" />
            </div>

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
