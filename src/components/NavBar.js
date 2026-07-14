'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getUser, isAdmin } from '@/lib/auth';
import { Home, LayoutGrid, BarChart3, Settings, User, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const links = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/courses', label: 'Courses', icon: LayoutGrid },
  { href: '/spaces', label: 'Spaces', icon: Users },
  { href: '/leaderboard', label: 'Rankings', icon: BarChart3 },
];

function trackNav(href) {
  try {
    const sid = sessionStorage.getItem('_sid') || crypto.randomUUID()
    sessionStorage.setItem('_sid', sid)
    fetch('/api/track', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'navigation_click',
        sessionId: sid,
        path: window.location.pathname,
        isPwa: window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true,
        metadata: { to: href, from: window.location.pathname },
      }),
      keepalive: true,
    }).catch(() => {})
  } catch {}
}

export default function NavBar({ active }) {
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUser(getUser());
    setMounted(true);
  }, []);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:inset-y-0 sm:right-auto sm:left-0 sm:w-20 sm:border-t-0 sm:border-r">
      <div className="flex items-center justify-around px-2 py-3 overflow-hidden sm:flex-col sm:gap-2 sm:py-4">
        {links.map(l => {
          const Icon = l.icon;
          const isActive = active === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => trackNav(l.href)}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs transition-colors sm:px-0 ${
                isActive
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="size-5" />
              <span className="hidden sm:block">{l.label}</span>
            </Link>
          );
        })}
        {mounted && user && isAdmin() && (
          <Link
            href="/admin"
            onClick={() => trackNav('/admin')}
            className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs transition-colors sm:px-0 ${
              active === '/admin'
                ? 'text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="size-5" />
            <span className="hidden sm:block">Admin</span>
          </Link>
        )}
        <Link
          href="/profile"
          onClick={() => trackNav('/profile')}
          className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs transition-colors sm:px-0 ${
            active === '/profile'
              ? 'text-primary font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {user ? (
            <Avatar className="size-5">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="bg-primary text-[10px] font-bold text-primary-foreground">
                {user.email[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : (
            <User className="size-5" />
          )}
          <span className="hidden sm:block">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
