'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { defaultDiceConfig, normalizeAvatarConfig, resolveUserAvatar } from '@/lib/dice-avatar'
import { avatarGradientFor, initialsOf, displayNameOf } from '@/lib/identity'

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
  const fallbackBg = avatarGradientFor(user)
  const initials = initialsOf(displayNameOf(user), user?.email)
  return (
    <Avatar className={'shrink-0 overflow-hidden ' + className}>
      <UserAvatarImage user={user} />
      <AvatarFallback className={'font-bold text-white ' + fallbackClassName} style={{ background: fallbackBg }}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

export default UserAvatar

// Role ticks for show-off: gold = admin, X-blue = editor, silver = official.
// Students get no tick. One self-contained seal: the scalloped badge filled
// solid with its own check path stroked on top — always perfectly aligned,
// exactly how X composites theirs.
const TICK_SEAL = {
  admin: { fill: '#EAB308', shadow: 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]', label: 'Admin' },
  editor: { fill: '#1D9BF0', shadow: 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]', label: 'Editor' },
  official: { fill: '#94A3B8', shadow: 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]', label: 'Official' },
}

export function RoleSeal({ role, size = 'size-4' }) {
  const t = TICK_SEAL[role]
  if (!t) return null
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label={t.label} className={`shrink-0 ${size} ${t.shadow}`}>
      <title>{t.label}</title>
      <path
        d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
        fill={t.fill}
      />
      <path d="m9 12 2 2 4-4" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function roleTick(user) {
  if (!user) return null
  if (user.admin || user.role === 'admin') return 'admin'
  if (user.role === 'editor') return 'editor'
  if (user.role === 'official') return 'official'
  return null
}

export function VerifiedTick({ user, size = 'size-4' }) {
  const role = roleTick(user)
  if (!role) return null
  return (
    <span className={`absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-background`}>
      <RoleSeal role={role} size={size} />
    </span>
  )
}

// Drop-in avatar with the role tick attached. Wrapper must stay relative +
// overflow-visible (shadcn Avatar clips, so the tick lives outside it).
export function AvatarWithTick({ user, className = 'size-10', tickSize = 'size-4', fallbackClassName = '' }) {
  return (
    <span className="relative inline-flex shrink-0">
      <UserAvatar user={user} className={className} fallbackClassName={fallbackClassName} />
      <VerifiedTick user={user} size={tickSize} />
    </span>
  )
}
