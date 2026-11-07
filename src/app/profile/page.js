'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getUser, setUser, getToken, apiPutProfile } from '@/lib/auth'
import { setCached } from '@/lib/client-cache'
import { contributorRating } from '@/lib/contributor-rating'
import { defaultDiceConfig, normalizeAvatarConfig } from '@/lib/dice-avatar'
import AvatarCustomizer from '@/components/AvatarCustomizer'
import BtnSpinner from '@/components/BtnSpinner'
import { User, ArrowLeft } from 'lucide-react'
import ContributorProfile from '@/components/ContributorProfile'
import Contributions from '@/components/Contributions'
import StudyActivity from '@/components/StudyActivity'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

function ProfileContent() {
  const router = useRouter()
  const [user, setUserState] = useState(null)
  const [scores, setScores] = useState([])
  const [contrib, setContrib] = useState(null)
  const [contribLoading, setContribLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showAvatarBuilder, setShowAvatarBuilder] = useState(false)
  const [avatarConfig, setAvatarConfig] = useState(null)
  const [savingAvatar, setSavingAvatar] = useState(false)

  useEffect(() => {
    const u = getUser()
    setUserState(u)
    if (u?.email) {
      const t = getToken()
      Promise.all([
        fetch(`/api/scores?email=${encodeURIComponent(u.email)}`).then(r => r.json()),
        t ? fetch('/api/contributions/mine', { headers: { Authorization: `Bearer ${t}` }, cache: 'no-store' }).then(r => r.json()).catch(() => null) : Promise.resolve(null),
      ])
        .then(([myScores, contribData]) => {
          const list = Array.isArray(myScores) ? myScores : []
          setScores(list)
          setCached('scores', list)
          if (contribData && !contribData.error) {
            setContrib(contribData)
            setCached('contrib', contribData)
          }
          setContribLoading(false)
          setLoading(false)
        })
        .catch(() => { setLoading(false); setContribLoading(false) })
    } else {
      setLoading(false)
      setContribLoading(false)
    }
  }, [])

  async function uploadPhoto(file, kind) {
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('folder', kind === 'cover' ? 'gss-quiz/covers' : 'gss-quiz/avatars')
      const up = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      })
      if (!up.ok) throw new Error('Upload failed')
      const { url } = await up.json()
      await apiPutProfile(kind === 'cover' ? { cover: url } : { avatar: url })
      const u = getUser()
      const updated = { ...u, ...(kind === 'cover' ? { cover: url } : { avatar: url }) }
      setUser(updated)
      setUserState(updated)
    } catch {
      // SESSION_EXPIRED clears the session inside apiPutProfile; send them to sign in.
      try { if (!getUser()?.token) router.push('/auth') } catch {}
    }
    setUploading(false)
  }

  function openAvatarBuilder() {
    try {
      const u = getUser()
      setAvatarConfig(normalizeAvatarConfig(u?.avatarConfig) || defaultDiceConfig())
    } catch { setAvatarConfig(defaultDiceConfig()) }
    setShowAvatarBuilder(true)
  }

  async function handleSaveAvatar() {
    if (!avatarConfig) return
    setSavingAvatar(true)
    try {
      const data = await apiPutProfile({ avatarConfig })
      const u = getUser()
      const updated = { ...u, avatarConfig: data.avatarConfig || avatarConfig }
      setUser(updated)
      setUserState(updated)
      setShowAvatarBuilder(false)
    } catch {
      try { if (!getUser()?.token) router.push('/auth') } catch {}
    }
    setSavingAvatar(false)
  }

  const bestPct = scores.length > 0 ? Math.max(...scores.map(s => s.percentage || 0)) : 0
  // Contributors see BOTH graphs (contributions + study); normal users see
  // their study graph plus the useful links (history, performance, settings).
  const isContributor = !!user && (!!user.admin || ['editor', 'official', 'admin'].includes(user.role))
  const medals = contrib?.medals || []
  const rating = contrib ? contributorRating({
    approved: contrib.totals?.approved || 0,
    total: contrib.totals?.total || 0,
    courses: contrib.totals?.courses || 0,
    rank: contrib.rank ?? null,
    totalContributors: contrib.totalContributors || 0,
    badgesWon: medals.filter(m => m.earned).length,
    badgesTotal: medals.length,
    streak: contrib.streak || 0,
  }) : null

  return (
    <div className="min-h-dvh bg-background pb-28">
      {loading ? (
        <div className="mx-auto w-full max-w-xl space-y-3 px-4 pt-4">
          <Skeleton className="h-44 w-full rounded-none sm:rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : !user ? (
        <div className="mx-auto w-full max-w-xl px-4 pt-10">
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
        </div>
      ) : (
        <>
          <ContributorProfile
            user={user}
            totals={contrib?.totals}
            rank={contrib?.rank}
            isOwner
            uploading={uploading}
            rating={rating}
            onAvatarFile={(f) => uploadPhoto(f, 'avatar')}
            onCoverFile={(f) => uploadPhoto(f, 'cover')}
            onEditProfile={() => router.push('/profile/settings')}
            onCreateAvatar={openAvatarBuilder}
          />

          {showAvatarBuilder ? (
            <div className="mx-auto w-full max-w-xl space-y-2 px-4 pt-4">
              <div className="flex items-center gap-3 py-2">
                <button onClick={() => setShowAvatarBuilder(false)} aria-label="Go back" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                  <ArrowLeft size={18} />
                </button>
                <h1 className="text-lg font-bold tracking-tight">Create an avatar</h1>
              </div>
              <AvatarCustomizer value={avatarConfig} onChange={setAvatarConfig} size={96} />
              <div className="py-2">
                <Button onClick={handleSaveAvatar} disabled={savingAvatar} className="h-12 w-full text-base">
                  {savingAvatar ? <span className="flex items-center justify-center gap-2"><BtnSpinner /> Saving…</span> : 'Save avatar'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-xl space-y-4 px-4 pt-4">
              {isContributor ? (
                <>
                  <Contributions data={contrib} loading={contribLoading} historyCount={scores.length} bestPct={scores.length ? bestPct : null} />
                  <StudyActivity />
                </>
              ) : (
                <>
                  <StudyActivity />
                  <Contributions data={contrib} loading={contribLoading} historyCount={scores.length} bestPct={scores.length ? bestPct : null} showGraph={false} />
                </>
              )}
            </div>
          )}
        </>
      )}
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
