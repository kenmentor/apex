'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Lock, Users, FileText, Search, BookOpen } from 'lucide-react'
import { getUser, getToken } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

const TAG_STYLES = {
  'Past Questions': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  'Notes': 'bg-green-500/10 text-green-600 dark:text-green-400',
  'Videos': 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  'Textbooks': 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  'General': 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
}

export default function GroupsPage() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [user, setUser] = useState(null)

  useEffect(() => {
    setUser(getUser())
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
  }, [])

  const q = search.toLowerCase()
  const filtered = groups.filter(g =>
    g.name?.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q)
  )

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background pb-24">
        <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <h1 className="flex-1 text-base font-bold">Groups</h1>
        </header>
        <div className="mx-auto w-full max-w-2xl space-y-4 px-5 pt-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background pb-24">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <h1 className="flex-1 text-base font-bold">Groups</h1>
          {user && (
          <Link href="/groups/create" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            New Group
          </Link>
        )}
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-5 px-5 pt-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {!user && (
          <div className="rounded-xl border border-dashed p-5 text-center space-y-2">
            <p className="text-sm text-muted-foreground">Sign in to create and join study groups</p>
            <Link href="/auth" className="inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
              Sign In
            </Link>
          </div>
        )}

        {filtered.length === 0 ? (
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
    </div>
  )
}
