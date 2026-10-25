'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight, Shuffle } from 'lucide-react'
import {
  BG_COLORS,
  CLOTHING_COLORS,
  DICE_STYLES,
  HAIR_COLORS,
  SKIN_COLORS,
  buildDiceAvatarUrl,
  defaultDiceConfig,
  getPick,
  randomSeed,
  schemaFor,
  withPick,
} from '@/lib/dice-avatar'

const PALETTES = { skin: SKIN_COLORS, hair: HAIR_COLORS, clothes: CLOTHING_COLORS, bg: BG_COLORS }

function labelOf(v) {
  return String(v)
    .replace(/([A-Z])/g, ' $1')
    .replace(/(\d+)/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

// Horizontal snap-scroll well (Embla — same lib as the home feed).
// Scrolling snaps to a card AND applies it, so the avatar changes live as you swipe.
function SnapWell({ items, selectedKey, onPick, renderCard, tabKey }) {
  const startIndex = Math.max(0, items.findIndex((i) => i.key === selectedKey))
  const [viewportRef, api] = useEmblaCarousel({ loop: false, align: 'center', startIndex })
  const [snapped, setSnapped] = useState(startIndex)

  useEffect(() => {
    if (!api) return
    const onSelect = () => {
      const i = api.selectedScrollSnap()
      setSnapped(i)
      const item = items[i]
      if (item && item.key !== selectedKey) onPick(item.key)
    }
    api.on('select', onSelect)
    return () => { api.off('select', onSelect) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, tabKey, items, selectedKey])

  const go = (dir) => {
    if (!api) return
    dir > 0 ? api.scrollNext() : api.scrollPrev()
  }

  return (
    <div>
      <div ref={viewportRef} className="overflow-hidden">
        <div className="flex gap-2.5 px-8 py-1">
          {items.map((item) => (
            <div key={item.key} className="min-w-0 shrink-0 grow-0 basis-[76px]">
              {renderCard(item)}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button" onClick={() => go(-1)} aria-label="Previous"
          className="flex size-7 items-center justify-center rounded-full border hover:bg-muted"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((snapped + 1) / Math.max(items.length, 1)) * 100}%` }}
          />
        </div>
        <button
          type="button" onClick={() => go(1)} aria-label="Next"
          className="flex size-7 items-center justify-center rounded-full border hover:bg-muted"
        >
          <ChevronRight className="size-4" />
        </button>
        <span className="w-10 text-right text-[11px] font-bold text-muted-foreground">
          {snapped + 1}/{items.length}
        </span>
      </div>
    </div>
  )
}

export default function AvatarCustomizer({ value, onChange, size = 112 }) {
  const config = useMemo(() => ({ ...defaultDiceConfig(), ...(value || {}) }), [value])
  const schema = schemaFor(config.style)
  const [tab, setTab] = useState('hair')
  const tabsRef = useRef(null)
  const set = (patch) => onChange?.({ ...config, ...patch })

  const tabs = useMemo(() => ([
    { id: 'style', label: 'Style', kind: 'style' },
    ...schema.variants.map((v) => ({ id: v.key, label: v.label, kind: 'variant', tab: v })),
    ...schema.colors.map((c) => ({ id: 'c-' + c.key, label: c.label, kind: 'color', tab: c })),
  ]), [schema])

  // If the active tab doesn't exist in the new style, jump to its first variant tab.
  const active = tabs.find((t) => t.id === tab) || tabs[1] || tabs[0]
  const preview = useMemo(() => buildDiceAvatarUrl(config), [config])

  useEffect(() => {
    const el = tabsRef.current?.querySelector(`[data-tab="${CSS.escape(active.id)}"]`)
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [active.id])

  const items = useMemo(() => {
    if (active.kind === 'style') {
      return DICE_STYLES.map((s) => ({
        key: s.id,
        label: s.label,
        preview: buildDiceAvatarUrl({ ...config, style: s.id }),
      }))
    }
    if (active.kind === 'color') {
      const colors = PALETTES[active.tab.palette] || []
      return colors.map((c) => ({ key: c, label: '#' + c, color: c }))
    }
    return active.tab.variants.map((v) => ({
      key: v,
      label: v === active.tab.noneValue ? 'None' : labelOf(v),
      preview: buildDiceAvatarUrl(withPick(config, active.tab.key, v)),
    }))
  }, [active, config])

  const selectedKey = active.kind === 'style'
    ? config.style
    : active.kind === 'color'
      ? config[active.tab.key]
      : getPick(config, active.tab.key)

  function handlePick(key) {
    if (active.kind === 'style') {
      set({ style: key })
      setTab('hair')
    } else if (active.kind === 'color') {
      const patch = { [active.tab.key]: key }
      for (const extra of active.tab.sync || []) patch[extra] = key
      set(patch)
    } else {
      onChange?.(withPick(config, active.tab.key, key))
    }
  }

  function renderCard(item) {
    const isActive = item.key === selectedKey
    if (item.color !== undefined) {
      return (
        <button
          type="button" title={item.label} onClick={() => handlePick(item.key)}
          className="flex w-full flex-col items-center gap-1.5"
        >
          <span
            className={
              'size-14 rounded-2xl border-2 transition ' +
              (isActive ? 'scale-105 border-primary' : 'border-black/10')
            }
            style={{ backgroundColor: item.color === 'transparent' ? 'transparent' : '#' + item.color }}
          />
          <span className={'text-[10px] font-semibold ' + (isActive ? 'text-primary' : 'text-muted-foreground')}>
            {isActive ? '✓ ' : ''}{item.color === 'transparent' ? 'None' : item.label}
          </span>
        </button>
      )
    }
    return (
      <button
        type="button" onClick={() => handlePick(item.key)}
        className={
          'flex w-full flex-col items-center gap-1 rounded-2xl border p-1.5 transition ' +
          (isActive ? 'border-primary bg-primary/5' : 'hover:bg-muted')
        }
      >
        <img src={item.preview} alt={item.label} className="size-14 rounded-xl bg-muted" loading="lazy" draggable={false} />
        <span className={'text-[10px] font-medium leading-tight ' + (isActive ? 'text-primary' : '')}>
          {item.label}
        </span>
      </button>
    )
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-center gap-4">
        <img
          src={preview} alt="Your avatar"
          className="rounded-3xl border bg-muted"
          style={{ width: size, height: size }}
          draggable={false}
        />
        <div className="flex flex-col items-start gap-1.5">
          <button
            type="button"
            onClick={() => onChange?.({ ...config, seed: randomSeed() })}
            className="flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold hover:bg-muted"
          >
            <Shuffle className="size-3.5" /> Shuffle
          </button>
          <p className="max-w-[140px] text-[11px] leading-snug text-muted-foreground">
            Swipe the row below — it snaps and updates your look live.
          </p>
        </div>
      </div>

      <div ref={tabsRef} className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => (
          <button
            key={t.id} data-tab={t.id} type="button" onClick={() => setTab(t.id)}
            className={
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition ' +
              (active.id === t.id ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div key={config.style + ':' + active.id} className="rounded-2xl border bg-card/50 p-2">
        <p className="px-2 pb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {active.label}
        </p>
        <SnapWell
          tabKey={config.style + ':' + active.id}
          items={items}
          selectedKey={selectedKey}
          onPick={handlePick}
          renderCard={renderCard}
        />
      </div>
    </div>
  )
}
