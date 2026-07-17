'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Bell, BookOpen, ArrowRight, Trophy, Users, Sparkles } from 'lucide-react';
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
    case 'space_post': {
      return (
        <Link
          href={`/spaces/${d.space?.id}`}
          className="block rounded-xl border p-4 transition-all hover:bg-muted active:scale-[0.99] space-y-2"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white" style={{ backgroundColor: d.space?.color || '#130f40' }}>
              {d.space?.name?.charAt(0) || 'S'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold truncate">{d.space?.name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{getTimeAgo(d.createdAt)}</span>
              </div>
              <div className="text-[10px] text-muted-foreground">{d.authorName}</div>
            </div>
          </div>
          {d.title && <div className="text-sm font-medium leading-snug">{d.title}</div>}
          {d.content && <div className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{d.content}</div>}
          {(d.likeCount > 0 || d.commentCount > 0) && (
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              {d.likeCount > 0 && <span>{d.likeCount} likes</span>}
              {d.commentCount > 0 && <span>{d.commentCount} comments</span>}
            </div>
          )}
        </Link>
      );
    }
    case 'milestone':
      return (
        <div className="rounded-xl border bg-card p-5 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg">
              {d.icon || '🎯'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold">{d.title}</div>
              <div className="text-xs text-muted-foreground">{d.message}</div>
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
}

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [user, setUser] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [feed, setFeed] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const u = getUser();
    setUser(u);

    const fetches = [
      fetch('/api/categories?limit=20').then(r => r.json()),
    ];

    if (u?.email) {
      fetches.push(
        fetch('/api/notifications?limit=1', {
          headers: { Authorization: `Bearer ${getToken()}` },
        }).then(r => r.json()).catch(() => ({ unreadCount: 0 }))
      );
      fetches.push(
        fetch(`/api/feed/personalized?email=${encodeURIComponent(u.email)}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }).then(r => r.json()).catch(() => ({ items: [] }))
      );
    }

    Promise.all(fetches)
      .then(([catsData, notifData, feedData]) => {
        setCategories(catsData.docs || []);
        if (notifData) setUnreadCount(notifData.unreadCount || 0);
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
          setProfile(feedData.profile || null);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
  const recommendedItems = feed.filter(i => i.type === 'recommended');
  const spaceItems = feed.filter(i => i.type === 'space_post');
  const milestoneItems = feed.filter(i => i.type === 'milestone');
  const hasFeed = feed.length > 0;

  return (
    <div className="mx-auto min-h-dvh max-w-2xl space-y-5 px-5 pb-28 pt-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <img src="/just-logo.png" alt="Apex" className="size-12 rounded-xl object-cover shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">
            {user ? `Hey, ${user.name?.split(' ')[0] || 'there'}` : 'Apex'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {user ? (profile ? `${profile.quizCount} quizzes · ${profile.courseCount} courses` : 'Ready to study?') : 'Master your exams with past questions'}
          </p>
        </div>
        {user ? (
          <Link href="/notifications" className="relative flex size-10 items-center justify-center rounded-xl hover:bg-muted shrink-0">
            <Bell className="size-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        ) : (
          <Link href="/auth" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shrink-0">
            Sign In
          </Link>
        )}
      </div>

      {/* Search */}
      <div
        onClick={() => router.push('/courses')}
        className="flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-3.5 transition-colors hover:bg-accent"
      >
        <Search className="size-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground">Search courses...</span>
      </div>

      {/* Personalized Feed */}
      {user && hasFeed && (
        <div className="space-y-4">
          {/* Continue Studying */}
          {continueItems.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <BookOpen className="size-4 text-primary" />
                Continue Studying
              </h2>
              <div className="space-y-2">
                {continueItems.map((item, i) => <FeedItem key={`cont-${i}`} item={item} />)}
              </div>
              {profile?.courseCount > continueItems.length && (
                <Link href="/profile" className="block text-center text-xs font-medium text-primary">View all courses</Link>
              )}
            </section>
          )}

          {/* Milestones */}
          {milestoneItems.length > 0 && (
            <section className="space-y-2">
              {milestoneItems.map((item, i) => <FeedItem key={`mile-${i}`} item={item} />)}
            </section>
          )}

          {/* Recommended Courses */}
          {recommendedItems.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                Recommended For You
              </h2>
              <div className="space-y-2">
                {recommendedItems.map((item, i) => <FeedItem key={`rec-${i}`} item={item} />)}
              </div>
            </section>
          )}

          {/* Space Updates */}
          {spaceItems.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  From Your Spaces
                </h2>
                <Link href="/spaces" className="text-xs font-medium text-primary">All Spaces</Link>
              </div>
              <div className="space-y-2">
                {spaceItems.map((item, i) => <FeedItem key={`sp-${i}`} item={item} />)}
              </div>
            </section>
          )}
        </div>
      )}

      {/* No quizzes state */}
      {user && !hasFeed && (
        <section className="rounded-xl border-2 border-dashed p-8 text-center space-y-4">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
            <BookOpen className="size-7 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Ready to start?</h2>
            <p className="text-sm text-muted-foreground mt-1">Take your first quiz to get a personalized feed</p>
          </div>
          <Link
            href="/courses"
            className="inline-block rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Browse Courses
          </Link>
        </section>
      )}

      {/* Not logged in: show departments */}
      {!user && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold">Departments</h2>
          <div className="space-y-2">
            {categories.map((cat) => {
              const color = cat.color || DEPT_COLORS[cat.code] || '#636e72';
              return (
                <Link
                  key={cat.id || cat.code}
                  href={`/courses?cat=${cat.code}`}
                  className="flex items-center gap-4 rounded-xl p-4 text-white transition-all active:scale-[0.98]"
                  style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/20 text-sm font-bold backdrop-blur-sm">
                    {cat.code?.slice(0, 3)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold truncate">{cat.title}</div>
                    <div className="text-xs text-white/70">{cat.courseCount || 0} courses</div>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-white/50" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-2.5">
        <Link
          href="/leaderboard"
          className="rounded-xl border p-4 text-center transition-colors hover:bg-muted active:scale-[0.98]"
        >
          <Trophy className="mx-auto mb-1.5 size-4 text-primary" />
          <div className="text-[10px] font-semibold">Leaderboard</div>
        </Link>
        <Link href="/spaces" className="rounded-xl border p-4 text-center transition-colors hover:bg-muted active:scale-[0.98]">
          <Users className="mx-auto mb-1.5 size-4 text-primary" />
          <div className="text-[10px] font-semibold">Spaces</div>
        </Link>
        <Link href="/courses" className="rounded-xl border p-4 text-center transition-colors hover:bg-muted active:scale-[0.98]">
          <BookOpen className="mx-auto mb-1.5 size-4 text-primary" />
          <div className="text-[10px] font-semibold">Courses</div>
        </Link>
      </div>
    </div>
  );
}
