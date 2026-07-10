'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { setUser } from '@/lib/auth';
import NIGERIAN_UNIVERSITIES from '@/lib/universities';
import { DEPARTMENTS, LEVELS } from '@/lib/departments';

export default function AuthPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [department, setDepartment] = useState('');
  const [level, setLevel] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const emailRef = useRef(null);
  const searchRef = useRef(null);
  const panelRef = useRef(null);

  const filtered = search
    ? NIGERIAN_UNIVERSITIES.filter(u => u.toLowerCase().includes(search.toLowerCase()))
    : NIGERIAN_UNIVERSITIES;

  useEffect(() => {
    const saved = localStorage.getItem('apex_last_email');
    if (saved) setEmail(saved);
    if (step === 1 && emailRef.current) emailRef.current.focus();
    if (step === 2 && searchRef.current) searchRef.current.focus();
  }, [step]);

  useEffect(() => {
    function onClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target) && !searchRef.current?.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function handleEmailNext() {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (data.id) {
        localStorage.setItem('apex_last_email', trimmed);
        setUser({ id: data.id, email: data.email, school: data.school || '', department: data.department || '', level: data.level || '', admin: !!data.admin, verified: !!data.verified, name: data.name || '', avatar: data.avatar || '', token: data.token || '' });
        if (data.needsSchool) {
          setStep(2);
          setTimeout(() => setSearch(''), 300);
        } else if (data.needsDeptOrLevel) {
          setStep(3);
        } else {
          router.push('/');
        }
      } else {
        setError(data.error || 'Something went wrong.');
      }
    } catch {
      setError('Could not connect to server.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSchoolComplete() {
    if (!school) {
      setError('Please select your university.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), school }),
      });
      const data = await res.json();
      if (data.id) {
        setUser({ id: data.id, email: data.email, school: data.school || '', department: data.department || '', level: data.level || '', admin: !!data.admin, verified: !!data.verified, name: data.name || '', avatar: data.avatar || '', token: data.token || '' });
        if (data.needsDeptOrLevel) {
          setStep(3);
        } else {
          router.push('/');
        }
      } else {
        setError(data.error || 'Something went wrong.');
      }
    } catch {
      setError('Could not connect to server.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeptLevelComplete() {
    if (!department) {
      setError('Please select your department.');
      return;
    }
    if (!level) {
      setError('Please select your level.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), school, department, level }),
      });
      const data = await res.json();
      if (data.id) {
        setUser({ id: data.id, email: data.email, school: data.school || '', department: data.department || '', level: data.level || '', admin: !!data.admin, verified: !!data.verified, name: data.name || '', avatar: data.avatar || '', token: data.token || '' });
        router.push('/');
      } else {
        setError(data.error || 'Something went wrong.');
      }
    } catch {
      setError('Could not connect to server.');
    } finally {
      setSubmitting(false);
    }
  }

  function selectSchool(u) {
    setSchool(u);
    setSearch(u);
    setOpen(false);
    setError('');
  }

  return (
    <div className="app-wrapper">
      <div className="quiz-container" style={{ justifyContent: 'center' }}>
        <div className="top-bar">
          <Link href="/leaderboard" className="back-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div className="screen-title-center">Sign In</div>
          <div className="back-btn" style={{ background: 'none' }}></div>
        </div>

        <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 24, flex: 1 }}>
          {step === 1 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24, justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 24, margin: '0 auto 16px',
                  background: 'var(--space-purple)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-dark)' }}>Welcome back</h2>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6, maxWidth: 280, margin: '6px auto 0' }}>
                  Enter your email to continue. No password needed.
                </p>
              </div>

              <div style={{ position: 'relative' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 0,
                  background: '#f8f9fa', borderRadius: 16,
                  border: '2px solid', borderColor: error ? 'var(--error-red)' : email ? 'var(--space-purple)' : '#e2e8f0',
                  transition: 'border-color 0.2s',
                }}>
                  <div style={{ padding: '0 0 0 16px', display: 'flex', color: email ? 'var(--space-purple)' : '#a0aec0' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <input
                    ref={emailRef}
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder="Enter your email"
                    type="email"
                    onKeyDown={e => e.key === 'Enter' && handleEmailNext()}
                    style={{
                      flex: 1, border: 'none', background: 'none', outline: 'none',
                      padding: '16px 12px', fontSize: 15, fontFamily: 'Poppins, sans-serif',
                      color: 'var(--text-dark)',
                    }}
                  />
                </div>
                {error && (
                  <div style={{ fontSize: 12, color: 'var(--error-red)', marginTop: 6, paddingLeft: 4 }}>{error}</div>
                )}
              </div>

              <button
                onClick={handleEmailNext}
                disabled={submitting || !email.includes('@')}
                style={{
                  width: '100%', padding: '16px', borderRadius: 16, border: 'none',
                  background: submitting || !email.includes('@') ? '#e2e8f0' : 'var(--space-purple)',
                  color: submitting || !email.includes('@') ? '#a0aec0' : 'white',
                  fontSize: 15, fontWeight: 600, fontFamily: 'Poppins, sans-serif',
                  cursor: submitting || !email.includes('@') ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {submitting ? 'Please wait...' : 'Continue'}
                {!submitting && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                )}
              </button>
            </div>
          )}

          {step === 2 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 24, margin: '0 auto 16px',
                  background: 'var(--space-purple)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                  </svg>
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-dark)' }}>Select your university</h2>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
                  Pick your institution from the list.
                </p>
              </div>

              <div style={{ position: 'relative' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 0,
                  background: '#f8f9fa', borderRadius: 16,
                  border: '2px solid', borderColor: school || open ? 'var(--space-purple)' : '#e2e8f0',
                  transition: 'border-color 0.2s',
                }}>
                  <div style={{ padding: '0 0 0 16px', display: 'flex', color: school ? 'var(--space-purple)' : '#a0aec0' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                  </div>
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={e => { setSearch(e.target.value); setSchool(''); setError(''); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    placeholder="Search your university..."
                    style={{
                      flex: 1, border: 'none', background: 'none', outline: 'none',
                      padding: '16px 12px', fontSize: 15, fontFamily: 'Poppins, sans-serif',
                      color: 'var(--text-dark)',
                    }}
                  />
                  {school && (
                    <button
                      onClick={() => { setSchool(''); setSearch(''); setOpen(true); }}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0 16px 0 0', color: '#a0aec0', display: 'flex' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>

                {open && (
                  <div
                    ref={panelRef}
                    style={{
                      position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                      background: 'white', borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
                      maxHeight: 240, overflowY: 'auto', zIndex: 100, padding: 6,
                    }}
                  >
                    {filtered.length === 0 ? (
                      <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        No universities match &quot;{search}&quot;
                      </div>
                    ) : (
                      filtered.map(u => (
                        <button
                          key={u}
                          onClick={() => selectSchool(u)}
                          style={{
                            width: '100%', textAlign: 'left', padding: '12px 14px', border: 'none', borderRadius: 12,
                            background: school === u ? 'rgba(19,15,64,0.06)' : 'transparent',
                            color: 'var(--text-dark)', fontSize: 13, cursor: 'pointer', fontFamily: 'Poppins, sans-serif',
                            display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.15s',
                          }}
                        >
                          <div style={{
                            width: 20, height: 20, borderRadius: 6,
                            background: school === u ? 'var(--space-purple)' : '#f1f2f6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, transition: 'all 0.2s',
                          }}>
                            {school === u && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            )}
                          </div>
                          {u}
                        </button>
                      ))
                    )}
                  </div>
                )}
                {error && (
                  <div style={{ fontSize: 12, color: 'var(--error-red)', marginTop: 6, paddingLeft: 4 }}>{error}</div>
                )}
              </div>

              <button
                onClick={handleSchoolComplete}
                disabled={submitting || !school}
                style={{
                  width: '100%', padding: '16px', borderRadius: 16, border: 'none',
                  background: submitting || !school ? '#e2e8f0' : 'var(--space-purple)',
                  color: submitting || !school ? '#a0aec0' : 'white',
                  fontSize: 15, fontWeight: 600, fontFamily: 'Poppins, sans-serif',
                  cursor: submitting || !school ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  marginTop: 'auto',
                }}
              >
                {submitting ? 'Please wait...' : 'Continue'}
                {!submitting && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                )}
              </button>
            </div>
          )}

          {step === 3 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 24, margin: '0 auto 16px',
                  background: 'var(--space-purple)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-dark)' }}>Almost done</h2>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
                  Select your department and level.
                </p>
              </div>

              <div>
                <label style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-dark)', display: 'block', marginBottom: 8 }}>Department</label>
                <select
                  value={department}
                  onChange={e => { setDepartment(e.target.value); setError(''); }}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 14, border: '2px solid #e2e8f0',
                    fontSize: 14, fontFamily: 'Poppins, sans-serif', color: 'var(--text-dark)',
                    background: '#f8f9fa', outline: 'none', appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-dark)', display: 'block', marginBottom: 8 }}>Level</label>
                <select
                  value={level}
                  onChange={e => { setLevel(e.target.value); setError(''); }}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: 14, border: '2px solid #e2e8f0',
                    fontSize: 14, fontFamily: 'Poppins, sans-serif', color: 'var(--text-dark)',
                    background: '#f8f9fa', outline: 'none', appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2.5' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Select level</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              {error && (
                <div style={{ fontSize: 12, color: 'var(--error-red)', paddingLeft: 4 }}>{error}</div>
              )}

              <button
                onClick={handleDeptLevelComplete}
                disabled={submitting || !department || !level}
                style={{
                  width: '100%', padding: '16px', borderRadius: 16, border: 'none',
                  background: submitting || !department || !level ? '#e2e8f0' : 'var(--space-purple)',
                  color: submitting || !department || !level ? '#a0aec0' : 'white',
                  fontSize: 15, fontWeight: 600, fontFamily: 'Poppins, sans-serif',
                  cursor: submitting || !department || !level ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  marginTop: 'auto',
                }}
              >
                {submitting ? 'Please wait...' : 'Complete Sign In'}
                {!submitting && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
