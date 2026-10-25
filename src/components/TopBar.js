'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserAvatarImage } from '@/components/UserAvatar';

export default function TopBar({ user, unread = 0, onAvatar, hideTitle = false }) {
  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 border-b bg-background/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <button onClick={onAvatar} aria-label="Open menu" className="shrink-0 rounded-full ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring">
        {user ? (
          <Avatar className="size-8">
            <UserAvatarImage user={user} />
            <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
              {(user.email?.[0] || 'A').toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : (
          <Avatar className="size-8">
            <AvatarFallback className="bg-muted text-xs font-bold">?</AvatarFallback>
          </Avatar>
        )}
      </button>
      {hideTitle ? (
        <span className="flex-1" />
      ) : (
        <Link href="/" className="flex-1 text-base font-bold">
          GSS Banger
        </Link>
      )}
      <Link href="/notifications" aria-label="Notifications" className="relative flex size-9 items-center justify-center rounded-lg hover:bg-muted">
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </Link>
    </header>
  );
}
