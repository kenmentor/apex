// Raw PCM tap for live lecture capture. Posts Float32Array frames to the
// main thread; resampling + windowing happen there. Loaded via
// audioContext.audioWorklet.addModule('/audio-capture.worklet.js').
class CaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs && inputs[0] && inputs[0][0]
    if (ch) {
      try { this.port.postMessage(ch.slice(0)) } catch {}
    }
    return true
  }
}

registerProcessor('apex-capture', CaptureProcessor)
