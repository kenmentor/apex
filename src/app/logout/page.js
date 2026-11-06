'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { clearUser, getUser } from '@/lib/auth'

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    const u = getUser()
    if (u?.email) {
      try { localStorage.setItem('apex_last_email', u.email) } catch {}
    }
    clearUser()
    import('@/lib/firebase').then(m => m.firebaseSignOut()).catch(() => {})
    router.replace('/auth')
  }, [router])

  return null
}
