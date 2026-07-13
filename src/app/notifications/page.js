'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, BellOff, CheckCheck, Trophy, BookOpen, TrendingUp, Star, Clock, Trash2 } from 'lucide-react';
import { getUser, getToken } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const TYPE_CONFIG = {
  quiz_complete: { icon: CheckCheck, color: '#4cd137', bg: '#4cd13715' },
  rank_change: { icon: TrendingUp, color: '#ff9f43', bg: '#ff9f4315' },
  achievement: { icon: Trophy, color: '#ffc048', bg: '#ffc04815' },
  new_course: { icon: BookOpen, color: '#130f40', bg: '#130f4015' },
  streak: { icon: Star, color: '#e056a0', bg: '#e056a015' },
  system: { icon: Bell, color: '#636e72', bg: '#636e7215' },
};

function NotificationItem({ notif, onRead }) {
  const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
  const Icon = config.icon;
  const timeAgo = getTimeAgo(notif.createdAt);

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
        <span className="mt-1 block text-[10px] text-muted-foreground/60">{timeAgo}</span>
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

export default function NotificationsPage() {
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
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications?limit=50', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setNotifications(data.docs || []);
    } catch {}
    setLoading(false);
  }

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

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background pb-24">
        <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Link href="/" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="flex-1 text-base font-bold">Notifications</h1>
        </header>
        <div className="mx-auto w-full max-w-2xl space-y-3 px-4 pt-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background pb-24">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link href="/" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="flex-1 text-base font-bold">Notifications</h1>
        {unread.length > 0 && (
          <button
            onClick={markAllRead}
            className="flex size-9 items-center justify-center rounded-lg hover:bg-muted"
          >
            <CheckCheck className="size-4 text-muted-foreground" />
          </button>
        )}
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-4">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <BellOff className="size-12 opacity-30" />
            <p className="text-sm">No notifications yet</p>
            <p className="text-xs">Complete quizzes to get notified about your progress</p>
          </div>
        ) : (
          <>
            {unread.length > 0 && (
              <div className="space-y-2">
                <h3 className="px-1 text-xs font-semibold text-muted-foreground">New</h3>
                <div className="space-y-1.5">
                  {unread.map((n) => (
                    <NotificationItem key={n._id} notif={n} onRead={markRead} />
                  ))}
                </div>
              </div>
            )}
            {read.length > 0 && (
              <div className="space-y-2">
                <h3 className="px-1 text-xs font-semibold text-muted-foreground">Earlier</h3>
                <div className="space-y-1.5">
                  {read.map((n) => (
                    <NotificationItem key={n._id} notif={n} onRead={markRead} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
