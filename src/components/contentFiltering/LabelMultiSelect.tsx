import { useState } from 'react'
import { Check, ChevronDown, Plus, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Label } from '@/types'

/**
 * Multi-select for classification labels — search existing labels, or type a
 * new name and press Enter to create one inline. Selected labels render as
 * removable chips under the field, same "Default" badge treatment used
 * across the rest of the catalog.
 */
export function LabelMultiSelect({
  labels,
  selectedIds,
  onToggle,
  onCreate,
  placeholder = 'Select label or type a name and press Enter to add',
}: {
  labels: Label[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onCreate: (name: string) => Label
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')

  const query = q.trim().toLowerCase()
  const filtered = labels.filter(
    (l) => !query || l.name.toLowerCase().includes(query),
  )
  const exactMatch = labels.some((l) => l.name.toLowerCase() === query)
  const selected = labels.filter((l) => selectedIds.includes(l.id))

  const handleCreate = () => {
    const name = q.trim()
    if (!name) return
    const label = onCreate(name)
    onToggle(label.id)
    setQ('')
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
          >
            <span className="truncate text-muted-foreground">{placeholder}</span>
            <ChevronDown className="size-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] p-0"
        >
          <div className="border-b p-2">
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={placeholder}
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && q.trim() && !exactMatch) {
                  e.preventDefault()
                  handleCreate()
                }
              }}
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 && !q.trim() && (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                No labels yet.
              </p>
            )}
            {filtered.map((l) => {
              const on = selectedIds.includes(l.id)
              return (
                <button
                  key={l.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onToggle(l.id)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                    on ? 'bg-brand/5' : 'hover:bg-secondary/60',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-foreground">{l.name}</span>
                    {l.isDefault && (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        Default
                      </Badge>
                    )}
                  </span>
                  {on && <Check className="size-4 shrink-0 text-brand" strokeWidth={3} />}
                </button>
              )
            })}
            {q.trim() && !exactMatch && (
              <button
                type="button"
                onClick={handleCreate}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-brand hover:bg-secondary/60"
              >
                <Plus className="size-3.5" />
                Create “{q.trim()}”
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((l) => (
            <span
              key={l.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground"
            >
              {l.name}
              <button
                type="button"
                onClick={() => onToggle(l.id)}
                aria-label={`Remove ${l.name}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
