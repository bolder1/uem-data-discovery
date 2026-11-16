// History in a slide-over, like Figma's version history: it sits beside the
// page instead of taking a tab, so you can keep acting while you watch a
// command land. One component, two entry points — the header's Activity
// button (everything) and the Actions tab's Action history (commands only).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, MapPin, RefreshCw, Search, Send, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/format'
import { isOpen, isStuck, relTime, STUCK_DAYS, type ActivityEvent, type EventKind } from '@/data/deviceActivity'

const kindIcon: Record<EventKind, typeof Send> = { command: Send, change: Wrench, checkin: RefreshCw, location: MapPin }

export function stateLabel(e: ActivityEvent) {
  if (e.state === 'Failed') return { text: 'Failed', cls: 'border-red-200 bg-red-50 text-red-700' }
  if (isStuck(e)) return { text: 'Stuck', cls: 'border-amber-200 bg-amber-50 text-amber-800' }
  if (e.state === 'Queued') return { text: 'Queued', cls: 'border-slate-200 bg-slate-50 text-slate-700' }
  if (e.state === 'Sent') return { text: 'Waiting', cls: 'border-blue-200 bg-blue-50 text-blue-700' }
  return { text: 'Done', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
}

/** Queued → Sent → Done, with times. */
export function DeliverySteps({ e }: { e: ActivityEvent }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      {e.steps?.map((s, i) => (
        <li key={s.label} className="flex items-center gap-2">
          {i > 0 && <span className={cn('h-px w-4', s.at ? 'bg-foreground/30' : 'bg-border')} aria-hidden />}
          <span className={cn('size-2 rounded-full', !s.at ? 'border border-muted-foreground/40' : s.label.startsWith('Rejected') ? 'bg-red-500' : 'bg-foreground/70')} aria-hidden />
          <span className={cn(!s.at && 'text-muted-foreground')}>{s.label}{s.at && <span className="text-muted-foreground"> {new Date(s.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>}</span>
        </li>
      ))}
    </ol>
  )
}

const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
const initials = (who: string) => (who === 'You' ? 'You' : who.replace(/\..*/, '').slice(0, 2).toUpperCase())

type Filter = 'all' | 'command' | 'change' | 'location'
const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'command', label: 'Commands' }, { id: 'change', label: 'Changes' }, { id: 'location', label: 'Location' },
]

export function HistorySheet({ open, onOpenChange, mode, events, deviceId, offline, onRetry, onCancel, onPush }: {
  open: boolean; onOpenChange: (o: boolean) => void
  /** activity = everything; actions = commands only, titled "Action history". */
  mode: 'activity' | 'actions'
  events: ActivityEvent[]; deviceId: string; offline: boolean
  onRetry: (e: ActivityEvent) => void; onCancel: (e: ActivityEvent) => void; onPush: () => void
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const scope = mode === 'actions' ? events.filter((e) => e.kind === 'command') : events.filter((e) => e.kind !== 'checkin')
  const waiting = scope.filter(isOpen)
  const q = query.trim().toLowerCase()
  const rows = scope.filter((e) => !isOpen(e) && (mode === 'actions' || filter === 'all' || e.kind === filter) && (!q || `${e.title} ${e.by} ${e.detail ?? ''}`.toLowerCase().includes(q)))
  const lastCheckIn = events.find((e) => e.kind === 'checkin')

  const Entry = ({ e }: { e: ActivityEvent }) => {
    const Icon = kindIcon[e.kind]
    const st = e.state ? stateLabel(e) : null
    const canExpand = e.kind === 'command'
    const isExp = expanded === e.id
    return (
      <li className={cn('rounded-lg transition-colors', canExpand && 'hover:bg-muted/60', isExp && 'bg-muted/60')}>
        <button type="button" disabled={!canExpand} aria-expanded={canExpand ? isExp : undefined} onClick={() => setExpanded(isExp ? null : e.id)}
          className="grid w-full grid-cols-[2rem_1fr_auto] items-center gap-3 px-2.5 py-2.5 text-left disabled:cursor-default">
          <span className={cn('flex size-8 items-center justify-center rounded-full border text-[11px] font-semibold',
            e.by === 'You' ? 'border-brand/30 bg-brand/10 text-brand' : 'bg-card text-muted-foreground')}>
            {e.kind === 'command' ? initials(e.by) : <Icon className="size-3.5" />}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{e.title}</span>
            <span className="block truncate text-xs text-muted-foreground" title={formatDateTime(e.at)}>{e.by} · {relTime(e.at)}{e.detail && ` · ${e.detail}`}</span>
          </span>
          {st && <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', st.cls)}>{st.text}</span>}
        </button>
        {isExp && (
          <div className="space-y-2 pb-3 pl-[3.6rem] pr-3">
            <DeliverySteps e={e} />
            {e.error && <p className="rounded-md bg-red-50 px-2.5 py-2 text-xs text-red-900"><span className="font-mono">{e.error}</span> — {e.explain}</p>}
            {e.state === 'Failed' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onRetry(e)}>Retry</Button>}
          </div>
        )}
      </li>
    )
  }

  const days = [...new Set(rows.map((e) => day(e.at)))]

  return (
    // A side panel, not a modal: no backdrop, the page stays usable, and it stays
    // open while you work — Escape or × closes it.
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent side="right" overlay={false} onInteractOutside={(ev) => ev.preventDefault()}
        className="top-16 flex h-[calc(100%-4rem)] w-full flex-col gap-0 border-l p-0 shadow-2xl sm:max-w-[26rem]">
        <SheetHeader className="space-y-3 border-b px-5 py-4 text-left">
          <div>
            <SheetTitle className="text-base">{mode === 'actions' ? 'Action history' : 'Activity'}</SheetTitle>
            <SheetDescription className="text-xs">
              {mode === 'actions' ? 'Every command sent to this device.' : 'Commands, device changes and location.'}
              {lastCheckIn && ` Last check-in ${relTime(lastCheckIn.at)}.`}
            </SheetDescription>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search history" aria-label="Search history" className="h-9 pl-9" />
          </div>
          {mode === 'activity' && (
            <div className="flex gap-1" role="tablist" aria-label="Show">
              {filters.map((f) => (
                <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}
                  className={cn('rounded-full px-3 py-1 text-xs transition-colors', filter === f.id ? 'bg-foreground font-medium text-background' : 'text-muted-foreground hover:bg-muted')}>
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {waiting.length > 0 && (
            <section className="mb-5 rounded-xl border border-blue-200 bg-blue-50/40 p-3">
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <p className="text-xs font-semibold">Waiting on the device · {waiting.length}</p>
                <Button size="sm" variant="outline" className="h-7 bg-card text-xs" disabled={offline} onClick={onPush}><Send className="size-3" />Blank push</Button>
              </div>
              <ul className="space-y-1">
                {waiting.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{e.title}</span>
                    <span className={cn('rounded border px-1.5 py-0.5 text-[11px] font-medium', stateLabel(e).cls)}>{stateLabel(e).text}</span>
                    <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => onCancel(e)}>Cancel</button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 px-1 text-[11px] text-muted-foreground">{offline ? 'Device is offline — these run when it checks in.' : `Over ${STUCK_DAYS} days usually means stuck. A blank push wakes the device to collect them.`}</p>
            </section>
          )}

          {days.map((dy) => (
            <section key={dy} className="mb-4">
              <h3 className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{dy}</h3>
              <ol className="space-y-0.5">
                {rows.filter((e) => day(e.at) === dy).map((e) => <Entry key={e.id} e={e} />)}
              </ol>
            </section>
          ))}
          {!rows.length && !waiting.length && <p className="py-12 text-center text-sm text-muted-foreground">Nothing here yet.</p>}
        </div>

        <div className="border-t px-5 py-3">
          <Link to={`/devices/activity?device=${deviceId}`} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Open in fleet activity<ArrowUpRight className="size-3.5" /></Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}
