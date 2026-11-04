'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setUser, getUser, getToken } from '@/lib/auth';
import { defaultDiceConfig, normalizeAvatarConfig } from '@/lib/dice-avatar';
import AvatarCustomizer from '@/components/AvatarCustomizer';
import NIGERIAN_UNIVERSITIES from '@/lib/universities';
import { DEPARTMENTS, LEVELS } from '@/lib/departments';
import { ArrowRight, Mail, Check, X, Search, ChevronDown, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// Passwordless sign-in: one email box -> 6-digit code -> in for 90 days.
// No passwords, no Google, no third-party identity store.
function saveSession(data) {
  setUser({ id: data.id, email: data.email, school: data.school || '', department: data.department || '', level: data.level || '', admin: !!data.admin, verified: !!data.verified, name: data.name || '', avatar: data.avatar || '', avatarConfig: data.avatarConfig || null, token: data.token || '' });
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoTried = useRef(false);
  const [step, setStep] = useState('email'); // email | code | uni | dept | avatar
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [avatarConfig, setAvatarConfig] = useState(() => defaultDiceConfig());
  const [school, setSchool] = useState('');
  const [department, setDepartment] = useState('');
  const [level, setLevel] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  function fail(msg) { setError(msg); toast.error(msg); }

  const filtered = search
    ? NIGERIAN_UNIVERSITIES.filter(u => u.toLowerCase().includes(search.toLowerCase()))
    : NIGERIAN_UNIVERSITIES;

  useEffect(() => {
    try {
      const saved = localStorage.getItem('apex_last_email');
      if (saved) setEmail(saved);
    } catch {}
    // Already holding a session? Skip straight in.
    try { if (getUser()?.token) router.push('/'); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function afterAuth(data) {
    try { localStorage.setItem('apex_last_email', data.email) } catch {}
    saveSession(data);
    const dice = normalizeAvatarConfig(data.avatarConfig);
    if (dice) setAvatarConfig(dice);
    if (data.needsSchool) setStep('uni');
    else if (data.needsDeptOrLevel) setStep('dept');
    else if (!(data.avatar || data.avatarConfig)) setStep('avatar');
    else router.push('/');
  }

  async function handleSendCode() {
    if (!email.includes('@')) return fail('Enter your email.');
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && !data.sent) throw new Error(data.error || 'Could not send code.');
      setCode('');
      setCooldown(60);
      setStep('code');
      toast.success('Code sent — check your email.');
    } catch (e) {
      fail(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(emOverride, cdOverride) {
    const em = (emOverride ?? email).trim();
    const cd = (cdOverride ?? code).trim();
    if (cd.length < 4) return fail('Enter the code we sent you.');
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em, code: cd }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.token) throw new Error(data.error || 'That code did not work.');
      toast.success('Signed in — welcome!');
      afterAuth(data);
    } catch (e) {
      fail(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Magic link (?email=&code=): fill in and verify once, hands-free.
  useEffect(() => {
    if (autoTried.current) return;
    const em = (searchParams.get('email') || '').trim();
    const cd = (searchParams.get('code') || '').replace(/\D/g, '').slice(0, 6);
    if (!em.includes('@') || cd.length < 4) return;
    autoTried.current = true;
    setEmail(em);
    setCode(cd);
    setStep('code');
    handleVerify(em, cd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

  async function handleSchoolComplete() {
    if (!school) return setError('Pick your university to continue.');
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ school }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const u = getUser() || {};
      setUser({ ...u, school: data.school || school });
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
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ school, department, level }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const u = getUser() || {};
      const updated = { ...u, school: data.school || school, department: data.department || department, level: data.level || level };
      setUser(updated);
      const dice = normalizeAvatarConfig(updated.avatarConfig);
      if (dice) setAvatarConfig(dice);
      if (!(updated.avatar || updated.avatarConfig)) setStep('avatar');
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

  const dots = step === 'code' ? 1 : step === 'uni' ? 2 : step === 'dept' ? 3 : step === 'avatar' ? 4 : 0;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-10">
      {step === 'email' && (
        <div className="flex min-h-[calc(100dvh-120px)] flex-col justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight">Welcome to Apex</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enter your email — we&apos;ll send a sign-in code.</p>
          </div>
          <div className="mt-6 space-y-3">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={email} onChange={e => { setEmail(e.target.value); setError('') }} placeholder="Email address" type="email"
                onKeyDown={e => e.key === 'Enter' && handleSendCode()} className="h-14 py-3 pl-11 text-base" />
            </div>
            <Button onClick={handleSendCode} disabled={submitting} className="h-14 w-full text-base">
              {submitting ? 'Sending…' : 'Send me a code'}<ArrowRight className="ml-2 size-4" />
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">No password. No Google. The code lasts 10 minutes; your sign-in lasts months.</p>
          </div>
        </div>
      )}

      {step === 'code' && (
        <div className="flex min-h-[calc(100dvh-120px)] flex-col justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight">Check your email ✉️</h1>
            <p className="mt-1 text-sm text-muted-foreground">We sent a 6-digit code to {email}.</p>
          </div>
          <div className="mt-6 space-y-3">
            <div className="relative">
              <Hash className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }} placeholder="6-digit code"
                inputMode="numeric" onKeyDown={e => e.key === 'Enter' && handleVerify()} className="h-14 py-3 pl-11 text-center text-xl tracking-[0.5em]" />
            </div>
            <Button onClick={() => handleVerify()} disabled={submitting || code.trim().length < 4} className="h-14 w-full text-base">
              {submitting ? 'Checking…' : 'Sign in'}<Check className="ml-2 size-4" />
            </Button>
            <div className="flex items-center justify-between">
              <button onClick={() => setStep('email')} className="text-sm font-medium text-muted-foreground">← Change email</button>
              <button onClick={handleSendCode} disabled={submitting || cooldown > 0} className="text-sm font-medium text-primary disabled:opacity-50">
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
            </div>
          </div>
        </div>
      )}

      {(step === 'uni' || step === 'dept' || step === 'avatar') && (
        <>
          <div className="mb-1 flex justify-center gap-1.5">
            {[2, 3, 4].map(i => <span key={i} className={'h-1.5 w-8 rounded-full ' + (i <= dots ? 'bg-primary' : 'bg-muted')} />)}
          </div>
          {step === 'uni' && (
            <div className="flex flex-1 flex-col gap-5 pt-6">
              <div className="text-center">
                <h2 className="text-xl font-extrabold">Where do you study?</h2>
                <p className="mt-1 text-sm text-muted-foreground">We will load your school&apos;s exact curriculum.</p>
              </div>
              <div className="relative">
                <Input
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
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border bg-card shadow-lg">
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
