'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { getUser } from '@/lib/auth'
import { trackEvent, getOrCreateSessionId, getPwaStatus } from '@/lib/tracking'

export function trackQuizEvent(event, data = {}) {
  const user = typeof getUser === 'function' ? getUser() : null
  trackEvent(event, { ...data, email: user?.email || null })
}

export default function AnalyticsTracker() {
  const pathname = usePathname()
  const startTime = useRef(Date.now())

  useEffect(() => {
    if (!pathname) return

    const nav = performance.getEntriesByType('navigation')[0]
    const isRefresh = nav && nav.type === 'reload'

    trackEvent('page_view', { path: pathname })
    if (isRefresh) trackEvent('page_refresh', { path: pathname })
    if (getPwaStatus()) trackEvent('pwa_active', { path: pathname })

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

  useEffect(() => {
    const interval = setInterval(() => {
      trackEvent('heartbeat')
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  return null
}
