// Settings layout shared by the onboarding sheet's tabs: titled sections of
// rows, label (+ OS badge + ⓘ hint) on the left, control on the right.
import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1">
      <h4 className="pb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{title}</h4>
      <div className="divide-y rounded-lg border bg-card">{children}</div>
    </section>
  )
}

export function Label2({ label, required, since, hint, dim }: { label: string; required?: boolean; since?: string; hint?: string; dim?: boolean }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5 text-sm', dim && 'text-muted-foreground')}>
      <span className="font-medium">{label}</span>
      {required && <span className="text-destructive">*</span>}
      {since && <span className="rounded border px-1.5 text-[11px] font-normal text-muted-foreground">{since}</span>}
      {hint && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-muted-foreground hover:text-foreground" aria-label={`About ${label}`}><Info className="size-3.5" /></button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{hint}</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

/**
 * Label on the left, control on the right (or under it when `stacked`).
 * `blocked` explains a disabled row; `note` is an always-visible line under the label.
 */
export function Row({ label, required, since, hint, note, blocked, stacked, children }: {
  label: string; required?: boolean; since?: string; hint?: string; note?: React.ReactNode; blocked?: string | null; stacked?: boolean; children: React.ReactNode
}) {
  return (
    <div className={cn('gap-3 px-4 py-3', stacked ? 'space-y-2' : 'grid items-center sm:grid-cols-[1fr_minmax(0,260px)]')}>
      <div className="space-y-0.5">
        <Label2 label={label} required={required} since={since} hint={hint} dim={!!blocked} />
        {blocked ? <p className="text-xs text-muted-foreground">{blocked}</p> : note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
      <div className={cn(!stacked && 'flex sm:justify-end', blocked && 'opacity-60')}>{children}</div>
    </div>
  )
}

/** A follow-up input revealed by the switch above it, indented to show it belongs to it. */
export function SubRow({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="grid items-center gap-3 bg-secondary/40 py-3 pr-4 pl-8 sm:grid-cols-[1fr_minmax(0,260px)]">
      <div>
        <span className="text-sm">{label}</span>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
      {children}
    </div>
  )
}

