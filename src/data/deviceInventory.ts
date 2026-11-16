// Inventory view of the org directory's devices — the same fields the live
// product's Devices page shows for iOS and macOS, plus what an MDM learns from
// check-ins. Same device ids as app scoping (`directory.ts`). Deterministic.
import { devices, users, departments, buildings, deviceGroups, type DirDevice, type DirUser } from './directory'

/** The live product's two Apple tabs. iPads list under iOS, as they do there. */
export type PlatformTab = 'ios' | 'macos'
export const tabOf = (d: DirDevice): PlatformTab => (d.platform === 'macOS' ? 'macos' : 'ios')

export type Ownership = 'Company owned' | 'BYOD'
export type EnrollmentType = 'ABM' | 'QR Code' | 'User enrollment'
export type UninstallPermission = 'Allowed' | 'Needs approval' | 'Blocked'
export type DeviceHealth = 'Compliant' | 'At risk' | 'Not compliant' | 'Not checked in'

export interface InventoryDevice extends DirDevice {
  owner?: DirUser
  departmentName: string
  buildingName: string
  /** Apple's identifier, e.g. iPhone17,3 — what the live list shows in "Model". */
  modelId: string
  osVersion: string
  /** True when osVersion is the latest release for the platform. */
  osCurrent: boolean
  supervised: boolean
  encrypted: boolean
  passcode: boolean
  storageUsedGb: number
  storageTotalGb: number
  batteryLevel: number | null
  /** ISO timestamp of the last MDM check-in. */
  lastCheckIn: string
  enrolledAt: string
  ownership: Ownership
  enrollmentType: EnrollmentType
  /** Every group the device sits in; the first is the primary one. */
  groups: string[]
  profileName: string | null
  /** iOS/iPadOS only. */
  lostMode: boolean
  /** The miniOrange agent (an app on iPhone/iPad, a daemon on Mac), if installed. */
  agentVersion: string | null
  /** What the user allowed the agent to do with location. */
  locationPermission: 'Always' | 'While using' | 'Denied' | null
  /** macOS only. */
  uninstallPermission: UninstallPermission | null
}

/** Prototype "now", so relative times don't drift between sessions. */
export const INVENTORY_NOW = new Date('2026-11-16T10:00:00Z')

const latest: Record<DirDevice['platform'], string> = { iOS: '27.2', iPadOS: '27.2', macOS: '26.6.2' }
const older: Record<DirDevice['platform'], string[]> = {
  iOS: ['26.6', '26.5.1', '18.7'],
  iPadOS: ['26.6', '18.7'],
  macOS: ['26.5.1', '15.7.9'],
}
const modelIds: Record<string, string> = {
  'iPhone 15': 'iPhone15,4', 'iPhone 15 Pro': 'iPhone16,1', 'iPhone 14': 'iPhone14,7', 'iPhone 16': 'iPhone17,3',
  'MacBook Pro 14"': 'Mac15,3', 'MacBook Air 13"': 'Mac16,12', 'MacBook Pro 16"': 'MacBookPro17,1',
  'iPad Air': 'iPad13,16', 'iPad (10th gen)': 'iPad13,18',
}

let seed = 42
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const hoursAgo = (h: number) => new Date(INVENTORY_NOW.getTime() - h * 3_600_000).toISOString()

export const inventory: InventoryDevice[] = devices.map((d) => {
  const mac = d.platform === 'macOS'
  const current = rnd() > 0.3
  const total = mac ? [256, 512, 1024][Math.floor(rnd() * 3)] : [128, 256][Math.floor(rnd() * 2)]
  // Most devices checked in within the day; a long tail has gone quiet for weeks.
  const r = rnd()
  const lastH = r < 0.75 ? rnd() * 20 : r < 0.92 ? 24 + rnd() * 24 * 6 : 24 * 7 + rnd() * 24 * 40
  const byod = !!d.userId && rnd() < 0.12
  const groups = deviceGroups.filter((g) => g.members.includes(d.id)).map((g) => g.name)
  return {
    ...d,
    owner: users.find((u) => u.id === d.userId),
    departmentName: departments.find((x) => x.id === d.department)?.name ?? '—',
    buildingName: buildings.find((x) => x.id === d.building)?.name ?? '—',
    modelId: modelIds[d.model] ?? d.model,
    osVersion: current ? latest[d.platform] : older[d.platform][Math.floor(rnd() * older[d.platform].length)],
    osCurrent: current,
    supervised: !byod && (mac ? rnd() > 0.3 : rnd() > 0.08),
    encrypted: rnd() > 0.08,
    passcode: mac || rnd() > 0.06,
    storageTotalGb: total,
    storageUsedGb: Math.round(total * (0.2 + rnd() * 0.78)),
    batteryLevel: mac ? null : Math.round(8 + rnd() * 92),
    lastCheckIn: hoursAgo(lastH),
    enrolledAt: hoursAgo(24 * (30 + rnd() * 600)),
    ownership: byod ? 'BYOD' : 'Company owned',
    enrollmentType: byod ? 'User enrollment' : !d.userId || rnd() > 0.25 ? 'ABM' : 'QR Code',
    groups: groups.length ? groups : [mac ? 'Default-macOS' : 'Default-iOS'],
    profileName: rnd() > 0.35 ? (d.userId ? `${departments.find((x) => x.id === d.department)?.name} baseline` : 'Kiosk lockdown') : null,
    lostMode: !mac && rnd() < 0.03,
    agentVersion: rnd() > 0.2 ? `4.${Math.floor(rnd() * 3) + 6}.${Math.floor(rnd() * 9)}` : null,
    locationPermission: (['Always', 'Always', 'Always', 'While using', 'Denied'] as const)[Math.floor(rnd() * 5)],
    uninstallPermission: mac ? (['Blocked', 'Blocked', 'Needs approval', 'Allowed'] as const)[Math.floor(rnd() * 4)] : null,
  }
})

export const daysSinceCheckIn = (d: InventoryDevice) =>
  (INVENTORY_NOW.getTime() - new Date(d.lastCheckIn).getTime()) / 86_400_000

/** Silent for a week: everything we show is the last known state. */
export const isOffline = (d: InventoryDevice) => daysSinceCheckIn(d) > 7

/**
 * One health state per device, shown as dot + label in the list and counted
 * in the summary cards. Order matters: the first rule that matches wins.
 */
export function deviceHealth(d: InventoryDevice): DeviceHealth {
  // Stale data can't vouch for a device, so silence outranks everything else.
  if (isOffline(d)) return 'Not checked in'
  if (!d.encrypted || !d.passcode || d.lostMode) return 'Not compliant'
  if (!d.osCurrent || d.storageUsedGb / d.storageTotalGb >= 0.9 || (d.ownership === 'Company owned' && !d.supervised)) return 'At risk'
  return 'Compliant'
}

export const healthOrder: DeviceHealth[] = ['Not compliant', 'At risk', 'Not checked in', 'Compliant']

export const HEALTH_META: Record<DeviceHealth, { dot: string; badge: string }> = {
  Compliant: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'At risk': { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  'Not compliant': { dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 border-red-200' },
  'Not checked in': { dot: 'bg-slate-400', badge: 'bg-slate-50 text-slate-700 border-slate-200' },
}

/** "3h ago", "2d ago" — relative to the prototype's fixed now. */
export function checkInLabel(d: InventoryDevice) {
  const days = daysSinceCheckIn(d)
  if (days < 1 / 24) return 'Just now'
  if (days < 1) return `${Math.floor(days * 24)}h ago`
  return `${Math.floor(days)}d ago`
}
