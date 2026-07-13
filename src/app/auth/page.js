'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { setUser } from '@/lib/auth';
import NIGERIAN_UNIVERSITIES from '@/lib/universities';
import { DEPARTMENTS, LEVELS } from '@/lib/departments';
import { ArrowLeft, Mail, Search, GraduationCap, FileText, ArrowRight, Check, X, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

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
    <div className="flex min-h-dvh flex-col overflow-x-hidden bg-background pb-24">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link href="/courses" className="flex size-9 items-center justify-center rounded-lg hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="flex-1 text-base font-bold">Sign In</h1>
        <div className="size-9" />
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-6">
        {step === 1 && (
          <div className="flex flex-1 flex-col justify-center gap-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary">
                <Mail className="size-8 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold">Welcome back</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your email to continue. No password needed.
              </p>
            </div>

            <div className="relative">
              <Input
                ref={emailRef}
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="Enter your email"
                type="email"
                onKeyDown={e => e.key === 'Enter' && handleEmailNext()}
                className={`h-14 pl-12 text-base ${error ? 'border-red-500' : ''}`}
              />
              <Mail className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              {error && (
                <p className="mt-2 pl-1 text-xs text-red-500">{error}</p>
              )}
            </div>

            <Button
              onClick={handleEmailNext}
              disabled={submitting || !email.includes('@')}
              className="h-14 text-base"
              size="lg"
            >
              {submitting ? 'Please wait...' : 'Continue'}
              {!submitting && <ArrowRight className="ml-2 size-4" />}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-1 flex-col gap-5">
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary">
                <GraduationCap className="size-8 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold">Select your university</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Pick your institution from the list.
              </p>
            </div>

            <div className="relative">
              <Input
                ref={searchRef}
                value={search}
                onChange={e => { setSearch(e.target.value); setSchool(''); setError(''); setOpen(true); }}
                onFocus={() => setOpen(true)}
                placeholder="Search your university..."
                className={`h-14 pl-12 pr-10 text-base ${school || open ? 'border-primary' : ''}`}
              />
              <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              {school && (
                <button
                  onClick={() => { setSchool(''); setSearch(''); setOpen(true); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}

              {open && (
                <div
                  ref={panelRef}
                  className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border bg-card shadow-lg"
                >
                  <ScrollArea className="max-h-[240px]">
                    {filtered.length === 0 ? (
                      <div className="p-5 text-center text-sm text-muted-foreground">
                        No universities match &quot;{search}&quot;
                      </div>
                    ) : (
                      <div className="p-1">
                        {filtered.map(u => (
                          <button
                            key={u}
                            onClick={() => selectSchool(u)}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                              school === u ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                            }`}
                          >
                            <div className={`flex size-5 shrink-0 items-center justify-center rounded ${
                              school === u ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            }`}>
                              {school === u && <Check className="size-3" />}
                            </div>
                            {u}
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              )}
              {error && (
                <p className="mt-2 pl-1 text-xs text-red-500">{error}</p>
              )}
            </div>

            <Button
              onClick={handleSchoolComplete}
              disabled={submitting || !school}
              className="mt-auto h-14 text-base"
              size="lg"
            >
              {submitting ? 'Please wait...' : 'Continue'}
              {!submitting && <ArrowRight className="ml-2 size-4" />}
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-1 flex-col gap-5">
            <div className="text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary">
                <FileText className="size-8 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold">Almost done</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Select your department and level.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Department</label>
              <div className="relative">
                <select
                  value={department}
                  onChange={e => { setDepartment(e.target.value); setError(''); }}
                  className="h-12 w-full appearance-none rounded-xl border bg-muted/50 px-4 pr-10 text-sm outline-none focus:border-primary"
                >
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Level</label>
              <div className="relative">
                <select
                  value={level}
                  onChange={e => { setLevel(e.target.value); setError(''); }}
                  className="h-12 w-full appearance-none rounded-xl border bg-muted/50 px-4 pr-10 text-sm outline-none focus:border-primary"
                >
                  <option value="">Select level</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}

            <Button
              onClick={handleDeptLevelComplete}
              disabled={submitting || !department || !level}
              className="mt-auto h-14 text-base"
              size="lg"
            >
              {submitting ? 'Please wait...' : 'Complete Sign In'}
              {!submitting && <Check className="ml-2 size-4" />}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
