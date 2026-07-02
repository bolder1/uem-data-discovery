import { useState, type ReactNode } from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { Search, Check, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface ComboOption {
  id: string
  label: string
  description?: string
  keywords?: string
}

export interface FilterGroup<T> {
  key: string
  label: string
  chips: { value: string; label: string }[]
  /** True if the option passes given the active chip values for this group. */
  test: (option: T, active: string[]) => boolean
}

// A searchable, filterable dropdown (popover combobox). Single or multi select.
// Shared by the data-type and sources pickers so they feel identical.
export function Combobox<T extends ComboOption>({
  options,
  selected,
  onSelect,
  onSelectAll,
  multiple = false,
  disabled = false,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyHint = 'No matches.',
  filters = [],
  renderIcon,
  renderMeta,
  triggerSummary,
}: {
  options: T[]
  selected: Set<string>
  onSelect: (id: string) => void
  onSelectAll?: (ids: string[], checked: boolean) => void
  multiple?: boolean
  disabled?: boolean
  placeholder?: string
  searchPlaceholder?: string
  emptyHint?: string
  filters?: FilterGroup<T>[]
  renderIcon?: (o: T) => ReactNode
  renderMeta?: (o: T) => ReactNode
  /** Custom trigger content; falls back to a sensible default. */
  triggerSummary?: (selectedOptions: T[]) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState<Record<string, string[]>>({})

  const query = q.trim().toLowerCase()
  const filtered = options.filter((o) => {
    if (
      query &&
      !`${o.label} ${o.description ?? ''} ${o.keywords ?? ''}`
        .toLowerCase()
        .includes(query)
    )
      return false
    for (const f of filters) {
      const a = active[f.key] ?? []
      if (a.length && !f.test(o, a)) return false
    }
    return true
  })

  const selectedOptions = options.filter((o) => selected.has(o.id))
  const allFilteredChecked =
    filtered.length > 0 && filtered.every((o) => selected.has(o.id))

  const toggleChip = (key: string, value: string) =>
    setActive((prev) => {
      const cur = prev[key] ?? []
      return {
        ...prev,
        [key]: cur.includes(value)
          ? cur.filter((v) => v !== value)
          : [...cur, value],
      }
    })

  const summary = (() => {
    if (triggerSummary) return triggerSummary(selectedOptions)
    if (selectedOptions.length === 0)
      return <span className="text-muted-foreground">{placeholder}</span>
    if (!multiple) {
      const o = selectedOptions[0]
      return (
        <span className="flex min-w-0 items-center gap-2">
          {renderIcon?.(o)}
          <span className="truncate">{o.label}</span>
        </span>
      )
    }
    return selectedOptions.length === 1 ? (
      <span className="truncate">{selectedOptions[0].label}</span>
    ) : (
      <span>{selectedOptions.length} selected</span>
    )
  })()

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-sm shadow-xs transition-colors outline-none',
            'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          <span className="min-w-0 truncate text-left">{summary}</span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          className="z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
        >
          <div className="border-b p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-8 pl-8"
              />
            </div>
            {filters.map((f) => (
              <div key={f.key} className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {f.label}
                </span>
                {f.chips.map((c) => {
                  const on = (active[f.key] ?? []).includes(c.value)
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => toggleChip(f.key, c.value)}
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-xs transition-colors',
                        on
                          ? 'border-brand/40 bg-brand/10 text-brand'
                          : 'border-border text-muted-foreground hover:bg-secondary',
                      )}
                    >
                      {c.label}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {multiple && onSelectAll && filtered.length > 0 && (
            <button
              type="button"
              onClick={() => onSelectAll(filtered.map((o) => o.id), !allFilteredChecked)}
              className="flex w-full items-center gap-2 border-b px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/50"
            >
              <Tick on={allFilteredChecked} />
              {allFilteredChecked ? 'Clear all' : 'Select all'}
              <span className="ml-auto">{selected.size} selected</span>
            </button>
          )}

          <div className="max-h-64 divide-y overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                {emptyHint}
              </p>
            ) : (
              filtered.map((o) => {
                const on = selected.has(o.id)
                return (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      onSelect(o.id)
                      if (!multiple) setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
                      on ? 'bg-brand/5' : 'hover:bg-secondary/50',
                    )}
                  >
                    <Tick on={on} round={!multiple} />
                    {renderIcon && (
                      <span className="flex shrink-0 items-center text-muted-foreground">
                        {renderIcon(o)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {o.label}
                      </p>
                      {o.description && (
                        <p className="truncate text-xs text-muted-foreground">
                          {o.description}
                        </p>
                      )}
                    </div>
                    {renderMeta?.(o)}
                  </button>
                )
              })
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

function Tick({ on, round }: { on: boolean; round?: boolean }) {
  return (
    <span
      className={cn(
        'flex size-[18px] shrink-0 items-center justify-center border transition-colors',
        round ? 'rounded-full' : 'rounded-[5px]',
        on ? 'border-brand bg-brand text-white' : 'border-input bg-card text-transparent',
      )}
    >
      <Check className="size-3" strokeWidth={3} />
    </span>
  )
}
