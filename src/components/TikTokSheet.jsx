'use client'

import { Drawer } from 'vaul'

// Standard TikTok-style bottom sheet used by every popup in the app:
// dimmed overlay, grab handle, rounded top, scrollable body.
export default function TikTokSheet({ open, onOpenChange, title, subtitle, children, footer, wide = false, tall = false }) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[70] bg-black/50" />
        <Drawer.Content
          className={`fixed inset-x-0 bottom-0 z-[70] mx-auto flex ${tall ? 'max-h-[94dvh]' : 'max-h-[88dvh]'} w-full ${wide ? 'max-w-lg' : 'max-w-md'} flex-col rounded-t-3xl bg-background outline-none`}
        >
          <div className="mx-auto mb-1 mt-3 h-1 w-10 shrink-0 rounded-full bg-muted" />
          {(title || subtitle) && (
            <div className="shrink-0 px-5 pb-1 pt-1 text-center">
              {title && <Drawer.Title className="text-base font-bold">{title}</Drawer.Title>}
              {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          )}
          <div className="min-h-0 overflow-y-auto px-5 py-3">
            {children}
          </div>
          {footer && <div className="shrink-0 p-4 pt-2">{footer}</div>}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
