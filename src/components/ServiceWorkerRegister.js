'use client'

import { useEffect, useState } from 'react'

export default function ServiceWorkerRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Check for updates every 60 seconds
      const interval = setInterval(() => reg.update(), 60000)

      // Listen for new service worker installing
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true)
          }
        })
      })

      return () => clearInterval(interval)
    }).catch(() => {})

    // Listen for controlling change
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })
  }, [])

  if (!updateAvailable) return null

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 10000,
      padding: '14px 16px', borderRadius: 16,
      background: 'linear-gradient(135deg, #130f40, #2c2c54)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Update Available</div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Tap to load the latest version</div>
      </div>
      <button onClick={() => {
        navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' })
        setUpdateAvailable(false)
      }} style={{
        background: '#ff9f43', color: '#130f40', border: 'none', borderRadius: 10,
        padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
        fontFamily: 'Poppins, sans-serif', flexShrink: 0,
      }}>Reload</button>
    </div>
  )
}
