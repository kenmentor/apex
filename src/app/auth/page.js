'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setUser, getUser, getToken } from '@/lib/auth';
import { defaultDiceConfig, normalizeAvatarConfig } from '@/lib/dice-avatar';
import AvatarCustomizer from '@/components/AvatarCustomizer';
import NIGERIAN_UNIVERSITIES from '@/lib/universities';
import { DEPARTMENTS, LEVELS } from '@/lib/departments';
import { ArrowRight, Mail, Lock, User, Check, X, Search, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const GOOGLE_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

function saveSession(data) {
  setUser({ id: data.id, email: data.email, school: data.school || '', department: data.department || '', level: data.level || '', admin: !!data.admin, verified: !!data.verified, name: data.name || '', avatar: data.avatar || '', avatarConfig: data.avatarConfig || null, token: data.token || '' });
}

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState(0); // 0 sign in, 1 sign up
  const [step, setStep] = useState('auth'); // auth | verify | uni | dept | avatar
  const [code, setCode] = useState('');
  const [avatarConfig, setAvatarConfig] = useState(() => defaultDiceConfig());
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [school, setSchool] = useState('');
  const [department, setDepartment] = useState('');
  const [level, setLevel] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // Errors surface as bottom toasts (anti-clutter: no inline error text).
  // `error` state is kept only for red input borders.
  function fail(msg) { setError(msg); toast.error(msg); }
  const googleBtn = useRef(null);
  const searchRef = useRef(null);
  const panelRef = useRef(null);

  const filtered = search
    ? NIGERIAN_UNIVERSITIES.filter(u => u.toLowerCase().includes(search.toLowerCase()))
    : NIGERIAN_UNIVERSITIES;

  const goTab = (i) => setTab(i);

  useEffect(() => {
    const saved = localStorage.getItem('apex_last_email');
    if (saved) setEmail(saved);
  }, []);

  useEffect(() => {
    function onClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target) && !searchRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Google Identity Services button (hidden when not configured).
  useEffect(() => {
    if (!GOOGLE_ID || !googleBtn.current) return;
    if (window.google?.accounts?.id) { renderGoogle(); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = renderGoogle;
    document.head.appendChild(s);
    function renderGoogle() {
      try {
        window.google.accounts.id.initialize({ client_id: GOOGLE_ID, callback: handleGoogle });
        window.google.accounts.id.renderButton(googleBtn.current, { theme: 'outline', size: 'large', width: 320, text: 'continue_with' });
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function handleGoogle(resp) {
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: resp.credential }),
      });
      const data = await res.json();
      if (!data.id) throw new Error(data.error || 'Google sign-in failed.');
      afterAuth(data);
    } catch (e) {
      setError(''); toast.error('Google sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  }

  function afterAuth(data) {
    localStorage.setItem('apex_last_email', data.email);
    saveSession(data);
    const dice = normalizeAvatarConfig(data.avatarConfig);
    if (dice) setAvatarConfig(dice);
    if (data.needsSchool) setStep('uni');
    else if (data.needsDeptOrLevel) setStep('dept');
    else if (!(data.avatar || data.avatarConfig)) setStep('avatar');
    else router.push('/');
  }

  async function handleSignin() {
    if (!email.includes('@')) return fail('Enter your email.');
    if (!password) return fail('Enter your password.');
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!data.id) throw new Error(data.error || 'Could not sign you in.');
      afterAuth(data);
    } catch (e) {
      fail(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignup() {
    if (!name.trim()) return fail('Tell us your name.');
    if (!email.includes('@')) return fail('Enter a valid email.');
    if (password.length < 6) return fail('Password needs 6+ characters.');
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const data = await res.json();
      if (!data.id) throw new Error(data.error || 'Could not create your account.');
      toast.success('Account created! Check your email for the code.');
      saveSession(data);
      setStep('verify');
    } catch (e) {
      fail(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(skip) {
    if (!skip && code.trim().length < 4) return fail('Enter the code we sent you.');
    setError('');
    if (skip) { setStep('uni'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'That code did not work.');
      toast.success('Verified! One last setup.');
      setStep('uni');
    } catch (e) {
      fail(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAvatarComplete(skip) {
    if (skip) { router.push('/'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ avatarConfig }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const u = getUser() || {};
      const updated = { ...u, avatarConfig: data.avatarConfig || avatarConfig, avatar: data.avatar || u.avatar || '' };
      setUser(updated);
      toast.success('Avatar saved!');
      router.push('/');
    } catch (e) {
      fail(e.message);
    } finally {
      setSubmitting(false);
    }
  }
  async function authedPost(url, extra) {
    // Onboarding calls must carry the password for password accounts.
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), ...(password ? { password } : {}), ...extra }),
    });
  }

  async function handleSchoolComplete() {
    if (!school) return setError('Pick your university to continue.');
    setError('');
    setSubmitting(true);
    try {
      const res = await authedPost('/api/auth/login', { school });
      const data = await res.json();
      if (!data.id) throw new Error(data.error || 'Something went wrong.');
      saveSession(data);
      setStep('dept');
    } catch (e) {
      fail(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeptComplete() {
    if (!department) return setError('Pick your department.');
    if (!level) return setError('Pick your level.');
    setError('');
    setSubmitting(true);
    try {
      const res = await authedPost('/api/auth/login', { school, department, level });
      const data = await res.json();
      if (!data.id) throw new Error(data.error || 'Something went wrong.');
      saveSession(data);
      const dice = normalizeAvatarConfig(data.avatarConfig);
      if (dice) setAvatarConfig(dice);
      if (!(data.avatar || data.avatarConfig)) setStep('avatar');
      else router.push('/');
    } catch (e) {
      fail(e.message);
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

  const dots = step === 'verify' ? 1 : step === 'uni' ? 2 : step === 'dept' ? 3 : step === 'avatar' ? 4 : 0;
  const totalDots = 4;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-10">
      {step === 'auth' ? (
        <div className="flex min-h-[calc(100dvh-120px)] flex-col justify-center">
          {GOOGLE_ID ? (
            <div className="mt-6 flex justify-center">
              <div ref={googleBtn} className="min-h-[40px]" />
            </div>
          ) : null}

          <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span className="h-px flex-1 bg-border" />continue with email<span className="h-px flex-1 bg-border" />
          </div>

          <div className="flex gap-6 border-b text-sm font-bold">
            {['Sign in', 'Sign up'].map((label, i) => (
              <button key={label} onClick={() => goTab(i)}
                className={'pb-2 ' + (tab === i ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground')}>
                {label}
              </button>
            ))}
          </div>

          <div key={tab} className="page-enter mt-4">
            {tab === 0 ? (
              <div className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={email} onChange={e => { setEmail(e.target.value); setError('') }} placeholder="Email address" type="email" className="h-12 py-3 pl-11" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={password} onChange={e => { setPassword(e.target.value); setError('') }} placeholder="Password" type="password" onKeyDown={e => e.key === 'Enter' && handleSignin()} className="h-12 py-3 pl-11" />
                </div>
                <Button onClick={handleSignin} disabled={submitting} className="h-12 w-full text-base">Sign in<ArrowRight className="ml-2 size-4" /></Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={name} onChange={e => { setName(e.target.value); setError('') }} placeholder="Full name" className="h-12 py-3 pl-11" />
                </div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={email} onChange={e => { setEmail(e.target.value); setError('') }} placeholder="Email address" type="email" className="h-12 py-3 pl-11" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={password} onChange={e => { setPassword(e.target.value); setError('') }} placeholder="Create password (6+ characters)" type="password" onKeyDown={e => e.key === 'Enter' && handleSignup()} className="h-12 py-3 pl-11" />
                </div>
                <Button onClick={handleSignup} disabled={submitting} className="h-12 w-full text-base">Create account<ArrowRight className="ml-2 size-4" /></Button>
                <p className="text-center text-[11px] text-muted-foreground">Free forever for core quizzes. No card required.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-1 flex justify-center gap-1.5">
            {[1, 2, 3, 4].map(i => <span key={i} className={'h-1.5 w-8 rounded-full ' + (i <= dots ? 'bg-primary' : 'bg-muted')} />)}
          </div>
          {step === 'uni' && (
            <div className="flex flex-1 flex-col gap-5 pt-6">
              <div className="text-center">
                <h2 className="text-xl font-extrabold">Where do you study?</h2>
                <p className="mt-1 text-sm text-muted-foreground">We will load your school&apos;s exact curriculum.</p>
              </div>
              <div className="relative">
                <Input
                  ref={searchRef}
                  value={search}
                  onChange={e => { setSearch(e.target.value); setSchool(''); setError(''); setOpen(true) }}
                  onFocus={() => setOpen(true)}
                  placeholder="Type to search universities…"
                  className="h-14 pl-12 pr-10 text-base"
                />
                <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                {school && (
                  <button onClick={() => { setSchool(''); setSearch(''); setOpen(true) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <X className="size-4" />
                  </button>
                )}
                {open && (
                  <div ref={panelRef} className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border bg-card shadow-lg">
                    <ScrollArea className="max-h-[240px]">
                      {filtered.length === 0 ? (
                        <div className="p-5 text-center text-sm text-muted-foreground">No match for &quot;{search}&quot;</div>
                      ) : (
                        <div className="p-1">
                          {filtered.slice(0, 50).map(u => (
                            <button key={u} onClick={() => selectSchool(u)}
                              className={'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ' + (school === u ? 'bg-primary/10 text-primary' : 'hover:bg-muted')}>
                              <span className={'flex size-5 shrink-0 items-center justify-center rounded ' + (school === u ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                {school === u && <Check className="size-3" />}
                              </span>
                              {u}
                            </button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                )}
                </div>
              <Button onClick={handleSchoolComplete} disabled={submitting || !school} className="mt-auto h-14 text-base">Continue<ArrowRight className="ml-2 size-4" /></Button>
              <button onClick={() => setStep('verify')} className="pb-2 text-center text-sm font-medium text-muted-foreground">← Back</button>
            </div>
          )}
          {step === 'verify' && (
            <div className="flex flex-1 flex-col gap-5 pt-6">
              <div className="text-center">
                <h2 className="text-xl font-extrabold">Check your email ✉️</h2>
                <p className="mt-1 text-sm text-muted-foreground">We sent a code to {email}.</p>
              </div>
                <Input value={code} onChange={e => { setCode(e.target.value); setError('') }} placeholder="Enter code" inputMode="numeric" maxLength={6} className="h-14 text-center text-xl tracking-[0.5em]" />
                <Button onClick={() => handleVerify(false)} disabled={submitting || code.trim().length < 4} className="h-14 text-base">Verify<Check className="ml-2 size-4" /></Button>
              <button onClick={() => handleVerify(true)} className="text-center text-sm font-medium text-primary">Skip for now →</button>
            </div>
          )}
          {step === 'dept' && (
            <div className="flex flex-1 flex-col gap-5 pt-6">
              <div className="text-center">
                <h2 className="text-xl font-extrabold">Almost done 🎉</h2>
                <p className="mt-1 text-sm text-muted-foreground">Your plan, games and groups shape around this.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Department</label>
                <div className="relative">
                  <select value={department} onChange={e => { setDepartment(e.target.value); setError('') }} className="h-12 w-full appearance-none rounded-xl border bg-muted/50 px-4 pr-10 text-sm outline-none focus:border-primary">
                    <option value="">Select department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Level</label>
                <div className="relative">
                  <select value={level} onChange={e => { setLevel(e.target.value); setError('') }} className="h-12 w-full appearance-none rounded-xl border bg-muted/50 px-4 pr-10 text-sm outline-none focus:border-primary">
                    <option value="">Select level</option>
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </div>
              </div>
              <Button onClick={handleDeptComplete} disabled={submitting || !department || !level} className="mt-auto h-14 text-base">
                Continue<ArrowRight className="ml-2 size-4" />
              </Button>
              <button onClick={() => setStep('uni')} className="pb-2 text-center text-sm font-medium text-muted-foreground">← Back</button>
            </div>
          )}
          {step === 'avatar' && (
            <div className="flex min-h-0 flex-1 flex-col gap-4 pt-6">
              <div className="text-center">
                <h2 className="text-xl font-extrabold">Pick your look 🎨</h2>
                <p className="mt-1 text-sm text-muted-foreground">Hair, skin, eyes, beard, outfit — it saves to your profile.</p>
              </div>
              <ScrollArea className="min-h-0 max-h-[52dvh] flex-1 pr-2">
                <AvatarCustomizer value={avatarConfig} onChange={setAvatarConfig} size={120} />
              </ScrollArea>
              <Button onClick={() => handleAvatarComplete(false)} disabled={submitting} className="h-14 text-base">Start studying<Check className="ml-2 size-4" /></Button>
              <div className="flex items-center justify-between pb-2">
                <button onClick={() => setStep('dept')} className="text-sm font-medium text-muted-foreground">← Back</button>
                <button onClick={() => handleAvatarComplete(true)} className="text-center text-sm font-medium text-muted-foreground">Skip for now</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
