// Tiny WebAudio synth for game feedback — no audio assets needed.
// Sounds: pop (snap), correct (ding), wrong (buzz), win (arpeggio), click.
let ctx = null
const KEY = 'sfx-muted'

export function isMuted() {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

export function setMuted(m) {
  try { localStorage.setItem(KEY, m ? '1' : '0') } catch {}
}

function ac() {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq, dur = 0.12, type = 'sine', vol = 0.12, delay = 0) {
  const c = ac()
  if (!c) return
  const t = c.currentTime + delay
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain)
  gain.connect(c.destination)
  osc.start(t)
  osc.stop(t + dur + 0.05)
}

export function sfx(name) {
  if (isMuted()) return
  try {
    if (name === 'pop') {
      tone(520, 0.08, 'triangle', 0.14)
      tone(780, 0.1, 'triangle', 0.1, 0.05)
    } else if (name === 'correct') {
      tone(660, 0.1, 'sine', 0.14)
      tone(880, 0.14, 'sine', 0.14, 0.08)
    } else if (name === 'wrong') {
      tone(200, 0.18, 'sawtooth', 0.08)
      tone(150, 0.2, 'sawtooth', 0.08, 0.1)
    } else if (name === 'win') {
      ;[523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.13, i * 0.11))
    } else if (name === 'fail') {
      ;[392, 330, 262].forEach((f, i) => tone(f, 0.16, 'sine', 0.1, i * 0.12))
    } else if (name === 'click') {
      tone(440, 0.05, 'square', 0.05)
    } else if (name === 'flip') {
      tone(500, 0.06, 'triangle', 0.09)
    }
  } catch {}
}
