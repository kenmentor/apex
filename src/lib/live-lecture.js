// LiveLecture: mic → PCM worklet → 16kHz → overlapping WAV windows →
// your Cloudflare Whisper worker → deduped transcript segments.
//
// Capture, voice-activity gating, overlap reconciliation and retries all run
// on-device; only speech-bearing chunks travel, and only to your own worker
// (Bearer = Apex login token). No Cloudflare credentials in this file.
import { getToken } from './auth'

const WORKER_URL = process.env.NEXT_PUBLIC_WHISPER_URL || 'https://apex-whisper.davidnwachukwum.workers.dev'

const TARGET_SR = 16000
const WINDOW_S = 5
const STEP_S = 4
const MIN_FINAL_S = 1.5
const SILENCE_RMS = 0.008
const CHUNK_TIMEOUT_MS = 30000
const MAX_CONSEC_ERRORS = 3

// Drop the first k words of `next` when they repeat the tail of `prev`.
export function stripOverlap(prev, next, maxWords = 14) {
  const norm = (s) =>
    String(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
  const pw = norm(prev)
  const nw = norm(next)
  if (!pw.length || !nw.length) return next
  for (let n = Math.min(maxWords, pw.length, nw.length); n > 0; n--) {
    if (pw.slice(-n).join(' ') === nw.slice(0, n).join(' ')) {
      return String(next).split(/\s+/).slice(n).join(' ')
    }
  }
  return next
}

function rmsOf(pcm) {
  if (!pcm || !pcm.length) return 0
  let s = 0
  for (let i = 0; i < pcm.length; i++) s += pcm[i] * pcm[i]
  return Math.sqrt(s / pcm.length)
}

// Whisper hallucinates stage directions on noise ([inaudible], *chuckling*,
// "!!!", word loops). Strip the junk; null means "drop this window".
export function cleanTranscript(raw, prevClean) {
  let t = String(raw || '').trim()
  if (!t) return null
  // Stage directions + sound tags in any bracket style.
  t = t.replace(/\[[^\]]*\]|\([^)]*\)|\*[a-z][a-z\s]*\*/gi, ' ')
  // Punctuation-only outbursts.
  t = t.replace(/[!?]{2,}/g, ' ')
  t = t.replace(/\s+/g, ' ').trim()
  if (!t || !/[a-z0-9]/i.test(t)) return null
  // Word-loop collapse: "sorry sorry sorry…" or repeated phrases.
  const words = t.split(' ')
  if (words.length >= 3) {
    const uniq = new Set(words.map(w => w.toLowerCase()))
    if (uniq.size <= Math.max(1, Math.floor(words.length / 3))) return null
  }
  // Exact repeat of the previous segment: a stuck loop, not new speech.
  if (prevClean && t.toLowerCase() === String(prevClean).toLowerCase()) return null
  return t
}

function resampleTo16k(input, fromSr) {
  if (fromSr === TARGET_SR) return input
  const ratio = fromSr / TARGET_SR
  const outLen = Math.max(1, Math.floor(input.length / ratio))
  const out = new Float32Array(outLen)
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio
    const i0 = Math.floor(pos)
    const i1 = Math.min(input.length - 1, i0 + 1)
    const frac = pos - i0
    out[i] = input[i0] * (1 - frac) + input[i1] * frac
  }
  return out
}

// 16-bit mono WAV — the one format every speech backend takes.
function encodeWav(pcm) {
  const n = pcm.length
  const buf = new ArrayBuffer(44 + n * 2)
  const v = new DataView(buf)
  const wstr = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  wstr(0, 'RIFF')
  v.setUint32(4, 36 + n * 2, true)
  wstr(8, 'WAVE')
  wstr(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 1, true)
  v.setUint32(24, TARGET_SR, true)
  v.setUint32(28, TARGET_SR * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  wstr(36, 'data')
  v.setUint32(40, n * 2, true)
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([buf], { type: 'audio/wav' })
}

export class LiveLecture {
  constructor({ onResult, onState, onTick }) {
    this.onResult = onResult
    this.onState = onState
    this.onTick = onTick
    this.ctx = null
    this.stream = null
    this.running = false
    this.stopping = false
    this.sending = false
    this.queue = [] // [{ id, pcm }]
    this.segSeq = 0
    this.pending16k = [] // Float32Array chunks at 16k
    this.pendingLen = 0
    this.lastTail = ''
    this.lastClean = ''
    this.lastSpeechAt = 0
    this.consecErrors = 0
    this.elapsed = 0
    this.tickTimer = null
    this.dead = false
  }

  emitState(status, message) {
    try { this.onState?.(status, message) } catch {}
  }

  static supported() {
    try {
      return !!(navigator.mediaDevices?.getUserMedia && window.AudioContext)
    } catch {
      return false
    }
  }

  async start() {
    if (!LiveLecture.supported()) {
      throw new Error('Live notes need Chrome or Edge on HTTPS. Your browser cannot capture mic audio.')
    }
    const token = getToken()
    if (!token) throw new Error('Log in to use live notes.')
    this.dead = false
    this.emitState('starting')
    // Mic first: the permission prompt must sit inside the tap gesture.
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        // Lecture = distant speech. Echo cancellation fights room audio and
        // pumps artifacts; suppression + gain stay on for noise and level.
        audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true },
      })
    } catch {
      this.cleanup()
      throw new Error('Microphone blocked. Allow mic access, then tap the mic again.')
    }
    if (this.dead) { stream.getTracks().forEach(t => t.stop()); return }
    this.stream = stream

    const Ctx = window.AudioContext
    const ctx = new Ctx()
    this.ctx = ctx
    try {
      await ctx.audioWorklet.addModule('/audio-capture.worklet.js')
    } catch {
      this.cleanup()
      throw new Error('Audio engine failed to load. Reload and try again.')
    }
    if (this.dead) return this.cleanup()

    const src = ctx.createMediaStreamSource(stream)
    const node = new AudioWorkletNode(ctx, 'apex-capture')
    const sink = ctx.createGain()
    sink.gain.value = 0
    src.connect(node)
    node.connect(sink)
    sink.connect(ctx.destination)
    node.port.onmessage = (e) => this.pushFrames(e.data, ctx.sampleRate)

    // Mobile browsers park fresh AudioContexts in 'suspended' — without an
    // explicit resume no frames ever arrive and the mic looks dead.
    try { await ctx.resume() } catch {}

    this.running = true
    this.lastSpeechAt = Date.now()
    this.emitState('listening')
    this.tickTimer = setInterval(() => {
      this.elapsed += 1
      try {
        const quiet = this.running ? Math.floor((Date.now() - (this.lastSpeechAt || Date.now())) / 1000) : 0
        this.onTick?.(this.elapsed, quiet)
      } catch {}
    }, 1000)
  }

  pushFrames(frame, sampleRate) {
    if (!this.running || this.dead) return
    try {
      const mono = resampleTo16k(frame, sampleRate)
      this.pending16k.push(mono)
      this.pendingLen += mono.length
      this.pumpWindows()
    } catch {}
  }

  concatPending() {
    const out = new Float32Array(this.pendingLen)
    let off = 0
    for (const c of this.pending16k) {
      out.set(c, off)
      off += c.length
    }
    return out
  }

  pumpWindows() {
    const WIN = WINDOW_S * TARGET_SR
    const STEP = STEP_S * TARGET_SR
    while (this.pendingLen >= WIN) {
      const all = this.concatPending()
      const win = all.slice(0, WIN)
      const rest = all.slice(STEP)
      this.pending16k = rest.length ? [rest] : []
      this.pendingLen = rest.length
      // Silence gate: quiet windows never travel — that's where
      // "[inaudible]" hallucinations come from, and it saves data.
      if (rmsOf(win) >= SILENCE_RMS) {
        this.lastSpeechAt = Date.now()
        this.queue.push({ id: `seg-${Date.now()}-${this.segSeq++}`, pcm: win })
      }
    }
    // Cap the backlog (~25s): stale audio is worse than dropped audio for
    // anything calling itself live.
    while (this.queue.length > 5) this.queue.shift()
    this.pumpQueue()
  }

  pumpQueue() {
    if (this.sending || !this.queue.length || this.dead) return
    const job = this.queue.shift()
    this.sending = true
    this.sendJob(job)
      .then((text) => {
        this.sending = false
        this.consecErrors = 0
        const cleaned = cleanTranscript(text, this.lastClean)
        if (cleaned) {
          this.lastClean = cleaned
          const deduped = stripOverlap(this.lastTail, cleaned).trim()
          this.lastTail = `${this.lastTail} ${cleaned}`.trim().split(/\s+/).slice(-40).join(' ')
          if (deduped) {
            try { this.onResult?.({ id: job.id, text: deduped }) } catch {}
          }
        }
        if (this.stopping && !this.queue.length) this.finish()
        else this.pumpQueue()
      })
      .catch((err) => {
        this.sending = false
        if (err && err.fatal) {
          // Auth died mid-lecture: stop cleanly, keep the transcript.
          this.queue = []
          this.finish(err.message || 'Session expired — log in again.')
          return
        }
        this.consecErrors += 1
        if (this.consecErrors >= MAX_CONSEC_ERRORS) {
          this.queue = []
          this.finish('Connection lost — check internet. Everything so far is saved.')
          return
        }
        // One bad chunk never kills the session.
        if (this.stopping && !this.queue.length) this.finish()
        else this.pumpQueue()
      })
  }

  async sendJob(job) {
    const token = getToken()
    if (!token) {
      const e = new Error('Session expired — log in again.')
      e.fatal = true
      throw e
    }
    const wav = encodeWav(job.pcm)
    let res
    try {
      res = await fetch(`${WORKER_URL}/transcribe`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'audio/wav' },
        body: wav,
        signal: AbortSignal.timeout(CHUNK_TIMEOUT_MS),
      })
    } catch {
      throw new Error('network')
    }
    if (res.status === 401) {
      const e = new Error('Session expired — log in again.')
      e.fatal = true
      throw e
    }
    if (res.status === 403) {
      const e = new Error('This app address is blocked — contact support.')
      e.fatal = true
      throw e
    }
    if (res.status === 429) throw new Error('rate')
    if (!res.ok) throw new Error(`worker-${res.status}`)
    const d = await res.json().catch(() => ({}))
    return String(d.text || '').trim()
  }

  pause() {
    if (!this.running) return
    this.running = false
    try { clearInterval(this.tickTimer) } catch {}
    try { this.ctx?.suspend() } catch {}
    this.emitState('paused')
  }

  resume() {
    if (this.dead || this.running) return
    this.running = true
    this.lastSpeechAt = Date.now()
    try { this.ctx?.resume() } catch {}
    this.tickTimer = setInterval(() => {
      this.elapsed += 1
      try {
        const quiet = this.running ? Math.floor((Date.now() - (this.lastSpeechAt || Date.now())) / 1000) : 0
        this.onTick?.(this.elapsed, quiet)
      } catch {}
    }, 1000)
    this.emitState('listening')
  }

  async stop() {
    if (this.dead) return
    this.stopping = true
    this.running = false
    this.emitState('stopping')
    try { clearInterval(this.tickTimer) } catch {}
    // Flush leftover audio (≥1.5s) as one final window.
    try {
      const MIN = Math.floor(MIN_FINAL_S * TARGET_SR)
      if (this.pendingLen >= MIN) {
        const all = this.concatPending()
        this.pending16k = []
        this.pendingLen = 0
        if (rmsOf(all) >= SILENCE_RMS) {
          this.queue.push({ id: `seg-${Date.now()}-${this.segSeq++}`, pcm: all })
          this.pumpQueue()
        }
      }
    } catch {}
    try { this.stream?.getTracks().forEach(t => t.stop()) } catch {}
    try { await this.ctx?.close() } catch {}
    if (!this.queue.length && !this.sending) this.finish()
  }

  finish(message) {
    if (this.dead) return
    this.dead = true
    this.cleanup()
    this.emitState(message ? 'error' : 'idle', message)
  }

  cleanup() {
    this.running = false
    try { clearInterval(this.tickTimer) } catch {}
    try { this.stream?.getTracks().forEach(t => t.stop()) } catch {}
    this.stream = null
    try { this.ctx?.close() } catch {}
    this.ctx = null
    this.queue = []
    this.pending16k = []
    this.pendingLen = 0
  }

  destroy() {
    this.dead = true
    this.cleanup()
  }
}

export function formatElapsed(sec) {
  const s = Math.max(0, Math.floor(sec || 0))
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m % 60)}:${pad(s % 60)}` : `${pad(m)}:${pad(s)}`
}
