'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, BellOff, CheckCheck, Trophy, BookOpen, TrendingUp, Star, UserPlus, MessageCircle } from 'lucide-react'
import { getUser, getToken } from '@/lib/auth'
import { Skeleton } from '@/components/ui/skeleton'

const TYPE_CONFIG = {
  quiz_complete: { icon: CheckCheck, color: '#4cd137', bg: '#4cd13715' },
  rank_change: { icon: TrendingUp, color: '#ff9f43', bg: '#ff9f4315' },
  achievement: { icon: Trophy, color: '#ffc048', bg: '#ffc04815' },
  new_course: { icon: BookOpen, color: '#130f40', bg: '#130f4015' },
  streak: { icon: Star, color: '#e056a0', bg: '#e056a015' },
  follow: { icon: UserPlus, color: '#4bc0c0', bg: '#4bc0c015' },
  dm: { icon: MessageCircle, color: '#a55eea', bg: '#a55eea15' },
  system: { icon: Bell, color: '#636e72', bg: '#636e7215' },
}

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function NotificationItem({ notif, onRead }) {
  const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
  const Icon = config.icon;
  return (
    <button
      onClick={() => onRead(notif)}
      className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors ${
        notif.read ? 'bg-card' : 'bg-primary/5'
      } hover:bg-muted/50 active:scale-[0.99]`}
    >
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: config.bg }}
      >
        <Icon className="size-4" style={{ color: config.color }} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{notif.title}</span>
          {!notif.read && (
            <span className="size-2 shrink-0 rounded-full bg-primary" />
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notif.message}</p>
        <span className="mt-1 block text-[10px] text-muted-foreground/60">{getTimeAgo(notif.createdAt)}</span>
      </div>
      {notif.link && (
        <Link
          href={notif.link}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 shrink-0 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary hover:bg-primary/20"
        >
          View
        </Link>
      )}
    </button>
  );
}

// Shared inbox list (notifications, nudges, race results, announcements).
// Used by the Groups inbox tab. onUnread reports the unread count for badges.
// query filters by title/message. refreshKey refetch bumps.
export default function InboxList({ onUnread, query = '', refreshKey = 0 }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (!u) {
      setLoading(false);
      return;
    }
    fetchList();
  }, []);

  useEffect(() => {
    if (refreshKey > 0) fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  function fetchList() {
    fetch('/api/notifications?limit=50', {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(d => setNotifications(d.docs || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (onUnread) onUnread(notifications.filter(n => !n.read).length);
  }, [notifications, onUnread]);

  async function markRead(notif) {
    if (!notif.read) {
      try {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ id: notif._id }),
        });
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
        );
      } catch {}
    }
    if (notif.link) router.push(notif.link);
  }

  async function markAllRead() {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-dashed p-5 text-center">
        <p className="text-sm text-muted-foreground">Sign in to see your inbox.</p>
        <Link href="/auth" className="mt-2 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          Sign In
        </Link>
      </div>
    );
  }

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  const needle = query.trim().toLowerCase();
  const match = (n) => !needle
    || (n.title || '').toLowerCase().includes(needle)
    || (n.message || '').toLowerCase().includes(needle);
  const unreadShown = unread.filter(match);
  const readShown = read.filter(match);

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
        <BellOff className="size-12 opacity-30" />
        <p className="text-sm">No messages yet</p>
        <p className="text-xs">Nudges from study buddies, race results, and announcements land here.</p>
      </div>
    );
  }

  if (unreadShown.length === 0 && readShown.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No matches for “{query}”.</p>;
  }

  return (
    <div className="space-y-4">
      {unreadShown.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-semibold text-muted-foreground">New</h3>
          <button onClick={markAllRead} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            <CheckCheck className="size-3.5" /> Mark all read
          </button>
        </div>
      )}
      {unreadShown.length > 0 && (
        <div className="space-y-1.5">
          {unreadShown.map((n) => (
            <NotificationItem key={n._id} notif={n} onRead={markRead} />
          ))}
        </div>
      )}
      {readShown.length > 0 && (
        <div className="space-y-2">
          <h3 className="px-1 text-xs font-semibold text-muted-foreground">Earlier</h3>
          <div className="space-y-1.5">
            {readShown.map((n) => (
              <NotificationItem key={n._id} notif={n} onRead={markRead} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
