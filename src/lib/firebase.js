'use client'

// Firebase web app (apex-e9c78). Public config by design — the apiKey is
// NOT a secret. Auth (Google) + Analytics only; the app's MongoDB users
// collection remains the user base of record.
import { initializeApp, getApps } from 'firebase/app'

const firebaseConfig = {
  apiKey: 'AIzaSyDgPYyFxDGMFW4GpERNflbkEAoKxgaFRiw',
  // Fixed production host: exactly ONE handler URI to authorize in Google
  // Cloud (https://apex-tau-gules.vercel.app/__/auth/handler), and it also
  // serves dev (the handler bounces back to the initiating localhost URL).
  authDomain: 'apex-tau-gules.vercel.app',
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

export async function googleSignIn() {
  const { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect } =
    await import('firebase/auth')
  const auth = getAuth(firebaseApp)
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  // Popup is smoother on desktop; it throws on blocked popups/mobile PWA —
  // fall through to redirect in that case.
  try {
    const cred = await signInWithPopup(auth, provider)
    return await cred.user.getIdToken()
  } catch (e) {
    if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') {
      await signInWithRedirect(auth, provider)
      return null // resolves after redirect back
    }
    throw e
  }
}

// Completes a redirect sign-in on return (returns ID token or null).
// Errors propagate so the caller can show them — never swallow silently.
export async function completeRedirectSignIn() {
  const { getAuth, getRedirectResult } = await import('firebase/auth')
  const res = await getRedirectResult(getAuth(firebaseApp))
  if (!res?.user) return null
  return await res.user.getIdToken()
}

export async function firebaseSignOut() {
  try {
    const { getAuth } = await import('firebase/auth')
    await getAuth(firebaseApp).signOut()
  } catch {}
}
