'use client';

import { useState, useEffect, useRef } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { getUser, getToken } from '@/lib/auth';
import { fetchJson, TTL } from '@/lib/fetch-json';
import FeedCard from '@/components/FeedCard';
import PlaceholderMedia from '@/components/PlaceholderMedia';
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

const WEEK_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function WeekStrip({ activeSet, todayKey }) {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    days.push({ key: `${y}-${m}-${day}`, label: WEEK_LABELS[i] });
  }
  return (
    <div className="relative mt-3 flex items-center justify-between gap-1">
      {days.map(d => {
        const active = activeSet.has(d.key);
        const isToday = d.key === todayKey;
        return (
          <div key={d.key} className="flex flex-col items-center gap-1">
            <div
              className={`flex size-7 items-center justify-center rounded-lg text-[10px] font-bold transition-all ${
                active
                  ? 'bg-white text-orange-600 shadow-sm'
                  : isToday
                    ? 'border-2 border-white/70 text-white'
                    : 'bg-white/10 text-white/60'
              }`}
            >
              {d.label}
            </div>
            <span className={`text-[8px] font-semibold ${active ? 'text-white' : isToday ? 'text-white/80' : 'text-white/40'}`}>
              {active ? '🔥' : '·'}
            </span>
          </div>
        );
      })}
    </div>
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
    case 'space_post': {
      return (
        <Link
          href={`/groups/${d.space?.id}`}
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
  const [tab, setTab] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'start' });
  const [feed, setFeed] = useState([]);
  const [profile, setProfile] = useState(null);
  const [streakData, setStreakData] = useState(null);
  const [planTasks, setPlanTasks] = useState(null);
  const [planPct, setPlanPct] = useState(null);
  const [forYouMedia, setForYouMedia] = useState({ videos: [], reads: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    const fetches = [
      fetchJson('/api/categories?limit=20', { ttl: TTL.list }),
    ];

    if (u?.email) {
      fetches.push(
        fetchJson(`/api/feed/personalized?email=${encodeURIComponent(u.email)}`, {
          token: getToken(), ttl: 15000,
        }).catch(() => ({ items: [] }))
      );
      fetches.push(
        fetchJson(`/api/streak?email=${encodeURIComponent(u.email)}`, { ttl: 15000 }).catch(() => ({}))
      );
      // Curriculum tasks: plan + completions in one parallel batch.
      fetches.push(
        Promise.all([
          fetchJson(`/api/plans?email=${encodeURIComponent(u.email)}`, { ttl: 15000 }).catch(() => null),
          fetchJson(`/api/completions?email=${encodeURIComponent(u.email)}`, { ttl: 15000 }).catch(() => []),
        ]).then(([plan, completions]) => ({ plan, completions: Array.isArray(completions) ? completions : [] }))
      );
    }

    Promise.all(fetches)
      .then(([catsData, feedData, streak, planBundle]) => {
        setCategories(catsData.docs || []);
        if (streak) setStreakData(streak.email ? streak : null);
        if (planBundle?.plan) { setPlanTasks(planBundle); setPlanPct(planBundle.plan.progress?.pct ?? null); }
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

  // Vertical pager (Embla, axis y): slide 1 = tasks, slide 2 = feed.
  const [emblaVRef, emblaVApi] = useEmblaCarousel({ axis: 'y' });
  const feedSectionRef = useRef(null);
  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onFeedSelect);
    return () => { emblaApi.off('select', onFeedSelect); };
  }, [emblaApi]);
  // Bottom-tab re-tap while on home: back to the tasks slide.
  useEffect(() => {
    function onRetap(e) {
      if (e.detail !== '/') return;
      if (emblaVApi) emblaVApi.scrollTo(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.addEventListener('nav:retap', onRetap);
    return () => window.removeEventListener('nav:retap', onRetap);
  }, [emblaVApi]);
  // Your media: videos + readings from plan courses (real thumbnails/excerpts).
  useEffect(() => {
    const u = user || getUser();
    const courses = (planTasks?.plan?.courses || []).slice(0, 3).map(c => c.code).filter(Boolean);
    if (!u?.email || !courses.length) return;
    let live = true;
    Promise.all(courses.flatMap(code => [
      fetchJson('/api/videos?course=' + encodeURIComponent(code), { ttl: TTL.list }).catch(() => []),
      fetchJson('/api/readings?course=' + encodeURIComponent(code), { ttl: TTL.list }).catch(() => []),
    ])).then(all => {
      if (!live) return;
      const videos = [], reads = [];
      all.forEach((d, i) => {
        const rows = Array.isArray(d) ? d.slice(0, 2) : [];
        rows.forEach(x => (i % 2 === 0 ? videos : reads).push(x));
      });
      setForYouMedia({ videos: videos.slice(0, 4), reads: reads.slice(0, 4) });
    }).catch(() => {});
    return () => { live = false };
  }, [user, planTasks]);

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

  // ---- Mock fallbacks (UI review only, used when real data is absent) ----
  function onFeedSelect() {
    if (!emblaApi) return;
    setTab(emblaApi.selectedScrollSnap());
  }
  function goTab(i) {
    setTab(i);
    if (emblaApi) emblaApi.scrollTo(i);
    const bar = document.querySelector('header.sticky');
    const barH = bar ? bar.getBoundingClientRect().height : 53;
    const sec = feedSectionRef.current;
    if (sec) {
      sec.style.scrollMarginTop = barH + 'px';
      sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  let tasks = [];
  let doneCount = 0;
  if (planTasks?.plan?.supported) {
    const today = new Date().toISOString().slice(0, 10);
    const doneToday = new Set();
    for (const c of planTasks.completions || []) {
      if ((c.createdAt || '').slice(0, 10) === today) doneToday.add(c.topicId + ':' + c.itemId);
    }
    const pending = [];
    const seen = new Set();
    for (const course of planTasks.plan.courses || []) {
      for (const topic of course.topics || []) {
        for (const item of topic.items || []) {
          const key = topic.id + ':' + item.id;
          if (seen.has(key)) continue;
          seen.add(key);
          if (doneToday.has(key)) { tasks.push({ key, courseCode: course.code, kind: item.kind, title: item.title, href: '/task', done: true }); doneCount += 1 }
          else pending.push({ key, courseCode: course.code, kind: item.kind, title: item.title, href: '/task', done: false });
        }
      }
    }
    tasks = pending.slice(0, 5).concat(tasks);
  } else {
    tasks = continueItems.slice(0, 5).map((item, i) => ({
      key: 'cont-' + i, courseCode: item.data?.courseCode, kind: 'quiz',
      title: 'Continue ' + item.data?.courseCode + ' (' + item.data?.percentage + '%)',
      href: '/courses/' + (item.data?.courseCode || '').toLowerCase().replace(/\s+/g, '') + '/quiz',
      done: false,
    }));
  }

  // ---- Mock fallbacks (UI review only, used when real data is absent) ----
  const MOCK_TASKS = [
    { key: 'mock-1', courseCode: 'COS 202', kind: 'learn', title: 'Read: Arrays and Strings', href: '/task', done: false },
    { key: 'mock-2', courseCode: 'COS 202', kind: 'drill', title: 'Drill: 10 array questions', href: '/task', done: false },
    { key: 'mock-3', courseCode: 'CSC 282', kind: 'learn', title: 'Read: Classes and constructors', href: '/task', done: true },
  ];
  const MOCK_OTHERS = [
    { key: 'mock-o1', name: 'Amina', meta: 'COS · 200 Level', title: 'Shared: Arrays cheat sheet', sub: '12 likes · 4 comments', href: '/groups', placeholder: 'image', placeholderLabel: 'PICTURE' },
    { key: 'mock-o2', name: 'Tunde', meta: 'CSC · 200 Level', title: 'Posted: OOP explained', sub: '8 likes · 2 comments', href: '/groups', placeholder: 'video', placeholderLabel: 'VIDEO', duration: '8:24' },
    { key: 'mock-o3', name: 'Zainab', meta: 'COS · 200 Level', title: 'Shared: Logic audio recap', sub: '20 likes · 9 comments', href: '/groups', placeholder: 'audio', placeholderLabel: 'AUDIO', duration: '3:12' },
    { key: 'mock-o4', name: 'Emeka', meta: 'PHY · 200 Level', title: 'Shared: Physics 102 notes', sub: '5 likes · 1 comment', href: '/groups' },
  ];
  const showTasks = tasks.length > 0 ? tasks : (user && !hasFeed ? MOCK_TASKS : tasks);
  const showContinue = feed.filter(i => i.type === 'continue');
  const showRecommended = feed.filter(i => i.type === 'recommended');
  const showSpaces = feed.filter(i => i.type === 'space_post');
  // Helpers: YouTube thumb + plain-text excerpt (real media, not icons).
  const ytId = (url) => {
    const m = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
    return m ? m[1] : null;
  };
  const excerpt = (html, n = 110) => String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  // For You = your own stuff (videos + reads + continue, mapped to cards).
  const mediaCards = [
    ...forYouMedia.videos.map((v, i) => ({
      key: 'vid-' + i, kind: 'video', course: v.courseCode || '', title: v.title || 'Video',
      sub: v.description || 'Watch', href: '/courses/' + (v.courseCode || '').toLowerCase().replace(/\s+/g, ''),
      thumb: ytId(v.url) ? 'https://i.ytimg.com/vi/' + ytId(v.url) + '/hqdefault.jpg' : null,
    })),
    ...forYouMedia.reads.map((r, i) => ({
      key: 'read-' + i, kind: 'book', course: r.courseCode || '', title: r.title || 'Reading',
      sub: excerpt(r.content) || 'Read', href: '/courses/' + (r.courseCode || '').toLowerCase().replace(/\s+/g, ''),
    })),
  ];
  const forYouReal = [
    ...mediaCards,
    ...showContinue.slice(0, 3).map((item, i) => ({
      key: 'cont-' + i, kind: 'quiz', course: item.data?.courseCode || '',
      title: 'Continue ' + (item.data?.courseCode || 'quiz') + ' (' + (item.data?.percentage ?? 0) + '%)',
      sub: 'Pick up where you left off',
      href: '/courses/' + (item.data?.courseCode || '').toLowerCase().replace(/\s+/g, '') + '/quiz',
    })),
    ...showRecommended.slice(0, 3).map((item, i) => ({
      key: 'rec-' + i, kind: 'book', course: item.data?.courseCode || '',
      title: item.data?.courseTitle || item.data?.courseCode || 'Recommended',
      sub: 'Recommended for you',
      href: '/courses/' + (item.data?.courseCode || '').toLowerCase().replace(/\s+/g, ''),
    })),
  ];
  const forYou = forYouReal.length > 0 ? forYouReal : (user && !hasFeed ? [
    { key: 'mock-fy1', kind: 'book', course: 'COS 202', title: 'Read: Arrays and Strings', sub: 'Chapter 3 · 12 min', href: '/task' },
    { key: 'mock-fy2', kind: 'video', course: 'CSC 282', title: 'Watch: Classes and Constructors', sub: '8 min · Java', href: '/task', placeholder: 'video', placeholderLabel: 'VIDEO', duration: '8:24' },
    { key: 'mock-fy3', kind: 'image', course: 'PHY 102', title: 'See: Circuit diagrams', sub: '12 diagrams', href: '/task', placeholder: 'image', placeholderLabel: 'PICTURE' },
    { key: 'mock-fy4', kind: 'audio', course: 'GSS 212', title: 'Listen: Philosophy recap', sub: '3 min listen', href: '/task', placeholder: 'audio', placeholderLabel: 'AUDIO', duration: '3:12' },
    { key: 'mock-fy5', kind: 'quiz', course: 'CSC 203', title: 'Drill: 10 logic questions', sub: 'Prove · 80% to pass', href: '/task' },
  ] : []);
  const showOthersReal = showSpaces;
  const showOthersMock = user && !hasFeed && showOthersReal.length === 0;

  return (
    <div className={user
      ? 'mx-auto flex h-[calc(100dvh-122px)] max-w-2xl flex-col px-5 pt-4'
      : 'mx-auto min-h-dvh max-w-2xl space-y-5 px-5 pb-28 pt-6'}>
      {!user && (
        <div className="flex items-center gap-4">
          <img src="/just-logo.png" alt="Apex" className="size-12 rounded-xl object-cover shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">Apex</h1>
            <p className="text-xs text-muted-foreground">Master your exams with past questions</p>
          </div>
          <Link href="/auth" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shrink-0">
            Sign In
          </Link>
        </div>
      )}

      {/* Vertical pager: slide 1 = tasks, slide 2 = feed */}
      {user && (
      <div ref={emblaVRef} className="min-h-0 flex-1 overflow-hidden">
      <div className="flex h-full flex-col">
      <div className="min-h-0 flex-[0_0_auto] max-h-full overflow-y-auto pb-8">
      {/* Today's Tasks — straight from your curriculum */}
      {showTasks.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Today&apos;s Tasks{doneCount > 0 && <span className="ml-2 text-xs font-medium text-green-600">{doneCount} done</span>}</h2>
            <Link href="/plan" className="text-xs font-medium text-primary">
              {planPct != null ? `${planPct}%` : 'Plan'} →
            </Link>
          </div>
          {showTasks.map(t => (
            <Link
              key={t.key}
              href={t.href}
              className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted active:scale-[0.99]"
            >
              {t.done ? (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-500">
                  <Check className="size-4 text-white" strokeWidth={3} />
                </span>
              ) : (
                <span className="size-6 shrink-0 rounded-full border-2 border-muted-foreground/40" />
              )}
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm font-medium ${t.done ? 'text-muted-foreground line-through' : ''}`}>{t.title}</span>
                {(t.courseCode || t.kind) && (
                  <span className="text-[11px] text-muted-foreground">{[t.courseCode, t.kind].filter(Boolean).join(' · ')}</span>
                )}
              </span>
            </Link>
          ))}
        </section>
      )}
      </div>
      <div className="min-h-0 flex-[0_0_100%] overflow-y-auto pb-8">
      {/* Snap feed — For You | Others (mock) */}
      {user && (
        <section ref={feedSectionRef} className="space-y-2">
          <div className="flex gap-4 border-b text-sm font-bold">
            {['For You', 'Others'].map((label, i) => (
              <button key={label} onClick={() => goTab(i)}
                className={'pb-2 ' + (tab === i ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground')}>
                {label}
              </button>
            ))}
          </div>
          <div ref={emblaRef} className="overflow-hidden">
          <div className="flex gap-3">
            <div className="min-w-0 flex-[0_0_100%] space-y-2">
              {forYou.map(c => {
                if (c.placeholder) {
                  const tag = c.kind === 'video' ? 'VIDEO' : c.kind === 'book' ? 'READ' : c.kind === 'audio' ? 'AUDIO' : c.kind === 'image' ? 'PICTURE' : 'QUIZ';
                  return (
                    <Link key={c.key} href={c.href}
                      className="block overflow-hidden rounded-xl border transition-colors hover:bg-muted active:scale-[0.99]">
                      <PlaceholderMedia kind={c.kind} label={tag} duration={c.duration} />
                      <span className="block p-3">
                        <span className="block truncate text-sm font-medium">{c.title}</span>
                        <span className="text-[11px] text-muted-foreground">{[c.course, c.sub].filter(Boolean).join(' · ')}</span>
                      </span>
                    </Link>
                  );
                }
                if (c.kind === 'video' && c.thumb) {
                  return (
                    <Link key={c.key} href={c.href}
                      className="block overflow-hidden rounded-xl border transition-colors hover:bg-muted active:scale-[0.99]">
                      <span className="relative block">
                        <img src={c.thumb} alt="" loading="lazy" className="aspect-video w-full object-cover" />
                        <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">VIDEO</span>
                      </span>
                      <span className="block p-3">
                        <span className="block truncate text-sm font-medium">{c.title}</span>
                        <span className="text-[11px] text-muted-foreground">{[c.course, c.sub].filter(Boolean).join(' · ')}</span>
                      </span>
                    </Link>
                  );
                }
                if (c.kind === 'book') {
                  return (
                    <Link key={c.key} href={c.href}
                      className="block rounded-xl border p-3 transition-colors hover:bg-muted active:scale-[0.99]">
                      <span className="mb-1 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">READ</span>
                      <span className="block truncate text-sm font-medium">{c.title}</span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{c.sub}</span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">{c.course}</span>
                    </Link>
                  );
                }
                return (
                  <Link key={c.key} href={c.href}
                    className="block rounded-xl border p-3 transition-colors hover:bg-muted active:scale-[0.99]">
                    <span className="mb-1 inline-block rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">QUIZ</span>
                    <span className="block truncate text-sm font-medium">{c.title}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">{[c.course, c.sub].filter(Boolean).join(' · ')}</span>
                  </Link>
                );
              })}
              {forYou.length === 0 && (
                <p className="rounded-xl border p-4 text-center text-xs text-muted-foreground">Your task content will appear here once your plan is active.</p>
              )}
            </div>
            <div className="min-w-0 flex-[0_0_100%] space-y-2">
              {showOthersReal.map((item, i) => (
                <FeedCard key={item.data?.postId || i} item={item} userEmail={user?.email} />
              ))}
              {showOthersMock && MOCK_OTHERS.map(c => (
                <Link key={c.key} href={c.href}
                  className="block rounded-xl border p-3 transition-colors hover:bg-muted active:scale-[0.99]">
                  <span className="flex items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      {c.name.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold">{c.name} · {c.meta}</span>
                  </span>
                  <span className="mt-1 block truncate text-sm font-medium">{c.title}</span>
                  {c.placeholder && (
                    <span className="mt-2 block">
                      <PlaceholderMedia kind={c.placeholder} label={c.placeholderLabel} duration={c.duration} />
                    </span>
                  )}
                  <span className="mt-1 block text-[11px] text-muted-foreground">{c.sub}</span>
                </Link>
              ))}
            </div>
            </div>
          </div>
        </section>
      )}
      </div>
      </div>
      </div>
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
                  href={`/departments/${cat.code?.toLowerCase()}`}
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

    </div>
  );
}
