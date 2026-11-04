'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { UserPlus, UserCheck, Flame } from 'lucide-react'
import { getUser, getToken } from '@/lib/auth'
import ContributorProfile from '@/components/ContributorProfile'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

// Preview for visitors: identity + follow + contribution achievements.
// Quiz averages/totals and follower counts stay private; approved
// contribution counts + streak are public motivation.
export default function PublicProfileView({ email }) {
  const me = getUser()
  const decodedEmail = decodeURIComponent(email)
  const isMe = me?.email?.toLowerCase() === decodedEmail?.toLowerCase()

  const [profile, setProfile] = useState(null)
  const [scores, setScores] = useState([])
  const [contrib, setContrib] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const token = getToken()
        const [userRes, scoresRes, contribRes] = await Promise.all([
          fetch(`/api/profile?email=${encodeURIComponent(decodedEmail)}`),
          fetch(`/api/scores?email=${encodeURIComponent(decodedEmail)}`),
          fetch(`/api/contributions/public?email=${encodeURIComponent(decodedEmail)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }).catch(() => null),
        ])
        if (userRes.ok) setProfile(await userRes.json())
        if (scoresRes.ok) {
          const data = await scoresRes.json()
          setScores(data.scores || data || [])
        }
        if (contribRes && contribRes.ok) {
          const c = await contribRes.json().catch(() => null)
          if (c && !c.error) setContrib(c)
        }

        const followRes = await fetch(`/api/follow?email=${encodeURIComponent(decodedEmail)}`, {
          headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
        })
        if (followRes.ok) {
          const f = await followRes.json()
          setIsFollowing(!!f.isFollowing)
        }
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
      body: JSON.stringify({ targetEmail: decodedEmail, action: isFollowing ? 'unfollow' : 'follow' }),
    })
    if (res.ok) {
      const f = await res.json()
      setIsFollowing(!!f.isFollowing)
    }
  }

  const totalAttempts = scores.length
  const bestPct = scores.length > 0 ? Math.max(...scores.map(s => s.percentage || 0)) : 0

  return (
    <div className="min-h-dvh bg-background pb-28">
      {loading ? (
        <div className="mx-auto w-full max-w-xl space-y-3 px-4 pt-4">
          <Skeleton className="h-44 w-full rounded-none sm:rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : !profile ? (
        <div className="mx-auto w-full max-w-xl px-4 pt-10">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="text-5xl">🔍</div>
              <p className="text-sm text-muted-foreground">User not found</p>
              <Link href="/"><Button variant="outline" size="sm">Go Home</Button></Link>
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <ContributorProfile
            user={profile}
            isOwner={false}
            totals={contrib?.totals}
            rank={contrib?.rank}
            showStats={!!contrib && (contrib.totals?.approved || 0) > 0}
          />

          <div className="mx-auto w-full max-w-xl space-y-4 px-4 pt-4">
            {(contrib?.streak || 0) > 0 && (
              <p className="mx-auto flex w-fit items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1.5 text-xs font-bold text-orange-600">
                <Flame className="size-4" /> {contrib.streak}-day contribution streak
                {contrib?.rank ? <span className="text-muted-foreground">· #{contrib.rank} contributor</span> : null}
              </p>
            )}
            {!isMe && me && (
              <Button
                onClick={handleFollow}
                variant={isFollowing ? 'outline' : 'default'}
                className="w-full rounded-full"
              >
                {isFollowing ? <UserCheck className="mr-1.5 size-4" /> : <UserPlus className="mr-1.5 size-4" />}
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
            )}
            <p className="px-1 text-center text-xs text-muted-foreground">
              <span className="font-bold text-foreground">{totalAttempts} {totalAttempts === 1 ? 'quiz' : 'quizzes'}</span>
              {totalAttempts > 0 && (
                <> · <span className="font-bold text-foreground">Best {bestPct}%</span></>
              )}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
