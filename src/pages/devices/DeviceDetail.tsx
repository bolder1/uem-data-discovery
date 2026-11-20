// Device Inventory → Devices → one device (iOS/iPadOS or macOS). A pinned row
// that always says which device this is, the device card with its vitals, and
// a workspace for the jobs that matter: act on it, look inside it, see what happened.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ChevronRight, History, MonitorPlay, RefreshCw, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/common'
import { cn } from '@/lib/utils'
import { INVENTORY_NOW, inventory, isOffline, tabOf } from '@/data/deviceInventory'
import { deviceApps, systemDetails } from '@/data/deviceDetail'
import { deviceActions, availability, type DeviceAction } from '@/data/deviceActions'
import { commandEvent, deviceActivity, isStuck, type ActivityEvent } from '@/data/deviceActivity'
import { DeviceHero } from '@/components/devices/DeviceHero'
import { PinnedIdentity } from '@/components/devices/PinnedIdentity'
import { ActionsTab } from '@/components/devices/ActionsTab'
import { SystemDetailsTab } from '@/components/devices/SystemDetailsTab'
import { HistorySheet } from '@/components/devices/HistorySheet'
import { LocationTab } from '@/components/devices/LocationTab'
import { AppsTab, GroupsTab } from '@/components/devices/tabs'
import { useToast } from '@/components/devices/shared'

const Count = ({ n, red }: { n: number; red?: boolean }) =>
  n > 0 ? <span className={red ? 'rounded bg-red-100 px-1.5 text-xs text-red-700 tabular-nums' : 'rounded bg-amber-100 px-1.5 text-xs text-amber-800 tabular-nums'}>{n}</span> : null

/** Height of the pinned row (`h-14`). The tab bar pins directly under it (`top-14`). */
const PINNED_ROW = 56

const TABS = ['actions', 'system', 'location', 'apps', 'groups']

/** True once the element has scrolled out of sight under the pinned row. */
function useScrolledAway(el: HTMLElement | null) {
  const [away, setAway] = useState(false)
  useEffect(() => {
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setAway(!entry.isIntersecting), { root: el.closest('main'), rootMargin: `-${PINNED_ROW}px 0px 0px 0px` })
    io.observe(el)
    return () => io.disconnect()
  }, [el])
  return away
}

export function DeviceDetail() {
  const { deviceId } = useParams()
  const d = inventory.find((x) => x.id === deviceId)
  const { toast, node } = useToast()
  // The tab lives in the URL, so a link, a reload or Back lands on the same view.
  // Switching tabs replaces the entry: Back should leave the page, not replay tab clicks.
  const [params, setParams] = useSearchParams()
  const tab = TABS.includes(params.get('tab') ?? '') ? params.get('tab')! : 'actions'
  const setTab = (v: string) => setParams((p) => { p.set('tab', v); return p }, { replace: true })
  const [activityOpen, setActivityOpen] = useState(false)
  const cats = useMemo(() => (d ? systemDetails(d) : []), [d])
  // The System details category that is open, if any (`?section=`, set by SystemDetailsTab).
  const section = tab === 'system' ? cats.find((c) => c.id === params.get('section'))?.id : undefined
  // Opening a category is going inside: the page moves up so the category starts
  // right under the pinned rows. Instant on first load, and for reduced motion.
  const tabsEl = useRef<HTMLDivElement>(null)
  const loaded = useRef(false)
  useEffect(() => {
    const smooth = loaded.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    loaded.current = true
    if (section) tabsEl.current?.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'instant' })
  }, [section])
  const [events, setEvents] = useState<ActivityEvent[]>(() => (d ? deviceActivity(d) : []))
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  // The device card, watched so the pinned row can take over its job when it scrolls away.
  const [card, setCard] = useState<HTMLDivElement | null>(null)
  const pinned = useScrolledAway(card)

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
      {/* Pinned row. It starts as the breadcrumb; once the device card has
          scrolled away it also says which device this is. */}
      {/* Frosted like the app's top bar (Topbar.tsx), so the two pinned rows read as one family. */}
      <div className="sticky top-0 z-10 -mx-4 -mt-7 flex h-14 items-center justify-between gap-3 bg-background/80 px-4 backdrop-blur sm:-mx-6 sm:px-6">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
          <Link to={`/devices${tabOf(d) === 'macos' ? '?os=macos' : ''}`} className="shrink-0 text-primary hover:underline">Devices</Link>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          {/* Both sit in one grid cell and cross-fade, so nothing shifts when they swap. */}
          <span className="grid min-w-0 items-center *:col-start-1 *:row-start-1">
            <span aria-hidden={pinned} className={cn('flex items-center gap-1 transition-opacity duration-200 motion-reduce:transition-none', pinned && 'pointer-events-none opacity-0')}>
              <span className="text-muted-foreground">{tabOf(d) === 'ios' ? 'iOS' : 'macOS'}</span>
              <ChevronRight className="size-3.5 text-muted-foreground" />
              <span className="font-mono">{d.serial}</span>
            </span>
            <PinnedIdentity d={d} shown={pinned} />
          </span>
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" aria-label="Activity" onClick={() => setActivityOpen(true)}><History className="size-4" /><span className="hidden sm:inline">Activity</span><Count n={followUps} red /></Button>
          <Button variant="outline" size="sm" aria-label={offline ? 'Wake device' : 'Sync now'} onClick={() => send('sync', offline ? 'Send wake-up push' : 'Sync device')}><RefreshCw className="size-4" /><span className="hidden sm:inline">{offline ? 'Wake device' : 'Sync now'}</span></Button>
          <Button size="sm" disabled={!can('cast')} onClick={() => send('cast', 'Remote cast')}><MonitorPlay className="size-4" />Remote cast</Button>
        </div>
      </div>

      <div ref={setCard}><DeviceHero d={d} /></div>

      {/* `scroll-mt-14` is the pinned row's height: scrolled to, the tab bar lands exactly where it pins.
          The minimum height is the window minus the top bar (4rem) and the pinned row (3.5rem), so even a
          short tab can scroll that far. Without it the page jumps back to the device card on a short view. */}
      <Tabs ref={tabsEl} value={tab} onValueChange={setTab} className="min-h-[calc(100svh-7.5rem)] min-w-0 scroll-mt-14 gap-5">
        {/* The tab bar pins under the row above, so any tab is one click away from anywhere on the page. */}
        <div className="sticky top-14 z-10 -mx-4 bg-background/80 px-4 backdrop-blur sm:-mx-6 sm:px-6">
          <TabsList variant="line" className="w-full justify-start overflow-x-auto border-b pb-1">
            <TabsTrigger value="actions" className="flex-none">Actions</TabsTrigger>
            <TabsTrigger value="system" className="flex-none">System details</TabsTrigger>
            <TabsTrigger value="location" className="flex-none">Location</TabsTrigger>
            <TabsTrigger value="apps" className="flex-none">Apps<Count n={failedApps} red /></TabsTrigger>
            <TabsTrigger value="groups" className="flex-none">Groups & policies</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="actions">
          <ActionsTab d={d} events={events} run={run} onRetry={retry} onCancel={cancel} />
        </TabsContent>
        <TabsContent value="system">
          <SystemDetailsTab d={d} cats={cats} toast={toast} onRefresh={() => send('sync', 'Refresh system details')} />
        </TabsContent>
        <TabsContent value="location"><LocationTab d={d} onLocate={() => send('locate', 'Request location')} /></TabsContent>
        <TabsContent value="apps"><AppsTab d={d} onRetry={(name) => send('app', `Install app: ${name}`)} /></TabsContent>
        <TabsContent value="groups"><GroupsTab d={d} /></TabsContent>
      </Tabs>

      <HistorySheet open={activityOpen} onOpenChange={setActivityOpen} mode="activity" events={events} deviceId={d.id} offline={offline}
        onRetry={retry} onCancel={cancel} onPush={() => send('push', 'Send blank push')} />
      {node}
    </div>
  )
}
