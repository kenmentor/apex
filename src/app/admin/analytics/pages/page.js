'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAdmin } from '@/lib/auth'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function PagesPage() {
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

  if (!data && loading) return <div className="loading">Loading...</div>

  const stats = data || {}

  return (
    <div className="page">
      <div className="page-inner">
        <div className="page-header">
          <div className="page-header-block">
            <Link href="/admin/analytics" className="page-back">← Analytics</Link>
            <h1 className="page-title">Pages</h1>
          </div>
          <div className="btn-row">
            {['24h', '7d', '30d'].map(r => (
              <button key={r} onClick={() => setRange(r)} className={`btn btn-pill${range === r ? ' active' : ''}`}>{r}</button>
            ))}
          </div>
        </div>

        {stats.pageViews?.length > 0 ? (
          <>
            <div className="card">
              <div className="card-title">Most Visited Pages</div>
              <div style={{ width: '100%', height: Math.min(stats.pageViews.length * 40, 360) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.pageViews} layout="vertical" margin={{ left: 110 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="path" tick={{ fontSize: 10 }} width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--blue)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-title">All Pages</div>
              <div className="list">
                {stats.pageViews.map((p) => (
                  <div key={p.path} className="list-item">
                    <span className="list-name" style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.path}</span>
                    <span className="list-stat" style={{ color: 'var(--blue)' }}>{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="card" style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14, padding: 40 }}>
            No page view data available yet.
          </div>
        )}
      </div>
    </div>
  )
}
