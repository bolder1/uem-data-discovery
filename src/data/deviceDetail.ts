// What the device page shows beyond the list row. Sections mirror the live
// product's System Details per platform, built from the inventory record so
// the list, the header and the drill-in never disagree (the live product says
// "Lost Mode Enabled" in the list and "MDM Lost Mode: Disabled" in details).
import { Activity, Cpu, Info, KeyRound, Lock, Shield, ShieldCheck, Signal, type LucideIcon } from 'lucide-react'
import { daysSinceCheckIn, isOffline, tabOf, type InventoryDevice } from './deviceInventory'
import { STUCK_DAYS, isStuck, type ActivityEvent } from './deviceActivity'

/** good = expected, off = neutral, warn = needs attention. */
export type Tone = 'good' | 'off' | 'warn'

export interface DetailRow {
  label: string
  value: string
  tone?: Tone
  /** The device didn't report it. Folded into one line instead of a wall of "Unavailable". */
  missing?: boolean
  /** Masked until revealed; revealing is audit-logged. */
  secret?: boolean
  mono?: boolean
}
export interface DetailSection { title: string; rows: DetailRow[] }
export interface DetailCategory { id: string; title: string; description: string; icon: LucideIcon; sections: DetailSection[] }

export const attention = (rows: DetailRow[]) => rows.filter((r) => r.tone === 'warn').length
export const categoryAttention = (c: DetailCategory) => c.sections.reduce((n, s) => n + attention(s.rows), 0)

// Stable per-device coin flips, so a device looks the same on every visit.
function flips(id: string) {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return (i: number) => ((h >>> i) & 1) === 1
}

const yesNo = (v: boolean, bad: Tone = 'warn'): Pick<DetailRow, 'value' | 'tone'> => ({ value: v ? 'Yes' : 'No', tone: v ? 'good' : bad })
const onOff = (v: boolean, bad: Tone = 'warn'): Pick<DetailRow, 'value' | 'tone'> => ({ value: v ? 'On' : 'Off', tone: v ? 'good' : bad })
const na = (label: string): DetailRow => ({ label, value: 'Not reported', missing: true })
const mac = (serial: string, salt: number) => Array.from({ length: 6 }, (_, i) => ((serial.charCodeAt(i % serial.length) * (i + salt)) % 256).toString(16).padStart(2, '0')).join(':')
const key = (serial: string) => Array.from({ length: 6 }, (_, i) => (serial + serial).slice(i, i + 4).toUpperCase()).join('-')
const imei = (serial: string, n: number) => `35 ${String(356591 + n).padStart(6, '0')} ${String((serial.charCodeAt(0) * 7919 + n) % 1_000_000).padStart(6, '0')} ${n}`

export function deviceHeader(d: InventoryDevice) {
  return {
    status: isOffline(d) ? 'Inactive' : 'Active',
    deviceGroup: d.groups[0],
    profile: d.profileName ?? 'None',
    activityCount: 1 + (d.serial.charCodeAt(0) % 6),
  }
}

export function systemDetails(d: InventoryDevice): DetailCategory[] {
  const f = flips(d.id)
  const ios = tabOf(d) === 'ios'

  const info: DetailCategory = { id: 'info', title: 'Device information', description: 'Identity, model and operating system', icon: Info, sections: [
    { title: 'Identity', rows: [
      { label: 'Device name', value: d.name },
      { label: 'Serial number', value: d.serial, mono: true },
      { label: 'UDID', value: `0000${d.serial.charCodeAt(0)}-00${d.serial}`, mono: true },
      ...(ios ? [] : [{ label: 'Local host name', value: d.name.replace(/[^A-Za-z0-9]+/g, '-'), mono: true }]),
    ] },
    { title: 'Model', rows: [
      { label: 'Model name', value: d.model },
      { label: 'Model identifier', value: d.modelId, mono: true },
      f(2) ? { label: 'Model number', value: `M${d.serial.slice(0, 4)}HN/A`, mono: true } : na('Model number'),
    ] },
    { title: 'Operating system', rows: [
      { label: 'OS version', value: `${d.platform} ${d.osVersion}`, tone: d.osCurrent ? 'good' : 'warn' },
      { label: 'OS build', value: d.osCurrent ? '24B119' : '23G71', mono: true },
      na('Rapid Security Response'),
    ] },
  ] }

  const software: DetailCategory = { id: 'software', title: 'Software and settings', description: 'Setup, management and system settings', icon: Activity, sections: [
    { title: 'Setup and management', rows: [
      { label: 'Declarative management', value: f(3) ? 'On' : 'Off' },
      { label: 'MDM profile expires', value: 'Nov 9, 2036' },
      { label: 'Time zone', value: ios ? 'Asia/Kolkata' : 'Not reported', missing: !ios },
      ...(ios ? [
        { label: 'App analytics', value: f(4) ? 'On' : 'Off' },
        { label: 'Diagnostic submission', value: f(5) ? 'On' : 'Off' },
        { label: 'Shared iPad', value: d.platform === 'iPadOS' && !d.userId ? 'Yes' : 'No' },
      ] : []),
    ] },
  ] }

  const pct = d.storageUsedGb / d.storageTotalGb
  const hardware: DetailCategory = { id: 'hardware', title: 'Hardware', description: ios ? 'Storage, battery, cellular and network hardware' : 'Processor, storage and network hardware', icon: Cpu, sections: [
    ...(ios ? [] : [{ title: 'Processor and memory', rows: [
      { label: 'Chip', value: d.model.includes('16"') ? 'Intel Core i9' : 'Apple M3' },
      { label: 'Memory', value: '16 GB' },
    ] }]),
    { title: 'Storage and power', rows: [
      { label: 'Storage', value: `${d.storageUsedGb} of ${d.storageTotalGb} GB used`, tone: pct >= 0.9 ? 'warn' : undefined },
      ...(d.batteryLevel != null ? [{ label: 'Battery', value: `${d.batteryLevel}%`, tone: d.batteryLevel < 20 ? 'warn' as const : undefined }] : []),
    ] },
    ...(ios ? [{ title: 'Cellular', rows: [
      { label: 'IMEI', value: imei(d.serial, 0), mono: true },
      na('MEID'),
      f(6) ? { label: 'ICCID', value: `8991${d.serial.slice(0, 8)}`, mono: true } : na('ICCID'),
      { label: 'Modem firmware', value: '3.02.03', mono: true },
    ] }] : []),
    { title: 'Network hardware', rows: [
      { label: 'Wi-Fi MAC', value: mac(d.serial, 1), mono: true },
      { label: 'Bluetooth MAC', value: mac(d.serial, 2), mono: true },
      ...(ios ? [] : [na('Ethernet MAC')]),
    ] },
  ] }

  const security: DetailCategory = ios
    ? { id: 'security', title: 'Security and protection', description: 'Passcode, encryption and management trust', icon: ShieldCheck, sections: [
        { title: 'Passcode and encryption', rows: [
          { label: 'Passcode', value: d.passcode ? 'Set' : 'Not set', tone: d.passcode ? 'good' : 'warn' },
          { label: 'Passcode compliance', value: d.passcode ? 'Compliant' : 'Not compliant', tone: d.passcode ? 'good' : 'warn' },
          { label: 'Data protection', ...onOff(d.encrypted) },
          { label: 'Hardware encryption', value: 'Block and file level', tone: 'good' },
        ] },
        { title: 'Management', rows: [
          { label: 'Supervised', ...yesNo(d.supervised, d.ownership === 'BYOD' ? 'off' : 'warn') },
          { label: 'Bootstrap token escrowed', ...yesNo(f(7), 'off') },
          { label: 'Jailbreak detected', value: 'No', tone: 'good' },
        ] },
        { title: 'Device status', rows: [
          { label: 'Lost Mode', value: d.lostMode ? 'On' : 'Off', tone: d.lostMode ? 'warn' : 'off' },
          { label: 'Find My', value: f(8) ? 'On' : 'Off', tone: 'off' },
          { label: 'Do Not Disturb', value: f(9) ? 'On' : 'Off', tone: 'off' },
          { label: 'iCloud backup', value: f(10) ? 'On' : 'Off', tone: 'off' },
        ] },
      ] }
    : { id: 'security', title: 'Security and protection', description: 'System protection, startup security and management trust', icon: ShieldCheck, sections: [
        { title: 'System protection', rows: [
          { label: 'System Integrity Protection', ...onOff(true) },
          { label: 'Firewall', ...onOff(f(1)) },
          { label: 'Firewall stealth mode', ...onOff(f(2), 'off') },
          { label: 'Remote desktop', value: f(4) ? 'On' : 'Off', tone: 'off' },
        ] },
        { title: 'Startup security', rows: [
          { label: 'Secure boot level', value: 'Full', tone: 'good' },
          { label: 'External boot', value: f(11) ? 'Allowed' : 'Disallowed', tone: f(11) ? 'warn' : 'good' },
          { label: 'Recovery Lock', ...onOff(f(5), 'off') },
        ] },
        { title: 'Management', rows: [
          { label: 'Supervised', ...yesNo(d.supervised, d.ownership === 'BYOD' ? 'off' : 'warn') },
          { label: 'User-approved MDM', ...yesNo(true) },
          { label: 'Automated Device Enrollment', ...yesNo(d.enrollmentType === 'ABM', 'off') },
          { label: 'Bootstrap token escrowed', ...yesNo(f(6)) },
        ] },
      ] }

  const encryption: DetailCategory[] = ios ? [] : [{ id: 'encryption', title: 'Disk encryption', description: 'FileVault status and recovery key', icon: Lock, sections: [
    { title: 'FileVault', rows: [
      { label: 'FileVault', ...onOff(d.encrypted) },
      { label: 'Escrow status', value: d.encrypted ? 'Escrowed by MDM' : 'Not escrowed', tone: d.encrypted ? 'good' : 'warn' },
      ...(d.encrypted ? [{ label: 'Recovery key', value: key(d.serial), secret: true, mono: true }, { label: 'Last rotated', value: 'Oct 8, 2026, 4:29 PM' }] : []),
    ] },
  ] }]

  const activation: DetailCategory = { id: 'activation', title: 'Activation Lock', description: 'Status and bypass codes', icon: KeyRound, sections: [
    { title: 'Activation Lock', rows: [
      { label: 'Activation Lock', value: d.supervised && f(12) ? 'On (MDM)' : 'Off', tone: 'off' },
      { label: 'Bypass code', value: d.supervised && f(12) ? key(d.serial.split('').reverse().join('')) : 'Not available', secret: d.supervised && f(12), mono: true, missing: !(d.supervised && f(12)) },
    ] },
  ] }

  const network: DetailCategory[] = ios ? [{ id: 'network', title: 'Network and connectivity', description: 'Carrier, SIM and connectivity', icon: Signal, sections: [
    { title: 'Connectivity', rows: [
      { label: 'Personal Hotspot', value: 'Off', tone: 'off' },
      { label: 'Data roaming', value: 'Off', tone: 'off' },
      { label: 'Tethered', value: f(13) ? 'Yes' : 'No' },
    ] },
    { title: 'SIM 1', rows: [
      { label: 'Carrier', value: f(14) ? 'Jio' : 'Airtel' },
      { label: 'IMEI', value: imei(d.serial, 0), mono: true },
      { label: 'Roaming', value: 'No' },
    ] },
  ] }] : []

  const agent: DetailCategory[] = ios ? [] : [{ id: 'agent', title: 'miniOrange agent', description: 'Agent version and tamper protection', icon: Shield, sections: [
    { title: 'Agent', rows: [
      { label: 'Agent', value: d.agentVersion ? `Installed · ${d.agentVersion}` : 'Not installed', tone: d.agentVersion ? 'good' : 'warn' },
      { label: 'Uninstall permission', value: d.uninstallPermission ?? '—', tone: d.uninstallPermission === 'Allowed' ? 'warn' : 'good' },
    ] },
  ] }]

  return [info, software, hardware, security, ...encryption, activation, ...network, ...agent]
}

/* ── groups, policies, apps, location ───────────────────── */

export function groupsAndPolicies(d: InventoryDevice) {
  // Lengths vary on purpose: one name, a handful, and enough that the row has to fold.
  const policies: Record<string, string[]> = {
    'Engineering Macs': ['FileVault required', 'Firewall on', 'Dev tools allowed', 'Gatekeeper on', 'Screen lock 5 min'],
    'Sales iPhones': ['Passcode 6-digit', 'Managed Open In', 'CRM app required', 'Per-app VPN'],
    'Shared kiosks': ['Single App Mode', 'Kiosk restrictions'],
    'Remote workers': ['VPN always on', 'Wi-Fi: Corp-Secure', 'Screen lock 2 min', 'AirDrop off', 'iCloud backup off', 'USB accessories locked', 'OS updates within 7 days'],
    'Pilot devices': ['Beta OS updates'],
    'Leadership devices': ['Lost Mode contact: IT desk', 'Passcode 8-digit'],
  }
  return d.groups.map((g) => ({ name: g, smart: !g.startsWith('Default') && g !== 'Pilot devices', policies: policies[g] ?? [] }))
}

export interface DeviceApp { name: string; version: string; managed: boolean; status: 'Installed' | 'Pending' | 'Failed'; source: 'App Store' | 'In-house' | 'System'; sizeMb: number }

export function deviceApps(d: InventoryDevice): DeviceApp[] {
  const f = flips(d.id)
  const managed: DeviceApp[] = tabOf(d) === 'ios'
    ? [
        { name: 'Okta Verify', version: '9.71.1', managed: true, status: 'Installed', source: 'App Store', sizeMb: 88 },
        { name: 'Gmail', version: '6.0.261005', managed: true, status: 'Installed', source: 'App Store', sizeMb: 673 },
        { name: 'Microsoft Teams', version: '7.4.1', managed: true, status: f(1) ? 'Installed' : 'Pending', source: 'App Store', sizeMb: 312 },
        { name: 'miniOrange Self Service', version: '12.2.0', managed: true, status: 'Installed', source: 'In-house', sizeMb: 29 },
        { name: 'Slack', version: '26.10', managed: true, status: f(2) ? 'Installed' : 'Failed', source: 'App Store', sizeMb: 201 },
      ]
    : [
        { name: 'Google Chrome', version: '131.0', managed: true, status: 'Installed', source: 'App Store', sizeMb: 512 },
        { name: 'Zoom', version: '6.3.1', managed: true, status: 'Installed', source: 'In-house', sizeMb: 145 },
        { name: 'Microsoft Teams', version: '24.2', managed: true, status: f(1) ? 'Installed' : 'Pending', source: 'In-house', sizeMb: 420 },
        { name: 'miniOrange Agent', version: d.agentVersion ?? '—', managed: true, status: d.agentVersion ? 'Installed' : 'Failed', source: 'In-house', sizeMb: 38 },
        { name: 'Docker Desktop', version: '4.36', managed: false, status: 'Installed', source: 'In-house', sizeMb: 1900 },
      ]
  const system: DeviceApp[] = (tabOf(d) === 'ios' ? ['Safari', 'Mail', 'Calendar', 'Camera', 'Photos', 'Maps', 'Files', 'Notes'] : ['Safari', 'Mail', 'Calendar', 'Notes', 'Preview', 'Terminal'])
    .map((name, i) => ({ name, version: '26.0', managed: false, status: 'Installed' as const, source: 'System' as const, sizeMb: 4 + i * 7 }))
  return [...managed, ...system]
}

/* ── issues: the verdict at the top of the page ──────────── */

export interface Issue {
  id: string
  title: string
  detail: string
  severity: 'high' | 'medium'
  /** The action id from deviceActions that resolves it, or 'activity' to review the queue. */
  fix?: { label: string; action: string }
}

/** Everything wrong with this device, worst first — one list, so nothing hides in a sub-tab. */
export function deviceIssues(d: InventoryDevice, cats: DetailCategory[], events: ActivityEvent[]): Issue[] {
  const out: Issue[] = []
  const days = Math.floor(daysSinceCheckIn(d))
  const ios = tabOf(d) === 'ios'
  if (d.lostMode) out.push({ id: 'lost', severity: 'high', title: 'In Lost Mode', detail: 'The device is locked and showing a contact message. Location is on the Location tab.', fix: { label: 'Disable Lost Mode', action: 'lost-off' } })
  if (isOffline(d)) out.push({ id: 'offline', severity: 'high', title: `Silent for ${days} days`, detail: 'Everything on this page is the last known state. Commands wait until it checks in.', fix: { label: 'Wake device', action: 'sync' } })
  if (!d.encrypted) out.push({ id: 'enc', severity: 'high', title: ios ? 'Data protection is off' : 'FileVault is off', detail: ios ? 'Data protection turns on with a passcode.' : 'Data on the disk is readable if the Mac is lost.' })
  if (!d.passcode) out.push({ id: 'pass', severity: 'high', title: 'No passcode set', detail: 'Anyone holding the device can open it.', fix: { label: 'Lock device', action: 'lock' } })
  const failed = events.filter((e) => e.state === 'Failed')
  if (failed.length) out.push({ id: 'failed', severity: 'medium', title: `${failed.length} ${failed.length === 1 ? 'command' : 'commands'} failed`, detail: failed.map((e) => e.title).join(', '), fix: { label: 'Review', action: 'activity' } })
  const stuck = events.filter(isStuck)
  if (stuck.length && !isOffline(d)) out.push({ id: 'stuck', severity: 'medium', title: `${stuck.length} ${stuck.length === 1 ? 'command' : 'commands'} stuck`, detail: `Waiting over ${STUCK_DAYS} days while the device checks in normally.`, fix: { label: 'Review', action: 'activity' } })
  if (!d.osCurrent) out.push({ id: 'os', severity: 'medium', title: `${d.platform} ${d.osVersion} is out of date`, detail: 'Security fixes in the latest release are missing.' })
  if (d.storageUsedGb / d.storageTotalGb >= 0.9) out.push({ id: 'disk', severity: 'medium', title: 'Storage almost full', detail: `${d.storageTotalGb - d.storageUsedGb} GB free. App and OS updates may fail.` })
  if (!d.agentVersion) out.push({ id: 'agent', severity: 'medium', title: 'miniOrange agent not installed', detail: ios ? 'Location needs the agent app.' : 'Location, DLP and remote cast need the agent.' })

  // Any other flagged row, so the verdict and the drill-in always agree.
  const coveredBy: Record<string, string[]> = {
    lost: ['Lost Mode'], enc: ['Data protection', 'FileVault', 'Escrow status'], pass: ['Passcode', 'Passcode compliance'],
    os: ['OS version'], disk: ['Storage'], agent: ['Agent'],
  }
  const covered = new Set(out.flatMap((i) => coveredBy[i.id] ?? []))
  for (const c of cats) for (const s of c.sections) for (const r of s.rows) {
    if (r.tone === 'warn' && !covered.has(r.label)) out.push({ id: `${c.id}-${r.label}`, severity: 'medium', title: `${r.label}: ${r.value}`, detail: `${c.title} → ${s.title}` })
  }
  return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1))
}
