'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { getToken } from '@/lib/auth'
import RichTextEditor from '@/components/RichTextEditor'

function eq(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

// One clutter-free modal for proposing an edit to any live item.
// Only changed fields are sent; an admin merges or rejects in review.
export default function SuggestEdit({ collection, target, onClose, onDone }) {
  const t = target || {}
  const qType = String(t.questionType || t.type || '')
  const hasOptions = t.options && Object.keys(t.options).length > 0
  const isFibLike = ['fib', 'saq'].includes(qType) || (!hasOptions && (t.blankAnswers || t.blank_answers))

  const [question, setQuestion] = useState(t.question || '')
  const [options, setOptions] = useState({ ...(t.options || {}) })
  const [correct, setCorrect] = useState(
    Array.isArray(t.correctAnswer ?? t.correct_answer) ? (t.correctAnswer ?? t.correct_answer)[0] : (t.correctAnswer ?? t.correct_answer ?? '')
  )
  const [correctMulti, setCorrectMulti] = useState(
    Array.isArray(t.correctAnswer ?? t.correct_answer) ? (t.correctAnswer ?? t.correct_answer) : []
  )
  const [accept, setAccept] = useState((t.blankAnswers || t.blank_answers || []).join(' | '))
  const [explanation, setExplanation] = useState(t.explanation || '')
  const [title, setTitle] = useState(t.title || '')
  const [content, setContent] = useState(t.content || '')
  const [description, setDescription] = useState(t.description || '')
  const [url, setUrl] = useState(t.url || t.href || '')
  const [note, setNote] = useState('')
  const [refs, setRefs] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function buildPatch() {
    const patch = {}
    if (collection === 'questions') {
      if (question !== (t.question || '')) patch.question = question.trim()
      if (isFibLike) {
        const acc = accept.split(/[|;]/).map(s => s.trim()).filter(Boolean)
        if (!eq(acc, t.blankAnswers || t.blank_answers || [])) patch.blankAnswers = acc
      } else if (hasOptions) {
        const clean = {}
        for (const [k, v] of Object.entries(options)) {
          if (String(v || '').trim()) clean[k] = String(v).trim().slice(0, 300)
        }
        if (!eq(clean, t.options)) patch.options = clean
        if (qType === 'multi') {
          const picked = correctMulti.filter(k => clean[k])
          const cur = (Array.isArray(t.correctAnswer) ? t.correctAnswer : [t.correctAnswer]).map(String)
          if (!eq([...picked].sort(), [...cur].sort())) patch.correctAnswers = picked
        } else if (String(correct) && !eq(String(correct), String(t.correctAnswer ?? t.correct_answer ?? ''))) {
          patch.correctAnswer = String(correct)
        }
      }
      if (explanation !== (t.explanation || '')) patch.explanation = explanation.trim()
    } else if (collection === 'readings') {
      if (title.trim() !== (t.title || '')) patch.title = title.trim()
      if (content !== (t.content || '')) patch.content = content
    } else {
      if (title.trim() !== (t.title || t.fileName || '')) patch.title = title.trim()
      if (description !== (t.description || '')) patch.description = description.trim()
      if (url.trim() !== (t.url || t.href || '')) patch.url = url.trim()
    }
    return patch
  }

  async function submit() {
    setError('')
    const patch = buildPatch()
    if (!Object.keys(patch).length) { setError('Change something first'); return }
    if (!note.trim()) { setError('Say what should change and why'); return }
    // Player items carry prefixed ids (m-…, q-…); strip to the raw ObjectId.
    const rawId = String(t._id || t.id || '')
    const m = rawId.match(/^[a-z]-([0-9a-f]{24})$/i)
    const targetId = m ? m[1] : rawId
    setBusy(true)
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
        body: JSON.stringify({ collection, targetId, patch, note: note.trim(), references: refs }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Could not send suggestion')
      onDone?.()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm" onClick={() => !busy && onClose?.()} />
      <div className="fixed inset-x-0 bottom-0 z-[71] mx-auto max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t bg-background p-4 pb-8">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
        <div className="mb-3 flex items-center gap-2">
          <h2 className="flex-1 truncate text-base font-black">Suggest an edit</h2>
          <button onClick={() => !busy && onClose?.()} aria-label="Close" className="flex size-8 items-center justify-center rounded-lg hover:bg-muted"><X className="size-4" /></button>
        </div>
        <div className="space-y-2">
          <p className="truncate rounded-xl bg-muted/60 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">On: {t.title || t.fileName || String(t.question || '').slice(0, 60) || 'item'}</p>
          {collection === 'questions' && (
            <>
              <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={2} placeholder="Question…" className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
              {isFibLike ? (
                <input value={accept} onChange={e => setAccept(e.target.value)} placeholder="Accepted answers (| separates)" className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
              ) : hasOptions ? (
                <div className="space-y-1.5">
                  {Object.keys(options).map(k => (
                    <div key={k} className="flex items-center gap-2">
                      {qType === 'multi' ? (
                        <button type="button" onClick={() => setCorrectMulti(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])}
                          className={`flex size-7 shrink-0 items-center justify-center rounded-lg border text-[11px] font-black ${correctMulti.includes(k) ? 'border-green-500 bg-green-500/10 text-green-600' : 'text-muted-foreground'}`}>{correctMulti.includes(k) ? '✓' : k}</button>
                      ) : (
                        <button type="button" onClick={() => setCorrect(k)}
                          className={`flex size-7 shrink-0 items-center justify-center rounded-lg border text-[11px] font-black ${String(correct) === k ? 'border-green-500 bg-green-500/10 text-green-600' : 'text-muted-foreground'}`}>{k}</button>
                      )}
                      <input value={options[k] || ''} onChange={e => setOptions(o => ({ ...o, [k]: e.target.value }))} placeholder={`Option ${k}`} className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
                    </div>
                  ))}
                </div>
              ) : null}
              <textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={2} placeholder="Explanation (optional)" className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
            </>
          )}
          {collection === 'readings' && (
            <>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-bold outline-none" />
              <RichTextEditor value={content} onChange={setContent} placeholder="Content…" />
            </>
          )}
          {collection === 'user_materials' && (
            <>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="w-full rounded-xl border bg-background px-3 py-2 text-sm font-bold outline-none" />
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Description (optional)" className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Link URL" inputMode="url" className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
            </>
          )}
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="What should change and why? (required)" className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" />
          <input value={refs} onChange={e => setRefs(e.target.value)} placeholder="Supporting links (optional, comma separated)" inputMode="url" className="w-full rounded-xl border bg-background px-3 py-2 text-xs outline-none" />
          {error && <p className="text-xs font-semibold text-red-500">{error}</p>}
          <button disabled={busy} onClick={submit} className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
            {busy ? 'Sending…' : 'Send suggestion'}
          </button>
          <p className="text-center text-[11px] text-muted-foreground">An admin reviews it before anything changes.</p>
        </div>
      </div>
    </>
  )
}
