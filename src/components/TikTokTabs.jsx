'use client'

import { useEffect, useRef } from 'react'

// TikTok-style switch: plain text tabs, underline bar under the active one.
// Follows the snap — active moves as you swipe.
export default function TikTokTabs({ tabs, active, onChange }) {
  const rowRef = useRef(null)

  useEffect(() => {
    const el = rowRef.current?.querySelector(`[data-tiktab="${CSS.escape(String(active))}"]`)
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [active])

  return (
    <div ref={rowRef} className="flex gap-5 overflow-x-auto pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map(t => {
        const isActive = String(active) === String(t.id)
        return (
          <button
            key={t.id}
            data-tiktab={t.id}
            onClick={() => onChange(t.id)}
            className={`relative shrink-0 pb-2 text-sm font-bold transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            {t.label}
            {t.count > 0 ? <span className="ml-1 text-[11px] font-semibold opacity-70">{t.count}</span> : null}
            <span className={`absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-foreground transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`} />
          </button>
        )
      })}
    </div>
  )
}
