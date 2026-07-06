import type { Policy } from '@/types'

export const seedPolicies: Policy[] = [
  {
    id: 'pol-1',
    name: 'Azure Sensitive Data Sweep',
    description:
      'Flag PII and financial records across Azure blob containers.',
    status: true,
    fileTypeIds: ['word', 'excel', 'pdf', 'csv'],
    classificationIds: ['pii', 'financial', 'credentials'],
    configurationId: 'cfg-aws-1',
    scopeIds: ['s3-finance-exports', 's3-public-web-assets'],
    createdAt: '2026-06-19T09:15:00',
    createdBy: 'gautam',
    lastRun: '2026-06-24T17:08:23',
  },
  {
    id: 'pol-2',
    name: 'S3 Public Exposure Check',
    description:
      'Detect cardholder and credential data in S3, prioritising public buckets.',
    status: true,
    fileTypeIds: ['pdf', 'csv', 'text', 'zip'],
    classificationIds: ['pci', 'credentials', 'pii'],
    configurationId: 'cfg-aws-1',
    scopeIds: ['s3-finance-exports', 's3-public-web-assets'],
    createdAt: '2026-06-16T11:40:00',
    createdBy: 'gautam',
    lastRun: '2026-06-23T20:14:48',
  },
  {
    id: 'pol-3',
    name: 'Source Code Leak Monitor',
    description: 'Watch for proprietary source code committed to storage.',
    status: false,
    fileTypeIds: ['zip', 'jar', 'text'],
    classificationIds: ['source-code', 'ip'],
    configurationId: 'cfg-aws-1',
    scopeIds: ['s3-public-web-assets'],
    createdAt: '2026-06-20T16:05:00',
    createdBy: 'gautam',
  },
]
