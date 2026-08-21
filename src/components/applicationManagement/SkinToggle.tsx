import { SwatchBook } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// A page-only exception: flips Application Management between the redesign's
// design system and a skin that matches the live product. Scoped to this page.
export function SkinToggle({
  revamp,
  onChange,
  className,
}: {
  revamp: boolean
  onChange: (v: boolean) => void
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 shadow-sm',
            className,
          )}
        >
          <SwatchBook className="size-4 text-muted-foreground" />
          <button
            type="button"
            onClick={() => onChange(!revamp)}
            className="text-xs font-medium text-foreground"
          >
            Product&nbsp;UI
          </button>
          <Switch
            checked={revamp}
            onCheckedChange={onChange}
            size="sm"
            aria-label="Match the live product UI on this page"
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        Restyle this page to match the live product. Applies to this page only.
      </TooltipContent>
    </Tooltip>
  )
}
