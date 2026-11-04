'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getUser } from '@/lib/auth';
import { Trophy, Users, FileText, TrendingUp, Medal, Crown, Search, ChevronRight } from 'lucide-react';
import { AvatarWithTick } from '@/components/UserAvatar';
import { Skeleton } from '@/components/ui/skeleton';

const RANK_STYLE = {
  1: { ring: '#f1c40f', chip: '#f1c40f', label: '1st' },
  2: { ring: '#bdc3c7', chip: '#95a5a6', label: '2nd' },
  3: { ring: '#cd7f32', chip: '#cd7f32', label: '3rd' },
};

function toAvatarUser(entry, role) {
  if (!entry) return { name: '---' };
  return {
    name: entry.name,
    email: entry.email,
    avatar: entry.avatar || '',
    avatarConfig: entry.avatarConfig || null,
    role: entry.role || role || null,
    admin: (entry.role || role) === 'admin',
  };
}

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border bg-card px-2 py-3 text-center">
      <div className="flex size-9 items-center justify-center rounded-xl" style={{ background: bg, color }}>
        <Icon className="size-4" />
      </div>
      <div className="text-base font-extrabold leading-tight tabular-nums">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function PodiumCard({ entry, rank, role, large }) {
  const s = RANK_STYLE[rank];
  const href = entry?.email ? `/profile/${encodeURIComponent(entry.email)}` : '#';
  return (
    <Link
      href={href}
      className={`relative flex flex-1 flex-col items-center rounded-3xl border bg-card px-2 pb-3 pt-5 text-center transition-transform hover:-translate-y-0.5 ${rank === 1 ? 'shadow-lg' : ''}`}
      style={rank === 1 ? { borderColor: '#f1c40f55' } : undefined}
    >
      {rank === 1 && <Crown className="absolute -top-3.5 size-7 text-yellow-400" fill="currentColor" />}
      <span
        className="absolute -top-2.5 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white"
        style={{ background: s.chip }}
      >
        {s.label}
      </span>
      <span className="rounded-full p-1" style={{ boxShadow: `0 0 0 3px ${s.ring}` }}>
        <AvatarWithTick
          user={toAvatarUser(entry, role)}
          className={large ? 'size-20' : 'size-16'}
          tickSize="size-5"
          fallbackClassName="text-xl"
        />
      </span>
      <div className="mt-2 w-full truncate text-xs font-bold sm:text-sm">{entry?.name || '---'}</div>
      <div className="text-sm font-extrabold tabular-nums text-primary">{entry?.totalScore || 0} pts</div>
      <div className="text-[10px] font-semibold text-muted-foreground">{entry?.avgPct ?? 0}% avg · {entry?.quizCount ?? 0} quiz{(entry?.quizCount ?? 0) === 1 ? '' : 'zes'}</div>
    </Link>
  );
}

function RankRow({ entry, rank, isUser, role }) {
  const s = RANK_STYLE[rank];
  const href = entry?.email ? `/profile/${encodeURIComponent(entry.email)}` : '#';
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-2xl border bg-card px-3 py-2.5 transition-colors hover:bg-muted/50 ${isUser ? 'border-primary/60 ring-1 ring-primary/30' : ''}`}
    >
      <span
        className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-black tabular-nums"
        style={s ? { background: s.chip, color: '#fff' } : undefined}
      >
        {s ? <Medal className="size-3.5" /> : rank}
      </span>
      <AvatarWithTick user={toAvatarUser(entry, role)} className="size-10" tickSize="size-4" />
      <span className="min-w-0 flex-1 leading-tight">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold">{entry.name}</span>
          {isUser && (
            <span className="shrink-0 rounded-full bg-primary px-1.5 py-px text-[9px] font-black uppercase tracking-wide text-primary-foreground">
              You
            </span>
          )}
        </span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {[entry.school, `${entry.quizCount} quiz${entry.quizCount !== 1 ? 'zes' : ''}`].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span className="shrink-0 text-right leading-tight">
        <span className="block text-sm font-extrabold tabular-nums">{entry.totalScore}</span>
        <span className="block text-[11px] font-semibold text-muted-foreground">{entry.avgPct}% avg</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
    </Link>
  );
}

export default function LeaderboardPage() {
  const [allEntries, setAllEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUserState] = useState(null);
  const [roleMap, setRoleMap] = useState({});
  const [query, setQuery] = useState('');

  useEffect(() => {
    const u = getUser();
    setUserState(u);
    Promise.all([
      fetch('/api/leaderboard').then(r => r.json()),
      fetch('/api/leaderboard?stats=true').then(r => r.json()),
    ])
      .then(([scoresData, statsData]) => {
        const list = Array.isArray(scoresData) ? scoresData : [];
        setAllEntries(list);
        if (statsData && !statsData.error) setStats(statsData);
        // Roles for entries that didn't already carry one from the API.
        const missing = [...new Set(list.filter(e => !e.role && e.email).map(e => e.email))].slice(0, 50);
        if (missing.length) {
          fetch(`/api/users/roles?emails=${missing.map(encodeURIComponent).join(',')}`)
            .then(r => r.json())
            .then(d => { if (d.roles) setRoleMap(d.roles) })
            .catch(() => {});
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const roleOf = (entry) => entry?.role || (entry?.email && roleMap[entry.email.toLowerCase()]) || null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allEntries;
    return allEntries.filter(e =>
      e.name?.toLowerCase().includes(q) || e.school?.toLowerCase().includes(q)
    );
  }, [allEntries, query]);

  const userEmail = user?.email?.toLowerCase();
  const userRank = useMemo(() => {
    const i = allEntries.findIndex(e => e.email?.toLowerCase() === userEmail);
    return i >= 0 ? i + 1 : null;
  }, [allEntries, userEmail]);
  const userEntry = userRank ? allEntries[userRank - 1] : null;
  const searching = query.trim().length > 0;

  const top3 = allEntries.slice(0, 3);
  const showPodium = top3.length > 0 && !searching;

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background pb-24">
        <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-3 items-end gap-3 pt-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="size-16 rounded-full" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background pb-24">
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pt-4">
        {allEntries.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Trophy className="size-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No scores yet</p>
            <Link
              href="/courses"
              className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Take a Quiz
            </Link>
          </div>
        ) : (
          <>
            {stats && (
              <div className="grid grid-cols-4 gap-2">
                <StatCard icon={Users} label="Players" value={stats.totalPlayers} bg="#e8f4fd" color="#3498db" />
                <StatCard icon={FileText} label="Quizzes" value={stats.totalQuizzes} bg="#fef3e2" color="#f39c12" />
                <StatCard icon={TrendingUp} label="Avg Pct" value={`${stats.avgPercentage}%`} bg="#e6f7ee" color="#27ae60" />
                <StatCard icon={Medal} label="Top Score" value={stats.topScore || 0} bg="#f4e6fd" color="#9b59b6" />
              </div>
            )}

            {showPodium && (
              <div className="grid grid-cols-3 items-end gap-2 pt-5 sm:gap-3">
                <PodiumCard entry={top3[1]} rank={2} role={top3[1] && roleOf(top3[1])} />
                <PodiumCard entry={top3[0]} rank={1} large role={top3[0] && roleOf(top3[0])} />
                {top3[2] ? (
                  <PodiumCard entry={top3[2]} rank={3} role={roleOf(top3[2])} />
                ) : (
                  <div className="flex flex-1 flex-col items-center rounded-3xl border border-dashed px-2 py-6 text-center">
                    <span className="text-xs font-bold text-muted-foreground">3rd place</span>
                    <span className="text-[11px] text-muted-foreground">up for grabs</span>
                  </div>
                )}
              </div>
            )}

            {userEntry && userRank > 3 && !searching && (
              <Link
                href={userEntry.email ? `/profile/${encodeURIComponent(userEntry.email)}` : '#'}
                className="flex items-center gap-3 rounded-2xl border border-primary/60 bg-primary/5 px-3 py-2.5 ring-1 ring-primary/30"
              >
                <AvatarWithTick user={toAvatarUser(userEntry, roleOf(userEntry))} className="size-10" tickSize="size-4" />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-sm font-bold">Your rank · #{userRank}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {userEntry.totalScore} pts · {userEntry.avgPct}% avg — keep climbing
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            )}

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search players or schools…"
                className="w-full rounded-2xl border bg-card py-2.5 pl-9 pr-9 text-sm font-medium outline-none placeholder:text-muted-foreground/60 focus:border-primary"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="space-y-2">
              {searching && filtered.length === 0 && (
                <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No players match “{query.trim()}”.
                </p>
              )}
              {(searching ? filtered : allEntries.slice(3)).map((entry) => {
                const rank = allEntries.indexOf(entry) + 1;
                const isUser = userEmail && entry.email?.toLowerCase() === userEmail;
                return <RankRow key={entry.email || `${rank}-${entry.name}`} entry={entry} rank={rank} isUser={isUser} role={roleOf(entry)} />;
              })}
            </div>

            <div className="text-center text-xs text-muted-foreground">
              Ranking by total correct answers · {searching ? `${filtered.length} of ` : ''}{allEntries.length} players
            </div>
          </>
        )}
      </div>
    </div>
  );
}
