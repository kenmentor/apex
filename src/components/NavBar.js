'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Home, Trophy, Gamepad2, Search, Folder } from 'lucide-react';
import { subscribeUploads } from '@/lib/uploads';

const links = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/games', label: 'Games', icon: Gamepad2 },
  { href: '/leaderboard', label: 'Rankings', icon: Trophy },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/folders', label: 'Folders', icon: Folder },
];

function trackNav(href, isActive) {
  // page_view already records the journey — no per-tap event.
  if (isActive && typeof window !== 'undefined') {
    // Re-tapping the current tab: back to top + let the page reset itself.
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.dispatchEvent(new CustomEvent('nav:retap', { detail: href }));
  }
}

export default function NavBar({ active }) {
  const [uploads, setUploads] = useState([]);

  useEffect(() => subscribeUploads(setUploads), []);

  function isActive(l) {
    return active === l.href;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:inset-y-0 sm:right-auto sm:left-0 sm:w-20 sm:border-t-0 sm:border-r">
      {/* Upload progress: thin blue line riding directly on top of the nav. No text. */}
      {!!uploads.length && (
        <div className="pointer-events-none absolute inset-x-0 top-0 -translate-y-full">
          {uploads.slice(0, 3).map(j => (
            <div key={j.id} className="h-[3px] w-full bg-transparent">
              <div
                className={`h-full transition-[width] duration-200 ${j.status === 'error' ? 'bg-red-500' : j.status === 'done' ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${j.status === 'done' ? 100 : j.progress}%` }}
              />
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-around px-2 py-3 overflow-hidden sm:flex-col sm:gap-2 sm:py-4">
        {links.map(l => {
          const Icon = l.icon;
          const on = isActive(l);
          return (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => trackNav(l.href, on)}
              className={`relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs transition-all duration-100 active:scale-90 active:bg-muted ${
                on
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className={`flex size-9 items-center justify-center rounded-full transition-colors ${on ? 'bg-primary/10' : ''}`}>
                <Icon className="size-5" strokeWidth={on ? 2.5 : 1.8} />
              </span>
              <span className="hidden sm:block">{l.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
