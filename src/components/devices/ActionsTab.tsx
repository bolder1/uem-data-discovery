// Actions: the four commands people send most as cards, then every other
// command, one group per row. History lives in a slide-over, opened from
// here or the page header.
import { useState } from 'react'
import { ChevronRight, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { isOffline, type InventoryDevice } from '@/data/deviceInventory'
import { actionGroups, actionsFor, type DeviceAction } from '@/data/deviceActions'
import { isOpen, relTime, type ActivityEvent } from '@/data/deviceActivity'
import { ActionDialog, needsDialog } from './ActionDialog'

export function ActionsTab({ d, events, run, openHistory }: {
  d: InventoryDevice; events: ActivityEvent[]; run: (a: DeviceAction, title?: string) => void; openHistory: () => void
}) {
  const [dialog, setDialog] = useState<DeviceAction | null>(null)
  const commands = events.filter((e) => e.kind === 'command')
  const waiting = commands.filter(isOpen).length
  const failed = commands.filter((e) => e.state === 'Failed').length

  const start = (a: DeviceAction) => (needsDialog(a) ? setDialog(a) : run(a))
  const all = actionsFor(d)
  const quick = all.filter((x) => x.action.quick)
  const lastRun = (id: string) => commands.find((e) => e.actionId === id)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Quick actions</h3>
          <p className="text-sm text-muted-foreground">{isOffline(d) ? 'The device is offline. Commands are queued and run when it checks in.' : "Sent right away, done on the device's next check-in."}</p>
        </div>
        <Button variant="outline" size="sm" onClick={openHistory}>
          <History className="size-4" />Action history
          {(waiting > 0 || failed > 0) && <span className={cn('rounded px-1.5 text-xs tabular-nums', failed ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700')}>{failed || waiting}</span>}
        </Button>
      </div>

      {/* The four commands helpdesk sends most, one click each. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {quick.map(({ action: a, enabled, reason }) => {
          const last = lastRun(a.id)
          return (
            <button key={a.id} type="button" disabled={!enabled} onClick={() => start(a)} title={reason}
              className="group flex flex-col items-start gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition-colors hover:border-brand/40 hover:bg-brand/5 disabled:pointer-events-none disabled:opacity-50">
              <span className="flex size-9 items-center justify-center rounded-lg bg-brand/10 text-brand"><a.icon className="size-4" /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{a.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{reason ?? (last ? `Last run ${relTime(last.at).toLowerCase()}` : a.detail)}</span>
              </span>
            </button>
          )
        })}
      </div>

      <h3 className="pt-2 text-sm font-semibold">All commands</h3>
      <div className="space-y-4">
        {actionGroups.map((g) => {
          const items = all.filter((x) => x.action.group === g && !x.action.quick)
          if (!items.length) return null
          return (
            <section key={g} className={cn('overflow-hidden rounded-xl border bg-card shadow-sm', g === 'Reset and removal' && 'border-red-200')}>
              <h3 className={cn('border-b px-4 py-2 text-xs font-semibold uppercase tracking-wider', g === 'Reset and removal' ? 'bg-red-50/60 text-red-700' : 'bg-muted/40 text-muted-foreground')}>{g}</h3>
              <ul className="divide-y">
                {items.map(({ action: a, enabled, reason }) => {
                  const on = a.toggle?.(d)
                  return (
                    <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                      <a.icon className={cn('size-4 shrink-0', a.danger ? 'text-red-600' : 'text-muted-foreground')} />
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-sm', !enabled && 'text-muted-foreground')}>{a.label}</p>
                        {(reason || a.toggle) && <p className="truncate text-xs text-muted-foreground">{reason ?? `Currently ${on ? 'on' : 'off'}`}</p>}
                      </div>
                      {a.toggle ? (
                        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={!enabled} onClick={() => run(a, `Turn ${on ? 'off' : 'on'} ${a.label}`)}>Turn {on ? 'off' : 'on'}</Button>
                      ) : (
                        <Button size="sm" variant="ghost" className={cn('h-7 text-xs', a.danger && 'text-red-600 hover:bg-red-50 hover:text-red-700')} disabled={!enabled} onClick={() => start(a)}>
                          Run<ChevronRight className="size-3.5" />
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>

      {dialog && <ActionDialog a={dialog} d={d} onClose={() => setDialog(null)} onRun={(title) => { run(dialog, title); setDialog(null) }} />}
    </div>
  )
}
