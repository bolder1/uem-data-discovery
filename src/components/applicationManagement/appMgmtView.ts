import type { AppPlatform, AppPolicy, AppVersion, ManagedApp } from '@/types'

/** What a pending delete confirmation targets — a whole app, one version, or a bulk set. */
export type ConfirmTarget =
  | { kind: 'app'; app: ManagedApp }
  | { kind: 'version'; app: ManagedApp; version: AppVersion }
  | { kind: 'bulk'; ids: string[] }

export interface AppSummary {
  total: number
  assigned: number
  unassigned: number
  devices: number
}

/**
 * The controller (the page) owns all state + store actions and hands this
 * bundle to whichever view is active — the design-system ClassicView or the
 * product-styled ProductView — so both share one source of truth.
 */
export interface AppMgmtViewProps {
  // skin toggle
  revamp: boolean
  onToggleSkin: (v: boolean) => void

  // os tab + search
  os: AppPlatform
  onSwitchOs: (os: AppPlatform) => void
  winCount: number
  macCount: number
  query: string
  onQueryChange: (q: string) => void

  // filtered rows (current os + query) + summary + policy catalogue
  rows: ManagedApp[]
  summary: AppSummary
  appPolicies: AppPolicy[]
  recentId: string | null

  // selection (used by ClassicView only)
  selected: Set<string>
  onToggleRow: (id: string) => void
  onToggleAll: () => void
  allVisibleSelected: boolean
  someVisibleSelected: boolean
  onClearSelection: () => void
  selectedIds: string[]

  // actions
  onUpload: () => void
  onOpenDetails: (id: string) => void
  onOpenUpdate: (app: ManagedApp) => void
  onAssign: (app: ManagedApp) => void
  onRequestDelete: (target: ConfirmTarget) => void
}
