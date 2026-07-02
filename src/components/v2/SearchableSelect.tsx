import { useState, type ReactNode } from 'react'
import { Search, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface SelectOption {
  id: string
  label: string
  description?: string
  /** Extra text matched by the search box (e.g. an abbreviation). */
  keywords?: string
}

// Minimal, searchable, scrollable multi/single select. Built to stay calm and
// usable when the list is long — search + scroll instead of a giant card grid.
export function SearchableSelect({
  options,
  selected,
  onToggle,
  mode = 'multi',
  onSelectAll,
  renderIcon,
  renderMeta,
  placeholder = 'Search…',
  emptyHint = 'No matches.',
  maxHeightClass = 'max-h-72',
}: {
  options: SelectOption[]
  selected: Set<string>
  onToggle: (id: string) => void
  mode?: 'single' | 'multi'
  onSelectAll?: (checked: boolean) => void
  renderIcon?: (o: SelectOption) => ReactNode
  renderMeta?: (o: SelectOption) => ReactNode
  placeholder?: string
  emptyHint?: string
  maxHeightClass?: string
}) {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const filtered = query
    ? options.filter((o) =>
        `${o.label} ${o.description ?? ''} ${o.keywords ?? ''}`
          .toLowerCase()
          .includes(query),
      )
    : options
  const isMulti = mode === 'multi'
  const allChecked = options.length > 0 && options.every((o) => selected.has(o.id))

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="h-9 pl-9"
        />
      </div>

      {isMulti && onSelectAll && (
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => onSelectAll(!allChecked)}
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Tick on={allChecked} />
            Select all
          </button>
          <span className="text-xs text-muted-foreground">
            {selected.size} of {options.length} selected
          </span>
        </div>
      )}

      <div className={cn('divide-y overflow-y-auto rounded-lg border', maxHeightClass)}>
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
                onClick={() => onToggle(o.id)}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
                  on ? 'bg-brand/5' : 'hover:bg-secondary/50',
                )}
              >
                <Tick on={on} round={!isMulti} />
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
    </div>
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
