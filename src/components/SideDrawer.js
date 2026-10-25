'use client';

import Link from 'next/link';
import { X, Map, Users, Gamepad2, PlusCircle, Wallet, BarChart3, Settings, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserAvatarImage } from '@/components/UserAvatar';

const ROWS = [
  { href: '/plan', label: 'My Curriculum', icon: Map },
  { href: '/groups', label: 'Study Groups', icon: Users },
  { href: '/races', label: 'Games & Races', icon: Gamepad2 },
  { href: '/groups/create', label: 'Create', icon: PlusCircle },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/leaderboard', label: 'Rankings', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function SideDrawer({ open, user, coins, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r bg-background p-4">
        <div className="flex items-center justify-between">
          <Link href="/profile" onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3">
            {user ? (
              <Avatar className="size-10 shrink-0">
                <UserAvatarImage user={user} />
                <AvatarFallback className="bg-primary text-sm font-bold text-primary-foreground">
                  {(user.email?.[0] || 'A').toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Avatar className="size-10 shrink-0">
                <AvatarFallback className="bg-muted text-sm font-bold">?</AvatarFallback>
              </Avatar>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{user?.name || user?.email || 'Guest'}</span>
              <span className="block text-xs text-muted-foreground">{coins ?? '—'} coins</span>
            </span>
          </Link>
          <button onClick={onClose} aria-label="Close menu" className="flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>

        <nav className="mt-4 space-y-1">
          {ROWS.map(r => {
            const Icon = r.icon;
            return (
              <Link key={r.href} href={r.href} onClick={onClose} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted">
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                {r.label}
              </Link>
            );
          })}
          <Link href="/logout" onClick={onClose} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted">
            <LogOut className="size-4 shrink-0 text-muted-foreground" />
            Logout
          </Link>
        </nav>
        <div className="flex-1" />
      </aside>
    </div>
  );
}
