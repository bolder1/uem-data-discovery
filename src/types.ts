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

export type Risk = 'low' | 'medium' | 'high' | 'critical'

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
  risk: Risk
  status: boolean
  fileTypeIds: string[]
  classificationIds: string[]
  configurationId: string
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
  risk: Risk
  classificationIds: string[]
  publicAccess: boolean
  lastModified: string
  evidence: FindingEvidence[]
}
