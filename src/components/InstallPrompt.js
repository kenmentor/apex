'use client'

import { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true)
      return
    }

    // Already dismissed in this session
    if (sessionStorage.getItem('apex_install_dismissed')) return

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }

    const installedHandler = () => {
      setIsInstalled(true)
      setShowBanner(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
    }
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    setShowBanner(false)
    sessionStorage.setItem('apex_install_dismissed', '1')
  }

  if (isInstalled || !showBanner) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      padding: '14px 16px',
      background: 'linear-gradient(135deg, #130f40, #2c2c54)',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.2)',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff9f43" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Install Apex</div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Add to your home screen for quick access</div>
      </div>
      <button onClick={handleInstall} style={{
        background: '#ff9f43', color: '#130f40', border: 'none', borderRadius: 10,
        padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
        fontFamily: 'Poppins, sans-serif', flexShrink: 0,
      }}>Install</button>
      <button onClick={handleDismiss} style={{
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
        cursor: 'pointer', padding: 4, flexShrink: 0,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}
