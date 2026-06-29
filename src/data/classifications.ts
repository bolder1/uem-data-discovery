import type { Classification } from '@/types'

export const classifications: Classification[] = [
  {
    id: 'pii',
    label: 'Personally Identifiable Information',
    abbr: 'PII',
    description: 'Names, addresses, government IDs, dates of birth.',
  },
  {
    id: 'pci',
    label: 'Payment Card Data',
    abbr: 'PCI',
    description: 'Credit/debit card numbers, CVV, expiry.',
  },
  {
    id: 'phi',
    label: 'Protected Health Information',
    abbr: 'PHI',
    description: 'Medical records, diagnoses, insurance identifiers.',
  },
  {
    id: 'financial',
    label: 'Financial Records',
    abbr: 'FIN',
    description: 'Bank accounts, IBAN, salary and invoice data.',
  },
  {
    id: 'credentials',
    label: 'Credentials & Secrets',
    abbr: 'SEC',
    description: 'Passwords, API keys, access tokens, private keys.',
  },
  {
    id: 'source-code',
    label: 'Source Code',
    abbr: 'CODE',
    description: 'Proprietary source files and configuration.',
  },
  {
    id: 'ip',
    label: 'Intellectual Property',
    abbr: 'IP',
    description: 'Designs, contracts, roadmaps marked confidential.',
  },
  {
    id: 'legal',
    label: 'Legal & Contracts',
    abbr: 'LEGAL',
    description: 'Agreements, NDAs, and signed legal documents.',
  },
]

export const classificationById = (id: string) =>
  classifications.find((c) => c.id === id)
