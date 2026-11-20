// Actions: every command as a compact card, all in view at once, so an admin
// can see what they can do to this device without scrolling. Right under the
// cards sit the commands already sent — the audit trail for this device.
import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { isOffline, type InventoryDevice } from '@/data/deviceInventory'
import { actionsFor, type DeviceAction } from '@/data/deviceActions'
import { isOpen, type ActivityEvent } from '@/data/deviceActivity'
import { ActionDialog, needsDialog } from './ActionDialog'
import { CommandsTable } from './CommandsTable'

/** Where an on/off setting stands: what the device reports, and where it is heading if a change is on its way. */
interface SwitchState { on: boolean; pending?: boolean }

/**
 * Read from the commands, not stored separately: the newest "Turn on/off" command for this setting
 * decides. Done means the device took the new state; Queued or Sent means it is still on its way.
 */
function switchState(a: DeviceAction, d: InventoryDevice, events: ActivityEvent[]): SwitchState {
  const reported = a.toggle!(d)
  const last = events.find((e) => e.kind === 'command' && e.actionId === a.id && /^Turn (on|off) /.test(e.title))
  if (!last || last.state === 'Failed') return { on: reported }
  const target = last.title.startsWith('Turn on')
  if (last.state === 'Done') return { on: target }
  return isOpen(last) ? { on: target, pending: true } : { on: reported }
}

/** A small switch that shows the state. It is a picture, not a control: the whole card is the button. */
function SwitchMark({ on, pending }: SwitchState) {
  return (
    <span aria-hidden className={cn('relative inline-flex h-3.5 w-6 shrink-0 rounded-full transition-colors duration-200 motion-reduce:transition-none',
      on ? 'bg-emerald-500' : 'bg-slate-300', pending && 'animate-pulse')}>
      <span className={cn('absolute top-0.5 left-0.5 size-2.5 rounded-full bg-white shadow-sm transition-transform duration-200 motion-reduce:transition-none', on && 'translate-x-2.5')} />
    </span>
  )
}

/** One command. The line under the label says why it is unavailable, or the state of a switch. */
function ActionCard({ a, enabled, reason, sw, onStart }: {
  a: DeviceAction; enabled: boolean; reason?: string; sw?: SwitchState; onStart: (a: DeviceAction) => void
}) {
  // A change on its way can't be sent again until the device answers.
  const busy = !!sw?.pending
  const live = enabled && !busy
  const state = sw && !reason ? (busy ? `Turning ${sw.on ? 'on' : 'off'}…` : sw.on ? 'On' : 'Off') : null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* aria-disabled, not disabled: an unavailable card can still be hovered and focused to read why.
            One line: icon, name, and a switch for on/off settings. What it does, or why it is
            unavailable, is in the tooltip, so the whole catalog stays in a couple of rows. */}
        <button type="button" aria-disabled={!live} aria-pressed={state ? sw!.on : undefined} aria-label={state ? `${a.label}: ${state}` : undefined}
          onClick={() => live && onStart(a)}
          className={cn('flex h-12 items-center gap-2.5 rounded-lg border bg-card px-3.5 text-left shadow-xs transition-colors',
            !enabled ? 'cursor-not-allowed opacity-55' : busy ? 'cursor-progress' : a.danger ? 'hover:border-red-300 hover:bg-red-50/60' : 'hover:border-brand/40 hover:bg-brand/5')}>
          <a.icon className={cn('size-4 shrink-0', !enabled ? 'text-muted-foreground' : a.danger ? 'text-red-600' : 'text-brand')} />
          <span className="line-clamp-2 min-w-0 flex-1 text-sm font-medium leading-tight">{a.label}</span>
          {state && <SwitchMark {...sw!} />}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {reason ? <><span className="font-medium">{reason}.</span> {a.detail}.</>
          : state ? `${state === 'On' || state === 'Off' ? `${state}. ` : `${state} `}${busy ? 'Waiting for the device to confirm.' : `Click to turn ${sw!.on ? 'off' : 'on'}.`}`
            : a.detail}
      </TooltipContent>
    </Tooltip>
  )
}

export function ActionsTab({ d, events, run, onRetry, onCancel }: {
  d: InventoryDevice; events: ActivityEvent[]; run: (a: DeviceAction, title?: string) => void
  onRetry: (e: ActivityEvent) => void; onCancel: (e: ActivityEvent) => void
}) {
  const [dialog, setDialog] = useState<DeviceAction | null>(null)
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const actions = actionsFor(d).filter(({ action: a }) => !q || `${a.label} ${a.detail} ${a.group}`.toLowerCase().includes(q))

  const start = (a: DeviceAction) => {
    if (a.toggle) run(a, `Turn ${switchState(a, d, events).on ? 'off' : 'on'} ${a.label}`)
    else if (needsDialog(a)) setDialog(a)
    else run(a)
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Device actions</h3>
            <p className="text-sm text-muted-foreground">{isOffline(d) ? 'The device is offline. Commands are queued and run when it checks in.' : "Sent right away, done on the device's next check-in."}</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find an action" aria-label="Find an action" className="h-9 pl-9" />
          </div>
        </div>

        {/* As small as a button: the whole catalog in a couple of rows. Risky commands come last. */}
        {/* 14rem: room for a two-word name and a switch on one line ("Personal Hotspot", "Clear Screen Time passcode" wraps at most once). */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-2.5">
          {actions.map(({ action: a, enabled, reason }) => (
            <ActionCard key={a.id} a={a} enabled={enabled} reason={reason} sw={a.toggle ? switchState(a, d, events) : undefined} onStart={start} />
          ))}
        </div>
        {!actions.length && <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">No action matches “{query}”.</p>}
      </section>

      <CommandsTable events={events} onRetry={onRetry} onCancel={onCancel} />

      {dialog && <ActionDialog a={dialog} d={d} onClose={() => setDialog(null)} onRun={(title) => { run(dialog, title); setDialog(null) }} />}
    </div>
  )
}
