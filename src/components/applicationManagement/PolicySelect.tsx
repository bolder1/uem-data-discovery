import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { AppPolicy } from '@/types'

// Searchable policy multi-select — a plain list of names (no descriptions). The
// top policy in the hierarchy is flagged Active. Reused by the upload wizard's
// last step and the standalone Assign Policies drawer.
export function PolicySelect({
  policies,
  value,
  onChange,
  className,
}: {
  policies: AppPolicy[]
  value: string[]
  onChange: (ids: string[]) => void
  className?: string
}) {
  const [q, setQ] = useState('')
  const selected = useMemo(() => new Set(value), [value])
  // The policy at the top of the hierarchy is the active one.
  const topId = policies[0]?.id

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase()
    return policies.filter((p) => !query || p.name.toLowerCase().includes(query))
  }, [policies, q])

  const allShownSelected = rows.length > 0 && rows.every((p) => selected.has(p.id))
  const someShownSelected = rows.some((p) => selected.has(p.id))

  const toggle = (id: string) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    onChange([...next])
  }
  const toggleAll = () => {
    const next = new Set(selected)
    if (allShownSelected) rows.forEach((p) => next.delete(p.id))
    else rows.forEach((p) => next.add(p.id))
    onChange([...next])
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by policy name"
          className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <div className="flex items-center gap-3 border-b bg-secondary/50 px-3 py-2.5">
          <Checkbox
            checked={
              allShownSelected ? true : someShownSelected ? 'indeterminate' : false
            }
            onCheckedChange={toggleAll}
            aria-label="Select all policies"
          />
          <span className="text-xs font-semibold text-muted-foreground">Policy</span>
          <span className="ml-auto text-xs text-muted-foreground">
            {value.length} selected
          </span>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {rows.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No policies match this search.
            </p>
          ) : (
            rows.map((p) => {
              const on = selected.has(p.id)
              return (
                <label
                  key={p.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 border-b px-3 py-2.5 text-sm last:border-b-0 transition-colors hover:bg-accent/40',
                    on && 'bg-brand/5',
                  )}
                >
                  <Checkbox
                    checked={on}
                    onCheckedChange={() => toggle(p.id)}
                    aria-label={`Select ${p.name}`}
                  />
                  <span className="font-medium text-foreground">{p.name}</span>
                  {p.id === topId && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  )}
                </label>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
