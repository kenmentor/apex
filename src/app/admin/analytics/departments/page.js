'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAdmin } from '@/lib/auth'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function DepartmentsPage() {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('7d')
  const [selectedDept, setSelectedDept] = useState(null)
  const [deptStudents, setDeptStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(false)

  useEffect(() => {
    if (!isAdmin()) { router.push('/auth'); return }
    setLoading(true)
    setSelectedDept(null)
    setDeptStudents([])
    fetch('/api/leaderboard/department')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [range])

  useEffect(() => {
    if (!selectedDept) { setDeptStudents([]); return }
    setLoadingStudents(true)
    fetch(`/api/leaderboard?department=${encodeURIComponent(selectedDept)}`)
      .then(r => r.json())
      .then(d => { setDeptStudents(Array.isArray(d) ? d : []); setLoadingStudents(false) })
      .catch(() => setLoadingStudents(false))
  }, [selectedDept])

  if (!data && loading) return <div className="loading">Loading...</div>

  const stats = data || {}

  return (
    <div className="page">
      <div className="page-inner">
        <div className="page-header">
          <div className="page-header-block">
            <Link href="/admin/analytics" className="page-back">← Analytics</Link>
            <h1 className="page-title">Departments</h1>
          </div>
          <div className="btn-row">
            {['24h', '7d', '30d'].map(r => (
              <button key={r} onClick={() => setRange(r)} className={`btn btn-pill${range === r ? ' active' : ''}`}>{r}</button>
            ))}
          </div>
        </div>

        {/* Chart */}
        {stats.departments?.length > 0 && (
          <div className="card">
            <div className="card-title">Department Rankings</div>
            <div style={{ width: '100%', height: Math.min(stats.departments.length * 50, 320) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.departments} layout="vertical" margin={{ left: 120 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                  <Tooltip formatter={(val) => `${val}%`} />
                  <Bar dataKey="avgPct" fill="var(--green)" radius={[0, 4, 4, 0]} cursor="pointer"
                    onClick={(entry) => setSelectedDept(entry.name === selectedDept ? null : entry.name)} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Table */}
        {stats.departments?.length > 0 && !selectedDept && (
          <div className="card">
            <div className="card-title">All Departments</div>
            <div className="list">
              {stats.departments.map((d, i) => (
                <div key={d.name} className="list-item clickable" onClick={() => setSelectedDept(d.name)}>
                  <span className="list-rank">{i + 1}</span>
                  <span className="list-name">{d.name}</span>
                  <span className="list-stat" style={{ color: 'var(--green)' }}>{d.avgPct}%</span>
                  <span className="list-sub">{d.quizCount} quizzes</span>
                  <span className="list-sub">{d.userCount} students</span>
                  <span className="list-arrow">▶</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Drill-down */}
        {selectedDept && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">{selectedDept}</div>
              <button onClick={() => setSelectedDept(null)} className="btn btn-ghost">✕ Close</button>
            </div>
            {loadingStudents ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)', fontSize: 13 }}>Loading...</div>
            ) : deptStudents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)', fontSize: 13 }}>No students found.</div>
            ) : (
              <div className="list">
                {deptStudents.sort((a, b) => b.totalScore - a.totalScore).map((s, i) => (
                  <Link key={s.email} href={`/profile/${encodeURIComponent(s.email)}`} className="list-item" style={{ textDecoration: 'none' }}>
                    <span className="list-rank">{i + 1}</span>
                    {s.avatar && <img src={s.avatar} alt="" className="avatar" />}
                    <span className="list-name">{s.name}</span>
                    <span className="list-stat">{s.totalScore} pts</span>
                    <span className="list-sub" style={{ color: 'var(--green)' }}>{s.avgPct}%</span>
                    <span className="list-sub">{s.quizCount} quizzes</span>
                    <span className="list-sub">{s.level || '—'}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Top students */}
        {stats.topUsers?.length > 0 && !selectedDept && (
          <div className="card">
            <div className="card-title">Top Student per Department</div>
            <div className="list">
              {stats.topUsers.map((u) => (
                <div key={u.email} className="list-item clickable" onClick={() => setSelectedDept(u.department)}>
                  <span className="list-name" style={{ color: 'var(--orange)', fontWeight: 700, flex: '0 0 110px' }}>{u.department}</span>
                  <span className="list-name">{u.name}</span>
                  <span className="list-stat">{u.totalScore} pts</span>
                  <span className="list-sub" style={{ color: 'var(--green)' }}>{u.avgPct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
