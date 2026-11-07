'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MoreHorizontal, GraduationCap, Star, Camera, Pencil, Settings, Share2, Link2, LogOut, Check, ImagePlus, Smile, ChevronRight } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import BtnSpinner from '@/components/BtnSpinner'
import { UserAvatarImage, RoleSeal, roleTick } from '@/components/UserAvatar'

function Stat({ value, label }) {
  return (
    <div className="px-2 text-center">
      <div className="text-base font-bold tracking-tight">{value}</div>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

// Mono single hero: achievements visible to everyone, management lives in the 3-dot.
export default function ContributorProfile({
  user,
  totals,
  rank,
  isOwner = false,
  onAvatarFile,
  onCoverFile,
  uploading = false,
  onEditProfile,
  onCreateAvatar,
  rating = null,
  showStats = true,
}) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const avatarRef = useRef(null)
  const coverRef = useRef(null)

  const name = user?.name || 'Anonymous'
  const username = (user?.email || 'user').split('@')[0].toLowerCase();
  const deptLine = [user?.department, user?.level].filter(Boolean).join(' · ')
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const total = totals?.total || 0
  const approved = totals?.approved || 0
  const courses = totals?.courses || 0
  const tick = roleTick(user)

  function goBack() {
    try {
      if (typeof window !== 'undefined' && window.history.length > 1) router.back()
      else router.push('/')
    } catch { router.push('/') }
  }

  function profileUrl() {
    try {
      const em = user?.email ? encodeURIComponent(user.email) : ''
      return em ? `${window.location.origin}/profile/${em}` : window.location.href
    } catch { return '' }
  }

  async function shareProfile() {
    setMenuOpen(false)
    const url = profileUrl()
    try {
      if (navigator.share) { await navigator.share({ title: name, url }) }
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500) }
    } catch {}
  }

  async function copyLink() {
    setMenuOpen(false)
    try { await navigator.clipboard.writeText(profileUrl()); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }

  function editProfile() {
    setMenuOpen(false)
    if (onEditProfile) onEditProfile()
    else {
      try { document.getElementById('settings')?.scrollIntoView({ behavior: 'smooth' }) } catch {}
    }
  }

  return (
    <>
      <section className="overflow-hidden bg-background">
        <div className="relative h-44 w-full bg-gradient-to-br from-violet-500/30 via-muted to-slate-500/30 sm:h-56 dark:from-violet-950/60 dark:via-muted dark:to-slate-900">
          {user?.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.cover} alt="" className="absolute inset-0 size-full object-cover" />
          ) : null}
          <button onClick={goBack} aria-label="Go back" className="absolute left-4 top-4 flex size-10 items-center justify-center rounded-full bg-background/80 shadow-sm backdrop-blur transition hover:bg-background">
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <div className="absolute right-4 top-4 flex items-center gap-2">
            {copied && <span className="flex items-center gap-1 rounded-full bg-background/85 px-2.5 py-1 text-[11px] font-bold text-green-600 backdrop-blur"><Check size={12} strokeWidth={3} /> Copied</span>}
            <div className="relative">
              <button onClick={() => setMenuOpen(v => !v)} aria-label="More options" className="flex size-10 items-center justify-center rounded-full bg-background/80 shadow-sm backdrop-blur transition hover:bg-background">
                <MoreHorizontal size={18} className="text-foreground" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-2xl border border-border/50 bg-card shadow-xl">
                    {isOwner && (
                      <>
                        <button onClick={editProfile} className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] font-bold hover:bg-muted">
                          <Pencil className="size-4 text-muted-foreground" /> Edit profile
                        </button>
                        <button onClick={editProfile} className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] font-bold hover:bg-muted">
                          <Settings className="size-4 text-muted-foreground" /> Settings
                        </button>
                      </>
                    )}
                    <button onClick={shareProfile} className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] font-bold hover:bg-muted">
                      <Share2 className="size-4 text-muted-foreground" /> Share profile
                    </button>
                    <button onClick={copyLink} className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] font-bold hover:bg-muted">
                      <Link2 className="size-4 text-muted-foreground" /> Copy link
                    </button>
                    {isOwner && (
                      <a href="/logout" className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] font-bold text-red-500 hover:bg-muted">
                        <LogOut className="size-4" /> Sign out
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          {isOwner && (
            <>
              <button
                onClick={() => coverRef.current?.click()}
                aria-label="Change banner"
                className="absolute bottom-3 right-4 flex items-center gap-1.5 rounded-full bg-background/85 px-3 py-1.5 text-[11px] font-bold shadow-sm backdrop-blur transition hover:bg-background"
              >
                <Camera className="size-3.5" /> {uploading ? <span className="flex items-center gap-1"><BtnSpinner className="size-3" /> Saving…</span> : 'Cover'}
              </button>
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={e => onCoverFile?.(e.target.files?.[0] || null)} />
            </>
          )}
          <div className="absolute -bottom-10 left-4 sm:left-6">
            <div className="relative">
              <Avatar className="size-24 border-4 border-background shadow-sm">
                <UserAvatarImage user={user} />
                <AvatarFallback className="bg-muted text-2xl font-semibold text-muted-foreground">
                  {user?.avatar ? '' : initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-1 right-1 size-4 rounded-full border-[3px] border-background bg-green-500" />
              {isOwner && (
                <>
                  <button
                    onClick={() => setSheetOpen(true)}
                    aria-label="Change photo"
                    className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:opacity-90"
                  >
                    <Camera className="size-4" />
                  </button>
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={e => { setSheetOpen(false); onAvatarFile?.(e.target.files?.[0] || null) }} />
                </>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 pt-12 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="flex items-center gap-1.5 text-xl font-bold tracking-tight">
                <span className="truncate">{name}</span>
                {tick && <RoleSeal role={tick} size="size-5" />}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">@{username}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2 pt-1 text-xs text-muted-foreground">
              <span>{total} resources</span>
              <span className="opacity-40">·</span>
              <span>{courses} courses</span>
            </div>
          </div>

          {(deptLine || user?.school) && (
            <div className="mt-2 flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <GraduationCap size={14} className="shrink-0" />
              <span className="truncate">{[deptLine, user?.school].filter(Boolean).join(' · ')}</span>
            </div>
          )}

          {user?.bio ? (
            <p className="mt-2.5 text-[15px] leading-6">{user.bio}</p>
          ) : null}

        {rating && (
          <div className="mt-3 flex items-center gap-2">
            <span className="relative inline-flex" title={`${rating.score}/100`}>
              <span className="flex gap-0.5 text-muted-foreground/30">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} size={16} fill="currentColor" strokeWidth={0} />
                ))}
              </span>
              <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${Math.min(100, Math.max(0, (rating.score / 100) * 100))}%` }}>
                <span className="flex w-max gap-0.5 text-amber-400">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} size={16} fill="currentColor" strokeWidth={0} />
                  ))}
                </span>
              </span>
            </span>
            <span className="text-xs font-bold text-muted-foreground">{rating.score}</span>
          </div>
        )}

        {showStats && (
          <div className="mt-4 grid grid-cols-3 divide-x divide-border border-y border-border py-3">
            <Stat value={String(total)} label="Resources" />
            <Stat value={String(courses)} label="Courses" />
            <Stat value={String(approved)} label="Approved" />
          </div>
        )}
      </div>

      {isOwner && sheetOpen && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-3xl bg-background p-5 pb-8 outline-none">
            <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-muted" />
            <h2 className="text-center text-base font-bold">Change profile photo</h2>
            <p className="mt-1 text-center text-xs text-muted-foreground">Use a photo or build an avatar</p>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => avatarRef.current?.click()}
                className="flex w-full items-center gap-3 rounded-2xl border p-4 text-left"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                  <ImagePlus className="size-5 text-primary" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">Upload a photo</span>
                  <span className="block text-xs text-muted-foreground">{uploading ? <span className="flex items-center gap-1"><BtnSpinner className="size-3" /> Uploading…</span> : 'From your gallery or camera'}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
              <button
                onClick={() => { setSheetOpen(false); onCreateAvatar?.() }}
                className="flex w-full items-center gap-3 rounded-2xl border p-4 text-left"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                  <Smile className="size-5 text-primary" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">Create an avatar</span>
                  <span className="block text-xs text-muted-foreground">Hair, skin, eyes, outfit and more</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
    </>
  )
}
