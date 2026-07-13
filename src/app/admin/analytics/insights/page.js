'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAdmin } from '@/lib/auth'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts'

const COLORS = ['#ff9f43', '#130f40', '#34c759', '#9b59b6', '#e17055', '#007aff', '#00b894', '#6c5ce7', '#d63031', '#636e72']

function StatCard({ label, value, color, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${color || ''}`}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function InsightsPage() {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('30d')

  useEffect(() => {
    if (!isAdmin()) { router.push('/auth'); return }
    setLoading(true)
    fetch(`/api/insights?range=${range}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [range])

  if (!data && loading) return <div className="loading">Loading...</div>

  const d = data || {}
  const funnel = d.engagementFunnel || {}
  const content = d.contentCoverage || {}

  return (
    <div className="page">
      <div className="page-inner">
        <div className="page-header">
          <div className="page-header-block">
            <Link href="/admin/analytics" className="page-back">← Analytics</Link>
            <h1 className="page-title">Insights</h1>
            <div className="page-subtitle">Actionable data for decision making</div>
          </div>
          <div className="btn-row">
            {['24h', '7d', '30d'].map(r => (
              <button key={r} onClick={() => setRange(r)} className={`btn btn-pill${range === r ? ' active' : ''}`}>{r}</button>
            ))}
          </div>
        </div>

        {/* ── Engagement Funnel ── */}
        <div className="stat-grid">
          <StatCard label="Total Users" value={funnel.totalUsers || 0} color="purple" />
          <StatCard label="Active Quiz Takers" value={funnel.activeQuizCount || 0} color="green" />
          <StatCard label="Churned Users" value={funnel.churnedUsers || 0} color="red" sub={`${funnel.churnRate || 0}% churn rate`} />
          <StatCard label="Repeat Quiz Rate" value={`${funnel.repeatQuizRate || 0}%`} color="orange" />
          <StatCard label="Multi-Course Rate" value={`${funnel.multiCourseRate || 0}%`} color="blue" sub="tried 2+ courses" />
          <StatCard label="Content Coverage" value={`${content.coveragePct || 0}%`} color="purple" sub={`${content.coursesWithContent || 0}/${content.totalCourses || 0} courses`} />
        </div>

        {/* ── Daily Quiz Trend ── */}
        {d.dailyQuizTrend?.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Daily Quiz Activity</div>
            </div>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.dailyQuizTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="quizzes" fill="var(--purple)" radius={[4, 4, 0, 0]} name="Quizzes" />
                  <Bar dataKey="users" fill="var(--orange)" radius={[4, 4, 0, 0]} name="Users" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Score Distribution ── */}
        {d.scoreDistribution?.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Score Distribution</div>
            </div>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.scoreDistribution}>
                  <XAxis dataKey="range" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(val, name) => [val, name === 'count' ? 'Quizzes' : 'Avg Time (s)']} />
                  <Bar dataKey="count" fill="var(--blue)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 8 }}>
              Most quizzes land in the {(() => { const top = d.scoreDistribution.reduce((a, b) => b.count > a.count ? b : a, d.scoreDistribution[0]); return top?.range || '—' })()} range
            </div>
          </div>
        )}

        <div className="grid-2">
          {/* ── Hardest Courses ── */}
          {d.hardestCourses?.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Hardest Courses</div>
                <span style={{ fontSize: 11, color: 'var(--red)' }}>Low avg score</span>
              </div>
              <div className="list">
                {d.hardestCourses.map((c, i) => (
                  <div key={c.course} className="list-item">
                    <span className="list-rank">{i + 1}</span>
                    <span className="list-name" style={{ fontFamily: 'monospace', fontSize: 11 }}>{c.course}</span>
                    <span className="list-stat" style={{ color: 'var(--red)' }}>{c.avgPct}%</span>
                    <span className="list-sub">{c.totalAttempts} tries</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Easiest Courses ── */}
          {d.easiestCourses?.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Easiest Courses</div>
                <span style={{ fontSize: 11, color: 'var(--green)' }}>High avg score</span>
              </div>
              <div className="list">
                {d.easiestCourses.map((c, i) => (
                  <div key={c.course} className="list-item">
                    <span className="list-rank">{i + 1}</span>
                    <span className="list-name" style={{ fontFamily: 'monospace', fontSize: 11 }}>{c.course}</span>
                    <span className="list-stat" style={{ color: 'var(--green)' }}>{c.avgPct}%</span>
                    <span className="list-sub">{c.totalAttempts} tries</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Level Performance ── */}
        {d.levelPerformance?.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Performance by Level</div>
            </div>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.levelPerformance}>
                  <XAxis dataKey="level" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                  <Tooltip formatter={(val, name) => [name === 'avgPct' ? `${val}%` : val, name === 'avgPct' ? 'Avg Score' : name === 'totalQuizzes' ? 'Quizzes' : 'Users']} />
                  <Bar dataKey="avgPct" fill="var(--green)" radius={[4, 4, 0, 0]} name="Avg Score %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="list" style={{ marginTop: 8 }}>
              {d.levelPerformance.map(l => (
                <div key={l.level} className="list-item">
                  <span className="list-name">{l.level}</span>
                  <span className="list-stat" style={{ color: l.avgPct >= 70 ? 'var(--green)' : l.avgPct >= 50 ? 'var(--orange)' : 'var(--red)' }}>{l.avgPct}%</span>
                  <span className="list-sub">{l.totalQuizzes} quizzes</span>
                  <span className="list-sub">{l.userCount} students</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Time Efficiency ── */}
        {d.timeEfficiency?.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Quiz Time Efficiency</div>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Score per minute spent</span>
            </div>
            <div className="list">
              {d.timeEfficiency.map((t, i) => (
                <div key={t.course} className="list-item">
                  <span className="list-rank">{i + 1}</span>
                  <span className="list-name" style={{ fontFamily: 'monospace', fontSize: 11 }}>{t.course}</span>
                  <span className="list-stat" style={{ color: 'var(--blue)' }}>{t.efficiency}</span>
                  <span className="list-sub">{t.avgScore}% in {Math.round(t.avgTimeSec / 60)}m</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid-2">
          {/* ── Top Performers ── */}
          {d.topPerformers?.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Top Performers</div>
                <span style={{ fontSize: 11, color: 'var(--green)' }}>2+ quizzes</span>
              </div>
              <div className="list">
                {d.topPerformers.map((u, i) => (
                  <div key={u.email} className="list-item">
                    <span className="list-rank">{i + 1}</span>
                    <span className="list-name">{u.name || u.email}</span>
                    <span className="list-stat" style={{ color: 'var(--green)' }}>{u.avgPct}%</span>
                    <span className="list-sub">{u.totalQuizzes} quizzes</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Struggling Users ── */}
          {d.strugglingUsers?.length > 0 && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Needs Attention</div>
                <span style={{ fontSize: 11, color: 'var(--red)' }}>Low avg score</span>
              </div>
              <div className="list">
                {d.strugglingUsers.map((u, i) => (
                  <div key={u.email} className="list-item">
                    <span className="list-rank">{i + 1}</span>
                    <span className="list-name">{u.name || u.email}</span>
                    <span className="list-stat" style={{ color: 'var(--red)' }}>{u.avgPct}%</span>
                    <span className="list-sub">{u.totalQuizzes} quizzes</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Signup Trend ── */}
        {d.signupTrend?.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">User Signup Trend</div>
            </div>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={d.signupTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="signups" stroke="var(--purple)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
