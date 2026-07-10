'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { getUser } from '@/lib/auth'

function getOrCreateSessionId() {
  try {
    let id = sessionStorage.getItem('apex_session_id')
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36)
      sessionStorage.setItem('apex_session_id', id)
    }
    return id
  } catch {
    return 'fallback'
  }
}

function track(event, data = {}) {
  try {
    const sessionId = getOrCreateSessionId()
    const user = getUser()
    const payload = {
      event,
      data: {
        ...data,
        sessionId,
        email: user?.email || null,
        userAgent: navigator.userAgent,
      },
    }
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      navigator.sendBeacon('/api/analytics', blob)
    } else {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {})
    }
  } catch {}
}

export function trackQuizEvent(event, data = {}) {
  track(event, data)
}

export default function AnalyticsTracker() {
  const pathname = usePathname()
  const startTime = useRef(Date.now())
  const hasTrackedPageview = useRef(false)

  // Track pageview on route change
  useEffect(() => {
    if (!pathname) return
    track('pageview', { path: pathname })
    startTime.current = Date.now()
    hasTrackedPageview.current = true
  }, [pathname])

  // Track session duration on unload
  useEffect(() => {
    function handleUnload() {
      const duration = Math.round((Date.now() - startTime.current) / 1000)
      track('session_end', { duration })
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [])

  return null
}
