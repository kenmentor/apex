'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUser, setUser } from '@/lib/auth'
import { DEPARTMENTS, LEVELS } from '@/lib/departments'
import { getToken } from '@/lib/auth'

export default function ProfileCompletePrompt() {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [department, setDepartment] = useState('')
  const [level, setLevel] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const user = getUser()
    if (!user || !user.email) return
    if (user.department && user.level) return
    if (sessionStorage.getItem('apex_profile_prompted')) return
    setDepartment(user.department || '')
    setLevel(user.level || '')
    setShow(true)
  }, [])

  async function handleSave() {
    if (!department) { setError('Please select your department.'); return }
    if (!level) { setError('Please select your level.'); return }
    setError('')
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ department, level }),
      })
      const data = await res.json()
      if (data.id) {
        const user = getUser()
        setUser({ ...user, department: data.department, level: data.level })
        sessionStorage.setItem('apex_profile_prompted', '1')
        setShow(false)
      } else {
        setError(data.error || 'Failed to save')
      }
    } catch {
      setError('Could not connect to server')
    } finally {
      setSaving(false)
    }
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: 'white', borderRadius: 20, padding: '32px 24px', maxWidth: 400, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 12px',
            background: 'var(--space-purple)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-dark)', marginBottom: 4 }}>Complete your profile</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tell us your department and level to personalise your experience.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-dark)', display: 'block', marginBottom: 6 }}>Department</label>
            <select
              value={department}
              onChange={e => { setDepartment(e.target.value); setError(''); }}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12, border: '2px solid #e2e8f0',
                fontSize: 14, fontFamily: 'Poppins, sans-serif', color: 'var(--text-dark)',
                background: '#f8f9fa', outline: 'none', appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
                cursor: 'pointer',
              }}
            >
              <option value="">Select department</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-dark)', display: 'block', marginBottom: 6 }}>Level</label>
            <select
              value={level}
              onChange={e => { setLevel(e.target.value); setError(''); }}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12, border: '2px solid #e2e8f0',
                fontSize: 14, fontFamily: 'Poppins, sans-serif', color: 'var(--text-dark)',
                background: '#f8f9fa', outline: 'none', appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
                cursor: 'pointer',
              }}
            >
              <option value="">Select level</option>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {error && <div style={{ fontSize: 12, color: 'var(--error-red)' }}>{error}</div>}

          <button
            onClick={handleSave}
            disabled={saving || !department || !level}
            style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none',
              background: saving || !department || !level ? '#e2e8f0' : 'var(--space-purple)',
              color: saving || !department || !level ? '#a0aec0' : 'white',
              fontSize: 14, fontWeight: 600, fontFamily: 'Poppins, sans-serif',
              cursor: saving || !department || !level ? 'not-allowed' : 'pointer',
              marginTop: 4,
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>

          <button
            onClick={() => { sessionStorage.setItem('apex_profile_prompted', '1'); setShow(false); }}
            style={{
              width: '100%', padding: '10px', borderRadius: 12, border: 'none',
              background: 'none', color: 'var(--text-muted)', fontSize: 13,
              fontFamily: 'Poppins, sans-serif', cursor: 'pointer',
            }}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
