'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Retired: notifications live in the Groups inbox tab now.
export default function NotificationsRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/groups?tab=inbox') }, [router])
  return <div className="flex min-h-dvh items-center justify-center pb-24"><p className="text-sm text-muted-foreground">Opening inbox…</p></div>
}
