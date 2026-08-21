// Domain model for the Data Discovery module.

export type ProviderId = string

export type ProviderCategory =
  | 'Cloud Storage'
  | 'Database'
  | 'SaaS'
  | 'Endpoint'

export type ConnectionStatus =
  | 'connected'
  | 'error'
  | 'not-configured'
  | 'scanning'

export type ScanStatus = 'completed' | 'running' | 'failed' | 'queued'

/** Triage state of a discovered finding. */
export type FindingStatus = 'open' | 'acknowledged' | 'dismissed'

export interface Provider {
  id: ProviderId
  name: string
  vendor: string
  category: ProviderCategory
  description: string
  comingSoon: boolean
  /** What a unit of scan scope is called for this provider. */
  scopeNoun: string
  scopeNounPlural: string
}

export interface Classification {
  id: string
  label: string
  abbr: string
  description: string
}

export interface FileType {
  id: string
  label: string
  description: string
}

/** A container (Azure) or bucket (AWS) discovered under a configuration. */
export interface Scope {
  id: string
  name: string
  objects: number
  sensitive: number
  sizeBytes: number
  publicAccess: boolean
  lastScan?: string
}

/** A configured connection to a provider. */
export interface Configuration {
  id: string
  providerId: ProviderId
  name: string
  status: ConnectionStatus
  createdAt: string
  createdBy: string
  /** When the stored secret/key was last rotated (provenance). */
  lastRotated: string
  // Azure Blob
  storageAccount?: string
  tenantId?: string
  clientId?: string
  clientSecretMasked?: string
  endpointSuffix?: string
  // AWS S3
  accessKeyId?: string
  secretAccessKeyMasked?: string
  region?: string
  /** Containers/buckets discovered on this connection. */
  scopes: Scope[]
}

export interface Policy {
  id: string
  name: string
  description?: string
  status: boolean
  fileTypeIds: string[]
  classificationIds: string[]
  /** Primary connection (first selected) — kept for scans/tables. */
  configurationId: string
  /** All connections this policy targets (same data type). Falls back to [configurationId]. */
  configurationIds?: string[]
  scopeIds: string[]
  createdAt: string
  createdBy: string
  lastRun?: string
}

export interface ScanJob {
  id: string
  policyId: string
  configurationId: string
  status: ScanStatus
  startedAt: string
  durationSec?: number
  objectsScanned: number
  sensitiveFound: number
  dataScannedBytes: number
  scopeIds: string[]
}

export interface FindingEvidence {
  classificationId: string
  snippet: string
  count: number
}

export interface Finding {
  id: string
  /** Set when the finding was produced by a scan run (vs seed data). */
  scanId?: string
  /** Triage state; absent is treated as 'open'. */
  status?: FindingStatus
  configurationId: string
  scopeId: string
  fileName: string
  filePath: string
  fileTypeId: string
  sizeBytes: number
  classificationIds: string[]
  publicAccess: boolean
  lastModified: string
  evidence: FindingEvidence[]
}

// ---------------------------------------------------------------------------
// Content Filtering module — Classification, Labels, and the Rule Dictionary.
// A distinct domain from Data Discovery's simple `Classification` (PII/PCI/…
// abbreviations used when building a policy), so these types are named
// differently to avoid confusion between the two modules.

/** A sensitivity tag attached to a classification (e.g. Confidential). */
export interface Label {
  id: string
  name: string
  /** Seeded, built-in labels vs ones a user typed and created inline. */
  isDefault: boolean
}

export type RuleCriteriaType = 'Keyword' | 'Regex' | 'Dictionary' | 'File Extension'

export interface RuleCriterion {
  type: RuleCriteriaType
  /** Minimum number of matches for the rule to fire. */
  occurrences: number
  value: string
}

/** A detectable pattern — either a shared dictionary entry or a one-off rule
 * scoped to a single classification (created via "Add Custom Rule"). */
export interface Rule {
  id: string
  name: string
  /** Grouping shown in the dictionary, e.g. "Driver's license number". */
  category?: string
  /** Seeded dictionary rules vs a classification's own inline custom rule. */
  isDefault: boolean
  criteria: RuleCriterion[]
  tags?: string[]
}

export interface DlpClassification {
  id: string
  name: string
  description: string
  labelIds: string[]
  /** Rules picked from the shared Rule Dictionary. */
  ruleIds: string[]
  /** Rules defined inline for this classification only — never added to
   * the shared dictionary. */
  customRules: Rule[]
  /** Seeded (HIPAA/PII/…) vs user-created — defaults are read-only. */
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Application Management module — Windows (MSI) and macOS (PKG/DMG) applications
// uploaded once and deployed across enrolled devices. Lives under Mobile Device
// Management → Unified Controls. The list is split by platform; each app keeps
// a version history, and the newest version drives the row.

export type AppPlatform = 'windows' | 'macos'

/** Deployment state of an application. Published = live on assigned groups. */
export type AppStatus = 'published' | 'draft' | 'publishing'

export type AppInstallTarget = 'Device Level' | 'User Level'

export type AppPublishAction =
  | 'Install Immediately'
  | 'Available for Self-Service'

/** A device policy that can be assigned to an application (the "profile"). */
export interface AppPolicy {
  id: string
  name: string
  description: string
}

/** One uploaded build of a managed application. Newest first on the app. */
export interface AppVersion {
  id: string
  version: string
  sizeBytes: number
  uploadedAt: string
  uploadedBy: string
  /** Devices currently running this build. */
  installedDevices: number
  /** Device groups this build is published to. */
  publishedGroups: number
  /** Windows: ['64-bit','32-bit']; macOS: ['Universal'] or ['Apple Silicon','Intel']. */
  architectures: string[]
  releaseNotes?: string
}

/** A managed application — the head version drives its row's version/size/date. */
export interface ManagedApp {
  id: string
  platform: AppPlatform
  name: string
  publisher: string
  /** App logo/icon (any image the browser can render — PNG, SVG…). */
  iconUrl?: string
  status: AppStatus
  /** Package kind — Windows: 'MSI'; macOS: 'PKG' | 'DMG'. */
  packageType: string
  /** Bundle identifier (macOS) — provenance shown in details. */
  bundleId?: string
  /** Install command / arguments chosen in the upload wizard. */
  commandLine?: string
  /** Device policies assigned to this app (the "profile"). Absent = none. */
  policyIds?: string[]
  installTarget?: AppInstallTarget
  publishAction?: AppPublishAction
  createdAt: string
  createdBy: string
  /** Newest first — versions[0] is the current build shown in the list. */
  versions: AppVersion[]
}
