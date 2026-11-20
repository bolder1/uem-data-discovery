// The commands sent to this device, on the page rather than behind a button:
// what was sent, by whom, when, and how the device answered. It is the audit
// trail an admin reads before sending the next command.
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AuditStamp, StatusDot } from '@/components/common'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/format'
import { ageDays, isOpen, relTime, type ActivityEvent } from '@/data/deviceActivity'
import { stateLabel } from './HistorySheet'
import { SectionCard } from './shared'

type Filter = 'all' | 'pending' | 'failed'

/** Rows shown before "Show all". */
const FIRST_ROWS = 6

const dot: Record<string, string> = { Failed: 'bg-red-500', Stuck: 'bg-amber-500', Queued: 'bg-slate-400', Waiting: 'bg-blue-500', Done: 'bg-emerald-500' }

/** The line under a status: what it is waiting for. Failures show their own error. */
const waitingFor = (e: ActivityEvent, status: string) =>
  status === 'Stuck' ? `No answer for ${Math.floor(ageDays(e))} days`
    : status === 'Queued' ? 'Runs when the device checks in'
      : status === 'Waiting' ? 'Sent, waiting for the device to answer'
        : null

export function CommandsTable({ events, onRetry, onCancel }: {
  events: ActivityEvent[]; onRetry: (e: ActivityEvent) => void; onCancel: (e: ActivityEvent) => void
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [showAll, setShowAll] = useState(false)
  const commands = events.filter((e) => e.kind === 'command')
  const pending = commands.filter(isOpen)
  const failed = commands.filter((e) => e.state === 'Failed')
  const rows = filter === 'pending' ? pending : filter === 'failed' ? failed : commands
  const visible = showAll ? rows : rows.slice(0, FIRST_ROWS)
  const chips: { id: Filter; label: string; n: number }[] = [
    { id: 'all', label: 'All', n: commands.length }, { id: 'pending', label: 'Pending', n: pending.length }, { id: 'failed', label: 'Failed', n: failed.length },
  ]

  return (
    <SectionCard title="Command history" description="Every command sent to this device, who sent it, when, and how the device responded."
      aside={
        <div className="inline-flex rounded-lg border bg-muted/40 p-0.5" role="group" aria-label="Filter commands">
          {chips.map((c) => (
            <button key={c.id} type="button" aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}
              className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                filter === c.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              {c.label}
              {/* A count that needs follow-up is tinted, so it is noticed even when its rows are further down. */}
              <span className={cn('tabular-nums', !c.n || c.id === 'all' ? 'text-muted-foreground' : c.id === 'failed' ? 'text-red-600' : 'text-amber-700')}>{c.n}</span>
            </button>
          ))}
        </div>
      }>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60">
            <TableHead className="pl-5">Command</TableHead><TableHead>Status</TableHead><TableHead>Sent by</TableHead><TableHead>Sent</TableHead>
            <TableHead className="w-28 pr-5 text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((e) => {
            const status = stateLabel(e).text
            const waiting = waitingFor(e, status)
            return (
              <TableRow key={e.id}>
                <TableCell className="pl-5 font-medium">{e.title}</TableCell>
                <TableCell className="whitespace-normal">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium"><StatusDot className={dot[status]} />{status}</span>
                  {status === 'Failed' && e.error && <p className="mt-0.5 max-w-xl text-xs text-muted-foreground"><span className="font-mono">{e.error}</span>. {e.explain}</p>}
                  {waiting && <p className="mt-0.5 text-xs text-muted-foreground">{waiting}</p>}
                </TableCell>
                <TableCell className="text-muted-foreground">{e.by}</TableCell>
                <TableCell className="tabular-nums text-muted-foreground" title={relTime(e.at)}>{formatDateTime(e.at)}</TableCell>
                <TableCell className="pr-5 text-center">
                  {e.state === 'Failed' ? <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onRetry(e)}>Retry</Button>
                    : isOpen(e) ? <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onCancel(e)}>Cancel</Button>
                      : <span className="text-muted-foreground">—</span>}
                </TableCell>
              </TableRow>
            )
          })}
          {!visible.length && (
            <TableRow><TableCell colSpan={5} className="py-8 pl-5 text-muted-foreground">{filter === 'all' ? 'No commands have been sent to this device yet.' : `No ${filter} commands.`}</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
      {commands.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-2.5">
          <AuditStamp at={commands[0].at} by={commands[0].by} />
          {rows.length > FIRST_ROWS && <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Show fewer' : `Show all ${rows.length}`}</Button>}
        </div>
      )}
    </SectionCard>
  )
}
