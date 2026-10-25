'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { defaultDiceConfig, normalizeAvatarConfig, resolveUserAvatar } from '@/lib/dice-avatar'

export function randomAvatarConfig(overrides = {}) {
  return defaultDiceConfig(overrides)
}

export function isCustomAvatar(user) {
  return !!normalizeAvatarConfig(user?.avatarConfig)
}

// Renders inside a shadcn <Avatar>: plain <img>, no nested flex wrapper
// (the old nested <span class="size-full"> is what stretched/distorted avatars).
export function UserAvatarImage({ user }) {
  const resolved = resolveUserAvatar(user)
  if (resolved.kind === 'dice' || resolved.kind === 'url') {
    return <AvatarImage src={resolved.url} alt={user?.name || 'Avatar'} />
  }
  return null
}

// Single clean circle. For dice avatars the SVG already includes its own
// background, so no extra bg span — that double-layer caused the distortion.
export function UserAvatar({ user, className = 'size-10', fallbackClassName = '' }) {
  const initial = (user?.name?.[0] || user?.email?.[0] || 'A').toUpperCase()
  return (
    <Avatar className={'shrink-0 overflow-hidden ' + className}>
      <UserAvatarImage user={user} />
      <AvatarFallback className={'bg-primary/10 font-bold text-primary ' + fallbackClassName}>
        {initial}
      </AvatarFallback>
    </Avatar>
  )
}

export default UserAvatar
