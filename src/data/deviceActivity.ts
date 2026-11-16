// One event stream per device: commands an admin sent, check-ins, things that
// changed on the device, and location events from the agent. The same stream
// feeds three places — each action's own history, the device's Activity tab
// and the fleet-wide Activity page — so they always agree.
import { daysSinceCheckIn, inventory, isOffline, tabOf, INVENTORY_NOW, type InventoryDevice } from './deviceInventory'

export type EventKind = 'command' | 'change' | 'checkin' | 'location'
export type CommandState = 'Queued' | 'Sent' | 'Done' | 'Failed'

export interface ActivityEvent {
  id: string
  deviceId: string
  kind: EventKind
  title: string
  at: string
  by: string
  /** Commands only: which catalog action, and how far it got. */
  actionId?: string
  state?: CommandState
  /** Commands: queued → sent to Apple → acknowledged by the device. */
  steps?: { label: string; at?: string }[]
  detail?: string
  error?: string
  explain?: string
}

/** Pending longer than this is "stuck", not "waiting". */
export const STUCK_DAYS = 7
export const ageDays = (e: ActivityEvent, now = INVENTORY_NOW) => (now.getTime() - new Date(e.at).getTime()) / 86_400_000
export const isOpen = (e: ActivityEvent) => e.state === 'Queued' || e.state === 'Sent'
export const isStuck = (e: ActivityEvent) => isOpen(e) && ageDays(e) > STUCK_DAYS

export function relTime(iso: string, now = INVENTORY_NOW) {
  const m = (now.getTime() - new Date(iso).getTime()) / 60_000
  if (m < 1) return 'Just now'
  if (m < 60) return `${Math.floor(m)}m ago`
  if (m < 1440) return `${Math.floor(m / 60)}h ago`
  return `${Math.floor(m / 1440)}d ago`
}

function hash(s: string) {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

const admins = ['gautam.b', 'vedika.s', 'System']

/** Build a command event with its delivery steps filled in up to its state. */
export function commandEvent(d: InventoryDevice, id: string, actionId: string, title: string, at: Date, state: CommandState, by: string, extra: Partial<ActivityEvent> = {}): ActivityEvent {
  const t = (mins: number) => new Date(at.getTime() + mins * 60_000).toISOString()
  const steps = [
    { label: 'Queued', at: at.toISOString() },
    { label: 'Sent to device', at: state === 'Queued' ? undefined : t(1) },
    { label: state === 'Failed' ? 'Rejected by device' : 'Done on device', at: state === 'Done' || state === 'Failed' ? t(4) : undefined },
  ]
  return { id, deviceId: d.id, kind: 'command', title, at: at.toISOString(), by, actionId, state, steps, ...extra }
}

const cache = new Map<string, ActivityEvent[]>()

export function deviceActivity(d: InventoryDevice): ActivityEvent[] {
  if (cache.has(d.id)) return cache.get(d.id)!
  const h = hash(d.id)
  const bit = (i: number) => ((h >>> i) & 1) === 1
  const ios = tabOf(d) === 'ios'
  const silent = daysSinceCheckIn(d)
  // A per-device offset of up to ~half a day, so fleet rows don't all share one timestamp.
  const jitter = (h % 720) * 60_000
  const ago = (days: number) => new Date(INVENTORY_NOW.getTime() - days * 86_400_000 - jitter)
  const ev: ActivityEvent[] = []

  // Check-ins: the most recent one, plus a daily heartbeat for the last week the device was alive.
  for (let i = 0; i < 6; i++) ev.push({ id: `ci${i}`, deviceId: d.id, kind: 'checkin', title: i === 0 ? 'Checked in' : 'Inventory reported', at: ago(silent + i * 1.1).toISOString(), by: 'Device' })

  // Commands that finished.
  const done: [string, string, number][] = [
    ['sync', 'Sync device', 0.4], ['lock', 'Lock device', 2.2], ['rename', 'Rename device', 5],
    ['restart', 'Restart', 9], [ios ? 'timezone' : 'filevault', ios ? 'Set time zone' : 'Rotate FileVault key', 13], ['sync', 'Sync device', 18],
  ]
  done.forEach(([a, t, days], i) => {
    if (days < silent) return
    ev.push(commandEvent(d, `cd${i}`, a, t, ago(days), 'Done', admins[(h + i) % 3]))
  })

  // Open and failed commands.
  if (bit(7) || isOffline(d)) ev.push(commandEvent(d, 'cq1', 'sync', 'Sync device', ago(isOffline(d) ? silent - 0.5 : 29), isOffline(d) ? 'Queued' : 'Sent', 'System'))
  if (bit(8)) ev.push(commandEvent(d, 'cq2', 'bluetooth', 'Turn off Bluetooth', ago(0.08), 'Sent', 'gautam.b'))
  if (bit(9)) ev.push(commandEvent(d, 'cf1', 'profile', 'Install profile: Restrictions', ago(12), 'Failed', 'gautam.b',
    { error: 'Empty profile', explain: 'The profile has no payloads, so the device rejected it. Add a payload, then retry.' }))
  if (ios && !d.supervised) ev.push(commandEvent(d, 'cf2', 'lost-on', 'Enable Lost Mode', ago(20), 'Failed', 'vedika.s',
    { error: 'MDM error 12021', explain: 'Lost Mode needs a supervised device. Re-enroll it through Automated Device Enrollment.' }))
  if (d.lostMode) ev.push(commandEvent(d, 'cl', 'lost-on', 'Enable Lost Mode', ago(silent + 0.6), 'Done', 'vedika.s', { detail: 'Message: "This device belongs to Acme. Call IT on +91 20 1234 5678."' }))

  // Changes the device reported.
  if (!d.osCurrent) ev.push({ id: 'ch1', deviceId: d.id, kind: 'change', title: 'Update available', detail: `${d.platform} ${d.osVersion} → latest`, at: ago(silent + 3).toISOString(), by: 'Device' })
  else ev.push({ id: 'ch1', deviceId: d.id, kind: 'change', title: `Updated to ${d.platform} ${d.osVersion}`, at: ago(silent + 4).toISOString(), by: 'Device' })
  if (!d.encrypted) ev.push({ id: 'ch2', deviceId: d.id, kind: 'change', title: ios ? 'Data protection turned off' : 'FileVault turned off', at: ago(silent + 6).toISOString(), by: 'Device' })
  if (d.agentVersion) ev.push({ id: 'ch3', deviceId: d.id, kind: 'change', title: `Agent updated to ${d.agentVersion}`, at: ago(silent + 8).toISOString(), by: 'Device' })

  // Location events from the agent.
  if (d.agentVersion && d.locationPermission !== 'Denied') {
    const office = d.buildingName === 'Remote' ? 'Pune HQ' : d.buildingName
    ev.push({ id: 'lo1', deviceId: d.id, kind: 'location', title: `Arrived at ${office}`, at: ago(silent + 0.35).toISOString(), by: 'Agent' })
    ev.push({ id: 'lo2', deviceId: d.id, kind: 'location', title: `Left ${office}`, at: ago(silent + 0.9).toISOString(), by: 'Agent' })
  }

  const sorted = ev.sort((a, b) => b.at.localeCompare(a.at))
  cache.set(d.id, sorted)
  return sorted
}

/** Every command across the fleet, newest first — for the dedicated Activity page. */
export function fleetCommands(): { event: ActivityEvent; device: InventoryDevice }[] {
  return inventory
    .flatMap((device) => deviceActivity(device).filter((e) => e.kind === 'command').map((event) => ({ event, device })))
    .sort((a, b) => b.event.at.localeCompare(a.event.at))
}
