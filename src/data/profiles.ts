// Apple Profiles: the seed data and catalogs behind the two flows.
// Configuration profiles are edited on a full page (3-step stepper);
// onboarding profiles are edited in a side sheet (5 tabs).
// Field lists mirror the live product (endpointdefence.com → MDM → Apple → Profiles).

export type AppleOs = 'ios' | 'macos'
export type ProfileKind = 'configuration' | 'onboarding'

export interface ConfigProfile {
  id: string
  os: AppleOs
  name: string
  description: string
  /** Payload keys that are switched on / have entries. */
  payloads: string[]
  includedTargets: string[]
  excludedTargets: string[]
  allDevices: boolean
  updatedAt: string
  /** Folder the profile is filed under in lists. Unset = None. */
  category?: string
  /** Device = applies to the whole device; User = the signed-in user's channel. Unset = device. */
  level?: ProfileLevel
  /** How the profile reaches devices. Unset = installed automatically. */
  distribution?: ProfileDistribution
}

export type ProfileLevel = 'device' | 'user'
export type ProfileDistribution = 'auto' | 'self-service'

export const profileCategories = ['None', 'Security', 'Network', 'Productivity', 'Kiosk', 'Compliance']
export const levelOptions: { value: ProfileLevel; label: string; note: string }[] = [
  { value: 'device', label: 'Device level', note: 'Applies to the whole device, whoever uses it.' },
  { value: 'user', label: 'User level', note: 'Applies only to the signed-in user’s account and data.' },
]
export const distributionOptions: { value: ProfileDistribution; label: string; note: string }[] = [
  { value: 'auto', label: 'Install automatically', note: 'Pushed to devices with no action from users.' },
  { value: 'self-service', label: 'Make available in Self Service', note: 'Users choose to install it from Self Service.' },
]

export interface OnboardingProfile {
  id: string
  os: AppleOs
  name: string
  description: string
  deviceGroup: string
  autoAssign: boolean
  useExistingLocation: boolean
  supportPhone: string
  supportEmail: string
  department: string
  preventActivationLock: boolean
  allowMdmRemoval: boolean
  shared: SharedIpadSettings
  restoreFromBackup: boolean
  returnToService: boolean
  /** Setup Assistant screens that are skipped during enrollment. */
  skippedScreens: string[]
}

/** A setting that is either off or "after N seconds/minutes". */
export interface Timed {
  on: boolean
  value: string
  unit: 'seconds' | 'minutes'
}

/** Shared iPad: several Managed Apple Accounts on one iPad. */
export interface SharedIpadSettings {
  enabled: boolean
  owner: string
  userCount: string
  signInDomain: string
  /** Only temporary guest sessions; no named users. */
  guestOnly: boolean
  guestTimeout: Timed
  userTimeout: Timed
  quotaOn: boolean
  quotaMb: string
  allowedUsers: string[]
  autoLock: Timed
  passcodeAfterLock: Timed
}

const off = (unit: Timed['unit'] = 'minutes'): Timed => ({ on: false, value: '', unit })

export const blankShared = (): SharedIpadSettings => ({
  enabled: false, owner: '', userCount: '2', signInDomain: '', guestOnly: false,
  guestTimeout: off(), userTimeout: off(), quotaOn: false, quotaMb: '', allowedUsers: [],
  autoLock: off(), passcodeAfterLock: off(),
})

// ── Payload catalog (Profile Enforcer step) ──────────────────────────────

export type PayloadShape =
  /** One form, gated by an on/off switch (e.g. ACME Certificate). */
  | 'toggle'
  /** Starts empty; "Add …" opens a sheet and adds an entry (e.g. Passcode). */
  | 'list'
  /** Has sub-sections listed under it in the rail (e.g. Mail). */
  | 'group'

export interface PayloadField {
  label: string
  kind: 'text' | 'select' | 'yesno' | 'number' | 'allowdeny' | 'chips'
  required?: boolean
  placeholder?: string
  options?: string[]
  /** Min OS version badge shown next to the label. */
  since?: string
}

export interface Payload {
  key: string
  label: string
  shape: PayloadShape
  blurb: string
  children?: string[]
  fields?: PayloadField[]
}

const F = (label: string, kind: PayloadField['kind'], extra: Partial<PayloadField> = {}): PayloadField => ({ label, kind, since: 'iOS 16.0+', ...extra })

export const payloads: Payload[] = [
  {
    key: 'acme', label: 'ACME Certificate', shape: 'toggle',
    blurb: 'Devices request their own certificate from your ACME server. While it is off, no ACME settings are sent.',
    fields: [
      F('Directory URL', 'text', { required: true, placeholder: 'https://acme.example.com/directory' }),
      F('Client Identifier', 'text', { required: true, placeholder: 'Enter client identifier' }),
      F('Key Type', 'select', { options: ['ECSECPrimeRandom', 'RSA'] }),
      F('Key Size', 'select', { options: ['256', '384', '2048', '4096'] }),
      F('Hardware Bound', 'yesno'),
      F('Subject', 'text', { required: true, placeholder: 'CN=device' }),
      F('Key Usage', 'select', { options: ['None', 'Signing', 'Encryption', 'Both'] }),
    ],
  },
  { key: 'airplay', label: 'AirPlay', shape: 'list', blurb: 'Restrict which AirPlay destinations devices can connect to.' },
  { key: 'airprint', label: 'AirPrint', shape: 'list', blurb: 'Make AirPrint printers available to devices.' },
  { key: 'caldav', label: 'Calendar (CalDAV)', shape: 'list', blurb: 'Configure CalDAV calendar accounts.' },
  { key: 'cellular', label: 'Cellular', shape: 'toggle', blurb: 'Configure cellular network (APN) settings.',
    fields: [F('APN', 'text', { placeholder: 'internet' }), F('Username', 'text'), F('Authentication', 'select', { options: ['PAP', 'CHAP'] })] },
  { key: 'certificate', label: 'Certificate', shape: 'list', blurb: 'Install PKCS#1 / PKCS#12 certificates on devices.' },
  { key: 'ct', label: 'Certificate Transparency', shape: 'toggle', blurb: 'Disable Certificate Transparency enforcement for specific domains.',
    fields: [F('Disabled domains', 'chips', { placeholder: 'example.com' })] },
  { key: 'carddav', label: 'Contacts (CardDAV)', shape: 'list', blurb: 'Configure CardDAV contact accounts.' },
  { key: 'directory', label: 'Directory', shape: 'toggle', blurb: 'Bind devices to a directory service.', fields: [F('Server', 'text'), F('Search base', 'text')] },
  { key: 'dns', label: 'DNS Settings', shape: 'toggle', blurb: 'Encrypted DNS (DoH / DoT) for the device.',
    fields: [F('Protocol', 'select', { options: ['HTTPS', 'TLS'] }), F('Server URL', 'text', { required: true })] },
  { key: 'domains', label: 'Domains', shape: 'toggle', blurb: 'Mark email and web domains as managed.', fields: [F('Managed email domains', 'chips'), F('Managed web domains', 'chips')] },
  { key: 'font', label: 'Font', shape: 'list', blurb: 'Install fonts on devices.' },
  { key: 'homescreen', label: 'Home Screen Layout', shape: 'toggle', blurb: 'Set the Home Screen and Dock layout.', fields: [F('Dock apps', 'chips')] },
  { key: 'kiosk', label: 'Kiosk', shape: 'toggle', blurb: 'Lock the device to a single app.', fields: [F('App', 'select', { required: true, options: ['Safari', 'Zoom', 'Teams'] })] },
  { key: 'lockmsg', label: 'Lock Screen Message', shape: 'toggle', blurb: 'Show a message on the lock screen.', fields: [F('"If lost, return to" message', 'text'), F('Asset tag', 'text')] },
  { key: 'mail', label: 'Mail', shape: 'group', blurb: 'Configure mail accounts.', children: ['Exchange ActiveSync', 'IMAP / POP', 'Google Account'] },
  { key: 'netusage', label: 'Network Usage Rules', shape: 'list', blurb: 'Control which apps can use cellular data.' },
  { key: 'notifications', label: 'Notifications', shape: 'list', blurb: 'Notification settings per app.' },
  {
    key: 'passcode', label: 'Passcode', shape: 'list', blurb: 'Passcode rules devices must meet.',
    fields: [
      F('Simple passcode', 'allowdeny', { since: 'iOS 4.0+' }),
      F('Alphanumeric', 'allowdeny', { since: 'iOS 4.0+' }),
      F('Force PIN', 'allowdeny', { since: 'iOS 4.0+' }),
      F('Max grace period for unlock', 'select', { since: 'iOS 4.0+', options: ['Immediately', '1 minute', '5 minutes', '15 minutes', '30 minutes'] }),
      F('Passcode expiry', 'select', { since: 'iOS 4.0+', options: ['Never', '1 month', '3 months', '6 months', '1 year'] }),
      F('Minimum length', 'number', { since: 'iOS 4.0+', placeholder: '6' }),
      F('Minimum number of symbols', 'number', { since: 'iOS 4.0+', placeholder: '0' }),
      F('Max inactivity lock (minutes)', 'number', { since: 'iOS 4.0+', placeholder: '0' }),
      F('Maximum failed attempts', 'number', { since: 'iOS 4.0+', placeholder: '4' }),
      F('Passcode history', 'number', { since: 'iOS 4.0+', placeholder: '1' }),
    ],
  },
  { key: 'proxy', label: 'Proxy', shape: 'group', blurb: 'Route traffic through a proxy.', children: ['Global HTTP Proxy', 'Per-app Proxy'] },
  { key: 'relay', label: 'Relay', shape: 'list', blurb: 'Configure MASQUE relay servers.' },
  { key: 'restrictions', label: 'Restrictions', shape: 'toggle', blurb: 'Allow or block device features.',
    fields: [F('Camera', 'allowdeny'), F('Screenshots', 'allowdeny'), F('App installs', 'allowdeny'), F('iCloud backup', 'allowdeny'), F('AirDrop', 'allowdeny')] },
  { key: 'scep', label: 'SCEP', shape: 'list', blurb: 'Request certificates from a SCEP server.' },
  { key: 'sso', label: 'Single Sign-On Extensions', shape: 'group', blurb: 'Single sign-on for apps and websites.', children: ['Redirect', 'Credential', 'Kerberos'] },
  { key: 'tvremote', label: 'TV Remote', shape: 'list', blurb: 'Allowed Apple TV remotes.' },
  { key: 'vpn', label: 'VPN', shape: 'list', blurb: 'Configure VPN connections.' },
  { key: 'webfilter', label: 'Web Content Filter', shape: 'toggle', blurb: 'Filter the websites devices can open.', fields: [F('Filter type', 'select', { options: ['Limit adult content', 'Allowed websites only'] }), F('Blocked URLs', 'chips')] },
  { key: 'webclips', label: 'Web Shortcuts', shape: 'list', blurb: 'Add web shortcuts to the Home Screen.' },
  { key: 'wifi', label: 'Wi-Fi', shape: 'list', blurb: 'Configure Wi-Fi networks.' },
  { key: 'advanced', label: 'Advanced Settings', shape: 'toggle', blurb: 'Profile-level options such as removal policy.', fields: [F('Allow profile removal', 'select', { options: ['Always', 'With authorization', 'Never'] })] },
]

// ── Onboarding (Setup Assistant) ─────────────────────────────────────────

export const setupScreens = [
  'Accessibility Appearance', 'Action Button', 'Android Data Transfer', 'Appearance', 'Apple ID',
  'App Store', 'Biometric', 'Camera Button', 'Device Features Tour', 'Device to Device Migration',
  'App Analytics (Diagnostics)', 'Lockdown Mode', 'iMessage & FaceTime', 'Intelligence', 'Keyboard',
  'Liquid Glass', 'Location Services', 'Messaging Activation', 'Multitasking', 'Passcode',
  'Apple Pay', 'Privacy', 'Restore / Transfer', 'Restore Completed', 'Safety',
  'Safety and Handling', 'Screen Time', 'Cellular Plan', 'Siri', 'Software Update',
  'Dictation', 'Terms of Address', 'Terms and Conditions', 'Update Complete', 'Watch Migration',
  'Welcome',
]

/** The same 36 screens, grouped the way a person thinks about first setup. Each appears once. */
export const setupScreenGroups: { title: string; screens: string[] }[] = [
  { title: 'Welcome & account', screens: ['Welcome', 'Apple ID', 'Terms and Conditions', 'Terms of Address', 'iMessage & FaceTime', 'Messaging Activation', 'Cellular Plan'] },
  { title: 'Security & privacy', screens: ['Passcode', 'Biometric', 'Lockdown Mode', 'Privacy', 'Location Services', 'App Analytics (Diagnostics)', 'Safety', 'Safety and Handling'] },
  { title: 'Transfer & updates', screens: ['Restore / Transfer', 'Restore Completed', 'Device to Device Migration', 'Android Data Transfer', 'Watch Migration', 'Software Update', 'Update Complete'] },
  { title: 'Apple services', screens: ['Siri', 'Dictation', 'Intelligence', 'Apple Pay', 'App Store', 'Screen Time'] },
  { title: 'Look & hardware', screens: ['Appearance', 'Accessibility Appearance', 'Liquid Glass', 'Keyboard', 'Action Button', 'Camera Button', 'Multitasking', 'Device Features Tour'] },
]

export const deviceGroups = ['default', 'tets-migrate', 'Sales iPads', 'Field Engineers', 'Executives', 'Kiosk devices']
/** Devices in each group (dummy), and 1 for a single device — used for reach estimates. */
const GROUP_SIZES: Record<string, number> = { default: 48, 'tets-migrate': 6, 'Sales iPads': 22, 'Field Engineers': 31, Executives: 12, 'Kiosk devices': 9 }
export const deviceCountOf = (target: string) => GROUP_SIZES[target] ?? 1
export const fleetSize = Object.values(GROUP_SIZES).reduce((a, b) => a + b, 0)

export const targetDevices = ['iPhone 15 · A. Rao', 'iPad Air · Store 12', 'iPhone 14 · K. Shah', 'iPad mini · Lobby', 'iPhone 16 Pro · R. Iyer']

// ── Seeds ─────────────────────────────────────────────────────────────────

export const seedConfigProfiles: ConfigProfile[] = [
  { id: 'cp-zoom', os: 'ios', name: 'ZoomTesting', description: 'Testing the 1', payloads: ['restrictions', 'wifi'], includedTargets: ['Sales iPads'], excludedTargets: [], allDevices: false, updatedAt: '2026-11-18T10:20:00' },
  { id: 'cp-sso', os: 'ios', name: 'rushi-test-sso-entra', description: '', payloads: ['sso'], includedTargets: [], excludedTargets: [], allDevices: false, updatedAt: '2026-11-12T16:02:00' },
  { id: 'cp-admin', os: 'ios', name: 'apple-admin-policy', description: 'Configure policy to see how it works.', payloads: ['passcode', 'restrictions', 'lockmsg'], includedTargets: ['Executives', 'Field Engineers'], excludedTargets: ['Kiosk devices'], allDevices: false, updatedAt: '2026-11-05T09:45:00' },
  { id: 'cp-default', os: 'ios', name: 'Default-iOS', description: 'Testing', payloads: ['passcode'], includedTargets: [], excludedTargets: [], allDevices: true, updatedAt: '2026-10-29T13:10:00' },
  { id: 'cp-mac-base', os: 'macos', name: 'macOS Baseline', description: 'FileVault, firewall and passcode', payloads: ['passcode', 'restrictions'], includedTargets: ['default'], excludedTargets: [], allDevices: false, updatedAt: '2026-11-01T11:00:00' },
]

const ALL_SKIPPED = setupScreens.filter((s) => !['Accessibility Appearance', 'Device Features Tour', 'Liquid Glass', 'Multitasking', 'Safety and Handling'].includes(s))

export const seedOnboardingProfiles: OnboardingProfile[] = [
  {
    id: 'ob-migrate', os: 'ios', name: 'testafter-migrate', description: '', deviceGroup: 'tets-migrate',
    autoAssign: false, useExistingLocation: false, supportPhone: '', supportEmail: '', department: '',
    preventActivationLock: true, allowMdmRemoval: false, restoreFromBackup: false, returnToService: false,
    // A filled-in Shared iPad, so the tab has something to show.
    shared: {
      ...blankShared(), enabled: true, owner: 'aarav.shah@acme.com', signInDomain: 'acme.com',
      allowedUsers: ['ashish.rao@acme.com'], autoLock: { on: true, value: '2', unit: 'minutes' },
    },
    skippedScreens: [],
  },
  {
    id: 'ob-default', os: 'ios', name: 'Default-iOS', description: 'Device Assignment', deviceGroup: 'default',
    autoAssign: false, useExistingLocation: false, supportPhone: '', supportEmail: '', department: '',
    preventActivationLock: true, allowMdmRemoval: false, shared: blankShared(), restoreFromBackup: false, returnToService: false,
    skippedScreens: ALL_SKIPPED,
  },
]

export const blankOnboarding = (os: AppleOs): OnboardingProfile => ({
  id: '', os, name: '', description: '', deviceGroup: '', autoAssign: true, useExistingLocation: false,
  supportPhone: '', supportEmail: '', department: '', preventActivationLock: true, allowMdmRemoval: false,
  shared: blankShared(), restoreFromBackup: false, returnToService: false, skippedScreens: [],
})

export const blankConfig = (os: AppleOs): ConfigProfile => ({
  id: '', os, name: '', description: '', payloads: [], includedTargets: [], excludedTargets: [], allDevices: false, updatedAt: '',
})

export const osLabel: Record<AppleOs, string> = { ios: 'iOS/iPadOS', macos: 'macOS' }
