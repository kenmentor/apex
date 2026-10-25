'use client'

import { useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { isMuted, setMuted, sfx } from '@/lib/sfx'

// Standard mute toggle for every game header.
export default function SfxToggle() {
  const [muted, setM] = useState(() => isMuted())
  function toggle() {
    const next = !muted
    setM(next)
    setMuted(next)
    if (!next) sfx('click')
  }
  return (
    <button onClick={toggle} title={muted ? 'Unmute sounds' : 'Mute sounds'} className="ml-auto flex size-9 items-center justify-center rounded-lg hover:bg-muted">
      {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
    </button>
  )
}
