'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { getUser } from '@/lib/auth'
import { trackEvent, getOrCreateSessionId, getPwaStatus } from '@/lib/tracking'

export function trackQuizEvent(event, data = {}) {
  const user = typeof getUser === 'function' ? getUser() : null
  trackEvent(event, { ...data, email: user?.email || null })
}

// One event per page: refresh/PWA ride along as fields, not events.
// No heartbeat — it was the highest-volume, lowest-value event we had.
export default function AnalyticsTracker() {
  const pathname = usePathname()
  const startTime = useRef(Date.now())

  useEffect(() => {
    if (!pathname) return

    const nav = performance.getEntriesByType('navigation')[0]
    trackEvent('page_view', {
      path: pathname,
      isRefresh: !!(nav && nav.type === 'reload'),
      isPwa: getPwaStatus(),
    })

    startTime.current = Date.now()
  }, [pathname])

  useEffect(() => {
    function handleUnload() {
      const duration = Math.round((Date.now() - startTime.current) / 1000)
      trackEvent('session_end', { duration })
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [])

  return null
}
