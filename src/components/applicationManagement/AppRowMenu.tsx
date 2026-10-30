import { MoreVertical, Info, Upload, ShieldCheck, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { ManagedApp } from '@/types'
import type { ConfirmTarget } from './appMgmtView'

// The shared row/card action menu (Details · Update · Assign · Delete) reused
// by the Board / Gallery / Console / Focus experiences.
export function AppRowMenu({
  app,
  onOpenDetails,
  onOpenUpdate,
  onAssign,
  onRequestDelete,
  align = 'end',
  className,
}: {
  app: ManagedApp
  onOpenDetails: (id: string) => void
  onOpenUpdate: (app: ManagedApp) => void
  onAssign: (app: ManagedApp) => void
  onRequestDelete: (t: ConfirmTarget) => void
  align?: 'start' | 'end'
  className?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${app.name}`}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
            className,
          )}
        >
          <MoreVertical className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => onOpenDetails(app.id)}>
          <Info className="size-4" />
          Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onOpenUpdate(app)}>
          <Upload className="size-4" />
          Update
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAssign(app)}>
          <ShieldCheck className="size-4" />
          Assign policies
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={(e) => {
            e.preventDefault()
            onRequestDelete({ kind: 'app', app })
          }}
        >
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Shared helpers used across the new experiences.
export function policyCountOf(app: ManagedApp, valid: Set<string>): number {
  return (app.policyIds ?? []).filter((id) => valid.has(id)).length
}
