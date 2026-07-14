'use client'

import { useState, useEffect, useRef } from 'react'

function track(event, metadata = {}) {
  try {
    const sid = sessionStorage.getItem('_sid') || crypto.randomUUID()
    sessionStorage.setItem('_sid', sid)
    fetch('/api/track', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event, sessionId: sid,
        path: window.location.pathname,
        isPwa: window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true,
        metadata,
      }),
      keepalive: true,
    }).catch(() => {})
  } catch {}
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const mounted = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Already installed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true)
      return
    }

    // Frequency cap: show max 3 times, then wait 7 days
    const dismissCount = parseInt(localStorage.getItem('apex_install_dismiss_count') || '0')
    if (dismissCount >= 3) {
      const lastDismiss = localStorage.getItem('apex_install_dismissed_ts')
      if (lastDismiss) {
        const daysSince = (Date.now() - parseInt(lastDismiss)) / (1000 * 60 * 60 * 24)
        if (daysSince < 7) return
        localStorage.setItem('apex_install_dismiss_count', '0')
      }
    }

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    const installedHandler = () => {
      setIsInstalled(true)
      setShowBanner(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)

    // Show banner after 4s on first visit, or 2s on return visit
    const visitCount = parseInt(sessionStorage.getItem('apex_visit_count') || '0') + 1
    sessionStorage.setItem('apex_visit_count', visitCount.toString())

    const delay = visitCount <= 1 ? 4000 : 2000
    mounted.current = true

    const showTimer = setTimeout(() => {
      if (mounted.current) {
        setShowBanner(true)
      }
    }, delay)

    return () => {
      mounted.current = false
      clearTimeout(showTimer)
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  async function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      setDeferredPrompt(null)
      if (outcome === 'accepted') {
        setShowBanner(false)
        track('pwa_install', { outcome: 'accepted' })
        return
      }
    }
    // Fallback: show install instructions
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    if (isIOS) {
      alert('Tap the Share button → Add to Home Screen')
    } else {
      alert('Open browser menu → Install App / Add to Home Screen')
    }
    setShowBanner(false)
  }

  function handleDismiss() {
    setShowBanner(false)
    const count = parseInt(localStorage.getItem('apex_install_dismiss_count') || '0') + 1
    localStorage.setItem('apex_install_dismiss_count', count.toString())
    localStorage.setItem('apex_install_dismissed_ts', Date.now().toString())
  }

  if (isInstalled || !showBanner) return null

  return (
    <>
      <div
        onClick={handleDismiss}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
      />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-[88%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 text-center shadow-2xl"
        style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}
      >
        <div
          className="mx-auto mb-3.5 flex size-14 items-center justify-center rounded-2xl"
          style={{ background: 'linear-gradient(135deg, #ff9f43, #ff6b35)', boxShadow: '0 8px 24px rgba(255,159,67,0.3)' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </div>

        <h2 className="mb-1 text-lg font-bold text-white">Install Apex</h2>
        <p className="mb-5 text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Study anywhere, even offline. Take quizzes without internet and track your progress on the go.
        </p>

        <button
          onClick={handleInstall}
          className="mb-2.5 w-full rounded-xl py-3.5 text-sm font-extrabold tracking-wide text-white"
          style={{ background: 'linear-gradient(135deg, #ff9f43, #ff6b35)', boxShadow: '0 6px 20px rgba(255,159,67,0.35)' }}
        >
          INSTALL APP
        </button>

        <button
          onClick={handleDismiss}
          className="w-full cursor-pointer border-none bg-transparent px-3 py-1.5 text-xs font-medium tracking-wide"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          Not now
        </button>
      </div>
    </>
  )
}
