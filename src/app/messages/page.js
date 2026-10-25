'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MailOpen } from 'lucide-react'
import { getUser, getToken } from '@/lib/auth'

export default function MessagesPage() {
  const [user, setUser] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const u = getUser()
    setUser(u)
    if (!u) { setLoading(false); return }
    fetch('/api/notifications?limit=50', { headers: { Authorization: `Bearer ${getToken()}` }, cache: 'no-store' })
      .then(r => r.json())
      .then(d => setItems(d.docs || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function openMsg(m) {
    if (!m.read) {
      setItems(prev => prev.map(x => x._id === m._id ? { ...x, read: true } : x))
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ id: m._id }),
      }).catch(() => {})
    }
  }

  if (loading) return <div className="flex min-h-dvh items-center justify-center pb-24"><p className="text-sm text-muted-foreground">Loading messages…</p></div>

  if (!user) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-24 pt-6">
        <h1 className="text-xl font-bold">Messages</h1>
        <p className="text-sm text-muted-foreground">Sign in to see your messages.</p>
        <Link href="/auth" className="rounded-xl bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground">Sign In</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">Messages</h1>
      </div>
      {!items.length && (
        <div className="rounded-xl border p-6 text-center">
          <MailOpen className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-medium">No messages yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Nudges from study buddies, race results, and announcements land here.</p>
        </div>
      )}
      <ul className="space-y-2">
        {items.map(m => {
          const inner = (
            <li onClick={() => openMsg(m)} className={`cursor-pointer rounded-xl border p-3 ${m.read ? '' : 'border-primary/40 bg-primary/5'}`}>
              <p className="text-sm font-semibold">{m.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{m.message}</p>
              {!m.read && <span className="mt-1 inline-block rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">NEW</span>}
            </li>
          )
          return m.link ? <Link key={m._id} href={m.link}>{inner}</Link> : <div key={m._id}>{inner}</div>
        })}
      </ul>
    </div>
  )
}
