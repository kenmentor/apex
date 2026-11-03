'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getUser } from '@/lib/auth';
import { Trophy, ArrowLeft, Users, FileText, TrendingUp, Medal, Crown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RoleSeal } from '@/components/UserAvatar';

function RoleDot({ role, className = '' }) {
  if (role !== 'admin' && role !== 'editor' && role !== 'official') return null
  return (
    <span className={`inline-flex rounded-full ring-2 ring-background ${className}`}>
      <RoleSeal role={role} size="size-4" />
    </span>
  )
}
import { Skeleton } from '@/components/ui/skeleton';

const avatars = [
  'linear-gradient(135deg, #ff9f43, #ff4757)',
  'linear-gradient(135deg, #4bc0c0, #36a2eb)',
  'linear-gradient(135deg, #a855f7, #6366f1)',
  'linear-gradient(135deg, #05c46b, #0be881)',
  'linear-gradient(135deg, #f1c40f, #f39c12)',
  'linear-gradient(135deg, #e74c3c, #c0392b)',
  'linear-gradient(135deg, #3498db, #2980b9)',
  'linear-gradient(135deg, #9b59b6, #8e44ad)',
  'linear-gradient(135deg, #00b894, #00cec9)',
  'linear-gradient(135deg, #fd79a8, #e84393)',
];

function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarIndex(id, idx) {
  if (typeof id === 'string') {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % avatars.length;
    return hash;
  }
  return (idx || 0) % avatars.length;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(secs) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m > 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}m ${s}s`;
}

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-0.5 px-2 py-2.5 text-center">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ background: bg, color }}>
          <Icon className="size-4" />
        </div>
        <div className="text-sm font-bold leading-tight">{value}</div>
        <div className="text-[10px] leading-tight text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function PodiumUser({ entry, rank, role }) {
  const isWinner = rank === 1;
  const href = entry?.email ? `/profile/${encodeURIComponent(entry.email)}` : '#';
  return (
    <div className={`flex flex-1 flex-col items-center min-w-0 ${rank === 2 ? 'order-first sm:order-none' : ''}`}>
      <Link href={href} className="relative inline-flex flex-col items-center">
        <div className="relative">
          <Avatar className="size-12 border-4 border-background sm:size-16" style={{ boxShadow: isWinner ? '0 0 0 3px #f1c40f' : undefined }}>
            <AvatarImage src={entry?.avatar} />
            <AvatarFallback
              className="text-lg font-bold text-white"
              style={{ background: avatars[getAvatarIndex(entry?._id, rank - 1)] }}
            >
              {entry ? getInitials(entry.name) : '??'}
            </AvatarFallback>
          </Avatar>
          <RoleDot role={role} className="absolute -bottom-1 -right-1" />
          {isWinner && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Crown className="size-6 text-yellow-400" fill="currentColor" />
            </div>
          )}
          <Badge
            variant="secondary"
            className="absolute -bottom-1 left-1/2 size-6 -translate-x-1/2 p-0 text-xs font-bold"
            style={{
              background: rank === 1 ? '#f1c40f' : rank === 2 ? '#bdc3c7' : '#cd7f32',
              color: 'white',
            }}
          >
            {rank}
          </Badge>
        </div>
        <div className="mt-3 w-full text-center">
          <div className="truncate text-xs font-bold sm:text-sm">{entry?.name || '---'}</div>
          <div className="text-xs font-semibold text-primary">{entry?.totalScore || 0} pts</div>
        </div>
      </Link>
    </div>
  );
}

function LeaderEntry({ entry, rank, isUser, role }) {
  const href = entry?.email ? `/profile/${encodeURIComponent(entry.email)}` : '#';
  return (
    <div className={`flex items-center gap-2 rounded-xl border-b border-border px-2.5 py-2 transition-colors last:border-b-0 ${isUser ? 'bg-primary/5 ring-1 ring-primary/20' : 'bg-card hover:bg-muted/50'}`}>
      <span className="w-5 shrink-0 text-center text-xs font-black text-muted-foreground">{rank}</span>
      <Link href={href} className="relative shrink-0">
        <Avatar className="size-8">
          <AvatarImage src={entry.avatar} />
          <AvatarFallback
            className="text-[10px] font-bold text-white"
            style={{ background: avatars[getAvatarIndex(entry._id, rank)] }}
          >
            {getInitials(entry.name)}
          </AvatarFallback>
        </Avatar>
        <RoleDot role={role} className="absolute -bottom-0.5 -right-0.5" />
      </Link>
      <div className="min-w-0 flex-1 leading-tight">
        <Link href={href}>
          <div className="truncate text-[13px] font-bold hover:text-primary transition-colors">{entry.name}</div>
        </Link>
        <div className="truncate text-[10px] text-muted-foreground">
          {[entry.school, `${entry.quizCount} quiz${entry.quizCount !== 1 ? 'zes' : ''}`].filter(Boolean).join(' · ')}
        </div>
      </div>
      <div className="shrink-0 text-right leading-tight">
        <div className="text-[13px] font-bold">{entry.totalScore}</div>
        <div className="text-[10px] font-semibold text-muted-foreground">{entry.avgPct}%</div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const [allEntries, setAllEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUserState] = useState(null);
  const [roleMap, setRoleMap] = useState({});

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
        const emails = [...new Set(list.map(e => e.email).filter(Boolean))].slice(0, 50);
        if (emails.length) {
          fetch(`/api/users/roles?emails=${emails.map(encodeURIComponent).join(',')}`)
            .then(r => r.json())
            .then(d => { if (d.roles) setRoleMap(d.roles) })
            .catch(() => {});
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const userEmail = user?.email?.toLowerCase();
  const userEntry = allEntries.find(e => e.email?.toLowerCase() === userEmail);
  const userRank = userEntry ? allEntries.indexOf(userEntry) + 1 : null;
  const isInTop10 = userRank && userRank <= 10;

  const top3 = allEntries.slice(0, 3);

  // Build display: top 10, optional separator+user, then rest
  const top10 = allEntries.slice(0, 10);
  const afterTop10 = allEntries.slice(10);
  const showSeparator = userEntry && !isInTop10;

  if (loading) {
    return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background pb-24">
        <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Link href="/courses" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="flex-1 text-base font-bold">Leader Board</h1>
        </header>
        <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <div className="flex justify-center gap-6 py-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="size-16 rounded-full" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background pb-24">
        <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Link href="/courses" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
            <ArrowLeft className="size-4" />
          </Link>
        <h1 className="flex-1 text-base font-bold">Rankings</h1>
        <div className="size-9" />
      </header>

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
            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-4 gap-2">
                <StatCard icon={Users} label="Players" value={stats.totalPlayers} bg="#e8f4fd" color="#3498db" />
                <StatCard icon={FileText} label="Quizzes" value={stats.totalQuizzes} bg="#fef3e2" color="#f39c12" />
                <StatCard icon={TrendingUp} label="Avg Pct" value={`${stats.avgPercentage}%`} bg="#e6f7ee" color="#27ae60" />
                <StatCard icon={Medal} label="Top Score" value={stats.topScore || 0} bg="#f4e6fd" color="#9b59b6" />
              </div>
            )}

            {/* Podium */}
            {top3.length > 0 && (
              <div className="flex items-end justify-center gap-4 overflow-hidden py-4 sm:gap-6">
                {[1, 0, 2].map(pos => {
                  const entry = top3[pos];
                  return entry ? <PodiumUser key={pos} entry={entry} rank={pos + 1} role={entry?.email && roleMap[entry.email.toLowerCase()]} /> : null;
                })}
              </div>
            )}

            {/* Leaderboard List */}
            <div className="space-y-1">
              {/* Top 10 */}
              {top10.map((entry, i) => {
                const isUser = userEmail && entry.email?.toLowerCase() === userEmail;
                return (
                    <LeaderEntry key={`top-${i}`} entry={entry} rank={i + 1} isUser={isUser} role={entry?.email && roleMap[entry.email.toLowerCase()]} />
                );
              })}

              {/* Separator + User (if not in top 10) */}
              {showSeparator && (
                <>
                  <div className="flex items-center gap-3 py-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your Rank</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <LeaderEntry entry={userEntry} rank={userRank} isUser role={userEntry?.email && roleMap[userEntry.email.toLowerCase()]} />
                </>
              )}

              {/* After top 10 (skip user if already shown above) */}
              {afterTop10.map((entry, i) => {
                const isUser = userEmail && entry.email?.toLowerCase() === userEmail;
                if (isUser && showSeparator) return null;
                return (
                    <LeaderEntry key={`rest-${i}`} entry={entry} rank={10 + i + 1} isUser={isUser} role={entry?.email && roleMap[entry.email.toLowerCase()]} />
                );
              })}
            </div>

            <div className="text-center text-xs text-muted-foreground">
              Ranking by total correct answers · {allEntries.length} players
            </div>
          </>
        )}
      </div>
    </div>
  );
}
