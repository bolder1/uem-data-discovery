// Dummy org directory for scoping. An app is scoped to devices, device groups,
// users and user groups — nothing else. Departments and buildings only exist to
// make the generated groups realistic. Deterministic, so counts stay stable.

export type Platform = 'iOS' | 'iPadOS' | 'macOS'
export type ScopeKind = 'Device' | 'DeviceGroup' | 'User' | 'UserGroup'

export interface ScopeItem {
  kind: ScopeKind
  id: string
  name: string
}

export interface DirUser {
  id: string
  name: string
  email: string
  department: string
  building: string
  title: string
}

export interface DirDevice {
  id: string
  name: string
  model: string
  serial: string
  platform: Platform
  userId: string | null
  department: string
  building: string
}

export interface DeviceGroup {
  id: string
  name: string
  type: 'Smart' | 'Static'
  criteria: string
  members: string[]
}

export interface UserGroup {
  id: string
  name: string
  members: string[]
}

export const kindLabel: Record<ScopeKind, string> = {
  Device: 'Devices',
  DeviceGroup: 'Device groups',
  User: 'Users',
  UserGroup: 'User groups',
}
export const kindSingular: Record<ScopeKind, string> = {
  Device: 'Device',
  DeviceGroup: 'Device group',
  User: 'User',
  UserGroup: 'User group',
}

/** Picker tab order, used for both targets and exclusions. */
export const scopeKinds: ScopeKind[] = ['Device', 'DeviceGroup', 'User', 'UserGroup']

export const departments = ['Engineering', 'Sales', 'Finance', 'HR', 'Operations', 'Support'].map((n) => ({ id: `dept-${n.toLowerCase()}`, name: n }))
export const buildings = ['Pune HQ', 'Mumbai Office', 'Bangalore Office', 'Remote'].map((n) => ({ id: `bld-${n.split(' ')[0].toLowerCase()}`, name: n }))

const first = ['Aarav', 'Priya', 'Rohit', 'Sneha', 'Vikram', 'Ananya', 'Karan', 'Divya', 'Abhijeet', 'Surajit', 'Gautam', 'Neha', 'Arjun', 'Isha', 'Rahul', 'Meera', 'Kabir', 'Tara', 'Dev', 'Riya']
const last = ['Sharma', 'Patel', 'Mehta', 'Iyer', 'Nair', 'Reddy', 'Malhotra', 'Joshi', 'Dutta', 'Bose']
const titles = ['Engineer', 'Account Executive', 'Analyst', 'HR Partner', 'Ops Lead', 'Support Specialist']

// ponytail: tiny deterministic PRNG so the dummy org is identical on every load.
let seed = 7
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

// Big enough to stress the scope pickers: 180 users, ~400 devices.
export const users: DirUser[] = Array.from({ length: 180 }, (_, i) => {
  // The extra offset every 20 users keeps every name (and email) unique, up to 200.
  const name = `${first[i % first.length]} ${last[(i * 7 + Math.floor(i / first.length)) % last.length]}`
  const dept = departments[i % departments.length]
  return {
    id: `u-${i + 1}`,
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@acme.com`,
    department: dept.id,
    building: buildings[i % 7 === 0 ? 3 : i % 3].id,
    title: i < 6 ? `Head of ${dept.name}` : titles[i % titles.length],
  }
})

const managers = users.slice(0, 6).map((u) => u.id)
const contractors = users.filter((_, i) => i % 9 === 4).map((u) => u.id)
export const userGroups: UserGroup[] = [
  { id: 'ug-all', name: 'All staff', members: users.map((u) => u.id) },
  { id: 'ug-leaders', name: 'Leadership', members: managers },
  { id: 'ug-contractors', name: 'Contractors', members: contractors },
  { id: 'ug-field', name: 'Field sales', members: users.filter((u) => u.department === 'dept-sales' && u.building !== 'bld-pune').map((u) => u.id) },
  { id: 'ug-oncall', name: 'On-call engineers', members: users.filter((u, i) => u.department === 'dept-engineering' && i % 2 === 0).map((u) => u.id) },
]

const serial = () => Array.from({ length: 10 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789'[Math.floor(rnd() * 34)]).join('')
const devOf = (u: DirUser, platform: Platform, model: string, n: number): DirDevice => ({
  id: `d-${platform}-${u.id}-${n}`,
  name: `${u.name}'s ${model.split(' ')[0] === 'MacBook' ? 'MacBook' : model.split(' ')[0]}`,
  model,
  serial: serial(),
  platform,
  userId: u.id,
  department: u.department,
  building: u.building,
})

export const devices: DirDevice[] = [
  ...users.map((u, i) => devOf(u, 'iOS', ['iPhone 15', 'iPhone 15 Pro', 'iPhone 14', 'iPhone 16'][i % 4], 1)),
  ...users.filter((u) => u.department !== 'dept-support' || rnd() > 0.5).map((u, i) => devOf(u, 'macOS', ['MacBook Pro 14"', 'MacBook Air 13"', 'MacBook Pro 16"'][i % 3], 2)),
  ...users.filter((_, i) => i % 3 === 0).map((u) => devOf(u, 'iPadOS', 'iPad Air', 3)),
  ...Array.from({ length: 30 }, (_, i): DirDevice => ({
    id: `d-kiosk-${i + 1}`,
    name: `Store kiosk ${String(i + 1).padStart(2, '0')}`,
    model: 'iPad (10th gen)',
    serial: serial(),
    platform: 'iPadOS',
    userId: null,
    department: 'dept-operations',
    building: i < 15 ? 'bld-mumbai' : 'bld-bangalore',
  })),
]

const userOf = (id: string | null) => users.find((u) => u.id === id)
const ids = (f: (d: DirDevice) => boolean) => devices.filter(f).map((d) => d.id)
export const deviceGroups: DeviceGroup[] = [
  { id: 'dg-eng-macs', name: 'Engineering Macs', type: 'Smart', criteria: 'Department is Engineering and OS is macOS', members: ids((d) => d.department === 'dept-engineering' && d.platform === 'macOS') },
  { id: 'dg-sales-iphones', name: 'Sales iPhones', type: 'Smart', criteria: 'Department is Sales and OS is iOS', members: ids((d) => d.department === 'dept-sales' && d.platform === 'iOS') },
  { id: 'dg-kiosks', name: 'Shared kiosks', type: 'Smart', criteria: 'No assigned user and model is iPad', members: ids((d) => !d.userId) },
  { id: 'dg-remote', name: 'Remote workers', type: 'Smart', criteria: 'Building is Remote', members: ids((d) => d.building === 'bld-remote') },
  { id: 'dg-pilot', name: 'Pilot devices', type: 'Static', criteria: 'Picked by hand', members: devices.filter((_, i) => i % 11 === 0).map((d) => d.id) },
  { id: 'dg-leaders', name: 'Leadership devices', type: 'Smart', criteria: 'User is in Leadership', members: ids((d) => managers.includes(d.userId ?? '')) },
]

/** Everything you can pick for a scope, with the one detail that tells options apart. */
export function catalog(kind: ScopeKind): { id: string; name: string; sub?: string }[] {
  switch (kind) {
    case 'Device': return devices.map((d) => ({ id: d.id, name: d.name, sub: d.model }))
    case 'DeviceGroup': return deviceGroups.map((g) => ({ id: g.id, name: g.name }))
    case 'User': return users.map((u) => ({ id: u.id, name: u.name, sub: u.email }))
    case 'UserGroup': return userGroups.map((g) => ({ id: g.id, name: g.name, sub: `${g.members.length} users` }))
  }
}

export function matches(item: ScopeItem, d: DirDevice): boolean {
  switch (item.kind) {
    case 'Device': return d.id === item.id
    case 'DeviceGroup': return !!deviceGroups.find((g) => g.id === item.id)?.members.includes(d.id)
    case 'User': return d.userId === item.id
    case 'UserGroup': return !!userGroups.find((g) => g.id === item.id)?.members.includes(d.userId ?? '')
  }
}

/** Jamf-style targets: devices (all or specific) and users (all or specific), then exclusions. */
export interface ScopeInput {
  platform: Platform
  allDevices: boolean
  /** Every device that has an assigned user. */
  allUsers: boolean
  targets: ScopeItem[]
  exclusions: ScopeItem[]
}

export const isUserKind = (k: ScopeKind) => k === 'User' || k === 'UserGroup'

export interface ResolvedDevice extends DirDevice {
  owner?: DirUser
  /** Why it's in scope, or why it was dropped. */
  via: string
  excludedBy?: string
}

/**
 * Resolve a scope to concrete devices: targets − exclusions (exclusions always win).
 * Also returns what was removed and why, for the preview.
 */
export function resolveScope(s: ScopeInput) {
  const pool = devices.filter((d) => d.platform === s.platform)
  const included: ResolvedDevice[] = []
  const removed: ResolvedDevice[] = []
  for (const d of pool) {
    // A device gets the app if any target reaches it: all devices, a device or group, all users, or a user or group.
    const hit = s.targets.find((t) => matches(t, d))
    const via = s.allDevices ? `All ${s.platform} devices` : hit ? `${kindSingular[hit.kind]}: ${hit.name}` : s.allUsers && d.userId ? 'All users' : null
    if (!via) continue
    const r: ResolvedDevice = { ...d, owner: userOf(d.userId), via }
    const ex = s.exclusions.find((t) => matches(t, d))
    if (ex) { removed.push({ ...r, excludedBy: `${kindSingular[ex.kind]}: ${ex.name}` }); continue }
    included.push(r)
  }
  return { included, removed, total: pool.length }
}

/** How many of this platform's devices an item covers — shown next to each option. */
export function coverage(item: ScopeItem, platform: Platform) {
  return devices.filter((d) => d.platform === platform && matches(item, d)).length
}

export const platformTotal = (p: Platform) => devices.filter((d) => d.platform === p).length
/** This platform's devices that have an assigned user (what "All users" reaches). */
export const userDeviceTotal = (p: Platform) => devices.filter((d) => d.platform === p && d.userId).length
