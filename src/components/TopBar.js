'use client';

import Link from 'next/link';
import { Mail, ChevronLeft } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserAvatarImage, VerifiedTick } from '@/components/UserAvatar';

export default function TopBar({ user, unread = 0, onAvatar, title = 'Apex', showBack = false, onBack }) {
  return (
    <header className="sticky top-0 z-40 flex items-center gap-2 border-b bg-background/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {showBack ? (
        <button onClick={onBack} aria-label="Go back" className="flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted">
          <ChevronLeft className="size-5" />
        </button>
      ) : (
        <button onClick={onAvatar} aria-label="Open menu" className="relative shrink-0 rounded-full ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring">
          {user ? (
            <>
              <Avatar className="size-8">
                <UserAvatarImage user={user} />
                <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                  {(user.email?.[0] || 'A').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <VerifiedTick user={user} />
            </>
          ) : (
            <Avatar className="size-8">
              <AvatarFallback className="bg-muted text-xs font-bold">?</AvatarFallback>
            </Avatar>
          )}
        </button>
      )}
      <span className="flex-1 truncate text-base font-bold">
        {showBack ? title : <Link href="/">Apex</Link>}
      </span>
      <Link href="/groups?tab=inbox" aria-label="Messages" className="relative flex size-9 items-center justify-center rounded-lg hover:bg-muted">
        <Mail className="size-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </Link>
    </header>
  );
}
