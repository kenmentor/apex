'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Bell, ArrowRight, Trophy, Zap, Users } from 'lucide-react';
import { getUser, getToken } from '@/lib/auth';
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

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentScores, setRecentScores] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const u = getUser();
    setUser(u);

    const fetches = [
      fetch('/api/categories?limit=20').then((r) => r.json()),
      fetch('/api/leaderboard').then((r) => r.json()).catch(() => []),
    ];

    if (u?.email) {
      fetches.push(
        fetch('/api/notifications?limit=1', {
          headers: { Authorization: `Bearer ${getToken()}` },
        }).then((r) => r.json()).catch(() => ({ unreadCount: 0 }))
      );
      fetches.push(
        fetch(`/api/scores?email=${encodeURIComponent(u.email)}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }).then((r) => r.json()).catch(() => [])
      );
    }

    Promise.all(fetches)
      .then(([catsData, leaderData, notifData, scoresData]) => {
        setCategories(catsData.docs || []);
        const board = Array.isArray(leaderData) ? leaderData : [];
        setLeaderboard(board.slice(0, 5));
        if (notifData) setUnreadCount(notifData.unreadCount || 0);
        if (scoresData && Array.isArray(scoresData)) {
          setRecentScores(scoresData.slice(0, 3));
          const rank = board.findIndex((e) => e.email === u?.email);
          if (rank !== -1) setUserRank(rank + 1);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center overflow-x-hidden bg-background pb-24">
        <div className="space-y-4 w-full max-w-sm px-5">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const hasScores = recentScores.length > 0;
  const hasRank = hasScores && userRank !== null;

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background pb-24">
      <div className="mx-auto w-full max-w-2xl space-y-8 px-5 pt-8">

        {/* Header */}
        <div className="flex items-center gap-4">
          <img src="/just-logo.png" alt="Apex" className="size-14 rounded-xl object-cover" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">
              {user ? `Hey, ${user.name?.split(' ')[0] || 'there'}!` : 'Apex'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {user ? 'Ready to study?' : 'Master your exams with past questions'}
            </p>
          </div>
          {user && (
            <Link href="/notifications" className="relative flex size-12 items-center justify-center rounded-xl hover:bg-muted">
              <Bell className="size-6 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )}
          {!user && (
            <Link href="/auth" className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
              Sign In
            </Link>
          )}
        </div>

        {/* Search */}
        <div
          onClick={() => router.push('/courses')}
          className="flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent"
        >
          <Search className="size-5 text-muted-foreground" />
          <span className="text-base text-muted-foreground">Search courses...</span>
        </div>

        {/* User Status - Rank or Catch-up */}
        {user && (
          <>
            {hasRank ? (
              <Link
                href="/leaderboard"
                className="flex items-center gap-5 rounded-2xl border p-5 transition-colors hover:bg-muted active:scale-[0.98]"
              >
                <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Trophy className="size-7 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-muted-foreground">Your Rank</div>
                  <div className="text-2xl font-bold">
                    #{userRank || '—'}
                  </div>
                </div>
                <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
              </Link>
            ) : (
              <div className="rounded-2xl border-2 border-dashed p-6 text-center space-y-3">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
                  <Zap className="size-7 text-primary" />
                </div>
                <div>
                  <div className="text-lg font-bold">No quizzes yet!</div>
                  <p className="text-sm text-muted-foreground">Take your first quiz and start climbing the leaderboard</p>
                </div>
                <Link
                  href="/courses"
                  className="inline-block rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Start First Quiz
                </Link>
              </div>
            )}
          </>
        )}

        {/* Categories */}
        <div className="space-y-4">
          <h2 className="text-base font-bold">Departments</h2>
          <div className="space-y-3">
            {categories.map((cat) => {
              const color = cat.color || DEPT_COLORS[cat.code] || '#636e72';
              return (
                <Link
                  key={cat.id || cat.code}
                  href={`/courses?cat=${cat.code}`}
                  className="flex items-center gap-5 rounded-2xl p-5 text-white transition-all active:scale-[0.98]"
                  style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}
                >
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white/20 text-xl font-bold backdrop-blur-sm">
                    {cat.code}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-bold">{cat.title}</div>
                    <div className="text-sm text-white/70">
                      {cat.courseCount || 0} course{(cat.courseCount || 0) !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <ArrowRight className="size-5 shrink-0 text-white/50" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Scores */}
        {user && hasScores && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Recent Scores</h2>
              <Link href="/profile" className="text-sm font-medium text-primary">See All</Link>
            </div>
            <div className="space-y-3">
              {recentScores.map((s, i) => (
                <Link
                  key={s._id || i}
                  href={`/courses/${(s.course || '').toLowerCase().replace(/\s+/g, '')}`}
                  className="flex items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-muted active:scale-[0.99]"
                >
                  <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${
                    s.percentage >= 80 ? 'bg-green-500' : s.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}>
                    {s.percentage}%
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{s.course}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.score}/{s.total} correct · {getTimeAgo(s.createdAt)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-3 gap-3">
          <Link
            href="/leaderboard"
            className="rounded-xl border p-5 text-center transition-colors hover:bg-muted active:scale-[0.98]"
          >
            <Trophy className="mx-auto mb-2 size-5 text-primary" />
            <div className="text-xs font-semibold">Leaderboard</div>
          </Link>
          <Link
            href="/spaces"
            className="rounded-xl border p-5 text-center transition-colors hover:bg-muted active:scale-[0.98]"
          >
            <Users className="mx-auto mb-2 size-5 text-primary" />
            <div className="text-xs font-semibold">Spaces</div>
          </Link>
          <Link
            href="/courses"
            className="rounded-xl border p-5 text-center transition-colors hover:bg-muted active:scale-[0.98]"
          >
            <Zap className="mx-auto mb-2 size-5 text-primary" />
            <div className="text-xs font-semibold">Courses</div>
          </Link>
        </div>

      </div>
    </div>
  );
}
