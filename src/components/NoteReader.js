'use client'

import { useMemo } from 'react'
import { Volume2, Square } from 'lucide-react'
import { FullscreenReader, useSpeech } from './Reader'
import { renderMath } from '@/lib/math'
import { templateBgStyle } from '@/lib/note-template'
import SaveToFolder from './SaveToFolder'

// Split note HTML into vertical pages (~6 blocks each) so long notes read
// page by page instead of one endless column.
function paginate(html, perPage = 6) {
  try {
    const doc = new DOMParser().parseFromString(`<div>${html || ''}</div>`, 'text/html')
    const blocks = Array.from(doc.body.firstChild?.childNodes || [])
      .map(n => (n.outerHTML || n.textContent || '').trim())
      .filter(Boolean)
    if (!blocks.length) return []
    const pages = []
    for (let i = 0; i < blocks.length; i += perPage) pages.push(blocks.slice(i, i + perPage).join(''))
    return pages
  } catch {
    return html ? [html] : []
  }
}

// Shared fullscreen note reader — the same reading experience everywhere:
// course theory, folder notes, search hits. Prose + math + listen-aloud.
// Props: { title, subtitle, html, template?, savePayload?, extraActions?, onClose }
export default function NoteReader({ title, subtitle, html, template, savePayload, extraActions, onClose }) {
  const speech = useSpeech()
  const pages = useMemo(() => paginate(renderMath(html || '')), [html])

  function close() {
    try { speech.stop() } catch {}
    onClose?.()
  }

  return (
    <FullscreenReader
      title={title || 'Note'}
      subtitle={subtitle}
      onClose={close}
      actions={
        <div className="flex shrink-0 items-center gap-0.5">
          {speech.supported && (
            <button
              onClick={() => speech.toggle(html)}
              aria-label={speech.speaking ? 'Stop reading aloud' : 'Listen'}
              className="flex size-8 items-center justify-center rounded-lg hover:bg-muted">
              {speech.speaking ? <Square className="size-4" /> : <Volume2 className="size-4" />}
            </button>
          )}
          {savePayload && <SaveToFolder payload={savePayload} />}
          {extraActions}
        </div>
      }>
      <div className="mx-auto w-full max-w-2xl space-y-3 px-5 py-5">
        <h2 className="text-lg font-extrabold">{title || 'Note'}</h2>
        {speech.speaking && (
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round((speech.progress || 0) * 100)}%` }} />
          </div>
        )}
        {pages.length === 0 && <p className="text-sm text-muted-foreground">Empty note.</p>}
        {pages.map((p, i) => (
          <div key={i} className="rounded-2xl border bg-card p-5 shadow-sm">
            <div
              className="prose max-w-none dark:prose-invert"
              style={templateBgStyle(template)}
              dangerouslySetInnerHTML={{ __html: p || '<p class="text-muted-foreground">Empty note.</p>' }}
            />
            {pages.length > 1 && (
              <p className="mt-3 border-t pt-2 text-right text-[11px] font-bold tabular-nums text-muted-foreground">
                {i + 1} / {pages.length}
              </p>
            )}
          </div>
        ))}
      </div>
    </FullscreenReader>
  )
}
