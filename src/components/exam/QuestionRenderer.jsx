'use client'

import { useState, useRef } from 'react'
import { Check, Mic, Square, PlayCircle } from 'lucide-react'
import { typeOf } from '@/lib/quiz-types'

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E']

function Chip({ children }) {
  return (
    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  )
}

// One renderer for every format — used by the author preview AND the player,
// so what editors see is exactly what students get.
export default function QuestionRenderer({ q, value, onChange, revealed = false, disabled = false, onPick }) {
  const t = typeOf(q || {})
  const ro = revealed || disabled

  if (t === 'fib' || t === 'saq') {
    const accept = q.blankAnswers || q.blank_answers || []
    return (
      <div className="space-y-2">
        {t === 'saq' && (
          <div className="flex items-center gap-2">
            <Chip>Short answer{q.marks ? ` · ${q.marks} marks` : ''}</Chip>
          </div>
        )}
        <input
          value={typeof value === 'string' ? value : ''}
          onChange={e => !ro && onChange?.(e.target.value)}
          placeholder="Type your answer…"
          disabled={ro}
          className="w-full rounded-2xl border bg-background px-4 py-4 text-center text-base font-semibold outline-none focus:border-primary disabled:opacity-70"
        />
        {revealed && (
          <p className="text-center text-xs text-muted-foreground">
            Accepted: {accept.join(' · ') || '—'}
          </p>
        )}
      </div>
    )
  }

  if (t === 'match') {
    return (
      <div className="space-y-3">
        {(q.pairs || []).map((p, i) => (
          <div key={i} className="flex items-center gap-2 rounded-2xl border bg-muted/50 p-3">
            <span className="min-w-0 flex-1 text-left text-sm font-medium">{p.stem}</span>
            <select
              value={value?.[i] || ''}
              onChange={e => onChange?.({ ...((value && typeof value === 'object') ? value : {}), [i]: e.target.value })}
              disabled={ro}
              className="shrink-0 rounded-xl border bg-background px-2 py-2 text-sm font-bold outline-none focus:border-primary disabled:opacity-70"
            >
              <option value="">—</option>
              {Object.keys(q.options || {}).map(k => (
                <option key={k} value={k}>{k}: {String(q.options[k]).slice(0, 24)}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    )
  }

  if (t === 'mtf') {
    return (
      <div className="space-y-3">
        {Object.keys(q.options || {}).map((key, idx) => {
          const picked = value?.[key]
          const correctMap = q.correctAnswer ?? q.correct_answer ?? {}
          const truthy = v => /^(true|t)$/i.test(String(v ?? ''))
          const wasRight = revealed && picked && truthy(picked) === truthy(correctMap[key])
          const wasWrong = revealed && (!picked || truthy(picked) !== truthy(correctMap[key]))
          return (
            <div key={key} className={`flex items-center gap-2 rounded-2xl border p-3 ${revealed ? (wasRight ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10') : 'bg-muted/50'}`}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold text-muted-foreground">
                {OPTION_LABELS[idx] || key}
              </span>
              <span className="min-w-0 flex-1 text-sm">{q.options[key]}</span>
              <div className="flex shrink-0 gap-1">
                {['true', 'false'].map(v => {
                  const active = picked === v
                  return (
                    <button
                      key={v}
                      disabled={ro}
                      onClick={() => onChange?.({ ...((value && typeof value === 'object' && !Array.isArray(value)) ? value : {}), [key]: active ? undefined : v })}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-black ${active ? 'bg-primary text-primary-foreground' : revealed && truthy(correctMap[key]) === (v === 'true') ? 'bg-green-500/20 text-green-600' : 'bg-background text-muted-foreground border'} disabled:opacity-80`}
                    >
                      {v === 'true' ? 'T' : 'F'}
                    </button>
                  )
                })}
              </div>
            </div>
          );
        })}
      </div>
    )
  }

  if (t === 'case') {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border-l-4 border-primary bg-muted/50 p-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">Case</p>
          <p className="whitespace-pre-line text-sm leading-relaxed">{q.vignette || q.question}</p>
        </div>
        {(q.subQuestions || q.subs || []).map((s, i) => {
          const sel = value?.[i]
          return (
            <div key={i} className="space-y-2 rounded-2xl border p-3">
              <p className="text-sm font-bold">Q{i + 1}. {s.question}</p>
              <div className="space-y-2">
                {Object.keys(s.options || {}).map((key, idx) => {
                  const isCorrect = revealed && String(key).toLowerCase() === String(s.correctAnswer ?? s.correct_answer ?? '').toLowerCase()
                  const isSel = sel === key
                  let styles = 'border bg-muted/50 hover:bg-muted'
                  if (isSel) styles = 'border-2 border-primary bg-primary text-primary-foreground'
                  if (isRevealed(resolvedRevealed(revealed), isCorrect)) styles = 'border-2 border-green-500 bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-300'
                  return (
                    <button
                      key={key}
                      disabled={ro}
                      onClick={() => onChange?.({ ...((value && typeof value === 'object') ? value : {}), [i]: isSel ? null : key })}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-all active:scale-[0.98] ${styles} disabled:opacity-90`}
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                        {OPTION_LABELS[idx] || key}
                      </span>
                      <span className="flex-1">{s.options[key]}</span>
                      {isCorrect && <Check className="size-4 shrink-0 text-green-500" />}
                    </button>
                  )
                })}
              </div>
              {revealed && s.explanation && <p className="text-xs text-muted-foreground">{s.explanation}</p>}
            </div>
          )
        })}
      </div>
    )
  }

  if (t === 'essay') {
    const words = String(value || '').trim() ? String(value).trim().split(/\s+/).length : 0
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Chip>Essay{q.marks ? ` · ${q.marks} marks` : ''}</Chip>
          <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">{words} words</span>
        </div>
        <textarea
          value={typeof value === 'string' ? value : ''}
          onChange={e => !ro && onChange?.(e.target.value)}
          placeholder="Write your structured answer…"
          rows={10}
          disabled={ro}
          className="w-full rounded-2xl border bg-background px-4 py-3 text-sm leading-relaxed outline-none focus:border-primary disabled:opacity-70"
        />
        {revealed && q.rubric && (
          <div className="rounded-2xl border-l-4 border-primary bg-muted/50 p-4">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">Marking rubric</p>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{q.rubric}</p>
          </div>
        )}
      </div>
    )
  }

  if (t === 'meq') {
    return <MeqBody q={q} value={value} onChange={onChange} revealed={revealed} disabled={disabled} />
  }

  if (t === 'spotter') {
    return (
      <div className="space-y-3">
        {q.imageUrl && <img src={q.imageUrl} alt="Spotter" loading="lazy" className="max-h-72 w-full rounded-2xl object-contain bg-black/5" />}
        {(q.subQuestions || q.subs || []).map((s, i) => (
          <div key={i} className="space-y-1.5">
            <p className="text-sm font-bold">{i + 1}. {s.q || s.question}</p>
            <input
              value={value?.[i] || ''}
              onChange={e => !ro && onChange?.({ ...((value && typeof value === 'object') ? value : {}), [i]: e.target.value })}
              placeholder="Identify…"
              disabled={ro}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm font-semibold outline-none focus:border-primary disabled:opacity-70"
            />
            {revealed && (
              <p className="text-xs text-muted-foreground">Accepted: {(s.answers || s.blankAnswers || []).join(' · ')}</p>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (t === 'osce') {
    const st = q.station || {}
    const list = q.checklist || []
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <p className="flex-1 text-sm font-black">{q.question}</p>
            {st.minutes && <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">{st.minutes} min</span>}
          </div>
          {st.instructions && <p className="mt-2 text-sm"><strong>Instructions: </strong>{st.instructions}</p>}
          {st.scenario && <p className="mt-1 text-sm text-muted-foreground"><strong>Scenario: </strong>{st.scenario}</p>}
          {st.task && <p className="mt-1 text-sm"><strong>Task: </strong>{st.task}</p>}
        </div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Examiner checklist — tick what you performed</p>
        <div className="space-y-2">
          {list.map((c, i) => {
            const on = !!value?.[i]
            return (
              <button
                key={i}
                disabled={ro}
                onClick={() => onChange?.({ ...((value && typeof value === 'object') ? value : {}), [i]: !on })}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm ${on ? 'border-green-500 bg-green-500/10' : 'bg-muted/50'} disabled:opacity-90`}
              >
                <span className={`flex size-6 shrink-0 items-center justify-center rounded-md border text-xs font-black ${on ? 'bg-green-500 text-white border-green-500' : 'text-transparent'}`}>✓</span>
                <span className="flex-1">{c.text}</span>
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{c.marks}m</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (t === 'audio') {
    const followFib = q.followupKind === 'fib' || !q.options || !Object.keys(q.options).length
    return (
      <div className="space-y-3">
        {q.audioUrl && (
          <audio controls preload="none" src={q.audioUrl} className="w-full" style={{ height: 40 }} />
        )}
        {followFib ? (
          <input
            value={typeof value === 'string' ? value : ''}
            onChange={e => !ro && onChange?.(e.target.value)}
            placeholder="Type what you hear…"
            disabled={ro}
            className="w-full rounded-2xl border bg-background px-4 py-3.5 text-center text-sm font-semibold outline-none focus:border-primary disabled:opacity-70"
          />
        ) : (
          <OptionList q={q} value={value} onChange={onChange} revealed={revealed} disabled={disabled} onPick={onPick} />
        )}
        {revealed && followFib && (
          <p className="text-center text-xs text-muted-foreground">
            Accepted: {(q.blankAnswers || q.blank_answers || []).join(' · ')}
          </p>
        )}
      </div>
    )
  }

  if (t === 'viva') {
    return <VivaBody q={q} value={value} onChange={onChange} revealed={revealed} disabled={disabled} />
  }

  // sba / tf / image / assertion — single pick from options.
  return (
    <div className="space-y-3">
      {(q.imageUrl || q.image_url) && (
        <img src={q.imageUrl || q.image_url} alt="Question image" loading="lazy" className="max-h-64 w-full rounded-2xl object-contain bg-black/5" />
      )}
      <OptionList q={q} value={value} onChange={onChange} revealed={revealed} disabled={disabled} onPick={onPick} />
    </div>
  )
}

function resolvedRevealed(revealed) {
  return revealed
}

function isRevealed(rv, isCorrect) {
  return rv && isCorrect
}

function OptionList({ q, value, onChange, revealed, disabled, onPick }) {
  const correctKeys = (() => {
    const c = q.correctAnswer ?? q.correct_answer
    if (c == null) return []
    return (Array.isArray(c) ? c : [c]).map(v => String(v).toLowerCase())
  })()
  const isMulti = typeOf(q) === 'multi'
  return (
    <div className="grid grid-cols-1 gap-2">
      {Object.keys(q.options || {}).map((key, idx) => {
        const isCorrect = correctKeys.includes(String(key).toLowerCase())
        const isRevealedCorrect = revealed && isCorrect
        const isSelected = isMulti ? (value || []).includes(key) : value === key
        const isRevealedWrong = revealed && isSelected && !isCorrect
        // Same visual language as the games card: border-2 rows, letter
        // chips, emerald flash on the right answer, red on a wrong pick.
        let styles = 'border-muted hover:border-primary/50 hover:bg-muted/60'
        if (isSelected) styles = 'border-primary bg-primary text-primary-foreground'
        if (isRevealedCorrect) styles = 'border-emerald-500 bg-emerald-500/15'
        else if (isRevealedWrong) styles = 'border-red-500 bg-red-500/10'
        return (
          <button
            key={key}
            disabled={revealed || disabled}
            onClick={() => {
              if (isMulti) {
                const arr = Array.isArray(value) ? [...value] : []
                onChange?.(arr.includes(key) ? arr.filter(k => k !== key) : [...arr, key])
              } else if (onPick) {
                onPick(key)
              } else {
                onChange?.(isSelected ? null : key)
              }
            }}
            className={`flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-medium transition-all active:scale-[0.98] ${styles} disabled:opacity-90`}
          >
            <span className={`flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-black uppercase ${
              isRevealedCorrect ? 'bg-emerald-500 text-white' : isRevealedWrong ? 'bg-red-500 text-white' : isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
            }`}>
              {isMulti && isSelected && !revealed ? '✓' : (OPTION_LABELS[idx] || String(key).toUpperCase())}
            </span>
            <span className="flex-1">{q.options[key]}</span>
          </button>
        );
      })}
    </div>
  )
}

function MeqBody({ q, value, onChange, revealed, disabled }) {
  const stages = q.stages || []
  const responses = (value && typeof value === 'object' && !Array.isArray(value)) ? value : {}
  const ro = revealed || disabled
  const [open, setOpen] = useState(0)
  const current = Math.min(open, stages.length - 1)
  const locked = i => stages.slice(0, i).every((_, j) => String(responses[j] || '').trim().length > 0) || i === 0

  return (
    <div className="space-y-3">
      {stages.map((s, i) => {
        const isOpen = revealed || i === current
        const done = String(responses[i] || '').trim().length > 0
        const canOpen = revealed || locked(i)
        return (
          <div key={i} className="overflow-hidden rounded-2xl border">
            <button
              type="button"
              disabled={!canOpen}
              onClick={() => setOpen(i)}
              className="flex w-full items-center gap-2 bg-muted/60 px-3 py-2.5 text-left text-sm font-black disabled:opacity-60"
            >
              <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] ${done ? 'bg-green-500 text-white' : 'bg-muted-foreground/20'}`}>
                {done ? '✓' : i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate">Stage {i + 1}{!canOpen ? ' · locked' : ''}</span>
            </button>
            {isOpen && (
              <div className="space-y-2 p-3">
                <p className="whitespace-pre-line text-sm leading-relaxed">{s.info}</p>
                <p className="text-sm font-bold">{s.question}</p>
                <textarea
                  value={responses[i] || ''}
                  onChange={e => !ro && onChange?.({ ...responses, [i]: e.target.value })}
                  placeholder="Your answer for this stage…"
                  rows={3}
                  disabled={ro}
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-70"
                />
                {!revealed && i === current && i < stages.length - 1 && (
                  <button
                    type="button"
                    disabled={!String(responses[i] || '').trim()}
                    onClick={() => setOpen(i + 1)}
                    className="w-full rounded-xl bg-secondary py-2 text-xs font-bold disabled:opacity-50"
                  >
                    Lock & continue to stage {i + 2}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  )
}

function VivaBody({ q, value, onChange, revealed, disabled }) {
  const [recording, setRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const recRef = useRef(null)
  const chunksRef = useRef([])
  const ro = revealed || disabled

  async function toggleRec() {
    if (recording) {
      try { recRef.current?.stop() } catch {}
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = window.MediaRecorder?.isTypeSupported('audio/webm') ? 'audio/webm' : undefined
      const rec = new window.MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      rec.ondataavailable = e => { if (e.data?.size) chunksRef.current.push(e.data) }
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
        setAudioUrl(URL.createObjectURL(blob))
        setRecording(false)
        try { stream.getTracks().forEach(t => t.stop()) } catch {}
      }
      recRef.current = rec
      rec.start()
      setRecording(true)
    } catch {}
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
        <button
          type="button"
          onClick={toggleRec}
          disabled={ro}
          aria-label={recording ? 'Stop recording' : 'Record answer'}
          className={`flex size-12 shrink-0 items-center justify-center rounded-full text-white transition ${recording ? 'bg-red-500 animate-pulse' : 'bg-primary'}`}
        >
          {recording ? <Square className="size-4" fill="white" /> : <Mic className="size-5" />}
        </button>
        <span className="min-w-0 flex-1 text-xs text-muted-foreground">
          {recording ? 'Recording… tap to stop' : 'Tap to answer aloud, then play it back before checking the model.'}
        </span>
      </div>
      {audioUrl && <audio controls preload="metadata" src={audioUrl} className="w-full" style={{ height: 36 }} />}
      {revealed && (
        <div className="rounded-2xl border-l-4 border-primary bg-muted/50 p-4">
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">Model answer</p>
          <p className="whitespace-pre-line text-sm leading-relaxed">{q.modelAnswer || '—'}</p>
          {(q.followups || []).length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-xs font-bold">Follow-ups to try:</p>
              {(q.followups || []).map((f, i) => <p key={i} className="text-xs text-muted-foreground">• {f}</p>)}
            </div>
          )}
        </div>
      )}
      {(q.followups || []).length > 0 && !revealed && (
        <p className="text-[11px] text-muted-foreground">{q.followups.length} follow-up question{q.followups.length === 1 ? '' : 's'} after the model answer.</p>
      )}
      <input type="hidden" value={typeof value === 'string' ? value : ''} readOnly />
      {!ro && (
        <button type="button" onClick={() => onChange?.('answered-aloud')} className="w-full rounded-xl bg-secondary py-2 text-xs font-bold">
          Mark as answered
        </button>
      )}
    </div>
  )
}
