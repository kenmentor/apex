'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import { getUser } from '@/lib/auth';
import { Trophy } from 'lucide-react';

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

export default function LeaderboardPage() {
  const [allEntries, setAllEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUserState] = useState(null);

  useEffect(() => {
    const u = getUser();
    setUserState(u);
    Promise.all([
      fetch('/api/leaderboard').then(r => r.json()),
      fetch('/api/leaderboard?stats=true').then(r => r.json()),
    ])
      .then(([scoresData, statsData]) => {
        setAllEntries(Array.isArray(scoresData) ? scoresData : []);
        if (statsData && !statsData.error) setStats(statsData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const userEmail = user?.email?.toLowerCase();
  const userEntry = allEntries.find(e => e.email?.toLowerCase() === userEmail);
  const otherEntries = allEntries.filter(e => e.email?.toLowerCase() !== userEmail);

  const topSlice = otherEntries.slice(0, 10);
  const rest = otherEntries.slice(10);

  const displayEntries = userEntry
    ? [...topSlice, userEntry, ...rest]
    : allEntries;

  const top3 = allEntries.slice(0, 3);

  return (
    <div className="app-wrapper">
      <div className="quiz-container">
        <div className="top-bar">
          <Link href="/courses" className="back-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div className="screen-title-center">Leader Board</div>
          <div className="back-btn" style={{ background: 'none' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </div>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
            Loading...
          </div>
        ) : allEntries.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 12, padding: '40px 0' }}>
            <Trophy size={48} style={{ opacity: 0.3 }} />
            <div style={{ color: 'var(--text-muted)', fontSize: 16 }}>No scores yet</div>
            <Link href="/courses" className="btn-restart" style={{ padding: '12px 32px', fontSize: 14, textDecoration: 'none' }}>
              Take a Quiz
            </Link>
          </div>
        ) : (
          <>
            {stats && (
              <div className="stats-cards-row">
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#e8f4fd', color: '#3498db' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <div className="stat-label">Players</div>
                  <div className="stat-number">{stats.totalPlayers}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#fef3e2', color: '#f39c12' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  </div>
                  <div className="stat-label">Quizzes</div>
                  <div className="stat-number">{stats.totalQuizzes}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#e6f7ee', color: '#27ae60' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  </div>
                  <div className="stat-label">Avg Pct</div>
                  <div className="stat-number">{stats.avgPercentage}%</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: '#f4e6fd', color: '#9b59b6' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 6 9 6 9z"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 18 9 18 9z"/><path d="M4 22h16"/><path d="M10 22V2h4v20"/></svg>
                  </div>
                  <div className="stat-label">Top Score</div>
                  <div className="stat-number">{stats.topScore || 0}</div>
                </div>
              </div>
            )}

            {/* Podium */}
            <div className="podium-container">
              {[1, 0, 2].map(pos => {
                const entry = top3[pos];
                const rankNum = pos + 1;
                return (
                  <div key={pos} className={`podium-user rank-${rankNum}`}>
                    <div className="podium-avatar" style={{ background: entry?.avatar ? 'transparent' : avatars[getAvatarIndex(entry._id, pos)], overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {entry?.avatar ? (
                        <img src={entry.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      ) : (
                        <>
                          {rankNum === 1 && (
                            <svg className="crown-icon" width="18" height="18" viewBox="0 0 24 24" fill="#f1c40f" stroke="none">
                              <path d="M2 19l2-14 4 4 4-8 4 8 4-4 2 14H2z"/>
                            </svg>
                          )}
                          <span>{entry ? getInitials(entry.name) : '??'}</span>
                        </>
                      )}
                      <span className="rank-badge">{rankNum}</span>
                    </div>
                    <div className="podium-name">{entry?.name || '---'}</div>
                    <div className="podium-score">{entry?.totalScore || 0} pts</div>
                    {entry?.school && <div className="podium-school">{entry.school}</div>}
                  </div>
                );
              })}
            </div>

            {/* List */}
            <div className="leaderboard-list">
              {displayEntries.map((entry, i) => {
                const isUser = userEmail && entry.email?.toLowerCase() === userEmail;
                const actualRank = allEntries.indexOf(entry) + 1;
                const isInsertionPoint = userEntry && i === 10 && !otherEntries.slice(0, 10).some(e => e.email?.toLowerCase() === userEmail);

                return (
                  <div key={entry._id + (entry.email || i)}>
                    {isInsertionPoint && (
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '16px 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        ─ Your Rank ─
                      </div>
                    )}
                    <div className={`leader-item${isUser ? ' mine' : ''}`}>
                      <span className="leader-rank">{actualRank}</span>
                      <div className="leader-avatar-img" style={{ background: entry.avatar ? 'transparent' : avatars[getAvatarIndex(entry._id, i)], display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {entry.avatar ? (
                          <img src={entry.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{getInitials(entry.name)}</span>
                        )}
                      </div>
                      <div className="leader-info">
                        <div className="leader-name">{entry.name}</div>
                        <div className="leader-meta">
                          {entry.school && <span>{entry.school}</span>}
                          {entry.school && <span className="meta-dot">·</span>}
                          <span>{entry.quizCount} quiz{entry.quizCount !== 1 ? 'zes' : ''}</span>
                        </div>
                      </div>
                      <div className="leader-stats">
                        <div className="leader-score">{entry.totalScore} pts</div>
                        <div className="leader-sub">{entry.avgPct}%</div>
                      </div>
                      <div className="leader-time">{formatTime(entry.totalTimeSpent)}</div>
                      <div className="leader-date">{formatDate(entry.lastQuiz)}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="leader-footer-note">
              Ranking by total correct answers · {displayEntries.length} players
            </div>
          </>
        )}

        <NavBar active="/leaderboard" />
      </div>
    </div>
  );
}
