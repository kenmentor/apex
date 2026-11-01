'use client'

import { X } from 'lucide-react'
import { resolveUserAvatar } from '@/lib/dice-avatar'
import { RoleSeal } from '@/components/UserAvatar'

// WhatsApp-style fullscreen avatar: tap the sidebar avatar, photo takes the
// screen on near-black. Tap anywhere or X to close.
export default function AvatarViewer({ user, onClose }) {
  const resolved = resolveUserAvatar(user)
  const initial = (user?.name?.[0] || user?.email?.[0] || 'A').toUpperCase()

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black/95" onClick={onClose}>
      <div className="flex items-center gap-3 p-4">
        <button aria-label="Close photo" className="flex size-10 items-center justify-center rounded-full text-white hover:bg-white/10">
          <X className="size-6" />
        </button>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-[15px] font-bold text-white">
            <span className="truncate">{user?.name || user?.email || 'Guest'}</span>
            <RoleSeal role={user?.admin ? 'admin' : user?.role} size="size-4" />
          </p>
          {!!user?.email && !!user?.name && <p className="truncate text-xs text-white/60">{user.email}</p>}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-6">
        {resolved.kind === 'none' ? (
          <span className="flex size-56 items-center justify-center rounded-full bg-white/10 text-7xl font-bold text-white">
            {initial}
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolved.url}
            alt={user?.name || 'Avatar'}
            className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
            draggable={false}
          />
        )}
      </div>
      <p className="pb-8 text-center text-xs text-white/50">Tap anywhere to close</p>
    </div>
  )
}
