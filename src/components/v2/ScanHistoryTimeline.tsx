import { History, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScanStatusBadge } from '@/components/common'
import { SCAN_STATUS_META } from '@/lib/format'
import { formatDateTime, formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ScanJob } from '@/types'

/**
 * A plain button that opens a popover with the run history — a vertically
 * aligned timeline (status dot, connecting line, then the run's stats)
 * instead of a plain table, since a scan history is fundamentally a
 * sequence of events over time.
 */
export function ScanHistoryTimeline({
  scans,
  onOpenScan,
}: {
  scans: ScanJob[]
  onOpenScan?: (scan: ScanJob) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <History className="size-4" />
          Scan history
          {scans.length > 0 && (
            <span className="ml-0.5 flex size-5 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-foreground">
              {scans.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96">
        <div className="border-b px-5 py-4">
          <p className="text-sm font-semibold text-foreground">Scan history</p>
          <p className="text-xs text-muted-foreground">
            {scans.length} {scans.length === 1 ? 'run' : 'runs'}, most recent first
          </p>
        </div>

        <div className="max-h-96 overflow-y-auto px-5 py-5">
          {scans.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No scans have run yet.
            </p>
          ) : (
            <div className="relative pl-5">
              <div className="absolute left-[5px] top-1.5 bottom-1.5 w-px bg-border" />
              {scans.map((s) => {
                const meta = SCAN_STATUS_META[s.status]
                return (
                  <div key={s.id} className="relative pb-6 last:pb-0">
                    <span
                      className={cn(
                        'absolute -left-5 top-1 size-2.5 rounded-full ring-4 ring-popover',
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
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
