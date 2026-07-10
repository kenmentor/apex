'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getUser, setUser, clearUser, isAdmin, getToken } from '@/lib/auth'

function formatTime(secs) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}m ${s}s`
}

function ProfileContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUserState] = useState(null)
  const [scores, setScores] = useState([])
  const [globalRank, setGlobalRank] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [school, setSchool] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [sendingVerify, setSendingVerify] = useState(false)

  useEffect(() => {
    const u = getUser()
    setUserState(u)
    setName(u?.name || '')
    setSchool(u?.school || '')
    if (u?.email) {
      Promise.all([
        fetch(`/api/scores?email=${encodeURIComponent(u.email)}`).then(r => r.json()),
        fetch(`/api/leaderboard?email=${encodeURIComponent(u.email)}`).then(r => r.json()),
        fetch('/api/leaderboard').then(r => r.json()),
      ])
        .then(([myScores, myLeaderboard, allScores]) => {
          const my = Array.isArray(myScores) ? myScores : []
          const myAgg = Array.isArray(myLeaderboard) ? myLeaderboard : []
          const all = Array.isArray(allScores) ? allScores : []
          setScores(my)
          if (myAgg.length > 0 && all.length > 0) {
            const myBestPct = myAgg[0].avgPct || 0
            const topRank = all.findIndex(s => s.email?.toLowerCase() === u.email?.toLowerCase())
            setGlobalRank(topRank >= 0 ? topRank + 1 : null)
          }
          setLoading(false)
        })
        .catch(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setMessage('Email verified!')
      const u = getUser()
      if (u) { u.verified = true; setUser(u) }
    }
  }, [searchParams])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), school: school.trim() }),
      })
      if (!res.ok) throw new Error('Save failed')
      const data = await res.json()
      const u = getUser()
      setUser({ ...u, name: data.name, school: data.school })
      setUserState({ ...u, name: data.name, school: data.school })
      setEditing(false)
      setMessage('Saved!')
    } catch (err) { setMessage(err.message) }
    setSaving(false)
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setMessage('')
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      })
      if (!res.ok) throw new Error('Upload failed')
      const { url } = await res.json()
      const profileRes = await fetch('/api/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: url }),
      })
      if (!profileRes.ok) throw new Error('Profile update failed')
      const u = getUser()
      setUser({ ...u, avatar: url })
      setUserState({ ...u, avatar: url })
      setMessage('Avatar updated!')
    } catch (err) { setMessage(err.message) }
    setUploading(false)
  }

  async function handleSendVerification() {
    setSendingVerify(true)
    setMessage('')
    try {
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error('Failed to send')
      setMessage('Verification email sent!')
    } catch (err) { setMessage(err.message) }
    setSendingVerify(false)
  }

  function handleLogout() {
    const u = getUser()
    if (u?.email) localStorage.setItem('apex_last_email', u.email)
    clearUser()
    router.push('/auth')
  }

  const totalAttempts = scores.length
  const bestPct = scores.length > 0 ? Math.max(...scores.map(s => s.percentage)) : 0
  const totalTime = scores.reduce((s, e) => s + (e.timeSpent || 0), 0)

  return (
    <div className="app-wrapper">
      <div className="quiz-container">
        <div className="top-bar">
          <Link href="/leaderboard" className="back-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div className="screen-title-center">Profile</div>
          <div className="back-btn" style={{ background: 'none' }}></div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {!user ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f1f2f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Not signed in</p>
              <Link href="/auth" className="btn-next" style={{ textDecoration: 'none', display: 'inline-block', padding: '12px 32px' }}>Sign In</Link>
            </div>
          ) : (
            <>
              {/* Avatar + Info */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative' }}>
                  {user.avatar ? (
                    <img src={user.avatar} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--space-purple)' }} />
                  ) : (
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#130f40', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700 }}>
                      {user.email[0].toUpperCase()}
                    </div>
                  )}
                  <label style={{ position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, borderRadius: '50%', background: 'var(--space-purple)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} disabled={uploading} />
                  </label>
                </div>
                {uploading && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Uploading...</span>}

                {editing ? (
                  <form onSubmit={handleSave} style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'Poppins, sans-serif' }} />
                    <input value={school} onChange={e => setSchool(e.target.value)} placeholder="University" style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, fontFamily: 'Poppins, sans-serif' }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="submit" disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'var(--space-purple)', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button type="button" onClick={() => setEditing(false)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #ddd', background: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-dark)' }}>{user.name || user.email}</div>
                    {user.school && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{user.school}</div>}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}>
                      <button onClick={() => setEditing(true)} style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid #ddd', background: 'white', fontSize: 12, cursor: 'pointer' }}>Edit Profile</button>
                      {isAdmin() && <Link href="/admin" style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid #ddd', background: 'white', fontSize: 12, textDecoration: 'none', color: 'var(--text-dark)' }}>Admin</Link>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 6, fontSize: 12, alignItems: 'center' }}>
                      {user.verified ? (
                        <span style={{ color: '#27ae60' }}>✓ Verified</span>
                      ) : (
                        <button onClick={handleSendVerification} disabled={sendingVerify} style={{ border: 'none', background: 'none', color: '#3498db', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}>
                          {sendingVerify ? 'Sending...' : 'Verify email'}
                        </button>
                      )}
                      {isAdmin() && <span style={{ color: 'var(--primary-orange)' }}>● Admin</span>}
                    </div>
                  </div>
                )}
              </div>

              {message && <div style={{ textAlign: 'center', fontSize: 13, color: message.includes('fail') || message.includes('error') ? '#e74c3c' : '#27ae60' }}>{message}</div>}

              {/* Stats */}
              {!loading && (
                <>
                  <div className="stats-cards-row">
                    <div className="stat-card">
                      <div className="stat-icon" style={{ background: '#fef3e2', color: '#f39c12' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                      </div>
                      <div className="stat-label">Attempts</div>
                      <div className="stat-number">{totalAttempts}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon" style={{ background: '#e6f7ee', color: '#27ae60' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                      </div>
                      <div className="stat-label">Best %</div>
                      <div className="stat-number">{bestPct}%</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon" style={{ background: '#f4e6fd', color: '#9b59b6' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      </div>
                      <div className="stat-label">Total Time</div>
                      <div className="stat-number" style={{ fontSize: 16 }}>{formatTime(totalTime)}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-icon" style={{ background: '#e8f4fd', color: '#3498db' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 6 9 6 9z"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 18 9 18 9z"/><path d="M4 22h16"/><path d="M10 22V2h4v20"/></svg>
                      </div>
                      <div className="stat-label">Best Rank</div>
                      <div className="stat-number">{globalRank ? `#${globalRank}` : '—'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-dark)' }}>Score History</h3>
                    {scores.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>
                        No scores yet. Take a quiz to see your results here.
                      </div>
                    ) : (
                      scores.map((s, i) => (
                        <div key={`${i}-${s.course || 'unknown'}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', borderRadius: 12, padding: '12px 16px' }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dark)' }}>{s.course}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatTime(s.timeSpent)} · {new Date(s.createdAt).toLocaleDateString()}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.score}/{s.total}</span>
                            <span style={{ fontSize: 16, fontWeight: 700, color: s.percentage >= 50 ? '#27ae60' : '#e74c3c' }}>
                              {s.percentage}%
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              <button className="btn-next" onClick={handleLogout} style={{ background: '#e74c3c', marginTop: 'auto' }}>Sign Out</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileContent />
    </Suspense>
  )
}
