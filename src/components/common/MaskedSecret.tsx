import { KeyRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'

// Display-only: secrets are never revealed in read views, only their
// provenance (source + last rotated).
export function MaskedSecret({
  value,
  source,
  lastRotated,
  className,
}: {
  value: string
  source: string
  lastRotated: string
  className?: string
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center gap-2">
        <KeyRound className="size-3.5 text-muted-foreground" />
        <code className="font-mono text-xs tracking-widest text-foreground">
          {value}
        </code>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {source} · rotated {formatDate(lastRotated)}
      </p>
    </div>
  )
}
