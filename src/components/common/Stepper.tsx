import { useEffect, useRef } from 'react'
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
  scrollable = false,
}: {
  steps: Step[]
  current: number
  onStepClick?: (index: number) => void
  className?: string
  /**
   * One-line, horizontally scrollable layout that keeps the active step
   * centered. Use when the container is too narrow to fit every step
   * (e.g. a 6-step drawer). Default keeps the fit-to-width layout.
   */
  scrollable?: boolean
}) {
  const activeRef = useRef<HTMLLIElement>(null)

  // Keep the current step in view as the user advances/goes back.
  useEffect(() => {
    if (!scrollable) return
    activeRef.current?.scrollIntoView({
      inline: 'center',
      block: 'nearest',
      behavior: 'smooth',
    })
  }, [current, scrollable])

  const list = (
    <ol
      className={cn(
        'flex items-center',
        scrollable ? 'w-max' : 'w-full',
        className,
      )}
    >
      {steps.map((step, i) => {
        const done = i < current
        const active = i === current
        const clickable = !!onStepClick && i <= current
        const isLast = i === steps.length - 1
        return (
          <li
            key={step.key}
            ref={active ? activeRef : undefined}
            className={cn(
              'flex items-center',
              scrollable ? 'shrink-0' : !isLast && 'flex-1',
            )}
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
              <span
                className={cn(
                  'flex-col',
                  scrollable ? 'flex' : active ? 'flex' : 'hidden sm:flex',
                )}
              >
                <span
                  className={cn(
                    'whitespace-nowrap text-sm font-medium leading-tight',
                    active || done ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {step.description}
                  </span>
                )}
              </span>
            </button>
            {!isLast && (
              <span
                className={cn(
                  'mx-3 h-px transition-colors',
                  scrollable ? 'w-8 shrink-0' : 'flex-1',
                  done ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )

  if (!scrollable) return list

  // Hide the scrollbar — the active-step auto-scroll is the affordance.
  return (
    <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {list}
    </div>
  )
}
