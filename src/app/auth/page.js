'use client';

import { useState, useEffect, useRef, useId, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setUser, getUser, getToken } from '@/lib/auth';
import { defaultDiceConfig, normalizeAvatarConfig } from '@/lib/dice-avatar';
import AvatarCustomizer from '@/components/AvatarCustomizer';
import NIGERIAN_UNIVERSITIES from '@/lib/universities';
import { DEPARTMENTS, LEVELS } from '@/lib/departments';
import { ArrowRight, Mail, Check, X, Search, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// Six-box OTP: auto-advance, backspace flow, paste-to-fill, and OS
// one-time-code autofill (mobile keyboards offer codes copied from email).
function OtpBoxes({ value, onChange, hasError, namePrefix }) {
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  function commit(arr) {
    onChange(arr.join('').replace(/\D/g, '').slice(0, 6));
  }

  function handleChange(i, e) {
    const raw = String(e.target.value || '').replace(/\D/g, '');
    const arr = Array.from({ length: 6 }, (_, k) => value[k] || '');
    if (!raw) {
      arr[i] = '';
      commit(arr);
      return;
    }
    // Full code landed in one box (autofill/paste): spread it out.
    for (let k = 0; k < raw.length && i + k < 6; k++) arr[i + k] = raw[k];
    commit(arr);
    const next = Math.min(i + raw.length, 5);
    requestAnimationFrame(() => {
      refs.current[next]?.focus();
      try { refs.current[next]?.select() } catch {}
    });
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      e.preventDefault();
      const arr = Array.from({ length: 6 }, (_, k) => value[k] || '');
      arr[i - 1] = '';
      commit(arr);
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowRight' && i < 5) {
      refs.current[i + 1]?.focus();
    }
  }

  function handlePaste(e) {
    const text = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    commit(text.split(''));
    requestAnimationFrame(() => refs.current[Math.min(text.length, 5)]?.focus());
  }

  return (
    <div className="flex justify-center gap-2" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          value={d}
          name={namePrefix ? `${namePrefix}-${i}` : undefined}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={6}
          aria-label={`Digit ${i + 1}`}
          className={'h-14 w-full min-w-0 max-w-[54px] flex-1 rounded-xl border bg-background text-center text-2xl font-black tabular-nums outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 ' + (hasError ? 'border-red-500' : '')}
        />
      ))}
    </div>
  );
}

// Passwordless sign-in: one email box -> 6-digit code -> in for 90 days.
// No passwords, no Google, no third-party identity store.
function Brand({ title, sub }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="flex size-16 items-center justify-center overflow-hidden rounded-3xl bg-[#130f40] shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/white-logo.png" alt="Apex" className="size-10 object-contain" draggable={false} />
      </span>
      <h1 className="mt-3 text-2xl font-black tracking-tight">{title}</h1>
      {sub ? <p className="mt-1 max-w-[280px] text-sm text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

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
  // Unique per page load: stops the browser restoring stale codes into the
  // boxes on refresh or back-navigation. useId is SSR-safe.
  const formId = useId().replace(/[^a-zA-Z0-9]/g, '');
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
    // Never show a stale code: fresh boxes on every load.
    setCode('');
    // Already holding a session? Heal the edge cookie, skip straight in.
    try {
      const u = getUser();
      if (u?.token) {
        try { document.cookie = `apex_auth=1; path=/; max-age=${90 * 24 * 60 * 60}; SameSite=Lax` } catch {}
        router.push('/');
      }
    } catch {}
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

  // Typed the full code (paste, autofill or thumb-typing)? Go automatically.
  const typedFull = useRef(false);
  useEffect(() => {
    if (typedFull.current && code.replace(/\D/g, '').length >= 6 && !submitting && step === 'code') {
      typedFull.current = false;
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

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
          <Brand title="Welcome to Apex" sub="Enter your email for a sign-in code." />
          <div className="mt-7 space-y-3">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={email} onChange={e => { setEmail(e.target.value); setError('') }} placeholder="Email address" type="email" autoComplete="email"
                onKeyDown={e => e.key === 'Enter' && handleSendCode()} className={'h-14 py-3 pl-11 text-base ' + (error ? 'border-red-500' : '')} />
            </div>
            <Button onClick={handleSendCode} disabled={submitting} className="h-14 w-full text-base">
              {submitting ? 'Sending…' : 'Send code'}<ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 'code' && (
        <div className="flex min-h-[calc(100dvh-120px)] flex-col justify-center">
          <Brand title="Enter code" sub={<>Sent to <span className="font-bold text-foreground">{email}</span>.</>} />
          <div className="mt-7 space-y-4">
            <OtpBoxes value={code} hasError={!!error} namePrefix={`otp${formId}`} onChange={v => { typedFull.current = true; setCode(v); setError('') }} />
            <Button onClick={() => { typedFull.current = false; handleVerify() }} disabled={submitting || code.trim().length < 4} className="h-14 w-full text-base">
              {submitting ? 'Checking…' : 'Sign in'}
            </Button>
            <div className="flex h-10 items-center justify-between">
              <button onClick={() => setStep('email')} className="inline-flex h-10 items-center gap-1.5 px-1 text-sm font-semibold text-muted-foreground">
                <ArrowRight className="size-4 rotate-180" /> Back
              </button>
              <button onClick={handleSendCode} disabled={submitting || cooldown > 0} className="inline-flex h-10 items-center px-1 text-sm font-semibold text-primary disabled:opacity-50">
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
          <div className="flex h-10 items-center">
            <button onClick={() => setStep('uni')} className="inline-flex h-10 items-center gap-1.5 px-1 text-sm font-semibold text-muted-foreground">
              <ArrowRight className="size-4 rotate-180" /> Back
            </button>
          </div>
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
          <Button onClick={() => handleAvatarComplete(false)} disabled={submitting} className="h-14 text-base">Start studying</Button>
          <div className="flex h-10 items-center justify-between">
            <button onClick={() => setStep('dept')} className="inline-flex h-10 items-center gap-1.5 px-1 text-sm font-semibold text-muted-foreground">
              <ArrowRight className="size-4 rotate-180" /> Back
            </button>
            <button onClick={() => handleAvatarComplete(true)} className="inline-flex h-10 items-center px-1 text-sm font-semibold text-muted-foreground">Skip</button>
          </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
