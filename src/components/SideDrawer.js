'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X, Map, Users, Gamepad2, PlusCircle, Wallet, BarChart3, User, LogOut, PenLine, ShieldCheck, Inbox, Bell } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserAvatarImage, VerifiedTick } from '@/components/UserAvatar';
import AvatarViewer from '@/components/AvatarViewer';

const ROWS = [
  { href: '/plan', label: 'My Curriculum', icon: Map },
  { href: '/groups', label: 'Study Groups', icon: Users },
  { href: '/races', label: 'Games & Races', icon: Gamepad2 },
  { href: '/groups/create', label: 'Create', icon: PlusCircle },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/leaderboard', label: 'Rankings', icon: BarChart3 },
  { href: '/profile', label: 'Profile & Settings', icon: User },
];

const isContributor = (user) => !!user && (!!user.admin || user.role === 'editor' || user.role === 'official' || user.role === 'admin');

export default function SideDrawer({ open, user, coins, onClose }) {
  const [viewing, setViewing] = useState(false);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button onClick={() => user && setViewing(true)} aria-label="View profile photo" className="relative shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-ring">
              {user ? (
                <span className="relative inline-flex">
                  <Avatar className="size-10">
                    <UserAvatarImage user={user} />
                    <AvatarFallback className="bg-primary text-sm font-bold text-primary-foreground">
                      {(user.email?.[0] || 'A').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <VerifiedTick user={user} />
                </span>
              ) : (
                <Avatar className="size-10">
                  <AvatarFallback className="bg-muted text-sm font-bold">?</AvatarFallback>
                </Avatar>
              )}
            </button>
            <Link href="/profile" onClick={onClose} className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold hover:underline">{user?.name || user?.email || 'Guest'}</span>
              <span className="block text-xs text-muted-foreground">{coins ?? '—'} coins</span>
            </Link>
          </div>
          <button onClick={onClose} aria-label="Close menu" className="flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>

        <nav className="mt-4 space-y-1">
          {isContributor(user) && (
            <Link href="/contribute" onClick={onClose} className="flex items-center gap-3 rounded-xl bg-primary/10 px-3 py-2.5 text-sm font-bold text-primary">
              <PenLine className="size-4 shrink-0" />
              Contributor
            </Link>
          )}
          {!!user?.admin && (
            <>
              <p className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Admin</p>
              {[
                { href: '/admin/analytics', label: 'Stats', icon: BarChart3 },
                { href: '/admin/review', label: 'Review queue', icon: Bell },
                { href: '/admin/requests', label: 'Contributor requests', icon: Inbox },
                { href: '/admin/users', label: 'People & roles', icon: Users },
                { href: '/admin', label: 'Admin home', icon: ShieldCheck },
              ].map(r => {
                const Icon = r.icon;
                return (
                  <Link key={r.href} href={r.href} onClick={onClose} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted">
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    {r.label}
                  </Link>
                )
              })}
            </>
          )}
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
      {viewing && user && <AvatarViewer user={user} onClose={() => setViewing(false)} />}
    </div>
  );
}
