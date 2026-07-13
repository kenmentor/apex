'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAdmin } from '@/lib/auth'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#ff9f43', '#130f40', '#34c759', '#9b59b6', '#e17055', '#007aff', '#00b894', '#6c5ce7', '#d63031', '#636e72']

export default function ActivityPage() {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('7d')
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)

  useEffect(() => {
    if (!isAdmin()) { router.push('/auth'); return }
    setLoading(true)
    const params = new URLSearchParams({ range })
    if (selectedDay) params.set('date', selectedDay)
    if (selectedEvent) params.set('event', selectedEvent)
    fetch(`/api/analytics?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [range, selectedDay, selectedEvent])

  if (!data && loading) return <div className="loading">Loading...</div>

  const stats = data || {}
  const hasFilter = selectedDay || selectedEvent

  return (
    <div className="page">
      <div className="page-inner">
        <div className="page-header">
          <div className="page-header-block">
            <Link href="/admin/analytics" className="page-back">← Analytics</Link>
            <h1 className="page-title">Activity</h1>
          </div>
          <div className="btn-row">
            {hasFilter && (
              <button onClick={() => { setSelectedDay(null); setSelectedEvent(null) }} className="btn btn-pill danger">✕ Clear</button>
            )}
            {['24h', '7d', '30d'].map(r => (
              <button key={r} onClick={() => { setRange(r); setSelectedDay(null); setSelectedEvent(null) }} className={`btn btn-pill${range === r ? ' active' : ''}`}>{r}</button>
            ))}
          </div>
        </div>

        {hasFilter && (
          <div className="filter-bar">
            {selectedDay && <span className="filter-tag">Day: {selectedDay} <button onClick={() => setSelectedDay(null)}>✕</button></span>}
            {selectedEvent && <span className="filter-tag">Event: {selectedEvent} <button onClick={() => setSelectedEvent(null)}>✕</button></span>}
          </div>
        )}

        <div className="grid-2">
          {stats.dailyActive?.length > 0 && (
            <div className="card">
              <div className="card-title">Daily Active Users</div>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.dailyActive}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="users" fill="var(--purple)" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(entry) => setSelectedDay(entry.date === selectedDay ? null : entry.date)} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {stats.peakHours && (
            <div className="card">
              <div className="card-title">Peak Quiz Hours</div>
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.peakHours}>
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickFormatter={v => `${v}h`} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="var(--orange)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {stats.eventsBreakdown?.length > 0 && (
          <div className="card">
            <div className="card-title">Events Breakdown</div>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: '45%', minWidth: 200, height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.eventsBreakdown} dataKey="count" nameKey="event" cx="50%" cy="50%" outerRadius={80}
                      label={({ event, count }) => `${event}: ${count}`} cursor="pointer"
                      onClick={(entry) => setSelectedEvent(entry.event === selectedEvent ? null : entry.event)}
                    >
                      {stats.eventsBreakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={!selectedEvent || selectedEvent === stats.eventsBreakdown[i].event ? 1 : 0.3} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="list" style={{ flex: 1, minWidth: 160 }}>
                {stats.eventsBreakdown.map((e, i) => (
                  <div key={e.event} className="list-item clickable" onClick={() => setSelectedEvent(e.event === selectedEvent ? null : e.event)}
                    style={{ opacity: !selectedEvent || selectedEvent === e.event ? 1 : 0.3 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length], display: 'inline-block', flexShrink: 0 }} />
                    <span className="list-name">{e.event}</span>
                    <span className="list-stat" style={{ color: 'var(--orange)' }}>{e.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
