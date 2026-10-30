// Mock data for the Apple App Library. Mirrors the live miniOrange UEM screen
// (abhijeet.buzz/apple-app-library) plus the extras we layer on top.

import { platformTotal, resolveScope, type Platform, type ScopeItem } from './directory'
export type { Platform } from './directory'
export type AppSource = 'App Store' | 'VPP' | 'In-house'
export type InstallType = 'Forced install' | 'Available'
export type LicenseType = 'Automatic' | 'Device' | 'User'
export type UpdatePolicy = 'Automatic' | 'Prompt' | 'Keep version'

export type Target = ScopeItem

/**
 * One global list, as in Jamf: a name and a priority. Used by every app library,
 * Self Service and anything else that groups items. Priority 1 shows first.
 */
export interface AppCategory {
  id: string
  name: string
  priority: number
  createdAt: string
}

export const categoryPriorities = Array.from({ length: 20 }, (_, i) => i + 1)
export const DEFAULT_PRIORITY = 9

/** Priority order, then name — how categories are listed everywhere. */
export const byPriority = (a: AppCategory, b: AppCategory) => a.priority - b.priority || a.name.localeCompare(b.name)

export interface AppAttributes {
  removable: boolean
  hideable: boolean
  lockable: boolean
  preventBackup: boolean
  perAppVpn: boolean
  tapToPayScreenLock: boolean
}

/** Managed app configuration, as in Jamf: one plist of preferences per app. */
export interface AppConfig {
  plist: string
  /** Set when the plist came from an uploaded file. */
  fileName?: string
}

export interface InstallStats {
  installed: number
  pending: number
  failed: number
}

export type NotifyType = 'Self Service' | 'Self Service and Notification Center'

/** Jamf's Self Service tab. Some fields are per platform, as in Jamf (see SelfServiceForm). */
export interface SelfService {
  description: string
  /** Custom icon; null shows the App Store icon. */
  icon: string | null
  /** Button before install (Jamf "Button Name Before Initiation"; macOS: "Button Name"). */
  buttonName: string
  /** iOS / iPadOS: button once installed (Jamf "Button Name After Initiation"). */
  reinstallButtonName: string
  /** macOS: users must open the description before installing. */
  forceDescription: boolean
  /** Forced installs only: list the app in Self Service once it's installed. */
  showAfterInstall: boolean
  featured: boolean
  compliance: boolean
  /** Categories the app is listed in. */
  displayIn: string[]
  /** macOS: categories where the app is featured. */
  featureIn: string[]
  /** macOS notifications. */
  notify: boolean
  notifyType: NotifyType
  notifySubject: string
  notifyMessage: string
}

export interface HistoryEntry {
  at: string
  who: string
  what: string
}

export interface LibraryApp {
  id: string
  /** Draft = created but not published to devices yet (page flow). */
  status: 'Draft' | 'Published'
  selfService: SelfService
  history: HistoryEntry[]
  name: string
  bundleId: string
  publisher: string
  version: string
  country: string
  platform: Platform
  source: AppSource
  installType: InstallType
  licenseType: LicenseType
  updatePolicy: UpdatePolicy
  categoryId: string | null
  allDevices: boolean
  allUsers: boolean
  targets: Target[]
  exclusions: Target[]
  attributes: AppAttributes
  associatedDomains: string[]
  config: AppConfig | null
  stats: InstallStats
  addedAt: string
  icon: string
}

export interface InHouseBuild {
  id: string
  name: string
  bundleId: string | null
  version: string | null
  status: 'Ready' | 'Processing' | 'Failed'
  delivery: 'Hosted .ipa' | 'Manifest URL' | null
  signingExpires: string | null
  sizeMb?: number
  icon: string
}

/** Purchased Apple Business Manager licenses. */
export interface VppLicense {
  name: string
  bundleId: string
  publisher: string
  version: string
  platforms: Platform[]
  available: number | 'Unlimited'
  total: number | 'Unlimited'
  icon: string
}

export const attributeInfo: { key: keyof AppAttributes; label: string; hint: string }[] = [
  { key: 'removable', label: 'Removable', hint: 'The user can delete the app from the device.' },
  { key: 'hideable', label: 'Hideable', hint: 'The user can hide the app. Hideable apps are also lockable.' },
  { key: 'lockable', label: 'Lockable', hint: 'The user can lock the app behind Face ID or a passcode.' },
  { key: 'preventBackup', label: 'Prevent backup', hint: "The app's data is left out of iCloud and iTunes backups." },
  { key: 'perAppVpn', label: 'Requires VPN for networking', hint: "The app's traffic goes through the per-app VPN." },
  { key: 'tapToPayScreenLock', label: 'Tap to Pay screen lock', hint: 'Lock the screen while Tap to Pay is in use.' },
]

export const configVariables = ['$user.email', '$user.username', '$device.id', '$organization.id', '$organization.apikey']

/** Preferences are a <dict> … </dict> block. Empty means no configuration. */
export const plistProblem = (plist: string) =>
  !plist.trim() || /^\s*<dict>[\s\S]*<\/dict>\s*$/.test(plist) ? null : 'Preferences must be one <dict> … </dict> block.'

export const variablesIn = (plist: string) => configVariables.filter((v) => plist.includes(v))
export const keyCount = (plist: string) => (plist.match(/<key>/g) ?? []).length

export const fleetSize = (p: Platform) => platformTotal(p)

export const initialCategories: AppCategory[] = [
  { id: 'c-prod', name: 'Productivity', priority: 1, createdAt: '2026-05-20' },
  { id: 'c-sec', name: 'Security', priority: 2, createdAt: '2026-05-20' },
  { id: 'c-comm', name: 'Communication', priority: 3, createdAt: '2026-05-21' },
  { id: 'c-sales', name: 'Sales', priority: 4, createdAt: '2026-06-01' },
  { id: 'c-hr', name: 'HR', priority: 5, createdAt: '2026-06-01' },
  { id: 'c-dev', name: 'Developer tools', priority: 6, createdAt: '2026-07-15' },
  { id: 'c-design', name: 'Design', priority: 9, createdAt: '2026-08-02' },
]

export const defaultAttributes: AppAttributes = {
  removable: true,
  hideable: false,
  lockable: false,
  preventBackup: true,
  perAppVpn: false,
  tapToPayScreenLock: false,
}

// Real App Store artwork (iTunes Lookup API), keyed by bundle ID. Mac and iOS builds differ for some apps.
const ART = 'https://is1-ssl.mzstatic.com/image/thumb/'
const ICONS: Record<string, string> = {
  'com.google.chrome.ios': 'Purple211/v4/0a/9c/39/0a9c395e-2f03-5eb5-b3fc-4d1650630b5c/AppIcon-0-0-1x_U007epad-0-0-0-1-0-0-sRGB-85-220.png',
  'com.microsoft.Office.Outlook': 'Purple221/v4/68/d7/e4/68d7e488-404f-0cc3-b90e-b68aca7adffc/AppIcon-outlook.prod-0-0-1x_U007epad-0-1-0-0-0-85-220.png',
  'com.microsoft.Outlook': 'Purple221/v4/55/49/06/55490646-9dbc-93a5-d12d-de9332bd9c1c/Outlook_macOS-0-0-85-220-0-0-0-6-0-2x.png',
  'com.okta.mobile': 'Purple221/v4/17/3c/d9/173cd9d6-69ff-056a-6e44-59b7af7e9495/AppIcon-0-0-1x_U007emarketing-0-8-0-0-85-220.png',
  'com.apple.mobilesafari': 'Purple211/v4/9b/4a/12/9b4a12c2-7ea9-9e38-4d4f-f1342b310519/safariCalistoga-0-0-1x_U007epad-0-1-0-85-220.png',
  'com.amazon.Lassen': 'Purple221/v4/62/5d/45/625d453c-1265-3332-d5bd-66f04e528323/AppIcon-0-0-1x_U007emarketing-0-7-0-sRGB-0-0-85-220.png',
  'com.apple.business-essentials': 'Purple221/v4/db/ae/75/dbae75cb-02d7-ee63-f974-c76b8e37d5fd/applebusinessessentials-0-1x_U007epad-0-1-0-85-220-0.png',
  'com.lemon.lvoverseas': 'Purple221/v4/31/d8/5b/31d85b5d-7785-5789-df84-1b052afd2e43/AppIcon-0-0-1x_U007emarketing-0-8-0-85-220.png',
  'com.google.Gmail': 'Purple221/v4/c3/e6/4a/c3e64abe-aa7c-ff57-9bfb-a5529bd3e2fc/gmail_2026_ios-0-0-1x_U007epad-0-0-0-1-0-0-0-0-85-220.png',
  'com.microsoft.skype.teams': 'Purple221/v4/d4/a3/14/d4a314ce-5709-5f15-4b50-2f385257f4ae/AppIcon-0-0-1x_U007epad-0-1-0-0-85-220.png',
  'com.tinyspeck.chatlyio': 'Purple221/v4/5f/88/57/5f88579b-9082-4c7c-d578-3da3be4e4366/slack_icon_prod-0-0-1x_U007epad-0-1-85-220.png',
  'com.tinyspeck.slackmacgap': 'Purple221/v4/53/ab/c7/53abc748-c140-3331-e07e-9b12029c9cbd/electron.png',
  'us.zoom.videomeetings': 'Purple221/v4/98/69/60/9869606e-7bd2-1fa4-4398-7b079ba8ae57/AppIcon-0-0-1x_U007epad-0-1-0-0-85-220.png',
  'notion.id': 'Purple211/v4/17/a6/b9/17a6b901-c46f-ef67-c7b5-288195b768b8/AppIconProd-0-0-1x_U007epad-0-0-0-1-0-0-85-220.png',
  'com.1password.1password': 'Purple211/v4/f9/09/8c/f9098cba-3384-0f27-b58c-3e979e089881/AppIcon-0-0-1x_U007epad-0-8-0-P3-85-220.png',
  'com.apple.Keynote': 'Purple211/v4/82/67/5a/82675a1f-db9c-7350-cb2b-113a5d547181/AppIcon-0-0-1x_U007epad-0-0-0-1-0-0-P3-0-0-85-220-0.png',
  'com.apple.Pages': 'Purple211/v4/8e/c3/22/8ec322df-60dc-407c-aa76-46ddbe61d2b1/AppIcon-0-0-1x_U007epad-0-0-0-1-0-0-P3-0-0-85-220-0.png',
  'com.miniorange.mdm': 'Purple221/v4/fe/18/8c/fe188cb6-fd66-0845-7c20-593fb837535c/AppIcon-0-0-1x_U007epad-0-1-85-220.png',
  'com.microsoft.azureauthenticator': 'Purple211/v4/14/75/48/14754808-d06b-705b-0e4c-d2bd6865d697/AppIcon-0-1x_U007emarketing-0-11-0-sRGB-85-220-0.png',
  'com.microsoft.Office.Word': 'Purple211/v4/b7/c3/5b/b7c35bcf-fcec-9bd4-b0e6-a5615bb3a216/AppIcon-0-0-1x_U007epad-0-1-0-0-sRGB-0-0-0-85-220.png',
  'com.microsoft.Office.Excel': 'Purple221/v4/23/e3/41/23e34128-83be-bc19-2a80-19f6c8e03b88/AppIcon-0-0-1x_U007epad-0-1-0-0-sRGB-0-0-0-85-220.png',
  'com.microsoft.Word': 'Purple221/v4/8d/f6/55/8df65550-606a-d210-e230-91fcad328a48/Word_macOS-0-0-85-220-0-0-0-6-0-2x.png',
  'com.microsoft.Excel': 'Purple211/v4/08/df/e0/08dfe0ac-e2fd-1136-83b9-039633896b4d/Excel_macOS-0-0-85-220-0-0-0-6-0-2x.png',
  'com.google.Drive': 'Purple221/v4/b2/b6/75/b2b675cf-4e20-9ff2-99b8-6e6f5944adcd/drive_2026_ios-0-0-1x_U007epad-0-0-0-1-0-0-sRGB-0-0-85-220.png',
  'com.salesforce.chatter': 'Purple211/v4/70/56/d9/7056d962-b6a7-d098-902e-a7db2bb76836/SalesforceAppIcon-0-0-1x_U007epad-0-1-0-0-0-85-220.png',
  'com.workday.workdayapp': 'Purple221/v4/bb/29/14/bb2914e5-70c4-5f98-d25e-d290d054eaf3/AppIcon-0-0-1x_U007epad-0-1-85-220.png',
  'com.docusign.DocuSignIt': 'Purple221/v4/ae/96/7e/ae967e97-d0f0-d1e6-a66f-255a3d4175bb/dsIcon-0-0-1x_U007epad-0-1-0-85-220.png',
  'com.duosecurity.DuoMobile': 'Purple211/v4/9d/75/d6/9d75d6e5-c539-84d1-811c-a447aa4844fb/AppIconGlass-0-0-1x_U007epad-0-0-0-1-0-0-85-220.png',
  'com.squareup.square': 'Purple221/v4/4f/43/8c/4f438cdc-852f-2b71-1396-0ce613afa8e0/AppIcon-0-0-1x_U007epad-0-1-85-220.png',
  'com.apple.dt.Xcode': 'Purple221/v4/93/e1/c7/93e1c7a1-85e9-dfce-851e-d74172e2b132/Xcode-0-85-220-0-6-0-0-2x-P3-0-0.png',
}

/** Real icon URL for a bundle ID, or the fallback (emoji/initial) when we don't have one. */
export function iconFor(bundleId: string | null, fallback: string) {
  const path = bundleId ? ICONS[bundleId] : undefined
  return path ? `${ART}${path}/128x128bb.png` : fallback
}

let seq = 0
export const newApp = (
  p: Partial<LibraryApp> & Pick<LibraryApp, 'name' | 'bundleId' | 'publisher' | 'platform' | 'source' | 'icon'>,
  ss: Partial<SelfService> = {},
): LibraryApp => ({
  // Seeds pass a fixed id so their URLs survive a reload.
  id: `app-${++seq}-${Date.now()}`,
  status: 'Published',
  selfService: {
    description: '',
    icon: null,
    buttonName: 'Install',
    reinstallButtonName: 'Reinstall',
    forceDescription: false,
    showAfterInstall: false,
    featured: false,
    compliance: false,
    displayIn: p.categoryId ? [p.categoryId] : [],
    featureIn: [],
    notify: false,
    notifyType: 'Self Service',
    notifySubject: '',
    notifyMessage: '',
    ...ss,
  },
  history: [{ at: p.addedAt ?? new Date().toISOString().slice(0, 10), who: 'Abhijeet', what: 'Added to the library' }],
  version: '1.0',
  country: 'US',
  installType: 'Forced install',
  licenseType: 'Automatic',
  updatePolicy: 'Automatic',
  categoryId: null,
  allDevices: false,
  allUsers: false,
  targets: [],
  exclusions: [],
  attributes: { ...defaultAttributes },
  associatedDomains: [],
  config: null,
  stats: { installed: 0, pending: 0, failed: 0 },
  addedAt: new Date().toISOString().slice(0, 10),
  ...p,
  icon: iconFor(p.bundleId, p.icon),
})

const outlookConfig: AppConfig = {
  plist: '<dict>\n  <key>com.microsoft.outlook.EmailProfile.EmailAddress</key>\n  <string>$user.email</string>\n  <key>com.microsoft.outlook.EmailProfile.AccountType</key>\n  <string>ModernAuth</string>\n  <key>IntuneMAMAllowedAccountsOnly</key>\n  <string>Enabled</string>\n</dict>',
  fileName: 'outlook-config.plist',
}

export const initialApps: LibraryApp[] = [
  newApp({ id: 'app-uem-ios', name: 'Unified Endpoint Management', bundleId: 'com.miniorange.mdm', publisher: 'Xecurify Inc', version: '2.0.1', platform: 'iOS', source: 'VPP', icon: '🛡️', categoryId: 'c-sec', allDevices: true, stats: { installed: 84, pending: 4, failed: 2 }, addedAt: '2026-06-02' }),
  newApp({ id: 'app-chrome-ios', name: 'Google Chrome', bundleId: 'com.google.chrome.ios', publisher: 'Google LLC', version: '130.0', platform: 'iOS', source: 'App Store', icon: '🌐', categoryId: 'c-prod', allDevices: true, stats: { installed: 88, pending: 2, failed: 0 }, addedAt: '2026-06-10' }),
  newApp({ id: 'app-outlook-ios', name: 'Microsoft Outlook', bundleId: 'com.microsoft.Office.Outlook', publisher: 'Microsoft Corporation', version: '5.2642.0', platform: 'iOS', source: 'App Store', icon: '📧', categoryId: 'c-comm', allDevices: true, config: outlookConfig, stats: { installed: 79, pending: 6, failed: 5 }, addedAt: '2026-06-12' }),
  newApp({ id: 'app-outlook-mac', name: 'Microsoft Outlook', bundleId: 'com.microsoft.Outlook', publisher: 'Microsoft Corporation', version: '16.90', platform: 'macOS', source: 'VPP', icon: '📧', categoryId: 'c-comm', allDevices: true, stats: { installed: 6, pending: 0, failed: 0 }, addedAt: '2026-07-01' }),
  newApp({ id: 'app-pages-mac', name: 'Pages: Create Documents', bundleId: 'com.apple.Pages', publisher: 'Apple', version: '14.2', platform: 'macOS', source: 'VPP', icon: '📝', categoryId: 'c-prod', installType: 'Available', targets: [{ kind: 'UserGroup', id: 'ug-field', name: 'Field sales' }, { kind: 'DeviceGroup', id: 'dg-leaders', name: 'Leadership devices' }], stats: { installed: 9, pending: 0, failed: 0 }, addedAt: '2026-07-03' }, { description: 'Write and share documents.' }),
  newApp({ id: 'app-okta-mac', name: 'Okta Verify', bundleId: 'com.okta.mobile', publisher: 'Okta Inc', version: '9.73.0', platform: 'macOS', source: 'VPP', icon: '✅', categoryId: 'c-sec', allDevices: true, exclusions: [{ kind: 'UserGroup', id: 'ug-contractors', name: 'Contractors' }], stats: { installed: 3, pending: 0, failed: 0 }, addedAt: '2026-07-09' }),
  newApp({ id: 'app-slack-mac', name: 'Slack for Desktop', bundleId: 'com.tinyspeck.slackmacgap', publisher: 'Slack Technologies', version: '4.48.86', platform: 'macOS', source: 'VPP', icon: '💬', categoryId: 'c-comm', allDevices: true, stats: { installed: 1, pending: 0, failed: 0 }, addedAt: '2026-07-11' }),
  newApp({ id: 'app-uem-ios-2', name: 'Unified Endpoint Management', bundleId: 'com.miniorange.mdm', publisher: 'Xecurify Inc', version: '2.0.1', platform: 'iOS', source: 'VPP', icon: '🛡️', addedAt: '2026-08-01' }),
  newApp({ id: 'app-safari-ios', name: 'Safari', bundleId: 'com.apple.mobilesafari', publisher: 'Apple', version: '18.0', platform: 'iOS', source: 'App Store', icon: '🧭', addedAt: '2026-09-14', status: 'Draft' }),
  newApp({ id: 'app-teams-ios', name: 'Microsoft Teams', bundleId: 'com.microsoft.skype.teams', publisher: 'Microsoft Corporation', version: '8.19.1', platform: 'iOS', source: 'VPP', icon: '👥', categoryId: 'c-comm', targets: [{ kind: 'DeviceGroup', id: 'dg-sales-iphones', name: 'Sales iPhones' }, { kind: 'DeviceGroup', id: 'dg-leaders', name: 'Leadership devices' }], stats: { installed: 9, pending: 4, failed: 1 }, addedAt: '2026-06-18' }),
  newApp({ id: 'app-slack-ios', name: 'Slack', bundleId: 'com.tinyspeck.chatlyio', publisher: 'Slack Technologies', version: '26.10.30', platform: 'iOS', source: 'App Store', icon: '💬', categoryId: 'c-comm', installType: 'Available', targets: [{ kind: 'UserGroup', id: 'ug-all', name: 'All staff' }], stats: { installed: 38, pending: 0, failed: 0 }, addedAt: '2026-06-20' }, { description: 'Team chat. Sign in with your work email.', featured: true }),
  newApp({ id: 'app-zoom-ios', name: 'Zoom Workplace', bundleId: 'us.zoom.videomeetings', publisher: 'Zoom Communications, Inc.', version: '7.2.3', platform: 'iOS', source: 'App Store', icon: '🎥', categoryId: 'c-comm', allDevices: true, stats: { installed: 56, pending: 3, failed: 1 }, addedAt: '2026-06-22' }, { showAfterInstall: true }),
  newApp({ id: 'app-authenticator-ios', name: 'Microsoft Authenticator', bundleId: 'com.microsoft.azureauthenticator', publisher: 'Microsoft Corporation', version: '6.8.57', platform: 'iOS', source: 'App Store', icon: '🔐', categoryId: 'c-sec', allDevices: true, exclusions: [{ kind: 'UserGroup', id: 'ug-contractors', name: 'Contractors' }], stats: { installed: 52, pending: 1, failed: 0 }, addedAt: '2026-06-05' }, { showAfterInstall: true }),
  newApp({ id: 'app-duo-ios', name: 'Duo Mobile', bundleId: 'com.duosecurity.DuoMobile', publisher: 'Duo Security LLC', version: '4.124.0', platform: 'iOS', source: 'App Store', icon: '🔑', categoryId: 'c-sec', installType: 'Available', targets: [{ kind: 'UserGroup', id: 'ug-contractors', name: 'Contractors' }], stats: { installed: 4, pending: 0, failed: 0 }, addedAt: '2026-06-06' }, { description: 'Approve sign-ins with a push.' }),
  newApp({ id: 'app-1password-ios', name: '1Password', bundleId: 'com.1password.1password', publisher: 'AgileBits Inc.', version: '8.12.42', platform: 'iOS', source: 'App Store', icon: '🔑', categoryId: 'c-sec', installType: 'Available', targets: [{ kind: 'UserGroup', id: 'ug-leaders', name: 'Leadership' }], stats: { installed: 5, pending: 0, failed: 0 }, addedAt: '2026-07-02' }, { description: 'Shared vaults for team passwords.' }),
  newApp({ id: 'app-word-ios', name: 'Microsoft Word', bundleId: 'com.microsoft.Office.Word', publisher: 'Microsoft Corporation', version: '2.115.1', platform: 'iOS', source: 'App Store', icon: '📄', categoryId: 'c-prod', installType: 'Available', allDevices: true, stats: { installed: 31, pending: 0, failed: 0 }, addedAt: '2026-06-14' }, { description: 'Create and edit documents.' }),
  newApp({ id: 'app-excel-ios', name: 'Microsoft Excel', bundleId: 'com.microsoft.Office.Excel', publisher: 'Microsoft Corporation', version: '2.115.1', platform: 'iOS', source: 'App Store', icon: '📊', categoryId: 'c-prod', installType: 'Available', allDevices: true, stats: { installed: 22, pending: 0, failed: 0 }, addedAt: '2026-06-14' }, { description: 'Spreadsheets and reports.' }),
  newApp({ id: 'app-drive-ios', name: 'Google Drive', bundleId: 'com.google.Drive', publisher: 'Google LLC', version: '4.2643.40400', platform: 'iOS', source: 'App Store', icon: '📁', categoryId: 'c-prod', installType: 'Available', allDevices: true, stats: { installed: 17, pending: 0, failed: 0 }, addedAt: '2026-07-20' }, { description: 'Shared drives and files.' }),
  newApp({ id: 'app-salesforce-ios', name: 'Salesforce', bundleId: 'com.salesforce.chatter', publisher: 'salesforce.com', version: '264.010', platform: 'iOS', source: 'App Store', icon: '☁️', categoryId: 'c-sales', targets: [{ kind: 'DeviceGroup', id: 'dg-sales-iphones', name: 'Sales iPhones' }], stats: { installed: 8, pending: 1, failed: 1 }, addedAt: '2026-07-08' }),
  newApp({ id: 'app-workday-ios', name: 'Workday', bundleId: 'com.workday.workdayapp', publisher: 'Workday, Inc', version: '2026.10.1', platform: 'iOS', source: 'App Store', icon: '🗂️', categoryId: 'c-hr', installType: 'Available', allDevices: true, stats: { installed: 26, pending: 0, failed: 0 }, addedAt: '2026-07-12' }, { description: 'Pay slips, leave and approvals.', featured: true }),
  newApp({ id: 'app-docusign-ios', name: 'Docusign', bundleId: 'com.docusign.DocuSignIt', publisher: 'Docusign', version: '3.49.0', platform: 'iOS', source: 'App Store', icon: '✍️', categoryId: 'c-sales', installType: 'Available', targets: [{ kind: 'UserGroup', id: 'ug-field', name: 'Field sales' }], stats: { installed: 3, pending: 0, failed: 0 }, addedAt: '2026-08-04' }, { description: 'Send and sign contracts.' }),
  newApp({ id: 'app-fieldsales-ios', name: 'Field Sales Toolkit', bundleId: 'com.miniorange.fieldsales', publisher: 'In-house', version: '3.1.4', platform: 'iOS', source: 'In-house', icon: '📦', categoryId: 'c-sales', targets: [{ kind: 'UserGroup', id: 'ug-field', name: 'Field sales' }], stats: { installed: 6, pending: 1, failed: 0 }, addedAt: '2026-08-10' }),
  newApp({ id: 'app-square-ipad', name: 'Square Point of Sale', bundleId: 'com.squareup.square', publisher: 'Block, Inc.', version: '7.31', platform: 'iPadOS', source: 'App Store', icon: '🟦', targets: [{ kind: 'DeviceGroup', id: 'dg-kiosks', name: 'Shared kiosks' }], stats: { installed: 10, pending: 0, failed: 2 }, addedAt: '2026-08-18' }),
  newApp({ id: 'app-keynote-ipad', name: 'Keynote', bundleId: 'com.apple.Keynote', publisher: 'Apple', version: '15.4.2', platform: 'iPadOS', source: 'App Store', icon: '📽️', categoryId: 'c-prod', installType: 'Available', allDevices: true, stats: { installed: 6, pending: 0, failed: 0 }, addedAt: '2026-08-21' }, { description: 'Build and present slides.' }),
  newApp({ id: 'app-word-mac', name: 'Microsoft Word', bundleId: 'com.microsoft.Word', publisher: 'Microsoft Corporation', version: '16.114.1', platform: 'macOS', source: 'VPP', icon: '📄', categoryId: 'c-prod', allDevices: true, stats: { installed: 50, pending: 2, failed: 1 }, addedAt: '2026-07-04' }),
  newApp({ id: 'app-excel-mac', name: 'Microsoft Excel', bundleId: 'com.microsoft.Excel', publisher: 'Microsoft Corporation', version: '16.114.1', platform: 'macOS', source: 'VPP', icon: '📊', categoryId: 'c-prod', allDevices: true, stats: { installed: 49, pending: 0, failed: 3 }, addedAt: '2026-07-04' }),
  newApp({ id: 'app-xcode-mac', name: 'Xcode', bundleId: 'com.apple.dt.Xcode', publisher: 'Apple', version: '27.1', platform: 'macOS', source: 'App Store', icon: '🛠️', categoryId: 'c-dev', installType: 'Available', targets: [{ kind: 'DeviceGroup', id: 'dg-eng-macs', name: 'Engineering Macs' }], stats: { installed: 7, pending: 0, failed: 0 }, addedAt: '2026-09-02' }, { description: 'Build and test Apple apps. Large download.', forceDescription: true }),
  newApp({ id: 'app-gmail-ios', name: 'Gmail', bundleId: 'com.google.Gmail', publisher: 'Google LLC', version: '6.0.261019', platform: 'iOS', source: 'VPP', icon: '✉️', categoryId: 'c-comm', addedAt: '2026-10-02', status: 'Draft' }),
  newApp({ id: 'app-notion-ios', name: 'Notion', bundleId: 'notion.id', publisher: 'Notion Labs, Incorporated', version: '1.7.350', platform: 'iOS', source: 'App Store', icon: '📓', categoryId: 'c-prod', installType: 'Available', targets: [{ kind: 'DeviceGroup', id: 'dg-pilot', name: 'Pilot devices' }], addedAt: '2026-10-20', status: 'Draft' }, { description: 'Notes and team wikis.' }),
  newApp({ id: 'app-slack-ipad', name: 'Slack', bundleId: 'com.tinyspeck.chatlyio', publisher: 'Slack Technologies', version: '26.10.30', platform: 'iPadOS', source: 'App Store', icon: '💬', categoryId: 'c-comm', installType: 'Available', allDevices: true, stats: { installed: 9, pending: 0, failed: 0 }, addedAt: '2026-08-24' }, { description: 'Team chat. Sign in with your work email.' }),
  newApp({ id: 'app-teams-ipad', name: 'Microsoft Teams', bundleId: 'com.microsoft.skype.teams', publisher: 'Microsoft Corporation', version: '8.19.1', platform: 'iPadOS', source: 'App Store', icon: '👥', categoryId: 'c-comm', allDevices: true, exclusions: [{ kind: 'DeviceGroup', id: 'dg-kiosks', name: 'Shared kiosks' }], stats: { installed: 18, pending: 1, failed: 1 }, addedAt: '2026-08-26' }),
  newApp({ id: 'app-drive-ipad', name: 'Google Drive', bundleId: 'com.google.Drive', publisher: 'Google LLC', version: '4.2643.40400', platform: 'iPadOS', source: 'App Store', icon: '📁', categoryId: 'c-prod', installType: 'Available', allDevices: true, stats: { installed: 11, pending: 0, failed: 0 }, addedAt: '2026-09-01' }, { description: 'Shared drives and files.' }),
  newApp({ id: 'app-inventory-ipad', name: 'Store Inventory', bundleId: 'com.miniorange.inventory', publisher: 'In-house', version: '1.4.0', platform: 'iPadOS', source: 'In-house', icon: '🧾', targets: [{ kind: 'DeviceGroup', id: 'dg-kiosks', name: 'Shared kiosks' }], stats: { installed: 11, pending: 0, failed: 1 }, addedAt: '2026-09-05' }),
  newApp({ id: 'app-expenses-ios', name: 'Acme Expenses', bundleId: 'com.miniorange.expenses', publisher: 'In-house', version: '0.9.2', platform: 'iOS', source: 'In-house', icon: '💳', categoryId: 'c-hr', installType: 'Available', targets: [{ kind: 'UserGroup', id: 'ug-all', name: 'All staff' }], addedAt: '2026-10-24', status: 'Draft' }, { description: 'Snap receipts and file expense reports.' }),
]

export const vppLicenses: VppLicense[] = [
  { name: 'Amazon Kindle: Reading App', bundleId: 'com.amazon.Lassen', publisher: 'Amazon', version: '7.20', platforms: ['iOS', 'macOS'], available: 10, total: 10, icon: '📚' },
  { name: 'Apple Business', bundleId: 'com.apple.business-essentials', publisher: 'Apple', version: '1.4', platforms: ['iOS', 'macOS'], available: 'Unlimited', total: 'Unlimited', icon: '💼' },
  { name: 'CapCut: Photo & Video Editor', bundleId: 'com.lemon.lvoverseas', publisher: 'Bytedance', version: '5.6', platforms: ['iOS', 'macOS'], available: 99, total: 100, icon: '🎬' },
  { name: 'Gmail - Email by Google', bundleId: 'com.google.Gmail', publisher: 'Google LLC', version: '6.0', platforms: ['iOS'], available: 200, total: 200, icon: '✉️' },
  { name: 'Microsoft Teams', bundleId: 'com.microsoft.skype.teams', publisher: 'Microsoft Corporation', version: '7.1', platforms: ['iOS'], available: 10, total: 10, icon: '👥' },
  { name: 'Microsoft Outlook', bundleId: 'com.microsoft.Outlook', publisher: 'Microsoft Corporation', version: '16.90', platforms: ['macOS'], available: 26, total: 200, icon: '📧' },
  { name: 'Okta Verify', bundleId: 'com.okta.mobile', publisher: 'Okta Inc', version: '9.73.0', platforms: ['macOS'], available: 47, total: 200, icon: '✅' },
  { name: 'Pages: Create Documents', bundleId: 'com.apple.Pages', publisher: 'Apple', version: '14.2', platforms: ['macOS'], available: 31, total: 60, icon: '📝' },
  { name: 'Slack for Desktop', bundleId: 'com.tinyspeck.slackmacgap', publisher: 'Slack Technologies', version: '4.48.86', platforms: ['macOS'], available: 34, total: 200, icon: '💬' },
  { name: 'Unified Endpoint Management', bundleId: 'com.miniorange.mdm', publisher: 'Xecurify Inc', version: '2.0.1', platforms: ['iOS'], available: 18, total: 200, icon: '🛡️' },
  { name: 'Microsoft Word', bundleId: 'com.microsoft.Word', publisher: 'Microsoft Corporation', version: '16.114.1', platforms: ['macOS'], available: 4, total: 200, icon: '📄' },
  { name: 'Microsoft Excel', bundleId: 'com.microsoft.Excel', publisher: 'Microsoft Corporation', version: '16.114.1', platforms: ['macOS'], available: 12, total: 200, icon: '📊' },
]

export const appStoreCatalog = [
  { name: 'Microsoft Outlook', bundleId: 'com.microsoft.Office.Outlook', publisher: 'Microsoft Corporation', version: '5.2642.0', icon: '📧' },
  { name: 'Microsoft Teams', bundleId: 'com.microsoft.skype.teams', publisher: 'Microsoft Corporation', version: '7.1', icon: '👥' },
  { name: 'Google Chrome', bundleId: 'com.google.chrome.ios', publisher: 'Google LLC', version: '130.0', icon: '🌐' },
  { name: 'Slack', bundleId: 'com.tinyspeck.chatlyio', publisher: 'SLACK TECHNOLOGIES L.L.C.', version: '24.10', icon: '💬' },
  { name: 'Zoom Workplace', bundleId: 'us.zoom.videomeetings', publisher: 'Zoom Communications, Inc.', version: '6.2', icon: '🎥' },
  { name: 'Notion', bundleId: 'notion.id', publisher: 'Notion Labs', version: '3.4', icon: '📓' },
  { name: '1Password', bundleId: 'com.1password.1password', publisher: 'AgileBits', version: '8.10', icon: '🔑' },
]

export const countries = ['US', 'GB', 'IN', 'DE', 'FR', 'JP', 'AU', 'CA']

export const initialBuilds: InHouseBuild[] = [
  { id: 'b-1', name: 'Unified Endpoint Management', bundleId: 'com.miniorange.mdm', version: '2.0.0', status: 'Ready', delivery: 'Hosted .ipa', signingExpires: '2027-05-05', icon: '🛡️' },
  { id: 'b-2', name: 'Field Sales Toolkit', bundleId: 'com.miniorange.fieldsales', version: '3.1.4', status: 'Ready', delivery: 'Manifest URL', signingExpires: '2026-11-12', icon: '📦' },
  { id: 'b-4', name: 'Store Inventory', bundleId: 'com.miniorange.inventory', version: '1.4.0', status: 'Ready', delivery: 'Hosted .ipa', signingExpires: '2027-02-18', icon: '🧾' },
  { id: 'b-5', name: 'Acme Expenses', bundleId: 'com.miniorange.expenses', version: '0.9.2', status: 'Ready', delivery: 'Manifest URL', signingExpires: '2027-04-30', icon: '💳' },
  { id: 'b-3', name: 'app.ipa', bundleId: null, version: null, status: 'Processing', delivery: null, signingExpires: null, sizeMb: 6.2, icon: '📄' },
]

for (const list of [initialApps, vppLicenses, appStoreCatalog, initialBuilds] as { bundleId: string | null; icon: string }[][])
  for (const x of list) x.icon = iconFor(x.bundleId, x.icon)

/** Who gets it, in a few words: "All iOS devices, Field sales". */
export function scopeSummary(app: Pick<LibraryApp, 'platform' | 'allDevices' | 'allUsers' | 'targets'>) {
  const parts = [...(app.allDevices ? [`All ${app.platform} devices`] : []), ...(app.allUsers ? ['All users'] : []), ...app.targets.map((t) => t.name)]
  return parts.join(', ')
}

/** Devices an app will actually reach after targets and exclusions. */
export function reach(app: Pick<LibraryApp, 'platform' | 'allDevices' | 'allUsers' | 'targets' | 'exclusions'>): number {
  return resolveScope(app).included.length
}

// Keep the seeded install stats consistent with the dummy directory.
for (const a of initialApps) {
  const n = reach(a)
  if (a.stats.installed + a.stats.pending + a.stats.failed === 0 || !n) continue
  const pending = Math.min(a.stats.pending, n)
  const failed = Math.min(a.stats.failed, n - pending)
  // Forced installs land on every device in scope; Available ones only where users installed them.
  const installed = a.installType === 'Forced install' ? n - pending - failed : Math.min(a.stats.installed, n - pending - failed)
  a.stats = { installed, pending, failed }
}

/**
 * Install stats for the devices in scope right now. Run on every save, so a
 * scope change or a deploy never leaves the numbers stale. Devices that enter
 * a forced install's scope start as pending; drafts install nothing.
 */
export function syncStats(app: LibraryApp): InstallStats {
  const n = app.status === 'Draft' ? 0 : reach(app)
  const installed = Math.min(app.stats.installed, n)
  const failed = Math.min(app.stats.failed, n - installed)
  const left = n - installed - failed
  return { installed, failed, pending: app.installType === 'Forced install' ? left : Math.min(app.stats.pending, left) }
}

export function licensesFor(app: Pick<LibraryApp, 'source' | 'bundleId' | 'platform'>) {
  if (app.source !== 'VPP') return undefined
  return vppLicenses.find((l) => l.bundleId === app.bundleId && l.platforms.includes(app.platform))
}

/** Devices in scope that can actually get a license (all of them for non-VPP apps). */
export function licensedReach(app: LibraryApp) {
  const n = reach(app)
  const lic = licensesFor(app)
  return lic && typeof lic.total === 'number' ? Math.min(n, lic.total) : n
}

/** What Deploy will do, in the same words on the checklist row, the button and History. */
export function deployCopy(app: LibraryApp) {
  const n = reach(app)
  const gets = licensedReach(app)
  const available = app.installType === 'Available'
  return {
    gets,
    row: available ? `Available in Self Service on ${gets} devices` : `Installs on ${gets} devices`,
    button: available ? `Make available on ${gets} devices` : `Deploy to ${gets} devices`,
    history: available ? `Made available on ${gets} devices` : `Deployed to ${gets} devices`,
    shortBy: n - gets,
  }
}

export interface SetupStep {
  key: 'scope' | 'selfService' | 'config'
  label: string
  required: boolean
  done: boolean
}

/** Whether users see the app in Self Service at all. Forced installs only after they install, if allowed. */
export const listedInSelfService = (app: Pick<LibraryApp, 'installType' | 'selfService'>) =>
  app.installType === 'Available' || app.selfService.showAfterInstall

/** One line for a checklist row or card: where users find the app, or that they don't. */
export function selfServiceSummary(app: LibraryApp, categories: { id: string; name: string }[]) {
  const ss = app.selfService
  if (!listedInSelfService(app)) return 'Not shown in Self Service'
  const where = [...(ss.featured ? ['Featured'] : []), ...ss.displayIn.map((id) => categories.find((c) => c.id === id)?.name).filter(Boolean)]
  return where.length ? `${where.join(', ')} · “${ss.buttonName || 'Install'}”` : 'Categories, buttons and featuring'
}

/** The draft checklist. The list's "Draft · n/m" and the app page both count these. */
export function setupSteps(app: LibraryApp): SetupStep[] {
  const ss = app.selfService
  return [
    { key: 'scope', label: 'Scope', required: true, done: reach(app) > 0 },
    { key: 'selfService', label: 'Self Service', required: false, done: listedInSelfService(app) && (ss.displayIn.length > 0 || ss.featured) },
    { key: 'config', label: 'App configuration', required: false, done: !!app.config },
  ]
}

export function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000)
}
