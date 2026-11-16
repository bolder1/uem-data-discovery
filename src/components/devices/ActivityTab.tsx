// Activity answers two questions: "did my command work?" and "who did what
// to this device, when?". Open commands are pinned on top with the fix real
// MDMs use for stuck ones (a blank push). Below is the full history as a
// table — time, event, type, status, actor — each row expandable to its
// delivery steps and the device's response.
import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, ChevronDown, MapPin, RefreshCw, Search, Send, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/format'
import { isOpen, isStuck, relTime, STUCK_DAYS, type ActivityEvent, type EventKind } from '@/data/deviceActivity'

const kindMeta: Record<EventKind, { label: string; icon: typeof Send }> = {
  command: { label: 'Command', icon: Send },
  change: { label: 'Device change', icon: Wrench },
  checkin: { label: 'Check-in', icon: RefreshCw },
  location: { label: 'Location', icon: MapPin },
}

export function stateLabel(e: ActivityEvent) {
  if (e.state === 'Failed') return { text: 'Failed', cls: 'border-red-200 bg-red-50 text-red-700' }
  if (isStuck(e)) return { text: 'Stuck', cls: 'border-amber-200 bg-amber-50 text-amber-800' }
  if (e.state === 'Queued') return { text: 'Queued', cls: 'border-slate-200 bg-slate-50 text-slate-700' }
  if (e.state === 'Sent') return { text: 'Waiting for device', cls: 'border-blue-200 bg-blue-50 text-blue-700' }
  return { text: 'Done', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
}

/** Queued → Sent → Done, with times. */
export function DeliverySteps({ e }: { e: ActivityEvent }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      {e.steps?.map((s, i) => (
        <li key={s.label} className="flex items-center gap-2">
          {i > 0 && <span className={cn('h-px w-6', s.at ? 'bg-foreground/30' : 'bg-border')} aria-hidden />}
          <span className={cn('size-2 rounded-full', !s.at ? 'border border-muted-foreground/40' : s.label.startsWith('Rejected') ? 'bg-red-500' : 'bg-foreground/70')} aria-hidden />
          <span className={cn(!s.at && 'text-muted-foreground')}>{s.label}{s.at && <span className="text-muted-foreground"> · {new Date(s.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>}</span>
        </li>
      ))}
    </ol>
  )
}

const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

export function ActivityTab({ deviceId, events, offline, onRetry, onCancel, onPush }: {
  deviceId: string; events: ActivityEvent[]; offline: boolean; actionFilter?: string | null
  onRetry: (e: ActivityEvent) => void; onCancel: (e: ActivityEvent) => void; onPush: () => void
}) {
  // Routine check-ins drown out what people did; they're one filter away.
  const [kind, setKind] = useState<EventKind | 'all' | 'notable'>('notable')
  const [status, setStatus] = useState<'any' | 'failed' | 'open' | 'done'>('any')
  const [who, setWho] = useState('anyone')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const waiting = events.filter(isOpen)
  const people = [...new Set(events.map((e) => e.by))].sort()
  const q = query.trim().toLowerCase()
  const rows = events.filter((e) =>
    (kind === 'all' || (kind === 'notable' ? e.kind !== 'checkin' : e.kind === kind)) &&
    (who === 'anyone' || e.by === who) &&
    (status === 'any' || (status === 'failed' ? e.state === 'Failed' : status === 'open' ? isOpen(e) : e.state === 'Done')) &&
    (!q || `${e.title} ${e.detail ?? ''} ${e.by}`.toLowerCase().includes(q)),
  )

  return (
    <div className="space-y-5">
      {waiting.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-blue-200 bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-blue-100 bg-blue-50/60 px-5 py-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold">Waiting on the device · {waiting.length}</h3>
              <p className="text-xs text-muted-foreground">
                {offline ? 'The device is offline. These run when it checks in.' : `Sent but not done yet. Anything older than ${STUCK_DAYS} days is usually stuck — a blank push wakes the device to collect it.`}
              </p>
            </div>
            <Button size="sm" variant="outline" disabled={offline} onClick={onPush}><Send className="size-3.5" />Send blank push</Button>
            <Button size="sm" variant="ghost" onClick={() => waiting.forEach(onCancel)}>Cancel all</Button>
          </div>
          <ul className="divide-y">
            {waiting.map((e) => {
              const st = stateLabel(e)
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                  <span className="min-w-0 flex-1 text-sm font-medium">{e.title}</span>
                  <span className="text-xs text-muted-foreground">sent {relTime(e.at)} by {e.by}</span>
                  <span className={cn('rounded border px-1.5 py-0.5 text-xs font-medium', st.cls)}>{st.text}</span>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onCancel(e)}>Cancel</Button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search history" aria-label="Search history" className="h-9 pl-9" />
        </div>
        <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
          <SelectTrigger className="h-9 w-48" aria-label="Type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="notable">Without check-ins</SelectItem>
            <SelectItem value="all">All events</SelectItem>
            {(Object.keys(kindMeta) as EventKind[]).map((k) => <SelectItem key={k} value={k}>{kindMeta[k].label}s</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="h-9 w-36" aria-label="Status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any status</SelectItem><SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="open">Waiting</SelectItem><SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
        <Select value={who} onValueChange={setWho}>
          <SelectTrigger className="h-9 w-36" aria-label="By"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="anyone">Anyone</SelectItem>{people.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
        <Link to={`/devices/activity?device=${deviceId}`} className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Open in fleet activity<ArrowUpRight className="size-3.5" /></Link>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60">
              <TableHead className="w-28">Time</TableHead>
              <TableHead>Event</TableHead>
              <TableHead className="w-36">Type</TableHead>
              <TableHead className="w-40">Status</TableHead>
              <TableHead className="w-28">By</TableHead>
              <TableHead className="w-12 text-center"><span className="sr-only">Details</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((e, i) => {
              const K = kindMeta[e.kind]
              const st = e.state ? stateLabel(e) : null
              const newDay = i === 0 || day(rows[i - 1].at) !== day(e.at)
              const expandable = e.kind === 'command'
              const isOpenRow = open === e.id
              return (
                <Fragment key={e.id}>
                  {newDay && (
                    <TableRow className="hover:bg-transparent"><TableCell colSpan={6} className="bg-muted/30 py-1.5 text-xs font-semibold text-muted-foreground">{day(e.at)}</TableCell></TableRow>
                  )}
                  <TableRow className={cn(expandable && 'cursor-pointer')} onClick={() => expandable && setOpen(isOpenRow ? null : e.id)}>
                    <TableCell className="tabular-nums text-muted-foreground" title={formatDateTime(e.at)}>{new Date(e.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</TableCell>
                    <TableCell><p className="font-medium">{e.title}</p>{e.detail && <p className="text-xs text-muted-foreground">{e.detail}</p>}</TableCell>
                    <TableCell><span className="inline-flex items-center gap-1.5 text-muted-foreground"><K.icon className="size-3.5" />{K.label}</span></TableCell>
                    <TableCell>{st ? <span className={cn('rounded border px-1.5 py-0.5 text-xs font-medium', st.cls)}>{st.text}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-muted-foreground">{e.by}</TableCell>
                    <TableCell className="text-center">{expandable && <ChevronDown className={cn('mx-auto size-4 text-muted-foreground transition-transform', isOpenRow && 'rotate-180')} />}</TableCell>
                  </TableRow>
                  {isOpenRow && (
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableCell colSpan={6} className="space-y-2 py-3">
                        <DeliverySteps e={e} />
                        {e.error && <p className="text-xs"><span className="text-muted-foreground">Device response:</span> <span className="font-mono text-red-700">{e.error}</span> — {e.explain}</p>}
                        {e.state === 'Failed' && <Button size="sm" variant="outline" onClick={(ev) => { ev.stopPropagation(); onRetry(e) }}>Retry</Button>}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              )
            })}
            {!rows.length && <TableRow><TableCell colSpan={6} className="py-10 text-muted-foreground">Nothing matches these filters.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
