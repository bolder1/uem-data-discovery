import { ArrowRight, Radar } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { ScanStatusBadge } from '@/components/common'
import { SCAN_STATUS_META } from '@/lib/format'
import { formatDateTime, formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ScanJob } from '@/types'

/**
 * A real, always-visible section on the policy page — not tucked behind a
 * header popover the user has to think to open. History updates live as
 * scans run, so it's the natural place to look, right alongside the rest of
 * the policy's configuration and results. A vertically aligned timeline
 * (status dot, connecting line, then the run's stats) instead of a plain
 * table, since a scan history is fundamentally a sequence of events.
 */
export function ScanHistorySection({
  scans,
  onOpenScan,
}: {
  scans: ScanJob[]
  onOpenScan?: (scan: ScanJob) => void
}) {
  return (
    <Card className="gap-0 p-0">
      <div className="border-b px-5 py-4">
        <p className="text-sm font-semibold text-foreground">Scan history</p>
        <p className="text-xs text-muted-foreground">
          {scans.length === 0
            ? 'No scans have run yet.'
            : `${scans.length} ${scans.length === 1 ? 'run' : 'runs'}, most recent first`}
        </p>
      </div>

      {scans.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
          <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Radar className="size-4" />
          </span>
          <p className="text-sm text-muted-foreground">
            Run this policy to start building its history.
          </p>
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto px-5 py-5">
          <div className="relative pl-5">
            <div className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-border" />
            {scans.map((s) => {
              const meta = SCAN_STATUS_META[s.status]
              return (
                <div key={s.id} className="relative pb-6 last:pb-0">
                  <span
                    className={cn(
                      'absolute -left-5 top-1 size-2.5 rounded-full ring-4 ring-card',
                      meta.dot,
                    )}
                  />
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {formatDateTime(s.startedAt)}
                      </p>
                      <ScanStatusBadge status={s.status} pill />
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {formatDuration(s.durationSec)} ·{' '}
                      {s.objectsScanned.toLocaleString()} objects ·{' '}
                      <span className="font-medium text-foreground">
                        {s.sensitiveFound.toLocaleString()} sensitive
                      </span>
                    </p>
                    {onOpenScan && (
                      <button
                        type="button"
                        onClick={() => onOpenScan(s)}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                      >
                        View results
                        <ArrowRight className="size-3" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}
