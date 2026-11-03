'use client'

import { Volume2, Square } from 'lucide-react'
import { FullscreenReader, useSpeech } from './Reader'
import { renderMath } from '@/lib/math'
import SaveToFolder from './SaveToFolder'

// Shared fullscreen note reader — the same reading experience everywhere:
// course theory, folder notes, search hits. Prose + math + listen-aloud.
// Props: { title, subtitle, html, savePayload?, extraActions?, onClose }
export default function NoteReader({ title, subtitle, html, savePayload, extraActions, onClose }) {
  const speech = useSpeech()

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
      <div className="mx-auto w-full max-w-2xl px-5 py-5">
        <h2 className="text-lg font-extrabold">{title || 'Note'}</h2>
        {speech.speaking && (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round((speech.progress || 0) * 100)}%` }} />
          </div>
        )}
        <div
          className="prose mt-3 max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: renderMath(html || '<p class="text-muted-foreground">Empty note.</p>') }}
        />
      </div>
    </FullscreenReader>
  )
}
