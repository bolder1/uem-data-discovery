import { cn } from '@/lib/utils'
import { STATUS_META, SCAN_STATUS_META, APP_STATUS_META } from '@/lib/format'
import type { AppStatus, ConnectionStatus, ScanStatus } from '@/types'

export function StatusDot({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-block size-2 shrink-0 rounded-full', className)}
      aria-hidden
    />
  )
}

export function ConnectionStatusBadge({
  status,
  pill = false,
}: {
  status: ConnectionStatus
  pill?: boolean
}) {
  const m = STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium',
        pill
          ? cn('rounded-full border px-2 py-0.5', m.badge)
          : 'text-foreground',
      )}
    >
      <StatusDot className={m.dot} />
      {m.label}
    </span>
  )
}

export function ScanStatusBadge({
  status,
  pill = false,
}: {
  status: ScanStatus
  pill?: boolean
}) {
  const m = SCAN_STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium',
        pill
          ? cn('rounded-full border px-2 py-0.5', m.badge)
          : 'text-foreground',
      )}
    >
      <StatusDot className={m.dot} />
      {m.label}
    </span>
  )
}

export function AppStatusBadge({
  status,
  pill = true,
}: {
  status: AppStatus
  pill?: boolean
}) {
  const m = APP_STATUS_META[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium',
        pill
          ? cn('rounded-full border px-2 py-0.5', m.badge)
          : 'text-foreground',
      )}
    >
      <StatusDot className={m.dot} />
      {m.label}
    </span>
  )
}
