'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { clearUser, getUser } from '@/lib/auth'

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    const u = getUser()
    if (u?.email) localStorage.setItem('apex_last_email', u.email)
    clearUser()
    router.replace('/auth')
  }, [])

  return null
}
