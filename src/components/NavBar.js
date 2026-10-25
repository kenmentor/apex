'use client';

import Link from 'next/link';
import { Home, Map, Gamepad2, Search, Mail } from 'lucide-react';
import { trackEvent } from '@/lib/tracking';

const links = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/plan', label: 'Curriculum', icon: Map },
  { href: '/games', label: 'Games', icon: Gamepad2 },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/groups?tab=inbox', label: 'Messages', icon: Mail, badge: 'unread' },
];

function trackNav(href, isActive) {
  trackEvent('navigation_click', { to: href, from: typeof window !== 'undefined' ? window.location.pathname : '' });
  if (isActive && typeof window !== 'undefined') {
    // Re-tapping the current tab: back to top + let the page reset itself.
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.dispatchEvent(new CustomEvent('nav:retap', { detail: href }));
  }
}

export default function NavBar({ active, unread = 0 }) {
  function isActive(l) {
    // Messages owns the whole social page (groups list + inbox switcher).
    if (l.href === '/groups?tab=inbox') return active === '/groups';
    return active === l.href;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:inset-y-0 sm:right-auto sm:left-0 sm:w-20 sm:border-t-0 sm:border-r">
      <div className="flex items-center justify-around px-2 py-3 overflow-hidden sm:flex-col sm:gap-2 sm:py-4">
        {links.map(l => {
          const Icon = l.icon;
          const on = isActive(l);
          return (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => trackNav(l.href, on)}
              className={`relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs transition-colors sm:px-0 ${
                on
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className={`flex size-9 items-center justify-center rounded-full transition-colors ${on ? 'bg-primary/10' : ''}`}>
                <Icon className="size-5" strokeWidth={on ? 2.5 : 1.8} />
              </span>
              {l.badge === 'unread' && unread > 0 && (
                <span className="absolute right-1 top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
              <span className="hidden sm:block">{l.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
