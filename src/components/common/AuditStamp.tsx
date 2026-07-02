import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/format'

// Audit-visible action: every state change surfaces "Logged · time · who".
export function AuditStamp({
  at,
  by,
  className,
}: {
  at: string
  by: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-md bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700',
        className,
      )}
    >
      <ShieldCheck className="size-3.5" />
      <span>
        Logged to the audit trail · {formatDateTime(at)} · {by}
      </span>
    </div>
  )
}
