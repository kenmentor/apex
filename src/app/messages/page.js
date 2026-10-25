'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Retired: inbox lives in the Groups page now.
export default function MessagesRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/groups?tab=inbox') }, [router])
  return <div className="flex min-h-dvh items-center justify-center pb-24"><p className="text-sm text-muted-foreground">Opening inbox…</p></div>
}
