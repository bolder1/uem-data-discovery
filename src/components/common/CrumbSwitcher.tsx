import type { ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface CrumbOption {
  id: string
  label: string
  icon?: ReactNode
  disabled?: boolean
  /** A short remark before the tick, such as a count that needs attention. */
  note?: ReactNode
}

/**
 * The last crumb of a breadcrumb trail. It names where you are and opens a
 * menu of its siblings, so you can move sideways without going back to the list.
 */
export function CrumbSwitcher({
  options,
  current,
  onSelect,
  menuClassName,
}: {
  options: CrumbOption[]
  current: string
  onSelect: (id: string) => void
  menuClassName?: string
}) {
  const here = options.find((o) => o.id === current)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-base font-semibold text-foreground transition-colors hover:bg-secondary"
        >
          {here?.icon}
          {here?.label}
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={cn('max-h-80 w-60 overflow-y-auto', menuClassName)}
      >
        {options.map((o) => (
          <DropdownMenuItem
            key={o.id}
            disabled={o.disabled}
            onClick={() => onSelect(o.id)}
            className="gap-2"
          >
            {o.icon}
            <span className="flex-1 truncate">{o.label}</span>
            {o.note}
            {o.id === current && <Check className="size-4 text-brand" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
