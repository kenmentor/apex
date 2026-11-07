'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setUser, getUser, getToken, apiPutProfile } from '@/lib/auth';
import { reviewProfile, isValidSchool, isValidDepartment, isValidLevel } from '@/lib/profile-review';
import { googleSignIn, completeRedirectSignIn, isInAppBrowser } from '@/lib/firebase';
import { defaultDiceConfig, normalizeAvatarConfig } from '@/lib/dice-avatar';
import AvatarCustomizer from '@/components/AvatarCustomizer';
import NIGERIAN_UNIVERSITIES from '@/lib/universities';
import { DEPARTMENTS, LEVELS } from '@/lib/departments';
import { ArrowRight, Check, X, Search, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import BtnSpinner from '@/components/BtnSpinner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// Google sign-in via Firebase, app users in our own DB:
// uni -> dept/level -> avatar onboarding, then 90-day sessions.
function saveSession(data) {
  return setUser({ id: data.id, email: data.email, school: data.school || '', department: data.department || '', level: data.level || '', admin: !!data.admin, verified: !!data.verified, name: data.name || '', avatar: data.avatar || '', avatarConfig: data.avatarConfig || null, token: data.token || '' });
}

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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.8-5 3.8-8.9z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.6 2.8v.1C3.5 21.3 7.5 24 12 24z" />
      <path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.6-2.8-.1.1C.5 8.6 0 10.2 0 12s.5 3.4 1.4 4.9l3.8-2.5z" />
      <path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.5 0 3.5 2.7 1.4 6.8l3.8 2.9c1-2.9 3.7-5 6.8-5z" />
    </svg>
  );
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState('signin'); // signin | uni | dept | avatar
  const [isReview, setIsReview] = useState(false);
  const [notice, setNotice] = useState('');
  const [avatarConfig, setAvatarConfig] = useState(() => defaultDiceConfig());
  const [school, setSchool] = useState('');
  const [department, setDepartment] = useState('');
  const [level, setLevel] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [inApp] = useState(() => {
    try { return isInAppBrowser() } catch { return false }
  });
  function fail(msg) { setError(msg); setStatus(''); toast.error(msg); }

  const filtered = search
    ? NIGERIAN_UNIVERSITIES.filter(u => u.toLowerCase().includes(search.toLowerCase()))
    : NIGERIAN_UNIVERSITIES;

  // Already holding a session? Heal the edge cookie, then either go home
  // or — for stale profiles (?review=1 or invalid stored values) — route
  // into the fix-up flow with current values prefilled.
  // Otherwise finish a redirect sign-in if one just landed.
  useEffect(() => {
    let u = null;
    try { u = getUser(); } catch {}
    if (u?.token) {
      // The edge middleware gates personal pages on this cookie. If cookies
      // are blocked the write silently fails and the user bounces
      // gated-page → /auth → home forever with no message. Detect it here
      // and STOP instead of redirecting into that loop.
      let cookieStuck = false;
      try {
        document.cookie = `apex_auth=1; path=/; max-age=${90 * 24 * 60 * 60}; SameSite=Lax`;
        cookieStuck = document.cookie.includes('apex_auth=');
      } catch {}
      if (!cookieStuck) {
        fail('Cookies are blocked for this site — personal pages (Plan, Wallet, Streak) will keep bouncing you back here. Enable cookies, then continue.');
        return;
      }
      const r = reviewProfile(u);
      if (r.needsReview) {
        try {
          if (isValidSchool(u.school)) { setSchool(u.school); setSearch(u.school); }
          else if (u.school) setSearch(String(u.school));
          if (isValidDepartment(u.department)) setDepartment(u.department);
          if (isValidLevel(u.level)) setLevel(u.level);
        } catch {}
        setIsReview(true);
        setNotice('We updated schools & departments — please confirm your details.');
        if (r.needsSchool) setStep('uni');
        else if (r.needsDept || r.needsLevel) setStep('dept');
        else setStep('avatar');
        return;
      }
      if (searchParams.get('review') === '1') {
        // Asked to review but everything is already valid.
        router.push('/');
        return;
      }
      router.push('/');
      return;
    }
    completeRedirectSignIn()
      .then(t => {
        if (!t) return;
        setStatus('Completing sign-in…');
        bridge(t);
      })
      .catch((e) => {
        fail(`Return trip failed${e?.code ? ` (${e.code})` : ''}. Tap Google again.`);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function afterAuth(data) {
    try { localStorage.setItem('apex_last_email', data.email) } catch {}
    if (!saveSession(data)) {
      fail('Browser storage is blocked — enable storage/cookies for this site, then retry.');
      return;
    }
    // Read-back: prove the session actually persisted before routing.
    // Without this, a failed write strands users on this screen.
    try {
      if (!getUser()?.token) {
        fail('Session did not stick — check storage/cookies for this site, then retry.');
        return;
      }
    } catch {
      fail('Session did not stick — check storage/cookies for this site, then retry.');
      return;
    }
    try { document.cookie = `apex_auth=1; path=/; max-age=${90 * 24 * 60 * 60}; SameSite=Lax` } catch {}
    const dice = normalizeAvatarConfig(data.avatarConfig);
    if (dice) setAvatarConfig(dice);
    // Validity, not presence: stale old-app values re-prompt here too, so a
    // returning user with a misaligned department can't skip the fix-up.
    const r = reviewProfile(data);
    if (!data.isNewUser && (r.needsSchool || r.needsDept || r.needsLevel)) {
      setIsReview(true);
      setNotice('We updated schools & departments — please confirm your details.');
    }
    if (r.needsSchool) setStep('uni');
    else if (r.needsDept || r.needsLevel) setStep('dept');
    else if (r.needsAvatar) setStep('avatar');
    else router.push('/');
  }

  async function bridge(idToken) {
    setSubmitting(true);
    setStatus('Verifying with Apex…');
    try {
      const res = await fetch('/api/auth/firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.token) throw new Error(data.error || 'Sign-in failed.');
      setStatus('Saving session…');
      toast.success('Signed in — welcome!');
      afterAuth(data);
    } catch (e) {
      fail(e.message);
    } finally {
      setSubmitting(false);
      setStatus('');
    }
  }

  async function handleGoogle() {
    setError('');
    setStatus('Opening Google…');
    // Safety net: never leave the button spinning forever. 25s is generous
    // (popups resolve in seconds; redirect unloads the page) — 45s just made
    // hangs feel broken for longer.
    const watchdog = setTimeout(() => {
      setSubmitting(false);
      setStatus('');
      fail('Timed out — tap to retry.');
    }, 25000);
    try {
      const idToken = await googleSignIn();
      if (idToken) await bridge(idToken);
      // null = redirect flow; bridge runs on return via the mount effect.
      // If we get here with no token and no redirect, say so.
      clearTimeout(watchdog);
      if (!idToken) setStatus('');
    } catch (e) {
      clearTimeout(watchdog);
      if (e?.code === 'auth/timeout') {
        fail('Taking too long — check your connection, then tap Google again.');
      } else if (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') {
        setSubmitting(false);
        setStatus('');
        return;
      }
      // Firebase errors carry .code; bridge/server failures carry the reason
      // in .message — surface whichever exists.
      fail(e?.code ? `Google sign-in failed (${e.code}). Try again.` : (e?.message || 'Google sign-in failed. Try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  // Expired mid-onboarding session: start over at sign-in instead of
  // stranding the user on a failing save step.
  function expiredBackToSignin(e) {
    if (e?.code !== 'SESSION_EXPIRED') return false;
    setStep('signin');
    setStatus('');
    fail('Session expired — please sign in again.');
    return true;
  }

  async function handleAvatarComplete(skip) {
    if (skip) { router.push('/'); return; }
    setError('');
    setSubmitting(true);
    try {
      const data = await apiPutProfile({ avatarConfig });
      const u = getUser() || {};
      const updated = { ...u, avatarConfig: data.avatarConfig || avatarConfig, avatar: data.avatar || u.avatar || '' };
      setUser(updated);
      toast.success('Avatar saved!');
      router.push('/');
    } catch (e) {
      if (!expiredBackToSignin(e)) fail(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSchoolComplete() {
    if (!school) return setError('Pick your university to continue.');
    setError('');
    setSubmitting(true);
    try {
      const data = await apiPutProfile({ school });
      const u = getUser() || {};
      setUser({ ...u, school: data.school || school });
      setStep('dept');
    } catch (e) {
      if (!expiredBackToSignin(e)) fail(e.message);
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
      const data = await apiPutProfile({ school, department, level });
      const u = getUser() || {};
      const updated = { ...u, school: data.school || school, department: data.department || department, level: data.level || level };
      setUser(updated);
      const dice = normalizeAvatarConfig(updated.avatarConfig);
      if (dice) setAvatarConfig(dice);
      if (!(updated.avatar || updated.avatarConfig)) setStep('avatar');
      else router.push('/');
    } catch (e) {
      if (!expiredBackToSignin(e)) fail(e.message);
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

  const dots = step === 'uni' ? 1 : step === 'dept' ? 2 : step === 'avatar' ? 3 : 0;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10 pt-10">
      {step === 'signin' && (
        <div className="flex min-h-[calc(100dvh-120px)] flex-col justify-center">
          <Brand title="Welcome to Apex" sub="Continue with Google to keep studying." />
          {inApp && (
            <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-center">
              <p className="text-xs font-extrabold text-amber-600">You&apos;re in an in-app browser</p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                Sign-in can&apos;t stick here. Open this page in <span className="font-bold text-foreground">Chrome</span> or{' '}
                <span className="font-bold text-foreground">Safari</span> (⋯ → Open in browser), then sign in.
              </p>
            </div>
          )}
          <div className="mt-7 space-y-3">
            {!!error && (
              <p className="rounded-xl bg-red-500/10 px-3 py-2.5 text-center text-xs font-bold text-red-500">{error}</p>
            )}
            <Button onClick={handleGoogle} disabled={submitting} variant="outline" className="h-14 w-full gap-3 text-base font-bold">
              <GoogleIcon /> {submitting ? <span className="flex items-center gap-2"><BtnSpinner /> Signing in…</span> : 'Continue with Google'}
            </Button>
            {!!status && !error && (
              <p className="text-center text-xs font-semibold text-muted-foreground">{status}</p>
            )}
          </div>
        </div>
      )}

      {(step === 'uni' || step === 'dept' || step === 'avatar') && (
        <>
          <div className="mb-1 flex justify-center gap-1.5">
            {[1, 2, 3].map(i => <span key={i} className={'h-1.5 w-8 rounded-full ' + (i <= dots ? 'bg-primary' : 'bg-muted')} />)}
          </div>
          {!!notice && (
            <p className="rounded-xl bg-amber-500/10 px-3 py-2.5 text-center text-xs font-bold text-amber-600">{notice}</p>
          )}
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

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}
