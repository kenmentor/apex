'use client'

import { useEffect, useRef } from 'react'
import { trackRageClick, trackNetworkTransaction, trackRuntimeError } from '@/lib/telemetry'

export default function TelemetryProvider() {
  const rageRef = useRef({ x: 0, y: 0, count: 0, lastTime: 0, element: null })

  useEffect(() => {
    // ── 1. Rage Clicks ──
    const handlePointerDown = (e) => {
      const now = Date.now()
      const sameElement = e.target === rageRef.current.element
      const sameCoords = Math.abs(e.clientX - rageRef.current.x) <= 4 && Math.abs(e.clientY - rageRef.current.y) <= 4
      const fastEnough = now - rageRef.current.lastTime <= 600

      if (sameElement && sameCoords && fastEnough) {
        rageRef.current.count++
        if (rageRef.current.count >= 3) {
          const sel = e.target.tagName +
            (e.target.id ? '#' + e.target.id : '') +
            (e.target.className && typeof e.target.className === 'string' ? '.' + e.target.className.split(' ')[0] : '')
          trackRageClick({
            target_element_selector: sel,
            click_coordinates: `(${Math.round(e.clientX)}, ${Math.round(e.clientY)})`,
          })
          rageRef.current.count = 0
        }
      } else {
        rageRef.current = { x: e.clientX, y: e.clientY, count: 1, lastTime: now, element: e.target }
      }
    }

    // ── 2. API Roundtrip Latency ──
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const start = performance.now()
      try {
        const response = await originalFetch(...args)
        const duration = performance.now() - start
        if (duration > 1500) {
          const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown'
          trackNetworkTransaction({
            endpoint_url: url,
            duration_ms: Math.round(duration),
            http_status: response.status,
          })
        }
        return response
      } catch (err) {
        const duration = performance.now() - start
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || 'unknown'
        trackNetworkTransaction({
          endpoint_url: url,
          duration_ms: Math.round(duration),
          http_status: 0,
        })
        throw err
      }
    }

    // ── 3. Unhandled Runtime Crashes ──
    const handleError = (msg, source, lineno, colno, error) => {
      trackRuntimeError({
        error_message: msg || error?.message || 'unknown',
        stack_trace: error?.stack || '',
        active_view: window.location.pathname,
      })
    }

    const handleRejection = (event) => {
      trackRuntimeError({
        error_message: event.reason?.message || 'Unhandled Promise Rejection',
        stack_trace: event.reason?.stack || '',
        active_view: window.location.pathname,
      })
    }

    window.addEventListener('pointerdown', handlePointerDown, { capture: true })
    window.onerror = handleError
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true })
      window.onerror = null
      window.removeEventListener('unhandledrejection', handleRejection)
      window.fetch = originalFetch
    }
  }, [])

  return null
}
