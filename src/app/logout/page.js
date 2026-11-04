'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { clearUser, getUser } from '@/lib/auth'

export default function LogoutPage() {
  const router = useRouter()
  const { isLoaded, isSignedIn, signOut } = useAuth()

  useEffect(() => {
    if (!isLoaded) return
    ;(async () => {
      try {
        const u = getUser()
        if (u?.email) {
          try { localStorage.setItem('apex_last_email', u.email) } catch {}
        }
        clearUser()
        if (isSignedIn) await signOut()
      } catch {}
      router.replace('/auth')
    })()
  }, [isLoaded, isSignedIn, signOut, router])

  return null
}
