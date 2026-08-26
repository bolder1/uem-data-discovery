import { Layers, Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { AppView } from './appMgmtView'

export const APP_VIEWS: { value: AppView; label: string; blurb: string }[] = [
  { value: 'table', label: 'Table', blurb: 'The current Product UI data table' },
  { value: 'cards', label: 'Cards', blurb: 'App-store style card grid' },
  { value: 'workspace', label: 'Workspace', blurb: 'Master-detail: list + live inspector' },
]

// A page-only exception: switch the Application Management page between the
// available experiences so they can be compared side by side. Scoped to this
// page — no other screen is affected.
export function ViewSwitcher({
  view,
  onChange,
  className,
}: {
  view: AppView
  onChange: (v: AppView) => void
  className?: string
}) {
  const active = APP_VIEWS.find((v) => v.value === view) ?? APP_VIEWS[0]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm shadow-sm transition-colors hover:bg-secondary',
            className,
          )}
        >
          <Layers className="size-4 text-muted-foreground" />
          <span className="font-medium text-foreground">{active.label}</span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-muted-foreground">
          Experience · this page only
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {APP_VIEWS.map((o) => {
          const on = o.value === view
          return (
            <DropdownMenuItem
              key={o.value}
              onClick={() => onChange(o.value)}
              className="flex items-start gap-2.5 py-2"
            >
              <Check
                className={cn(
                  'mt-0.5 size-4 shrink-0',
                  on ? 'text-brand' : 'text-transparent',
                )}
              />
              <span className="flex flex-col">
                <span
                  className={cn(
                    'text-sm font-medium',
                    on ? 'text-brand' : 'text-foreground',
                  )}
                >
                  {o.label}
                </span>
                <span className="text-xs text-muted-foreground">{o.blurb}</span>
              </span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
