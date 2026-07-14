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

function getPwaStatus() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function trackAnalytics(event, data = {}) {
  try {
    const sessionId = getOrCreateSessionId()
    const user = getUser()
    const payload = {
      event,
      data: { ...data, sessionId, email: user?.email || null, userAgent: navigator.userAgent },
    }
    const body = JSON.stringify(payload)
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', new Blob([body], { type: 'application/json' }))
    } else {
      fetch('/api/analytics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
    }
  } catch {}
}

function trackNew(event, metadata = {}) {
  try {
    const sid = getOrCreateSessionId()
    fetch('/api/track', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, sessionId: sid, path: window.location.pathname, isPwa: getPwaStatus(), metadata }),
      keepalive: true,
    }).catch(() => {})
  } catch {}
}

export function trackQuizEvent(event, data = {}) {
  trackAnalytics(event, data)
}

export default function AnalyticsTracker() {
  const pathname = usePathname()
  const startTime = useRef(Date.now())
  const hasTrackedPageview = useRef(false)

  useEffect(() => {
    if (!pathname) return

    const nav = performance.getEntriesByType('navigation')[0]
    const isRefresh = nav && nav.type === 'reload'

    trackAnalytics('pageview', { path: pathname })
    if (isRefresh) trackNew('page_refresh', { path: pathname })
    if (getPwaStatus()) trackNew('pwa_active', { path: pathname })
    trackNew('page_view', { path: pathname })

    startTime.current = Date.now()
    hasTrackedPageview.current = true
  }, [pathname])

  useEffect(() => {
    function handleUnload() {
      const duration = Math.round((Date.now() - startTime.current) / 1000)
      trackAnalytics('session_end', { duration })
      trackNew('session_end', { duration })
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      trackNew('heartbeat')
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  return null
}
