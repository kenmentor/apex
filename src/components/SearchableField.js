'use client'

import { Combobox } from '@base-ui/react/combobox'
import { Check, ChevronsUpDown } from 'lucide-react'

// Type-to-filter dropdown (Base UI Combobox): tap to browse, type to narrow.
// Free text is never kept — only list picks stick, so no typos.
export default function SearchableField({ id, label, value, onChange, onInputChange, options, placeholder }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-[11px] font-medium text-muted-foreground">{label}</label>
      <Combobox.Root items={options} value={value || null} onValueChange={(v) => onChange(v ?? '')} onInputValueChange={(v) => onInputChange?.(v)}>
        <Combobox.InputGroup className="flex items-center gap-1 rounded-xl border border-input bg-background px-3 focus-within:border-primary">
          <Combobox.Input
            id={id}
            placeholder={placeholder}
            className="w-full min-w-0 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Combobox.Trigger
            aria-label={`Open ${label} options`}
            className="flex shrink-0 items-center rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <ChevronsUpDown className="size-4" />
          </Combobox.Trigger>
        </Combobox.InputGroup>
        <Combobox.Portal>
          <Combobox.Positioner className="z-[70] w-[var(--anchor-width)]" sideOffset={4}>
            <Combobox.Popup className="max-h-60 overflow-y-auto rounded-xl border bg-background p-1 shadow-xl">
              <Combobox.Empty className="px-3 py-2 text-xs text-muted-foreground">
                No match — pick from the list.
              </Combobox.Empty>
              <Combobox.List>
                {(item) => (
                  <Combobox.Item
                    key={item}
                    value={item}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-muted data-[highlighted]:bg-muted"
                  >
                    <Combobox.ItemIndicator className="flex size-4 shrink-0 items-center justify-center text-primary">
                      <Check className="size-3.5" strokeWidth={3} />
                    </Combobox.ItemIndicator>
                    <span className="truncate">{item}</span>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  )
}
