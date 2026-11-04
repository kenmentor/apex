'use client'

import { useEffect, useRef } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { setUser, getUser, clearUser } from '@/lib/auth'

// Keeps the app's localStorage session in step with Clerk:
// - Clerk signed out (but local session exists) -> clear local, notify.
// - Clerk signed in (local missing/stale) -> bridge via /api/auth/clerk.
// Mounted once in the root layout. Idempotent and loop-safe.
export default function ClerkSync() {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const { user } = useUser()
  const syncing = useRef(false)
  const lastEmail = useRef(null)

  useEffect(() => {
    if (!isLoaded) return
    try {
      const local = getUser()
      if (!isSignedIn) {
        if (local) {
          clearUser()
          try { window.dispatchEvent(new Event('app-signed-out')) } catch {}
        }
        lastEmail.current = null
        return
      }
      const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || null
      if (!email) return
      if (lastEmail.current === `${userId}:${email}`) return
      if (local && String(local.email || '').toLowerCase() === email && local.token) {
        lastEmail.current = `${userId}:${email}`
        return
      }
      if (syncing.current) return
      syncing.current = true
      fetch('/api/auth/clerk', { method: 'POST' })
        .then(r => r.json().catch(() => ({})))
        .then(d => {
          if (d && d.token && d.email) {
            setUser({
              id: d.id, email: d.email, school: d.school || '', department: d.department || '',
              level: d.level || '', admin: !!d.admin, role: d.role || 'student',
              verified: !!d.verified, name: d.name || '', avatar: d.avatar || '',
              avatarConfig: d.avatarConfig || null, token: d.token,
            })
            try { localStorage.setItem('apex_last_email', d.email) } catch {}
            lastEmail.current = `${userId}:${email}`
            try { window.dispatchEvent(new Event('app-signed-in')) } catch {}
          }
        })
        .catch(() => {})
        .finally(() => { syncing.current = false })
    } catch {}
  }, [isLoaded, isSignedIn, userId, user])

  return null
}
