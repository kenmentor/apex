'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Lock, Users, FileText, Search, BookOpen, Plus, UserPlus } from 'lucide-react'
import { motion } from 'motion/react'
import { getUser, getToken, isAdmin } from '@/lib/auth'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import TikTokTabs from '@/components/TikTokTabs'
import InboxList from '@/components/InboxList'

const ORDER = ['groups', 'inbox', 'contribute']

function ContributePane({ query }) {
  const [admin, setAdmin] = useState(false);
  const [pending, setPending] = useState(null);
  useEffect(() => {
    if (!isAdmin()) return;
    setAdmin(true);
    fetch('/api/admin/review', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then(d => { if (typeof d?.counts?.pending === 'number') setPending(d.counts.pending) })
      .catch(() => {});
  }, []);
  return (
    <div className="space-y-3">
      {admin && (
        <Link href="/admin/review" className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold">Review queue{pending ? ` · ${pending} waiting` : ''}</span>
            <span className="block text-xs text-muted-foreground">Approve, merge or reject contributor submissions.</span>
          </span>
          {pending > 0 && (
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[11px] font-black text-white">{pending > 9 ? '9+' : pending}</span>
          )}
          <span className="shrink-0 text-xs font-bold text-amber-600">Open ›</span>
        </Link>
      )}
      <InboxList query={query} types={['contribute']} autoRead />
    </div>
  );
}

export default function GroupsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background pb-24">
        <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <h1 className="flex-1 text-base font-bold">Groups</h1>
        </header>
      </div>
    }>
      <GroupsInner />
    </Suspense>
  )
}

function GroupsInner() {
  const params = useSearchParams()
  const initial = ['inbox', 'contribute'].includes(params.get('tab')) ? params.get('tab') : 'groups'
  const [tab, setTab] = useState(initial)
  const [dir, setDir] = useState(1)
  const [seenInbox, setSeenInbox] = useState(initial === 'inbox')
  const [seenContribute, setSeenContribute] = useState(initial === 'contribute')
  const [unread, setUnread] = useState(0)
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [user, setUser] = useState(null)
  const [menu, setMenu] = useState(false)
  const [friendOpen, setFriendOpen] = useState(false)
  const [friendQ, setFriendQ] = useState('')
  const [candidates, setCandidates] = useState([])
  const [friendLoading, setFriendLoading] = useState(false)
  const [followed, setFollowed] = useState([])
  const [friendError, setFriendError] = useState('')
  const [dmBusy, setDmBusy] = useState('')
  const router = useRouter()

  useEffect(() => {
    const v = ['inbox', 'contribute'].includes(params.get('tab')) ? params.get('tab') : 'groups'
    setTab(prev => {
      if (prev !== v) setDir(ORDER.indexOf(v) > ORDER.indexOf(prev) ? 1 : -1)
      return v
    })
    if (v === 'inbox') setSeenInbox(true)
    if (v === 'contribute') setSeenContribute(true)
  }, [params])

  useEffect(() => {
    setUser(getUser())
    fetchGroups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function fetchGroups() {
    const token = getToken()
    fetch('/api/spaces', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => {
        setGroups(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  function syncUrl(v) {
    try {
      const u = new URL(window.location.href)
      u.searchParams.set('tab', v)
      window.history.replaceState(null, '', u)
    } catch {}
  }

  function goTab(v) {
    setDir(ORDER.indexOf(v) >= ORDER.indexOf(tab) ? 1 : -1)
    setTab(v)
    if (v === 'inbox') setSeenInbox(true)
    if (v === 'contribute') setSeenContribute(true)
    syncUrl(v)
  }

  function stepTab(d) {
    const i = ORDER.indexOf(tab)
    const n = Math.min(ORDER.length - 1, Math.max(0, i + d))
    if (ORDER[n] !== tab) goTab(ORDER[n])
  }

  function openFriend() {
    setMenu(false)
    setFriendQ('')
    setFollowed([])
    setFriendError('')
    setFriendOpen(true)
    setFriendLoading(true)
    fetch('/api/leaderboard?limit=20', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setCandidates(Array.isArray(d) ? d : (d.entries || d.rankings || [])))
      .catch(() => {})
      .finally(() => setFriendLoading(false))
  }

  async function followUser(email) {
    setFriendError('')
    const key = String(email).toLowerCase()
    // Visual first: show Following instantly, reconcile with the server after.
    setFollowed(prev => (prev.includes(key) ? prev : [...prev, key]))
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ targetEmail: email, action: 'follow' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not follow')
    } catch (e) {
      setFollowed(prev => prev.filter(x => x !== key))
      setFriendError(e.message)
    }
  }

  async function startDm(email) {
    if (dmBusy) return
    setDmBusy(email)
    try {
      const res = await fetch('/api/dm/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ withEmail: email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not open chat')
      setFriendOpen(false)
      router.push(`/dm/${data.id}`)
    } catch (e) {
      setFriendError(e.message)
    }
    setDmBusy('')
  }

  const q = search.toLowerCase()
  const filtered = groups.filter(g =>
    g.name?.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q)
  )

  const me = (user?.email || '').toLowerCase()
  const fq = friendQ.trim().toLowerCase()
  const matches = candidates
    .filter(c => c.email && (c.email || '').toLowerCase() !== me)
    .filter(c => !fq || (c.name || '').toLowerCase().includes(fq) || (c.email || '').toLowerCase().includes(fq))
    .slice(0, 8)
  const emailGuess = fq.includes('@') && !matches.some(c => (c.email || '').toLowerCase() === fq) ? friendQ.trim() : ''

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background pb-24">
      <header className="sticky top-0 z-50 flex items-center gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <h1 className="flex-1 text-base font-bold">Groups</h1>
        <div className="relative">
          <button onClick={() => setMenu(m => !m)} aria-label="Add or create" className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:scale-95">
            <Plus className="size-5" />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-md" onClick={() => setMenu(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute right-0 z-50 mt-1 w-44 origin-top-right overflow-hidden rounded-xl border bg-background shadow-xl"
              >
                {user && (
                  <Link href="/groups/create" onClick={() => setMenu(false)} className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted">
                    <Plus className="size-4" /> New Group
                  </Link>
                )}
                <button onClick={openFriend} className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted">
                  <UserPlus className="size-4" /> Add friend
                </button>
              </motion.div>
            </>
          )}
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-5 pt-3">
        {/* Search on top — filters whichever tab is open */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={tab === 'inbox' ? 'Search messages...' : 'Search groups...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* TikTok-style switch — tap the words or swipe the page */}
        <div className="mt-2 border-b">
          <TikTokTabs
          tabs={[
            { id: 'groups', label: 'Groups' },
            { id: 'inbox', label: 'Inbox', count: unread },
            { id: 'contribute', label: 'Contribute' },
          ]}
            active={tab}
            onChange={goTab}
          />
        </div>

        {/* One page at a time — each tab owns its own height, swipe to switch */}
        <motion.div
          key={tab}
          initial={{ opacity: 0, x: 48 * dir }}
          animate={{ opacity: 1, x: 0 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.5}
        onDragEnd={(_, info) => {
          if (info.offset.x < -80) stepTab(1)
          else if (info.offset.x > 80) stepTab(-1)
        }}
          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
          className="pt-4"
        >
          {tab === 'inbox' ? (
            seenInbox ? <InboxList onUnread={setUnread} query={search} autoRead /> : <div className="py-10" />
          ) : tab === 'contribute' ? (
            seenContribute ? <ContributePane query={search} /> : <div className="py-10" />
          ) : (
            <div className="space-y-5">
              {!user && (
                <div className="rounded-xl border border-dashed p-5 text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Sign in to create and join study groups</p>
                  <Link href="/auth" className="inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                    Sign In
                  </Link>
                </div>
              )}

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                  <BookOpen className="size-12 opacity-20" />
                  <p className="text-sm">No groups yet</p>
                  {user && (
                    <Link href="/groups/create" className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                      Create First Group
                    </Link>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border rounded-xl border overflow-hidden">
                  {filtered.map(group => (
                    <Link
                      key={group._id}
                      href={`/groups/${group._id}`}
                      className="flex items-start gap-4 p-4 transition-colors hover:bg-muted/50"
                    >
                      <div
                        className="flex size-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                        style={{ background: `linear-gradient(135deg, ${group.color || '#130f40'}, ${group.color || '#130f40'}cc)` }}
                      >
                        {group.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-bold">{group.name}</h3>
                        </div>
                        {group.description && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{group.description}</p>
                        )}
                        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="size-3" />
                            {group.memberCount || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="size-3" />
                            {group.postCount || 0} files
                          </span>
                          <span>by {group.creatorName}</span>
                          {(group.visibility || 'open') !== 'open' && (
                            <span className="flex items-center gap-1 font-semibold">
                              <Lock className="size-3" />
                              {group.visibility === 'invite' ? 'Invite only' : 'Approval'}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Add friend sheet */}
      {friendOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setFriendOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-3xl border-t bg-background p-4 pb-8">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
            <h2 className="text-base font-black">Add friend</h2>
            <p className="text-xs text-muted-foreground">Tap someone to chat · follow studiers to see them on the leaderboard.</p>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Name or email..."
                value={friendQ}
                onChange={e => setFriendQ(e.target.value)}
                className="pl-9"
              />
            </div>
            {friendError && <p className="mt-2 text-xs font-semibold text-red-500">{friendError}</p>}
            <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto">
              {friendLoading ? (
                [1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)
              ) : (
                <>
                  {emailGuess && (
                    <div className="flex items-center gap-3 rounded-xl border border-dashed p-2.5">
                      <button onClick={() => startDm(emailGuess)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-black">@</span>
                        <span className="min-w-0 flex-1 truncate text-sm">{emailGuess}</span>
                      </button>
                      {dmBusy === emailGuess ? (
                        <span className="text-xs font-semibold text-muted-foreground">Opening…</span>
                      ) : followed.includes(emailGuess.toLowerCase()) ? (
                        <span className="text-xs font-bold text-emerald-600">Following ✓</span>
                      ) : (
                        <button onClick={() => followUser(emailGuess)} className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                          Follow
                        </button>
                      )}
                    </div>
                  )}
                  {matches.map(c => (
                    <div key={c.email} className="flex items-center gap-3 rounded-xl border p-2.5">
                      <button onClick={() => startDm(c.email)} title={`Chat with ${c.name || c.email}`} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-black">
                          {(c.name || c.email || '?').charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{c.name || c.email}</span>
                          {!!c.totalScore && <span className="block text-[11px] text-muted-foreground">{c.totalScore} pts</span>}
                        </span>
                      </button>
                      {dmBusy === c.email ? (
                        <span className="text-xs font-semibold text-muted-foreground">Opening…</span>
                      ) : followed.includes((c.email || '').toLowerCase()) ? (
                        <span className="text-xs font-bold text-emerald-600">Following ✓</span>
                      ) : (
                        <button onClick={() => followUser(c.email)} className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                          Follow
                        </button>
                      )}
                    </div>
                  ))}
                  {!matches.length && !emailGuess && (
                    <p className="py-6 text-center text-sm text-muted-foreground">No people found{fq ? ` for “${friendQ}”` : ''}.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
