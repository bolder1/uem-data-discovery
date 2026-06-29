import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

export function SummaryCard({
  label,
  value,
  icon: Icon,
  hint,
  iconClass = 'bg-blue-50 text-blue-600',
  className,
}: {
  label: string
  value: string | number
  icon: LucideIcon
  hint?: string
  iconClass?: string
  className?: string
}) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div
          className={cn(
            'flex size-10 items-center justify-center rounded-lg',
            iconClass,
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  )
}
