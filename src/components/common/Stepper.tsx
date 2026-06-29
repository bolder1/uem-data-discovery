import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Step {
  key: string
  label: string
  description?: string
}

export function Stepper({
  steps,
  current,
  onStepClick,
  className,
}: {
  steps: Step[]
  current: number
  onStepClick?: (index: number) => void
  className?: string
}) {
  return (
    <ol className={cn('flex w-full items-center', className)}>
      {steps.map((step, i) => {
        const done = i < current
        const active = i === current
        const clickable = !!onStepClick && i <= current
        const isLast = i === steps.length - 1
        return (
          <li
            key={step.key}
            className={cn('flex items-center', !isLast && 'flex-1')}
          >
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(i)}
              className={cn(
                'flex items-center gap-3 text-left',
                clickable && 'cursor-pointer',
              )}
            >
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors',
                  done && 'border-primary bg-primary text-primary-foreground',
                  active &&
                    'border-primary bg-primary/10 text-primary ring-4 ring-primary/10',
                  !done &&
                    !active &&
                    'border-border bg-card text-muted-foreground',
                )}
              >
                {done ? <Check className="size-4" /> : i + 1}
              </span>
              <span className={cn('flex-col', active ? 'flex' : 'hidden sm:flex')}>
                <span
                  className={cn(
                    'text-sm font-medium leading-tight',
                    active || done
                      ? 'text-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="text-xs text-muted-foreground">
                    {step.description}
                  </span>
                )}
              </span>
            </button>
            {!isLast && (
              <span
                className={cn(
                  'mx-3 h-px flex-1 transition-colors',
                  done ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
