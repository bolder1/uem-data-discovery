import type { Configuration, Scope } from '@/types'

// Azure is intentionally NOT seeded → it shows the first-time "Configure" state.
// AWS is kept stable because the seed policies/scans/findings reference its ids.

const SCOPE_NAMES = [
  'finance',
  'hr-confidential',
  'customer-data',
  'backups',
  'app-logs',
  'invoices',
  'contracts',
  'payroll',
  'analytics',
  'public-assets',
  'archive',
  'exports',
  'marketing',
  'support-tickets',
]

const SCAN_DATES = [
  '2026-06-24T17:08:23',
  '2026-06-23T20:14:48',
  '2026-06-22T09:30:00',
  '2026-06-20T11:15:00',
  '2026-06-18T08:00:00',
]

const ADD_DATES = [
  '2026-06-23T10:00:00',
  '2026-06-21T14:30:00',
  '2026-06-19T09:15:00',
  '2026-06-17T16:40:00',
  '2026-06-15T11:00:00',
  '2026-06-12T13:20:00',
  '2026-06-10T08:45:00',
]

let scopeSeq = 0
function genScopes(n: number, seed: number): Scope[] {
  return Array.from({ length: n }, (_, i) => {
    const k = seed + i
    const objects = 18 + ((k * 47) % 540)
    const sensitive = Math.max(1, Math.floor(objects * (0.1 + (k % 6) * 0.05)))
    return {
      id: `gs-${scopeSeq++}`,
      name: SCOPE_NAMES[k % SCOPE_NAMES.length],
      objects,
      sensitive,
      sizeBytes: (2 + ((k * 17) % 760)) * 1024 * 1024,
      publicAccess: k % 9 === 0,
      lastScan: SCAN_DATES[k % SCAN_DATES.length],
    }
  })
}

const awsConfig: Configuration = {
  id: 'cfg-aws-1',
  providerId: 'aws-s3',
  name: 'Test S3 Bucket',
  status: 'connected',
  createdAt: '2026-06-15T14:02:00',
  createdBy: 'gautam',
  lastRotated: '2026-05-20T11:30:00',
  accessKeyId: 'AKIA••••••••••XQ7P',
  secretAccessKeyMasked: '••••••••••••••••••••••••',
  region: 'us-east-1',
  scopes: [
    {
      id: 's3-finance-exports',
      name: 'finance-exports',
      objects: 142,
      sensitive: 47,
      sizeBytes: 92341560,
      publicAccess: false,
      lastScan: '2026-06-23T20:11:02',
    },
    {
      id: 's3-public-web-assets',
      name: 'public-web-assets',
      objects: 310,
      sensitive: 6,
      sizeBytes: 1288490188,
      publicAccess: true,
      lastScan: '2026-06-23T20:14:48',
    },
  ],
}

// Configured providers (besides AWS). Azure / Redshift / Notion are left out
// (not configured); BigQuery / Salesforce are coming-soon (no config).
const SEEDS: { providerId: string; names: string[] }[] = [
  { providerId: 'gcs', names: ['Prod GCS', 'Analytics GCS'] },
  { providerId: 'google-drive', names: ['Marketing Drive'] },
  { providerId: 'dropbox', names: ['Design Dropbox'] },
  { providerId: 'box', names: ['Legal Box'] },
  { providerId: 'onedrive', names: ['Finance OneDrive'] },
  { providerId: 'sharepoint', names: ['Corp SharePoint'] },
  { providerId: 'postgres', names: ['Prod Postgres', 'Reporting Postgres'] },
  { providerId: 'mysql', names: ['Billing MySQL'] },
  { providerId: 'mongodb', names: ['App MongoDB'] },
  { providerId: 'snowflake', names: ['Data Warehouse'] },
  { providerId: 'slack', names: ['Acme Slack'] },
  { providerId: 'confluence', names: ['Engineering Wiki'] },
  { providerId: 'jira', names: ['Product Jira'] },
  { providerId: 'endpoint', names: ['Corp Laptops'] },
]

let cfgSeq = 0
const generated: Configuration[] = SEEDS.flatMap((s) =>
  s.names.map((name): Configuration => {
    const seed = ++cfgSeq
    return {
      id: `cfg-${s.providerId}-${seed}`,
      providerId: s.providerId,
      name,
      status: 'connected',
      createdAt: ADD_DATES[seed % ADD_DATES.length],
      createdBy: 'gautam',
      lastRotated: '2026-06-01T09:00:00',
      accessKeyId: 'AKIA••••••••••' + s.providerId.slice(0, 3).toUpperCase(),
      secretAccessKeyMasked: '••••••••••••••••••••',
      region: 'us-east-1',
      scopes: genScopes(2 + (seed % 4), seed * 5),
    }
  }),
)

export const seedConfigurations: Configuration[] = [awsConfig, ...generated]
