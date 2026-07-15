'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAdmin, clearUser } from '@/lib/auth'

export default function AnalyticsPage() {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('7d')

  useEffect(() => {
    if (!isAdmin()) { router.push('/auth'); return }
    setLoading(true)
    fetch(`/api/analytics?range=${range}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [range])

  if (!data && loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#999', fontSize: 14 }}>Loading analytics...</div>
      </div>
    )
  }

  const stats = data || {}
  const quiz = stats.quiz || {}

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>Analytics</h1>
            <p style={{ fontSize: 13, color: '#999', marginTop: 2 }}>Last {range === '24h' ? '24 hours' : range === '30d' ? '30 days' : '7 days'}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {['24h', '7d', '30d'].map(r => (
              <button key={r} onClick={() => setRange(r)} style={{
                padding: '6px 14px', borderRadius: 8, border: '1px solid #ddd',
                background: range === r ? '#130f40' : '#fff', color: range === r ? '#fff' : '#666',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>{r}</button>
            ))}
            <Link href="/admin" style={{ fontSize: 13, color: '#666', marginLeft: 8 }}>← Admin</Link>
          </div>
        </div>

        {/* Top stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Unique Visitors', value: stats.uniqueVisitors || 0, color: '#130f40' },
            { label: 'Signed-in Users', value: stats.signedInCount || 0, color: '#27ae60' },
            { label: 'Total Events', value: stats.totalEvents || 0, color: '#ff9f43' },
            { label: 'Avg Session', value: stats.avgSessionDuration ? `${Math.round(stats.avgSessionDuration / 60)}m` : '—', color: '#9b59b6' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Quiz stats */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#130f40' }}>Quiz Performance</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
            {[
              { label: 'Started', value: quiz.started || 0, color: '#130f40' },
              { label: 'Completed', value: quiz.completed || 0, color: '#27ae60' },
              { label: 'Completion Rate', value: `${quiz.completionRate || 0}%`, color: quiz.completionRate > 60 ? '#27ae60' : '#ff9f43' },
              { label: 'Avg Score', value: `${quiz.avgScore || 0}%`, color: quiz.avgScore > 60 ? '#27ae60' : '#ff4757' },
              { label: 'Avg Time/Quiz', value: quiz.avgTimePerQuiz ? `${Math.round(quiz.avgTimePerQuiz / 60)}m` : '—', color: '#130f40' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 12, color: '#999' }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily active users chart (simple bar) */}
        {stats.dailyActive && stats.dailyActive.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Daily Active Users</h2>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120 }}>
              {stats.dailyActive.map(d => {
                const max = Math.max(...stats.dailyActive.map(x => x.users))
                const h = max > 0 ? (d.users / max) * 100 : 0
                return (
                  <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 10, color: '#999' }}>{d.users}</div>
                    <div style={{ width: '100%', height: `${h}%`, background: '#130f40', borderRadius: 4, minHeight: 2 }} />
                    <div style={{ fontSize: 9, color: '#999' }}>{d.date.slice(5)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Top pages */}
        {stats.pageViews && stats.pageViews.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Top Pages</h2>
            {stats.pageViews.slice(0, 10).map(p => (
              <div key={p.path} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8f9fa', fontSize: 13 }}>
                <span style={{ color: '#333', fontFamily: 'monospace' }}>{p.path}</span>
                <span style={{ fontWeight: 600, color: '#130f40' }}>{p.count}</span>
              </div>
            ))}
          </div>
        )}

        {/* Events breakdown */}
        {stats.eventsBreakdown && stats.eventsBreakdown.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Events</h2>
            {stats.eventsBreakdown.map(e => (
              <div key={e.event} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8f9fa', fontSize: 13 }}>
                <span style={{ color: '#333' }}>{e.event}</span>
                <span style={{ fontWeight: 600, color: '#ff9f43' }}>{e.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
