'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, UserPlus, UserCheck, Medal, Clock, Target, GraduationCap } from 'lucide-react'
import { getUser, getToken } from '@/lib/auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export default function PublicProfilePage({ params }) {
  const { email } = use(params)
  const me = getUser()
  const decodedEmail = decodeURIComponent(email)
  const isMe = me?.email?.toLowerCase() === decodedEmail?.toLowerCase()

  const [profile, setProfile] = useState(null)
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [followStats, setFollowStats] = useState({ followersCount: 0, followingCount: 0, isFollowing: false })

  useEffect(() => {
    async function load() {
      try {
        const [userRes, scoresRes] = await Promise.all([
          fetch(`/api/profile?email=${encodeURIComponent(decodedEmail)}`),
          fetch(`/api/scores?email=${encodeURIComponent(decodedEmail)}`),
        ])
        if (userRes.ok) setProfile(await userRes.json())
        if (scoresRes.ok) {
          const data = await scoresRes.json()
          setScores(data.scores || data || [])
        }

        const followRes = await fetch(`/api/follow?email=${encodeURIComponent(decodedEmail)}`, {
          headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
        })
        if (followRes.ok) setFollowStats(await followRes.json())
      } catch {}
      setLoading(false)
    }
    load()
  }, [decodedEmail])

  async function handleFollow() {
    if (!getToken()) return
    const res = await fetch('/api/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ targetEmail: decodedEmail, action: followStats.isFollowing ? 'unfollow' : 'follow' }),
    })
    if (res.ok) setFollowStats(await res.json())
  }

  const totalAttempts = scores.length
  const bestPct = scores.length > 0 ? Math.max(...scores.map(s => s.percentage || 0)) : 0
  const totalTime = scores.reduce((s, e) => s + (e.timeSpent || 0), 0)
  const avgPct = scores.length > 0 ? Math.round(scores.reduce((s, e) => s + (e.percentage || 0), 0) / scores.length) : 0

  return (
    <div className="flex min-h-dvh flex-col bg-background pb-24">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link href="/profile" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="flex-1 text-base font-bold truncate">{profile?.name || decodedEmail.split('@')[0]}</h1>
      </header>

      <div className="mx-auto w-full max-w-lg space-y-3 px-3 pt-3">
        {loading ? (
          <>
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </>
        ) : !profile ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="text-5xl">🔍</div>
              <p className="text-sm text-muted-foreground">User not found</p>
              <Link href="/"><Button variant="outline" size="sm">Go Home</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                  {profile.name?.[0]?.toUpperCase() || decodedEmail[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold">{profile.name || 'Anonymous'}</h2>
                  <p className="text-xs text-muted-foreground">{decodedEmail}</p>
                </div>
                {profile.school && (
                  <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                    <GraduationCap className="size-3.5 shrink-0" />
                    <span>{profile.school}</span>
                    {profile.department && <span className="opacity-50">·</span>}
                    {profile.department && <span>{profile.department}</span>}
                    {profile.level && <span className="opacity-50">·</span>}
                    {profile.level && <span>{profile.level}</span>}
                  </div>
                )}
                {profile.verified && (
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    ✓ Verified
                  </span>
                )}

                {!isMe && me && (
                  <Button
                    onClick={handleFollow}
                    variant={followStats.isFollowing ? 'outline' : 'default'}
                    className="mt-1"
                  >
                    {followStats.isFollowing ? <UserCheck className="mr-1.5 size-4" /> : <UserPlus className="mr-1.5 size-4" />}
                    {followStats.isFollowing ? 'Following' : 'Follow'}
                  </Button>
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
          </>
        )}
      </div>
    </div>
  )
}
