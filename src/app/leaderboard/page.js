'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getUser } from '@/lib/auth';
import { Trophy, Medal, Crown, Search, ChevronRight, Play } from 'lucide-react';
import { motion } from 'motion/react';
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

function PodiumCard({ entry, rank, role, large, contrib }) {
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
      {!!contrib?.medals?.length && (
        <div className="mt-1.5 flex justify-center">
          <MedalStack medals={contrib.medals} size="size-4 text-[10px]" max={4} />
        </div>
      )}
    </Link>
  );
}

// Earned achievement badges, overlapped like a facepile.
function MedalStack({ medals = [], size = 'size-5 text-[11px]', max = 5 }) {
  const shown = medals.slice(0, max);
  const extra = medals.length - shown.length;
  if (!shown.length && !extra) return null;
  return (
    <span className="inline-flex items-center">
      {shown.map(m => (
        <span key={m.id} title={m.label}
          className={`flex shrink-0 items-center justify-center rounded-full bg-muted ring-2 ring-card ${size} -ml-1.5 first:ml-0`}>
          {m.icon}
        </span>
      ))}
      {extra > 0 && (
        <span className={`flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-black text-primary ring-2 ring-card ${size} -ml-1.5`} style={{ fontSize: 9 }}>
          +{extra}
        </span>
      )}
    </span>
  );
}

function RankRow({ entry, rank, isUser, role, contrib }) {
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
        {!!contrib && (contrib.approved > 0 || (contrib.medals || []).length > 0) && (
          <span className="mt-1 flex items-center gap-1.5">
            <MedalStack medals={contrib.medals || []} />
            <span className="truncate text-[10px] font-bold text-muted-foreground">
              {contrib.approved} upload{contrib.approved === 1 ? '' : 's'}
            </span>
          </span>
        )}
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
  const [contribMap, setContribMap] = useState({});
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
        // Contribution badges + upload counts for the visible board.
        const board = [...new Set(list.slice(0, 30).map(e => e.email).filter(Boolean))];
        if (board.length) {
          fetch(`/api/contributions/public?emails=${board.map(encodeURIComponent).join(',')}`)
            .then(r => r.json())
            .then(d => { if (d.users) setContribMap(d.users) })
            .catch(() => {});
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const roleOf = (entry) => entry?.role || (entry?.email && roleMap[entry.email.toLowerCase()]) || null;
  const contribOf = (entry) => (entry?.email && contribMap[entry.email.toLowerCase()]) || null;

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
          <Skeleton className="h-64 rounded-3xl" />
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
            {/* Featured hero — all stats live inside this one card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            >
              <div className="relative block overflow-hidden rounded-3xl p-5 text-white shadow-lg" style={{ background: 'linear-gradient(150deg, #451a03 0%, #92400e 55%, #d97706 100%)' }}>
                <Trophy className="pointer-events-none absolute -bottom-6 -right-6 size-40 text-white/10" strokeWidth={1.25} />
                <span className="inline-block max-w-full truncate rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest backdrop-blur">
                  {top3[0]?.name ? `No. 1 · ${top3[0].name}` : 'Live season'}
                </span>
                <span className="mt-8 block text-2xl font-black tracking-tight">Rankings</span>
                <span className="mt-0.5 block max-w-[75%] text-[13px] leading-snug text-white/75">
                  Every quiz counts. Climb the board.
                </span>
                {stats && (
                  <div className="relative mt-4 grid grid-cols-4 divide-x divide-white/15 rounded-2xl bg-white/10 backdrop-blur">
                    {[
                      { label: 'Players', value: stats.totalPlayers },
                      { label: 'Quizzes', value: stats.totalQuizzes },
                      { label: 'Avg pct', value: `${stats.avgPercentage}%` },
                      { label: 'Top score', value: stats.topScore || 0 },
                    ].map(s => (
                      <div key={s.label} className="px-2 py-2.5 text-center">
                        <div className="truncate text-base font-black tabular-nums">{s.value}</div>
                        <div className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-widest text-white/70">{s.label}</div>
                      </div>
                    ))}
                  </div>
                )}
                <Link href="/courses" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-extrabold text-black">
                  <Play className="size-3.5" fill="currentColor" /> Take a quiz
                </Link>
              </div>
            </motion.div>

            {showPodium && (
              <div className="grid grid-cols-3 items-end gap-2 pt-5 sm:gap-3">
                <PodiumCard entry={top3[1]} rank={2} role={top3[1] && roleOf(top3[1])} contrib={top3[1] && contribOf(top3[1])} />
                <PodiumCard entry={top3[0]} rank={1} large role={top3[0] && roleOf(top3[0])} contrib={top3[0] && contribOf(top3[0])} />
                {top3[2] ? (
                  <PodiumCard entry={top3[2]} rank={3} role={roleOf(top3[2])} contrib={contribOf(top3[2])} />
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
                  {(() => { const c = contribOf(userEntry); return !!c && (c.approved > 0 || (c.medals || []).length > 0) ? (
                    <span className="mt-1 flex items-center gap-1.5">
                      <MedalStack medals={c.medals || []} />
                      <span className="truncate text-[10px] font-bold text-muted-foreground">{c.approved} uploads</span>
                    </span>
                  ) : null })()}
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
                return <RankRow key={entry.email || `${rank}-${entry.name}`} entry={entry} rank={rank} isUser={isUser} role={roleOf(entry)} contrib={contribOf(entry)} />;
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
