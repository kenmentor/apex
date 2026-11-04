'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Flame, ClipboardList, Gamepad2, Folder, Search } from 'lucide-react';
import { getUser, getToken } from '@/lib/auth';
import { fetchJson, TTL } from '@/lib/fetch-json';
import { Skeleton } from '@/components/ui/skeleton';

const DEPT_COLORS = { GSS: '#130f40', COS: '#1a5276', MTH: '#7d3c98', PHY: '#c0392b' };

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function ActionBlock({ href, color, Icon, title, sub }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-3xl p-4 text-white transition-all active:scale-[0.98]"
      style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)` }}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
        <Icon className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-bold">{title}</span>
        <span className="block truncate text-xs text-white/75">{sub}</span>
      </span>
    </Link>
  );
}

function StreakDots({ days }) {
  const set = new Set(days || []);
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const keys = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    keys.push(d.toISOString().slice(0, 10));
  }
  const todayKey = today.toISOString().slice(0, 10);
  return (
    <span className="flex items-center gap-1.5">
      {keys.map(k => (
        <span
          key={k}
          className={`size-2 rounded-full ${set.has(k) ? 'bg-white' : 'bg-white/30'} ${k === todayKey && !set.has(k) ? 'ring-1 ring-white/70' : ''}`}
        />
      ))}
    </span>
  );
}

function FeedItem({ item }) {
  const router = useRouter();
  const d = item.data;

  switch (item.type) {
    case 'continue': {
      const code = (d.courseCode || '').toLowerCase().replace(/\s+/g, '');
      return (
        <Link
          href={`/courses/${code}/quiz`}
          className="flex items-center gap-4 rounded-xl border p-4 transition-all hover:bg-muted active:scale-[0.99]"
        >
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${
            d.percentage >= 70 ? 'bg-green-500' : d.percentage >= 40 ? 'bg-amber-500' : 'bg-red-500'
          }`}>
            {d.percentage}%
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{d.courseCode}</div>
            <div className="text-xs text-muted-foreground">{getTimeAgo(d.createdAt)}</div>
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-primary shrink-0">
            Continue <ArrowRight className="size-3.5" />
          </div>
        </Link>
      );
    }
    case 'recommended': {
      const color = d.color || DEPT_COLORS[d.courseCode?.slice(0, 3)] || '#636e72';
      return (
        <Link
          href={`/courses/${d.courseCode?.toLowerCase().replace(/\s+/g, '')}`}
          className="flex items-center gap-4 rounded-xl border p-4 transition-all hover:bg-muted active:scale-[0.99]"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ backgroundColor: color }}>
            {d.courseCode?.slice(0, 3)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{d.courseCode}</div>
            <div className="text-xs text-muted-foreground truncate">{d.courseTitle || ''}</div>
          </div>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      );
    }
    default:
      return null;
  }
}

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [user, setUser] = useState(null);
  const [feed, setFeed] = useState([]);
  const [streakData, setStreakData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    const fetches = u?.email
      ? [
        fetchJson('/api/categories?limit=20', { ttl: TTL.list }),
        fetchJson(`/api/feed/personalized?email=${encodeURIComponent(u.email)}`, {
          token: getToken(), ttl: 15000,
        }).catch(() => ({ items: [] })),
        fetchJson(`/api/streak?email=${encodeURIComponent(u.email)}`, { ttl: 15000 }).catch(() => ({})),
      ]
      : [Promise.resolve({ docs: [] })];

    Promise.all(fetches)
      .then(([catsData, feedData, streak]) => {
        setCategories(catsData.docs || []);
        if (streak) setStreakData(streak.email ? streak : null);
        if (feedData?.items) {
          const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
          const filtered = feedData.items.filter(i => {
            if (i.type === 'space_post' || i.type === 'recommended') {
              const t = new Date(i.data?.createdAt || i.createdAt || 0).getTime();
              return t > twoDaysAgo;
            }
            return true;
          });
          setFeed(filtered);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Bottom-tab re-tap while on home: back to top.
  useEffect(() => {
    function onRetap(e) {
      if (e.detail !== '/') return;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.addEventListener('nav:retap', onRetap);
    return () => window.removeEventListener('nav:retap', onRetap);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center overflow-x-hidden bg-background pb-24">
        <div className="space-y-4 w-full max-w-lg px-5">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const continueItems = feed.filter(i => i.type === 'continue');

  const showContinue = continueItems;

  return (
    <div className="mx-auto min-h-dvh max-w-2xl space-y-7 px-5 pb-28 pt-6">
      {!user && (
        <div className="flex items-center gap-4">
          <img src="/black-logo.png" alt="Apex" className="size-12 shrink-0 rounded-xl object-cover dark:hidden" />
          <img src="/white-logo.png" alt="Apex" className="hidden size-12 shrink-0 rounded-xl object-cover dark:block" />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">Apex</h1>
            <p className="text-xs text-muted-foreground">Master your exams with past questions</p>
          </div>
          <Link href="/auth" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shrink-0">
            Sign In
          </Link>
        </div>
      )}

      {/* Greeting — just hello */}
      {user && (
        <section className="pt-2">
          <h1 className="truncate text-2xl font-bold">
            Hi{user?.name ? `, ${String(user.name).split(' ')[0]}` : ''}
          </h1>
        </section>
      )}

      {/* Streak — one calm banner, dots instead of the fussy week grid */}
      {user && (
        <Link href="/streak" className="flex items-center gap-4 rounded-3xl p-5 text-white transition-all active:scale-[0.99]"
          style={{ background: 'linear-gradient(120deg, #FBBF24, #F97316 55%, #EF4444)' }}>
          <span className="flex size-13 shrink-0 items-center justify-center rounded-2xl bg-white/20 p-3">
            <Flame className="size-7" fill="currentColor" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-3xl font-black leading-none">{streakData?.currentStreak ?? 0}</span>
            <span className="mt-1 block text-xs text-white/85">day streak</span>
            <span className="mt-2 block"><StreakDots days={streakData?.days} /></span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-white/70" />
        </Link>
      )}

      {/* One search — the front door to every material */}
      {user && (
        <Link href="/search" className="flex items-center gap-3 rounded-full border bg-card px-5 py-4 text-muted-foreground">
          <Search className="size-5 shrink-0" />
          <span className="text-sm">Search materials…</span>
        </Link>
      )}

      {/* The three majors, in color — quiz leads full-width */}
      {user && (
        <section className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <ActionBlock href="/plan" color="#F59E0B" Icon={ClipboardList} title="Take a quiz" sub="Pick a course & practice" />
          </div>
          <ActionBlock href="/games" color="#7C3AED" Icon={Gamepad2} title="Games" sub="Play & compete" />
          <ActionBlock href="/folders" color="#0284C7" Icon={Folder} title="My Files" sub="Notes & PDFs" />
        </section>
      )}

      {/* Continue where you left off — at most one quiet row */}
      {user && showContinue.length > 0 && (
        <section className="space-y-1">
          <h2 className="px-1 text-sm font-bold text-muted-foreground">Continue</h2>
          <FeedItem item={showContinue[0]} />
        </section>
      )}

      {/* Not logged in: no departments — just the way in. */}
      {!user && (
        <section className="overflow-hidden rounded-3xl p-6 text-center text-white" style={{ background: 'linear-gradient(135deg, #130f40, #2c2c54)' }}>
          <h2 className="text-lg font-black">Your study plan lives here</h2>
          <p className="mx-auto mt-1 max-w-[260px] text-xs text-white/70">Sign in to unlock your courses, quizzes and progress.</p>
          <Link href="/auth" className="mt-4 inline-block rounded-full bg-white px-6 py-2.5 text-sm font-extrabold text-black">
            Sign in
          </Link>
        </section>
      )}

    </div>
  );
}
