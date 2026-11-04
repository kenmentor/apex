'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Lock, Plus, ChevronRight, X } from 'lucide-react'
import { getUser, getToken, viewAsEditor, viewAsAdmin, isViewingAsEditor } from '@/lib/auth'
import { colorFor } from '@/lib/plan-colors'
import { fetchJson, TTL } from '@/lib/fetch-json'
import AddSheet, { NewCourseModal } from '@/components/ContributeAdd'
function progCodeOf(department) {
  const m = String(department || '').match(/\(([A-Za-z]{2,5})[^)]*\)\s*$/)
  return m ? m[1].toUpperCase() : null
}

export default function ContributePage() {
  const router = useRouter()
  const [viewAs, setViewAs] = useState('')
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [progState, setProgState] = useState(null)
  const [addFor, setAddFor] = useState(null)
  const [showNewCourse, setShowNewCourse] = useState(false)
  const [reqStatus, setReqStatus] = useState(null) // null|pending|approved|declined|none
  const [reqBusy, setReqBusy] = useState(false)
  const [reqMsg, setReqMsg] = useState('')
  const courseSlug = (c) => String(c || '').toLowerCase().replace(/\s+/g, '')
  const role = user?.role || 'student'
  const allowed = !!user && (!!user.admin || role === 'editor' || role === 'official' || role === 'admin')
  const prog = progCodeOf(user?.department)
  const realAdmin = !!user?.admin || isViewingAsEditor()

  useEffect(() => {
    const u = getUser()
    setUser(u)
    setReady(true)
    setViewAs(isViewingAsEditor() ? 'editor' : (u?.admin ? 'admin' : (u?.role || 'student')))
    if (!u) { router.replace('/auth'); return }
    ;(async () => {
      let prog = progCodeOf(u.department)
      if (!prog && u.department) {
        // Legacy department names without a code (e.g. "Computer Science") —
        // resolve through the programmes catalogue.
        try {
          const d = await fetchJson(`/api/programmes?q=${encodeURIComponent(u.department)}`, { ttl: TTL.list })
          const hit = (d.docs || []).find(p => String(p.name || '').toLowerCase() === String(u.department).toLowerCase())
            || (d.docs || [])[0]
          if (hit) prog = hit.code
        } catch {}
      }
      if (!prog) { setLoading(false); return }
      setProgState(prog)
      const qs = new URLSearchParams({ programme: prog })
      if (u.level) qs.set('level', u.level)
      fetchJson(`/api/contribute/summary?${qs.toString()}`, { token: getToken(), ttl: TTL.shell })
        .then(d => { if (!d.error) setSummary(d) })
        .catch(() => {})
        .finally(() => setLoading(false))
    })()
  }, [router])

  if (!ready) return <div className="flex min-h-dvh items-center justify-center pb-24"><p className="text-sm text-muted-foreground">Opening contributor hub…</p></div>

  if (!allowed) {
    return <RequestAccess user={user} role={role} status={reqStatus} setStatus={setReqStatus} busy={reqBusy} setBusy={setReqBusy} msg={reqMsg} setMsg={setReqMsg} />
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 pb-28 pt-6">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} aria-label="Back" className="flex size-9 items-center justify-center rounded-lg border hover:bg-muted"><ArrowLeft className="size-4" /></button>
        <h1 className="flex-1 text-xl font-bold">Contributor</h1>
        {realAdmin && (
          <button
            onClick={() => { if (viewAs === 'editor' ? viewAsAdmin() : viewAsEditor()) window.location.reload() }}
            title="Tap to switch role (dev)"
            className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold capitalize text-primary"
          >
            {viewAs === 'editor' ? 'editor' : 'admin'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse rounded-3xl bg-muted" />)}
        </div>
      ) : (summary?.courseCodes || []).length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
          No courses found for this programme yet. Set your department in Settings if this looks wrong.
        </p>
      ) : (
        <section className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <h2 className="flex-1 text-sm font-bold text-muted-foreground">Courses in {(summary?.programme || progState || '') + (user?.level ? ` · ${user.level}` : '')}</h2>
            <button onClick={() => setShowNewCourse(true)} className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
              <Plus className="size-3.5" strokeWidth={3} /> Add
            </button>
          </div>
          {(summary?.courseCodes || []).map(code => {
            const color = colorFor(code)
            return (
              <div key={code} className="relative overflow-hidden rounded-3xl text-white" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)` }}>
                <Link href={`/contribute/${courseSlug(code)}`} className="flex w-full items-center gap-3 p-4 text-left">
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-extrabold">{code}</span>
                    <span className="block truncate text-xs text-white/75">{summary?.courseTitles?.[code] || code}</span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-white/70" />
                </Link>
                <button onClick={() => setAddFor({ courseCode: code })} aria-label={`Add content to ${code}`}
                  className="absolute bottom-2 right-2 flex size-9 items-center justify-center rounded-full bg-white shadow-lg"
                  style={{ color }}>
                  <Plus className="size-5" strokeWidth={3} />
                </button>
              </div>
            )
          })}
        </section>
      )}

      {addFor && (
        <AddSheet
          courseCode={addFor.courseCode}
          programme={progState || prog}
          onClose={() => setAddFor(null)}
          onDone={() => setAddFor(null)}
        />
      )}
      {showNewCourse && (
        <NewCourseModal
          programme={progState || prog}
          onClose={() => setShowNewCourse(false)}
          onDone={() => { setShowNewCourse(false); window.location.reload() }}
        />
      )}
    </div>
  )
}

// Locked-out view for normal users: one tap asks to become a contributor.
// The request pings every admin instantly; approval unlocks this hub.
function RequestAccess({ user, role, status, setStatus, busy, setBusy, msg, setMsg }) {
  const router = useRouter()

  useEffect(() => {
    fetch('/api/contribute/requests?mine=1', { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json().catch(() => ({})))
      .then(d => setStatus(d?.request ? d.request.status : 'none'))
      .catch(() => setStatus('none'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function ask() {
    if (busy) return
    setBusy(true)
    setMsg('')
    try {
      const res = await fetch('/api/contribute/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || `Failed (${res.status})`)
      setStatus('pending')
      setMsg('Request sent — an admin will review it and you’ll be notified here.')
    } catch (e) { setMsg(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 pb-24 pt-6">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} aria-label="Back" className="flex size-9 items-center justify-center rounded-lg border hover:bg-muted"><ArrowLeft className="size-4" /></button>
        <h1 className="flex-1 text-xl font-bold">Contributor</h1>
      </div>
      <div className="rounded-2xl border p-6 text-center">
        <Lock className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-2 text-sm font-bold">Contributors only</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Signed in as <span className="font-semibold">{role}</span>{user?.department ? <> for <span className="font-semibold">{user.department}</span></> : ''}.
        </p>
        {status === null && <p className="mt-3 text-xs text-muted-foreground">Checking…</p>}
        {status === 'pending' && (
          <p className="mx-auto mt-3 max-w-xs rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-600">
            Request pending — an admin will review it and you’ll be notified here.
          </p>
        )}
        {status === 'approved' && (
          <p className="mx-auto mt-3 max-w-xs rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-600">
            Approved ✓ — log out and back in, then reopen this page.
          </p>
        )}
        {(status === 'none' || status === 'declined') && (
          <>
            {status === 'declined' && (
              <p className="mx-auto mt-3 max-w-xs rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                Last request was declined — you can ask again.
              </p>
            )}
            <button onClick={ask} disabled={busy}
              className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
              {busy ? 'Sending…' : 'Request contributor access'}
            </button>
          </>
        )}
        {msg && status !== 'pending' && <p className="mt-2 text-xs font-semibold text-muted-foreground">{msg}</p>}
      </div>
      <Link href="/" className="mx-auto rounded-xl border px-4 py-2 text-xs font-bold">Back home</Link>
    </div>
  )
}

