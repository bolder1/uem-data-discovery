import type { DlpClassification, Label, Rule } from '@/types'

// ---------------------------------------------------------------------------
// Labels — sensitivity tags attached to a classification.

export const seedLabels: Label[] = [
  { id: 'lbl-confidential', name: 'Confidential', isDefault: true },
  { id: 'lbl-highly-confidential', name: 'Highly Confidential', isDefault: true },
  { id: 'lbl-internal', name: 'Internal', isDefault: true },
  { id: 'lbl-public', name: 'Public', isDefault: true },
  { id: 'lbl-restricted', name: 'Restricted', isDefault: true },
  { id: 'lbl-code', name: 'Code', isDefault: false },
  { id: 'lbl-gautam', name: 'Gautam', isDefault: false },
  { id: 'lbl-ip', name: 'IP', isDefault: false },
]

export const labelById = (id: string) => seedLabels.find((l) => l.id === id)

// ---------------------------------------------------------------------------
// Rule Dictionary — shared, prebuilt detection rules. Grouped by category so
// the picker reads like a real DLP rule set rather than a flat list.

const usState = (state: string) => `Driver's license number – ${state}(USA)`

export const seedRuleDictionary: Rule[] = [
  ...[
    'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine',
    'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  ].map((state, i) => ({
    id: `rule-dl-${state.toLowerCase()}`,
    name: usState(state),
    category: "Driver's license number",
    isDefault: true,
    criteria: [
      { type: 'Regex' as const, occurrences: 1, value: `DL-${String(i + 1).padStart(2, '0')}-[A-Z0-9]{8,10}` },
    ],
  })),
  {
    id: 'rule-ssn',
    name: 'Social Security Number (USA)',
    category: 'Government ID',
    isDefault: true,
    criteria: [{ type: 'Regex', occurrences: 1, value: '\\d{3}-\\d{2}-\\d{4}' }],
  },
  {
    id: 'rule-aadhaar',
    name: 'Aadhaar Number (India)',
    category: 'Government ID',
    isDefault: true,
    criteria: [{ type: 'Regex', occurrences: 1, value: '\\d{4}\\s?\\d{4}\\s?\\d{4}' }],
  },
  {
    id: 'rule-pan',
    name: 'PAN Number (India)',
    category: 'Government ID',
    isDefault: true,
    criteria: [{ type: 'Regex', occurrences: 1, value: '[A-Z]{5}\\d{4}[A-Z]' }],
  },
  {
    id: 'rule-passport-us',
    name: 'Passport Number (USA)',
    category: 'Government ID',
    isDefault: true,
    criteria: [{ type: 'Regex', occurrences: 1, value: '[0-9]{9}' }],
  },
  {
    id: 'rule-credit-card',
    name: 'Credit Card Number',
    category: 'Payment Data',
    isDefault: true,
    criteria: [{ type: 'Regex', occurrences: 1, value: '\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}' }],
  },
  {
    id: 'rule-cvv',
    name: 'Card Verification Value (CVV)',
    category: 'Payment Data',
    isDefault: true,
    criteria: [{ type: 'Regex', occurrences: 1, value: '\\b\\d{3,4}\\b' }],
  },
  {
    id: 'rule-iban',
    name: 'IBAN Number',
    category: 'Payment Data',
    isDefault: true,
    criteria: [{ type: 'Regex', occurrences: 1, value: '[A-Z]{2}\\d{2}[A-Z0-9]{10,30}' }],
  },
  {
    id: 'rule-email',
    name: 'Email Address',
    category: 'Contact Info',
    isDefault: true,
    criteria: [{ type: 'Regex', occurrences: 1, value: '[\\w.+-]+@[\\w-]+\\.[a-zA-Z]{2,}' }],
  },
  {
    id: 'rule-phone',
    name: 'Phone Number',
    category: 'Contact Info',
    isDefault: true,
    criteria: [{ type: 'Regex', occurrences: 1, value: '\\+?\\d{1,3}[-.\\s]?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}' }],
  },
  {
    id: 'rule-api-key',
    name: 'API Key / Access Token',
    category: 'Credentials & Secrets',
    isDefault: true,
    criteria: [{ type: 'Keyword', occurrences: 1, value: 'api_key, access_token, secret_key' }],
  },
  {
    id: 'rule-aws-key',
    name: 'AWS Access Key ID',
    category: 'Credentials & Secrets',
    isDefault: true,
    criteria: [{ type: 'Regex', occurrences: 1, value: 'AKIA[0-9A-Z]{16}' }],
  },
  {
    id: 'rule-private-key',
    name: 'Private Key Block',
    category: 'Credentials & Secrets',
    isDefault: true,
    criteria: [{ type: 'Keyword', occurrences: 1, value: '-----BEGIN PRIVATE KEY-----' }],
  },
  {
    id: 'rule-ip-address',
    name: 'IP Address',
    category: 'Network',
    isDefault: true,
    criteria: [{ type: 'Regex', occurrences: 1, value: '\\b\\d{1,3}(\\.\\d{1,3}){3}\\b' }],
  },
  {
    id: 'rule-source-code',
    name: 'Source Code File',
    category: 'Intellectual Property',
    isDefault: true,
    criteria: [{ type: 'File Extension', occurrences: 1, value: '.js, .ts, .py, .java, .go' }],
  },
]

export const ruleById = (id: string) => seedRuleDictionary.find((r) => r.id === id)

// ---------------------------------------------------------------------------
// Classifications — Default (seeded, read-only) and Custom (user-editable).

const now = '2026-07-06T09:00:00.000Z'

export const seedDefaultClassifications: DlpClassification[] = [
  {
    id: 'cls-hipaa',
    name: 'HIPPA',
    description: 'Medical Records and Personal Info',
    labelIds: ['lbl-confidential'],
    ruleIds: [],
    customRules: [],
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'cls-indian-pii',
    name: 'Indian PII',
    description: 'Indian PII',
    labelIds: ['lbl-confidential'],
    ruleIds: ['rule-aadhaar', 'rule-pan'],
    customRules: [],
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'cls-pii',
    name: 'PII',
    description: 'Indian Identity Information',
    labelIds: ['lbl-highly-confidential'],
    ruleIds: ['rule-aadhaar', 'rule-pan', 'rule-passport-us'],
    customRules: [],
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  },
]

const day = (offset: number) =>
  new Date(Date.UTC(2026, 5, 25 - offset, 9, 30)).toISOString()

export const seedCustomClassifications: DlpClassification[] = [
  {
    id: 'cls-all-files',
    name: 'all files',
    description: 'all files',
    labelIds: [],
    ruleIds: [],
    customRules: [],
    isDefault: false,
    createdAt: day(30),
    updatedAt: '2026-03-26T09:39:13.000Z',
  },
  {
    id: 'cls-awd',
    name: 'awd',
    description: 'as',
    labelIds: [],
    ruleIds: [],
    customRules: [],
    isDefault: false,
    createdAt: day(1),
    updatedAt: '2025-07-25T10:33:18.000Z',
  },
  {
    id: 'cls-confidential',
    name: 'Confidential',
    description: 'confidential',
    labelIds: ['lbl-confidential'],
    ruleIds: ['rule-email', 'rule-credit-card'],
    customRules: [],
    isDefault: false,
    createdAt: day(2),
    updatedAt: '2026-06-01T06:40:01.000Z',
  },
  {
    id: 'cls-data-discovery',
    name: 'data discovery',
    description: 'source code',
    labelIds: ['lbl-code'],
    ruleIds: ['rule-source-code'],
    customRules: [],
    isDefault: false,
    createdAt: day(3),
    updatedAt: '2025-12-08T12:27:39.000Z',
  },
  {
    id: 'cls-default-scanning',
    name: 'default scanning',
    description: 'default scanning',
    labelIds: [],
    ruleIds: [],
    customRules: [],
    isDefault: false,
    createdAt: day(4),
    updatedAt: '2026-01-02T05:48:13.000Z',
  },
  {
    id: 'cls-ead',
    name: 'ead',
    description: 's',
    labelIds: [],
    ruleIds: [],
    customRules: [],
    isDefault: false,
    createdAt: day(5),
    updatedAt: '2025-07-25T10:04:36.000Z',
  },
  {
    id: 'cls-edge',
    name: 'edge',
    description: 'sd',
    labelIds: [],
    ruleIds: [],
    customRules: [],
    isDefault: false,
    createdAt: day(6),
    updatedAt: '2025-07-25T09:48:11.000Z',
  },
  {
    id: 'cls-edge-1',
    name: 'edge (1)',
    description: 'sd',
    labelIds: [],
    ruleIds: [],
    customRules: [],
    isDefault: false,
    createdAt: day(6),
    updatedAt: '2025-07-25T09:48:12.000Z',
  },
  {
    id: 'cls-edge-2',
    name: 'edge (2)',
    description: 'sd',
    labelIds: [],
    ruleIds: [],
    customRules: [],
    isDefault: false,
    createdAt: day(6),
    updatedAt: '2025-07-25T09:48:12.000Z',
  },
  {
    id: 'cls-edge-3',
    name: 'edge (3)',
    description: 'sd',
    labelIds: [],
    ruleIds: [],
    customRules: [],
    isDefault: false,
    createdAt: day(6),
    updatedAt: '2025-07-25T09:48:12.000Z',
  },
]
