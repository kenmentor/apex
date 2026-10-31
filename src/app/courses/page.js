'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Retired: course browsing lives in My Files now.
export default function CoursesRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/folders') }, [router])
  return <div className="flex min-h-dvh items-center justify-center pb-24"><p className="text-sm text-muted-foreground">Opening My Files…</p></div>
}
