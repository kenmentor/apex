'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getUser, setUser, apiPutProfile } from '@/lib/auth'
import { reviewProfile, isValidLevel } from '@/lib/profile-review'
import { LEVELS } from '@/lib/departments'
import BtnSpinner from '@/components/BtnSpinner'

// Returning-user year check: every ~90 days (14-day snooze), ask signed-in
// users whether they're still in the same level or have been promoted, so
// plans stay aligned year after year. Skipped while the profile review flow
// owns the user (no modal pile-ups).
const CHECK_EVERY_MS = 90 * 24 * 60 * 60 * 1000
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000
const CHECK_KEY = 'apex_year_check_at'
const SNOOZE_KEY = 'apex_year_snooze'

function stamp(key) {
  try { localStorage.setItem(key, String(Date.now())) } catch {}
}

function due() {
  try {
    const last = Number(localStorage.getItem(CHECK_KEY) || 0)
    if (last && Date.now() - last < CHECK_EVERY_MS) return false
    const snooze = Number(localStorage.getItem(SNOOZE_KEY) || 0)
    if (snooze && Date.now() - snooze < SNOOZE_MS) return false
    return true
  } catch {
    return false
  }
}

export default function YearCheckPrompt() {
  const router = useRouter()
  const [user, setUserState] = useState(null)
  const [open, setOpen] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const [level, setLevel] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const u = getUser()
    if (!u?.token || !u?.email) return
    // Fresh/stale-profile flows own these users — don't pile on.
    try {
      if (reviewProfile(u).needsReview) return
    } catch {}
    if (!due()) return
    setUserState(u)
    setLevel(isValidLevel(u.level) ? u.level : '')
    setOpen(true)
  }, [])

  function confirmSame() {
    stamp(CHECK_KEY)
    try { localStorage.removeItem(SNOOZE_KEY) } catch {}
    setOpen(false)
  }

  function snooze() {
    stamp(SNOOZE_KEY)
    setOpen(false)
  }

  async function saveUpgrade() {
    if (saving || !level) return
    if (!isValidLevel(level)) {
      setError('Pick your new level from the list.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const data = await apiPutProfile({ level })
      const u = getUser() || {}
      const updated = { ...u, level: data.level || level }
      setUser(updated)
      setUserState(updated)
      stamp(CHECK_KEY)
      try { localStorage.removeItem(SNOOZE_KEY) } catch {}
      const next = LEVELS[LEVELS.indexOf(data.level || level) + 1]
      try {
        const { toast } = await import('sonner')
        toast.success(next ? `Moved to ${data.level || level} — ${next} next!` : `Level updated to ${data.level || level}!`)
      } catch {}
      setOpen(false)
    } catch (e) {
      if (e?.code === 'SESSION_EXPIRED') { router.push('/auth'); return }
      setError(e?.message || 'Could not save — try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!open || !user) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-5">
      <div className="w-full max-w-sm space-y-4 rounded-3xl bg-card p-6 text-center shadow-xl">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
          <span className="text-2xl">🎓</span>
        </div>
        <div>
          <h3 className="text-base font-extrabold">Still in {user.level || 'the same level'}?</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            It&apos;s been a while — confirm your level so your plan, groups and leaderboard stay in the right class.
          </p>
        </div>
        {!upgrading ? (
          <div className="space-y-2">
            <button onClick={confirmSame} className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground">
              Yes, still here
            </button>
            <button onClick={() => setUpgrading(true)} className="w-full rounded-xl border py-2.5 text-sm font-bold">
              I&apos;ve moved up 🎉
            </button>
            <button onClick={snooze} className="w-full py-1 text-xs font-semibold text-muted-foreground">
              Remind me later
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold">Your new level</label>
              <div className="relative">
                <select
                  value={level}
                  onChange={e => { setLevel(e.target.value); setError('') }}
                  className="h-12 w-full appearance-none rounded-xl border bg-muted/50 px-4 pr-10 text-sm outline-none focus:border-primary"
                >
                  <option value="">Select level</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            {!!error && <p className="text-xs font-semibold text-red-500">{error}</p>}
            <button
              onClick={saveUpgrade}
              disabled={saving || !level}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {saving ? <><BtnSpinner className="size-4" /> Saving…</> : 'Save my new level'}
            </button>
            <button onClick={() => { setUpgrading(false); setError('') }} className="w-full py-1 text-xs font-semibold text-muted-foreground">
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
