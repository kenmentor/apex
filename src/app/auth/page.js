'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { SignIn } from '@clerk/nextjs';
import { setUser, getUser, getToken } from '@/lib/auth';
import { defaultDiceConfig, normalizeAvatarConfig } from '@/lib/dice-avatar';
import AvatarCustomizer from '@/components/AvatarCustomizer';
import NIGERIAN_UNIVERSITIES from '@/lib/universities';
import { DEPARTMENTS, LEVELS } from '@/lib/departments';
import { ArrowRight, Check, X, Search, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// Google-only sign-in (Clerk) + the app's onboarding steps
// (university -> department/level -> avatar). The bridge turns the Clerk
// session into the standard app session, so everything downstream works.
function saveSession(data) {
  setUser({ id: data.id, email: data.email, school: data.school || '', department: data.department || '', level: data.level || '', admin: !!data.admin, verified: !!data.verified, name: data.name || '', avatar: data.avatar || '', avatarConfig: data.avatarConfig || null, token: data.token || '' });
}

function AuthInner() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const [step, setStep] = useState('loading'); // loading | signin | uni | dept | avatar
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

  // After Clerk sign-in, bridge into the app session and route onboarding.
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { setStep('signin'); return; }
    let cancelled = false;
    setStep('loading');
    fetch('/api/auth/clerk', { method: 'POST' })
      .then(r => r.json().catch(() => ({})))
      .then(data => {
        if (cancelled) return;
        if (!data || !data.token) { setStep('signin'); return; }
        try { localStorage.setItem('apex_last_email', data.email) } catch {}
        saveSession(data);
        const dice = normalizeAvatarConfig(data.avatarConfig);
        if (dice) setAvatarConfig(dice);
        if (data.needsSchool) setStep('uni');
        else if (data.needsDeptOrLevel) {
          if (data.school) setSearch(data.school);
          setStep('dept');
        }
        else if (!(data.avatar || data.avatarConfig)) setStep('avatar');
        else router.push('/');
      })
      .catch(() => { if (!cancelled) setStep('signin') });
    return () => { cancelled = true };
  }, [isLoaded, isSignedIn, router]);

  async function authedPut(body) {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new Error(data.error || `Failed (${res.status})`);
    return data;
  }

  async function refreshBridge() {
    const res = await fetch('/api/auth/clerk', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!data || !data.token) throw new Error(data.error || 'Session refresh failed.');
    saveSession(data);
    return data;
  }

  async function handleSchoolComplete() {
    if (!school) return setError('Pick your university to continue.');
    setError('');
    setSubmitting(true);
    try {
      await authedPut({ school });
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
      await authedPut({ school, department, level });
      const data = await refreshBridge();
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

  async function handleAvatarComplete(skip) {
    if (skip) { router.push('/'); return; }
    setError('');
    setSubmitting(true);
    try {
      const data = await authedPut({ avatarConfig });
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

  function selectSchool(u) {
    setSchool(u);
    setSearch(u);
    setOpen(false);
    setError('');
  }

  if (step === 'loading' || !isLoaded) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-5 pb-10">
        <div className="size-10 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Getting you signed in…</p>
      </div>
    );
  }

  if (step === 'signin' || !isSignedIn) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-10">
        <div className="flex min-h-[calc(100dvh-120px)] flex-col justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-black tracking-tight">Welcome to Apex</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in with Google to keep studying.</p>
          </div>
          <div className="mt-6 flex justify-center">
            <Suspense>
              <SignIn routing="hash" />
            </Suspense>
          </div>
          <p className="mt-4 text-center text-[11px] text-muted-foreground">Free forever for core quizzes. No card required.</p>
        </div>
      </div>
    );
  }

  const dots = step === 'uni' ? 1 : step === 'dept' ? 2 : step === 'avatar' ? 3 : 0;
  const totalDots = 3;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-10">
      <div className="mb-1 flex justify-center gap-1.5">
        {[1, 2, 3].map(i => <span key={i} className={'h-1.5 w-8 rounded-full ' + (i <= dots ? 'bg-primary' : 'bg-muted')} />)}
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
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthInner />
    </Suspense>
  );
}
