// Subtle native-feel haptics (Android vibration / iOS Taptic via the
// vibration API where supported). Short bursts ONLY — long or repeated
// patterns feel uncomfortable fast, so every helper here stays under ~30ms
// except the single finish celebration. All no-ops where unsupported or
// when the user opts out in Settings.
const KEY = 'apex_haptics'

export function hapticsEnabled() {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function setHapticsEnabled(on) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {}
}

function buzz(pattern) {
  try {
    if (!hapticsEnabled()) return
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
    navigator.vibrate(pattern)
  } catch {}
}

export const haptic = {
  // Light tap: successful toggles (likes, saves).
  tap: () => buzz(8),
  // Correct answer.
  success: () => buzz(15),
  // Wrong answer. Single short burst — not a scolding.
  error: () => buzz(25),
  // Quiz complete. One gentle double-tap celebration.
  finish: () => buzz([15, 50, 15]),
}
