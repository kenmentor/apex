'use client'

import { useEffect, useState } from 'react'
import { getToken, getUser } from '@/lib/auth'

const VAPID_PUBLIC_KEY = 'BLJ8XZqvsEwOsl4S6yj2zlmI5gQofHMg24B_MiQNv4YsBRPw9JyDT1SEVPHPYhTsmI_bpEV4b5fvB0P_W2-9fLk'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

async function subscribePush(reg) {
  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
    const token = getToken()
    if (token) {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })
    }
  } catch (err) {
    if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
      console.error('Push subscribe error:', err)
    }
  }
}

export default function ServiceWorkerRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.update()

      const interval = setInterval(() => reg.update(), 60000)

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true)
          }
        })
      })

      // Push subscription
      if ('PushManager' in window && Notification.permission === 'granted' && !subscribed) {
        subscribePush(reg)
        setSubscribed(true)
      }

      return () => clearInterval(interval)
    }).catch(() => {})

    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })
  }, [subscribed])

  // Permission request on auth
  useEffect(() => {
    const user = getUser()
    if (user && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((perm) => {
        if (perm === 'granted') {
          navigator.serviceWorker.ready.then((reg) => subscribePush(reg))
          setSubscribed(true)
        }
      })
    }
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
