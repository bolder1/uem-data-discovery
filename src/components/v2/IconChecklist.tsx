import { Check, CheckCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Option {
  id: string
  label: string
  description?: string
}

// Calm, monochrome multi-select: gray when idle, brand when selected.
export function IconChecklist({
  options,
  selected,
  onToggle,
  onSelectAll,
  iconFor,
  columns = 2,
}: {
  options: Option[]
  selected: Set<string>
  onToggle: (id: string) => void
  onSelectAll: (checked: boolean) => void
  iconFor: (id: string) => LucideIcon
  columns?: 1 | 2
}) {
  const allChecked = options.every((o) => selected.has(o.id))

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => onSelectAll(!allChecked)}
        className={cn(
          'flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors',
          allChecked
            ? 'border-brand/40 bg-brand/5 text-foreground'
            : 'bg-secondary/40 hover:bg-secondary',
        )}
      >
        <span className="flex items-center gap-2">
          <CheckCheck
            className={cn('size-4', allChecked ? 'text-brand' : 'text-muted-foreground')}
          />
          Select all
        </span>
        <span className="text-xs text-muted-foreground">
          {selected.size}/{options.length}
        </span>
      </button>

      <div className={cn('grid gap-2', columns === 2 && 'sm:grid-cols-2')}>
        {options.map((o) => {
          const on = selected.has(o.id)
          const Icon = iconFor(o.id)
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onToggle(o.id)}
              className={cn(
                'relative flex items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                on
                  ? 'border-brand/40 bg-brand/5'
                  : 'hover:border-border hover:bg-secondary/40',
              )}
            >
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                  on ? 'bg-brand/10 text-brand' : 'bg-secondary text-muted-foreground',
                )}
              >
                <Icon className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1 pr-6">
                <p className="text-sm font-medium text-foreground">{o.label}</p>
                {o.description && (
                  <p className="text-xs leading-snug text-muted-foreground">
                    {o.description}
                  </p>
                )}
              </div>
              <span
                className={cn(
                  'absolute right-3 top-3 flex size-5 items-center justify-center rounded-full border transition-colors',
                  on
                    ? 'border-brand bg-brand text-white'
                    : 'border-border bg-card text-transparent',
                )}
              >
                <Check className="size-3" strokeWidth={3} />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
