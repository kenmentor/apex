'use client'

import { useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'

// Generic horizontal snap-scroll row (Embla).
// Gives every carousel breathing room: snap-to-card, optional counter.
export default function SnapRow({ items, renderItem, showCounter = false, slideClass = 'basis-[82%]', startIndex = 0, align = 'center', onSelect, apiRef }) {
  const [viewportRef, api] = useEmblaCarousel({ loop: false, align, startIndex })
  const [snapped, setSnapped] = useState(0)

  useEffect(() => {
    if (!api) return
    if (apiRef) apiRef.current = api
    setSnapped(api.selectedScrollSnap())
    const onSel = () => {
      const i = api.selectedScrollSnap()
      setSnapped(i)
      onSelect?.(i)
    }
    api.on('select', onSel)
    api.on('reInit', onSel)
    return () => { api.off('select', onSel); api.off('reInit', onSel) }
  }, [api, apiRef, onSelect])

  if (!items?.length) return null

  return (
    <div>
      <div ref={viewportRef} className="overflow-hidden">
        <div className="flex gap-2.5 py-1">
          {items.map((item, i) => (
            <div key={item.key ?? i} className={`min-w-0 shrink-0 grow-0 ${slideClass}`}>
              {renderItem(item, i === snapped, i)}
            </div>
          ))}
        </div>
      </div>
      {showCounter && items.length > 1 && (
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${((snapped + 1) / items.length) * 100}%` }}
            />
          </div>
          <span className="text-[11px] font-bold tabular-nums text-muted-foreground">
            {snapped + 1}/{items.length}
          </span>
        </div>
      )}
    </div>
  )
}
