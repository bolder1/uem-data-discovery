// Device Inventory → Devices → one device (iOS/iPadOS or macOS). A quiet
// identity bar, a side rail that keeps the checks in view, and a workspace
// for the three jobs that matter: act on it, look inside it, see what happened.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronRight, History, MonitorPlay, RefreshCw, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/common'
import { INVENTORY_NOW, inventory, isOffline, tabOf } from '@/data/deviceInventory'
import { categoryAttention, deviceApps, systemDetails } from '@/data/deviceDetail'
import { deviceActions, availability, type DeviceAction } from '@/data/deviceActions'
import { commandEvent, deviceActivity, isStuck, type ActivityEvent } from '@/data/deviceActivity'
import { DeviceHero } from '@/components/devices/DeviceHero'
import { ActionsTab } from '@/components/devices/ActionsTab'
import { SystemDetailsTab } from '@/components/devices/SystemDetailsTab'
import { HistorySheet } from '@/components/devices/HistorySheet'
import { LocationTab } from '@/components/devices/LocationTab'
import { AppsTab, GroupsTab } from '@/components/devices/tabs'
import { useToast } from '@/components/devices/shared'

const Count = ({ n, red }: { n: number; red?: boolean }) =>
  n > 0 ? <span className={red ? 'rounded bg-red-100 px-1.5 text-xs text-red-700 tabular-nums' : 'rounded bg-amber-100 px-1.5 text-xs text-amber-800 tabular-nums'}>{n}</span> : null

export function DeviceDetail() {
  const { deviceId } = useParams()
  const d = inventory.find((x) => x.id === deviceId)
  const { toast, node } = useToast()
  const [tab, setTab] = useState('actions')
  const [history, setHistory] = useState<'activity' | 'actions' | null>(null)
  const cats = useMemo(() => (d ? systemDetails(d) : []), [d])
  const [events, setEvents] = useState<ActivityEvent[]>(() => (d ? deviceActivity(d) : []))
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  if (!d) {
    return <EmptyState icon={Smartphone} title="Device not found" description="It may have been deprovisioned or deleted." action={<Button asChild variant="outline"><Link to="/devices">Back to devices</Link></Button>} />
  }
  const offline = isOffline(d)

  // A sent command walks Queued → Sent → Done in front of the admin (online devices only).
  const send = (actionId: string, title: string) => {
    const at = new Date(INVENTORY_NOW.getTime() + events.length * 1000)
    const id = `new-${events.length}`
    setEvents((list) => [commandEvent(d, id, actionId, title, at, 'Queued', 'You'), ...list])
    toast(offline ? `${title} queued. Runs when the device checks in.` : `${title} sent.`)
    if (offline) return
    const step = (state: 'Sent' | 'Done', ms: number) => timers.current.push(window.setTimeout(() =>
      setEvents((list) => list.map((e) => (e.id === id ? commandEvent(d, id, actionId, title, at, state, 'You') : e))), ms))
    step('Sent', 900)
    step('Done', 2600)
  }
  const run = (a: DeviceAction, title?: string) => send(a.id, title ?? a.label)
  const retry = (e: ActivityEvent) => send(e.actionId ?? 'sync', e.title)
  const cancel = (e: ActivityEvent) => { setEvents((l) => l.filter((x) => x.id !== e.id)); toast(`${e.title} cancelled.`) }
  const can = (id: string) => availability(deviceActions.find((a) => a.id === id)!, d).enabled


  const followUps = events.filter((e) => e.state === 'Failed' || isStuck(e)).length
  const failedApps = deviceApps(d).filter((a) => a.status === 'Failed').length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
          <Link to={`/devices${tabOf(d) === 'macos' ? '?os=macos' : ''}`} className="text-primary hover:underline">Devices</Link>
          <ChevronRight className="size-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">{tabOf(d) === 'ios' ? 'iOS' : 'macOS'}</span>
          <ChevronRight className="size-3.5 text-muted-foreground" />
          <span className="font-mono">{d.serial}</span>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setHistory('activity')}><History className="size-4" />Activity<Count n={followUps} red /></Button>
          <Button variant="outline" size="sm" onClick={() => send('sync', offline ? 'Send wake-up push' : 'Sync device')}><RefreshCw className="size-4" />{offline ? 'Wake device' : 'Sync now'}</Button>
          <Button size="sm" disabled={!can('cast')} onClick={() => send('cast', 'Remote cast')}><MonitorPlay className="size-4" />Remote cast</Button>
        </div>
      </div>

      <DeviceHero d={d} />

      <div>
        <Tabs value={tab} onValueChange={setTab} className="min-w-0 gap-5">
          <TabsList variant="line" className="w-full justify-start overflow-x-auto border-b pb-1">
            <TabsTrigger value="actions" className="flex-none">Actions</TabsTrigger>
            <TabsTrigger value="system" className="flex-none">System details<Count n={cats.reduce((n, c) => n + categoryAttention(c), 0)} /></TabsTrigger>
            <TabsTrigger value="location" className="flex-none">Location</TabsTrigger>
            <TabsTrigger value="apps" className="flex-none">Apps<Count n={failedApps} red /></TabsTrigger>
            <TabsTrigger value="groups" className="flex-none">Groups & policies</TabsTrigger>
          </TabsList>
          <TabsContent value="actions">
            <ActionsTab d={d} events={events} run={run} openHistory={() => setHistory('actions')} />
          </TabsContent>
          <TabsContent value="system">
            <SystemDetailsTab d={d} cats={cats} toast={toast} onRefresh={() => send('sync', 'Refresh system details')} />
          </TabsContent>
          <TabsContent value="location"><LocationTab d={d} onLocate={() => send('locate', 'Request location')} /></TabsContent>
          <TabsContent value="apps"><AppsTab d={d} onRetry={(name) => send('app', `Install app: ${name}`)} /></TabsContent>
          <TabsContent value="groups"><GroupsTab d={d} /></TabsContent>
        </Tabs>
      </div>

      <HistorySheet open={!!history} onOpenChange={(o) => !o && setHistory(null)} mode={history ?? 'activity'} events={events} deviceId={d.id} offline={offline}
        onRetry={retry} onCancel={cancel} onPush={() => send('push', 'Send blank push')} />
      {node}
    </div>
  )
}
