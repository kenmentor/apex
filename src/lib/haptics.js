// Subtle native-feel haptics via the vibration API (Android Chrome).
// NOTE: iPhone Safari does not implement navigator.vibrate at all, so no
// website can vibrate an iPhone — only a native app shell could. Keep every
// pattern >= 15ms: anything shorter is below what most motors can render,
// which is why the old 8ms tap felt like nothing.
const KEY = 'apex_haptics'

export function hapticsEnabled() {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function hapticsSupported() {
  try {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
  } catch {
    return false
  }
}

export function setHapticsEnabled(on) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {}
}

function buzz(pattern) {
  try {
    if (!hapticsEnabled()) return false
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false
    return navigator.vibrate(pattern)
  } catch { return false }
}

export const haptic = {
  // Light tap: successful toggles (likes, saves).
  tap: () => buzz(20),
  // Correct answer.
  success: () => buzz(30),
  // Wrong answer. Single firm burst — not a scolding.
  error: () => buzz(50),
  // Quiz complete. One gentle double-tap celebration.
  finish: () => buzz([25, 60, 25]),
}
