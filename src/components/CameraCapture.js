'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, X, RotateCcw, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [error, setError] = useState(null)

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        setCameraReady(true)
      }
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions or use file upload instead.')
    }
  }, [])

  useEffect(() => {
    startCamera()
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [startCamera])

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setPreview(dataUrl)
  }, [])

  const retake = useCallback(() => {
    setPreview(null)
  }, [])

  const confirm = useCallback(() => {
    if (!preview) return
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
    }
    fetch(preview)
      .then(r => r.blob())
      .then(blob => {
        const file = new File([blob], 'theory-answer.jpg', { type: 'image/jpeg' })
        onCapture(file, preview)
      })
  }, [preview, onCapture])

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-6">
        <div className="rounded-2xl bg-background p-8 text-center">
          <Camera className="mx-auto mb-4 size-12 text-muted-foreground" />
          <p className="mb-4 text-sm text-muted-foreground">{error}</p>
          <Button onClick={onClose} variant="outline">Close</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {!preview ? (
        <>
          <div className="relative flex-1 overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="size-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            <button
              onClick={onClose}
              className="absolute left-4 top-4 flex size-10 items-center justify-center rounded-full bg-black/50 text-white"
            >
              <X className="size-5" />
            </button>

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 pb-8">
              <p className="mb-3 text-center text-xs text-white/70">
                Position your answer clearly in the frame
              </p>
              <div className="flex justify-center">
                <button
                  onClick={capture}
                  disabled={!cameraReady}
                  className="flex size-16 items-center justify-center rounded-full border-4 border-white bg-white/20 transition-all hover:bg-white/30 disabled:opacity-50"
                >
                  <div className="size-12 rounded-full bg-white" />
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="relative flex-1 overflow-hidden">
            <img src={preview} alt="Captured answer" className="size-full object-contain bg-black" />

            <button
              onClick={onClose}
              className="absolute left-4 top-4 flex size-10 items-center justify-center rounded-full bg-black/50 text-white"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="flex gap-3 bg-black p-4">
            <Button
              onClick={retake}
              variant="outline"
              className="flex-1 border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              <RotateCcw className="mr-2 size-4" />
              Retake
            </Button>
            <Button
              onClick={confirm}
              className="flex-1 bg-green-600 text-white hover:bg-green-700"
            >
              <Check className="mr-2 size-4" />
              Use Photo
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
