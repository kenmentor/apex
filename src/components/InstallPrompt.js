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
  const [pageCount, setPageCount] = useState(0)
  const [dismissedCount, setDismissedCount] = useState(0)
  const shownThisSession = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsInstalled(true)
      return
    }

    const dismissTs = localStorage.getItem('apex_install_dismissed_ts')
    if (dismissTs) {
      const daysSince = (Date.now() - parseInt(dismissTs)) / (1000 * 60 * 60 * 24)
      if (daysSince < 3) return
    }

    const dismissCount = parseInt(localStorage.getItem('apex_install_dismiss_count') || '0')
    setDismissedCount(dismissCount)
    if (dismissCount >= 3) return

    const pv = parseInt(localStorage.getItem('apex_pageview_count') || '0')
    setPageCount(pv)

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      if (!shownThisSession.current && pageCount >= 2) {
        setShowBanner(true)
        shownThisSession.current = true
      }
    }

    const installedHandler = () => {
      setIsInstalled(true)
      setShowBanner(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)

    const interval = setInterval(() => {
      if (deferredPrompt && !shownThisSession.current && !showBanner) {
        const nowPv = parseInt(localStorage.getItem('apex_pageview_count') || '0')
        if (nowPv >= 2) {
          setShowBanner(true)
          shownThisSession.current = true
        }
      }
    }, 60000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    const pv = parseInt(localStorage.getItem('apex_pageview_count') || '0')
    localStorage.setItem('apex_pageview_count', pv + 1)
    setPageCount(pv + 1)
  }, [])

  useEffect(() => {
    if (showBanner && deferredPrompt) {
      const timer = setTimeout(() => {
        if (showBanner) {
          setShowBanner(false)
          shownThisSession.current = true
        }
      }, 10000)
      return () => clearTimeout(timer)
    }
  }, [showBanner, deferredPrompt])

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
      track('pwa_install', { outcome: 'accepted' })
    }
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    setShowBanner(false)
    shownThisSession.current = true
    const count = parseInt(localStorage.getItem('apex_install_dismiss_count') || '0') + 1
    localStorage.setItem('apex_install_dismiss_count', count.toString())
    localStorage.setItem('apex_install_dismissed_ts', Date.now().toString())
    setDismissedCount(count)
  }

  if (isInstalled || !showBanner || !deferredPrompt) return null

  return (
    <>
      <div
        onClick={handleDismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      />
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          background: 'linear-gradient(145deg, #1a1a2e, #16213e)',
          borderRadius: 24,
          padding: '28px 24px 20px',
          width: '88%', maxWidth: 340,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #ff9f43, #ff6b35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 8px 24px rgba(255,159,67,0.3)',
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </div>

        <div style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
          Install Apex
        </div>
        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12.5, lineHeight: 1.5, marginBottom: 20, padding: '0 6px' }}>
          Study anywhere, even offline. Take quizzes without internet and track your progress on the go.
        </div>

        <button
          onClick={handleInstall}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #ff9f43, #ff6b35)',
            color: '#fff',
            border: 'none',
            borderRadius: 14,
            padding: '14px 0',
            fontWeight: 800,
            fontSize: 15,
            letterSpacing: 1,
            cursor: 'pointer',
            fontFamily: 'Poppins, sans-serif',
            boxShadow: '0 6px 20px rgba(255,159,67,0.35)',
            marginBottom: 10,
          }}
        >
          INSTALL APP
        </button>

        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.25)',
            fontSize: 11,
            fontWeight: 500,
            cursor: 'pointer',
            padding: '6px 12px',
            fontFamily: 'Poppins, sans-serif',
            letterSpacing: 0.3,
          }}
        >
          Not now
        </button>
      </div>
    </>
  )
}
