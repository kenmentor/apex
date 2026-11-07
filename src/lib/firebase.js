'use client'

// Firebase web app (apex-e9c78). Public config by design — the apiKey is
// NOT a secret. Auth (Google) + Analytics only; the app's MongoDB users
// collection remains the user base of record.
import { initializeApp, getApps } from 'firebase/app'

// Same-domain auth helper proxy (next.config.mjs rewrite + in-app fallback
// route at src/app/__/auth/[[...path]]/route.js): the Firebase helper runs
// on our own origin so browsers can't block its storage. Firebase console
// → Authentication → Settings → Authorized domains must list EVERY domain
// serving the app. Localhost uses the firebaseapp.com helper directly.
function resolveAuthDomain() {
  try {
    if (typeof window !== 'undefined') {
      const h = window.location.hostname || ''
      if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost')) {
        return 'apex-e9c78.firebaseapp.com'
      }
      if (h) return h
    }
  } catch {}
  return 'apex-tau-gules.vercel.app'
}

const firebaseConfig = {
  apiKey: 'AIzaSyDgPYyFxDGMFW4GpERNflbkEAoKxgaFRiw',
  authDomain: resolveAuthDomain(),
  projectId: 'apex-e9c78',
  storageBucket: 'apex-e9c78.firebasestorage.app',
  messagingSenderId: '879742774988',
  appId: '1:879742774988:web:c419d97d74c89e3f211c69',
  measurementId: 'G-V6CP94G9JM',
}

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

let analyticsStarted = false
export function startAnalytics() {
  if (analyticsStarted || typeof window === 'undefined') return
  analyticsStarted = true
  import('firebase/analytics')
    .then(({ getAnalytics, isSupported }) =>
      isSupported()
        .then(ok => { if (ok) getAnalytics(firebaseApp) })
        .catch(() => {})
    )
    .catch(() => {})
}

function isMobileFlow() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  if (/Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent || '')) return true
  try {
    return (navigator.maxTouchPoints > 0 && Math.min(window.screen.width, window.screen.height) < 820)
  } catch { return false }
}

// True inside WhatsApp/Instagram/Facebook/TikTok-style in-app browsers,
// whose storage is walled off per-app (sessions can't stick, popups escape
// to the system browser). PWA standalone and real browsers return false.
export function isInAppBrowser() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  try {
    if (window.matchMedia?.('(display-mode: standalone)').matches) return false
    if (navigator.standalone) return false
  } catch {}
  const ua = navigator.userAgent || ''
  if (/FBAN|FBIO|FBAV|Instagram|WhatsApp|Line\/|Twitter|TikTok|Snapchat|Pinterest|WeChat|MicroMessenger|KAKAOTALK|NAVER|Viber|Telegram/i.test(ua)) return true
  // Android WebView (wv) and iOS WKWebView without Safari identity.
  if (/Android/i.test(ua) && /; wv\)/.test(ua)) return true
  if (/iPhone|iPad|iPod/i.test(ua) && /Version\//.test(ua) && !/Safari\//.test(ua)) return true
  return false
}

function toActionableAuthError(e) {
  const host = (() => {
    try { return window.location.hostname } catch { return '(unknown host)' }
  })()
  if (e?.code === 'auth/unauthorized-domain') {
    const err = new Error(
      `Google sign-in blocked: "${host}" is not an authorized domain. ` +
      `Add it in Firebase console → Authentication → Settings → Authorized domains, ` +
      `then check https://${host}/__/auth/handler loads.`
    )
    err.code = e.code
    return err
  }
  if (e?.code === 'auth/operation-not-allowed') {
    const err = new Error('Google sign-in is off in Firebase console → Sign-in method. Enable the Google provider.')
    err.code = e.code
    return err
  }
  if (e?.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
    const err = new Error('Firebase API key rejected. Check the web-app config in Firebase console.')
    err.code = e.code
    return err
  }
  return e
}

async function getPersistentAuth() {
  const { getAuth, setPersistence, browserLocalPersistence } = await import('firebase/auth')
  const auth = getAuth(firebaseApp)
  // Redirect flow stores a pending key before leaving; without explicit
  // local persistence Safari/ITP can drop it and getRedirectResult()
  // returns null after a successful Google trip (user stuck on sign-in).
  try { await setPersistence(auth, browserLocalPersistence) } catch {}
  return auth
}

export async function googleSignIn() {
  const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } =
    await import('firebase/auth')
  const auth = await getPersistentAuth()
  const provider = new GoogleAuthProvider()
  try { provider.setCustomParameters({ prompt: 'select_account' }) } catch {}
  // Mobile: popups open as detached tabs that can never report back to the
  // opener — go redirect-only so the whole flow stays in ONE tab.
  if (!isMobileFlow()) {
    try {
      const cred = await signInWithPopup(auth, provider)
      return await cred.user.getIdToken()
    } catch (e) {
      if (e?.code !== 'auth/popup-blocked' && e?.code !== 'auth/popup-closed-by-user'
        && e?.code !== 'auth/cancelled-popup-request') throw toActionableAuthError(e)
      if (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') throw e
    }
  }
  try {
    await signInWithRedirect(auth, provider)
  } catch (e) {
    throw toActionableAuthError(e)
  }
  return null // resolves after redirect back
}

// Completes a redirect sign-in on return (returns ID token or null).
// Errors propagate so the caller can show them — never swallow silently.
// Capped at 15s: getRedirectResult can hang on flaky networks, and an
// uncapped hang leaves the user staring at a spinner (the "shaky" feeling).
export async function completeRedirectSignIn(timeoutMs = 15000) {
  const { getRedirectResult } = await import('firebase/auth')
  const auth = await getPersistentAuth()
  let res
  try {
    res = await Promise.race([
      getRedirectResult(auth),
      new Promise((_, reject) =>
        setTimeout(() => {
          const e = new Error('Sign-in return is taking too long — tap Google again.')
          e.code = 'auth/timeout'
          reject(e)
        }, timeoutMs)
      ),
    ])
  } catch (e) {
    throw toActionableAuthError(e)
  }
  if (!res?.user) return null
  return await res.user.getIdToken()
}

export async function firebaseSignOut() {
  try {
    const { getAuth } = await import('firebase/auth')
    await getAuth(firebaseApp).signOut()
  } catch {}
}
