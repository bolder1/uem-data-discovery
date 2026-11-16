// Every MDM command the product offers for Apple devices, in one place. The
// list's row menu and the detail page's Actions tab both read from here, so
// they can't drift apart, and `availability()` decides per device state —
// the live product offers "Start Lost Mode" to a phone already in Lost Mode.
import {
  Bell, Bluetooth, Clock, Eraser, Globe, KeyRound, Lock, LockOpen, MapPin, MonitorPlay, Pencil,
  Power, RefreshCw, RotateCcw, Send, Shield, Signal, Smartphone, Trash2, UserCog, Wifi, type LucideIcon,
} from 'lucide-react'
import { isOffline, tabOf, type InventoryDevice, type PlatformTab } from './deviceInventory'

export type ActionGroup = 'Remote control' | 'Network' | 'Security' | 'Maintenance' | 'Reset and removal'
export const actionGroups: ActionGroup[] = ['Remote control', 'Network', 'Security', 'Maintenance', 'Reset and removal']

export interface DeviceAction {
  id: string
  label: string
  detail: string
  group: ActionGroup
  icon: LucideIcon
  platforms: PlatformTab[]
  /** On/off settings render as a switch showing the last reported state. */
  toggle?: (d: InventoryDevice) => boolean
  /** Opens a sheet to collect a value first (name, time zone, message). */
  input?: 'name' | 'timezone' | 'message'
  /** Irreversible or disruptive — always confirmed, styled red. */
  danger?: boolean
  confirm?: { title: string; body: string }
  /** Shown as a big tile at the top of the Actions tab and early in row menus. */
  quick?: boolean
  /** The word an admin must type to confirm, as Kandji does with ERASE. */
  typed?: string
}

const both: PlatformTab[] = ['ios', 'macos']

export const deviceActions: DeviceAction[] = [
  { id: 'sync', label: 'Sync device', detail: 'Ask the device for fresh inventory', group: 'Remote control', icon: RefreshCw, platforms: both, quick: true },
  { id: 'lock', label: 'Lock device', detail: 'Lock the screen, with an optional message', group: 'Remote control', icon: Lock, platforms: both, quick: true, input: 'message' },
  { id: 'restart', label: 'Restart', detail: 'Restart the device now', group: 'Remote control', icon: RotateCcw, platforms: both, quick: true },
  { id: 'shutdown', label: 'Shut down', detail: 'Power off — someone has to turn it back on', group: 'Remote control', icon: Power, platforms: both, quick: true,
    confirm: { title: 'Shut down this device?', body: 'It stops receiving commands until someone turns it back on.' } },
  { id: 'push', label: 'Send blank push', detail: 'Nudge the device to pick up waiting commands', group: 'Remote control', icon: Send, platforms: both },
  { id: 'cast', label: 'Remote cast', detail: 'Live view and remote control session', group: 'Remote control', icon: MonitorPlay, platforms: both },

  { id: 'roaming', label: 'Data roaming', detail: 'Mobile data outside the home network', group: 'Network', icon: Globe, platforms: ['ios'], toggle: () => false },
  { id: 'hotspot', label: 'Personal Hotspot', detail: "Share this device's mobile data", group: 'Network', icon: Wifi, platforms: ['ios'], toggle: () => false },
  { id: 'bluetooth', label: 'Bluetooth', detail: 'Bluetooth radio on the device', group: 'Network', icon: Bluetooth, platforms: both, toggle: () => true },
  { id: 'esim', label: 'Add eSIM', detail: 'Download the carrier eSIM plan', group: 'Network', icon: Signal, platforms: ['ios'] },

  { id: 'lost-on', label: 'Enable Lost Mode', detail: 'Lock and show a contact message', group: 'Security', icon: MapPin, platforms: ['ios'], input: 'message' },
  { id: 'lost-off', label: 'Disable Lost Mode', detail: 'Unlock and return the device to the user', group: 'Security', icon: LockOpen, platforms: ['ios'] },
  { id: 'sound', label: 'Play sound', detail: 'Play a sound so it can be found', group: 'Security', icon: Bell, platforms: ['ios'] },
  { id: 'passcode', label: 'Clear passcode', detail: 'Remove the device passcode', group: 'Security', icon: KeyRound, platforms: ['ios'],
    confirm: { title: 'Clear the passcode?', body: 'Anyone holding the device can open it until a new passcode is set.' } },
  { id: 'screentime', label: 'Clear Screen Time passcode', detail: 'Remove the passcode the user set for Screen Time', group: 'Security', icon: Clock, platforms: ['ios'] },
  { id: 'filevault', label: 'Rotate FileVault key', detail: 'Create a new recovery key and escrow it', group: 'Security', icon: Shield, platforms: ['macos'] },

  { id: 'rename', label: 'Rename device', detail: 'Shown on the device and in reports', group: 'Maintenance', icon: Pencil, platforms: both, input: 'name' },
  { id: 'timezone', label: 'Set time zone', detail: 'Set the device time zone', group: 'Maintenance', icon: Clock, platforms: ['ios'], input: 'timezone' },
  { id: 'user', label: 'Manage user', detail: 'Change who the device is assigned to', group: 'Maintenance', icon: UserCog, platforms: ['ios'] },

  { id: 'wipe', label: 'Wipe device', detail: 'Erase all data and settings', group: 'Reset and removal', icon: Eraser, platforms: both, danger: true, typed: 'ERASE',
    confirm: { title: 'Wipe this device?', body: 'All data and settings are erased and the device returns to setup. This cannot be undone.' } },
  { id: 'deprovision', label: 'Deprovision', detail: 'Remove management and stop managing it', group: 'Reset and removal', icon: Smartphone, platforms: both, danger: true, typed: 'DEPROVISION',
    confirm: { title: 'Deprovision this device?', body: 'Profiles, apps and policies are removed. It has to be enrolled again to be managed.' } },
  { id: 'delete', label: 'Delete record', detail: 'Remove this device from the inventory only', group: 'Reset and removal', icon: Trash2, platforms: both, danger: true,
    confirm: { title: 'Delete this device record?', body: 'Only the record is removed. If the device checks in again it reappears.' } },
]

export interface Availability {
  show: boolean
  enabled: boolean
  /** Why it's disabled, shown as a tooltip and under the action. */
  reason?: string
}

/**
 * What an admin can do to this device right now. Hidden when it can never
 * apply (wrong platform, wrong Lost Mode state); disabled with a reason when
 * it could apply but not yet (needs supervision, device offline).
 */
export function availability(a: DeviceAction, d: InventoryDevice): Availability {
  const tab = tabOf(d)
  if (!a.platforms.includes(tab)) return { show: false, enabled: false }

  // Lost Mode is a state: offer the way in or the way out, never both.
  if (a.id === 'lost-on' && d.lostMode) return { show: false, enabled: false }
  if ((a.id === 'lost-off' || a.id === 'sound') && !d.lostMode) return { show: a.id === 'sound', enabled: false, reason: 'Only while in Lost Mode' }
  if (a.id === 'delete' && !isOffline(d)) return { show: false, enabled: false }

  const needsSupervision = ['lost-on', 'roaming', 'hotspot', 'bluetooth', 'esim', 'timezone', 'shutdown', 'rename']
  if (needsSupervision.includes(a.id) && !d.supervised) return { show: true, enabled: false, reason: 'Needs a supervised device' }
  if (a.id === 'filevault' && !d.encrypted) return { show: true, enabled: false, reason: 'FileVault is off on this Mac' }
  if (a.id === 'passcode' && !d.passcode) return { show: true, enabled: false, reason: 'No passcode is set' }
  if (a.id === 'cast' && d.ownership === 'BYOD') return { show: true, enabled: false, reason: 'Not available on personal devices' }

  if (isOffline(d)) return offlinePolicy(a)
  return { show: true, enabled: true }
}

/**
 * The device hasn't checked in for 7+ days. Which commands may still be
 * queued for whenever it returns, and which make no sense to queue?
 */
function offlinePolicy(a: DeviceAction): Availability {
  // Live sessions and "someone nearby" actions can't wait for a check-in that may never come.
  if (['cast', 'sound', 'shutdown', 'restart'].includes(a.id)) return { show: true, enabled: false, reason: 'Needs the device online' }
  if (a.danger && a.id !== 'delete') return { show: true, enabled: true, reason: 'Queued — runs if it checks in again' }
  return { show: true, enabled: true }
}

/* ── Use cases: why an admin opens this tab ─────────────────
 * Helpdesk tickets arrive as situations ("I lost my phone"), not as command
 * names. Each use case lists the commands in the order you'd use them. */

export interface UseCase {
  id: string
  title: string
  /** What the requester usually says. */
  ticket: string
  icon: LucideIcon
  platforms: PlatformTab[]
  steps: { action: string; why: string }[]
}

export const useCases: UseCase[] = [
  { id: 'lost', title: 'Device is lost', ticket: '“I left my phone in a cab.”', icon: MapPin, platforms: ['ios'], steps: [
    { action: 'lost-on', why: 'Locks it and shows your contact message on screen.' },
    { action: 'sound', why: 'Plays a sound so the finder notices it.' },
    { action: 'lost-off', why: 'When it is back with the user.' },
    { action: 'wipe', why: 'Only if it will not come back.' },
  ] },
  { id: 'lost-mac', title: 'Device is lost', ticket: '“My laptop was taken from the office.”', icon: MapPin, platforms: ['macos'], steps: [
    { action: 'lock', why: 'Locks the Mac with a PIN and your message.' },
    { action: 'filevault', why: 'Rotates the recovery key so an old one cannot unlock the disk.' },
    { action: 'wipe', why: 'Only if it will not come back.' },
  ] },
  { id: 'locked-out', title: 'User is locked out', ticket: '“I forgot my passcode.”', icon: KeyRound, platforms: ['ios'], steps: [
    { action: 'passcode', why: 'Removes the passcode so the user can set a new one.' },
    { action: 'screentime', why: 'If it is the Screen Time passcode they forgot.' },
  ] },
  { id: 'locked-out-mac', title: 'User is locked out', ticket: '“My Mac will not accept my password.”', icon: KeyRound, platforms: ['macos'], steps: [
    { action: 'filevault', why: 'Gives you a fresh recovery key to unlock FileVault at startup.' },
    { action: 'restart', why: 'Restart so the user can sign in with the recovery key.' },
  ] },
  { id: 'broken', title: 'Installs are stuck', ticket: '“The app never installed.”', icon: RefreshCw, platforms: both, steps: [
    { action: 'push', why: 'Wakes the device so it picks up waiting commands.' },
    { action: 'sync', why: 'Refreshes inventory so you see its real state.' },
    { action: 'restart', why: 'Clears most stuck installs and profile issues.' },
  ] },
  { id: 'offboard', title: 'Employee is leaving', ticket: '“Priya leaves on Friday.”', icon: UserCog, platforms: both, steps: [
    { action: 'lock', why: 'Locks it so nobody uses it before IT collects it.' },
    { action: 'wipe', why: 'Erases it for the next person.' },
    { action: 'deprovision', why: 'Only if the device is leaving the company.' },
  ] },
]

export const useCasesFor = (d: InventoryDevice) => useCases.filter((u) => u.platforms.includes(tabOf(d)))

export const actionsFor = (d: InventoryDevice) =>
  deviceActions.map((a) => ({ action: a, ...availability(a, d) })).filter((x) => x.show)
