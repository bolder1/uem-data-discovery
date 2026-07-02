import type { Configuration, Finding, Policy, Scope } from '@/types'

// Turns a scan over selected scopes into concrete Finding rows, so the
// Run-a-scan -> View-results loop actually produces output. Deterministic-ish
// (index-driven) with redacted, classification-appropriate evidence.

const EXT: Record<string, string> = {
  word: 'docx',
  excel: 'xlsx',
  pptx: 'pptx',
  pdf: 'pdf',
  zip: 'zip',
  jar: 'jar',
  image: 'png',
  csv: 'csv',
  text: 'txt',
}

const NOUNS = [
  'customer',
  'employee',
  'finance',
  'vendor',
  'patient',
  'payroll',
  'backup',
  'export',
  'records',
  'contract',
]

function snippet(classId: string, n: number): string {
  switch (classId) {
    case 'pci':
      return `•••• •••• •••• 4242 ×${n}`
    case 'pii':
      return `${n} name + email pairs`
    case 'phi':
      return `Diagnosis + insurance IDs ×${n}`
    case 'financial':
      return `IBAN / account numbers ×${n}`
    case 'credentials':
      return `API key / secret detected`
    case 'source-code':
      return `Proprietary source detected`
    case 'ip':
      return `Confidential material ×${n}`
    case 'legal':
      return `Signed clauses ×${n}`
    default:
      return `${n} sensitive matches`
  }
}

let seq = 0
const fid = () => `f-gen-${(seq++).toString(36)}`

/** Cap per scope so a scan doesn't flood Results. */
const PER_SCOPE_CAP = 4

export function synthesizeFindings(
  policy: Policy,
  cfg: Configuration,
  scopes: Scope[],
  scanId: string,
  at: string,
): Finding[] {
  const fileTypes = policy.fileTypeIds.length ? policy.fileTypeIds : ['pdf']
  const classes = policy.classificationIds.length ? policy.classificationIds : ['pii']
  const out: Finding[] = []

  scopes.forEach((scope, si) => {
    const count = Math.min(scope.sensitive, PER_SCOPE_CAP)
    for (let i = 0; i < count; i++) {
      const ft = fileTypes[(si + i) % fileTypes.length]
      const noun = NOUNS[(si * 3 + i) % NOUNS.length]
      const fileName = `${noun}-${scope.name}-${i + 1}.${EXT[ft] ?? 'dat'}`
      const cls = [classes[(si + i) % classes.length]]
      if (classes.length > 1 && i % 2 === 0) {
        cls.push(classes[(si + i + 1) % classes.length])
      }
      const uniqueCls = [...new Set(cls)]
      const matches = 12 + ((si + 1) * (i + 3) * 7) % 900

      out.push({
        id: fid(),
        scanId,
        status: 'open',
        configurationId: cfg.id,
        scopeId: scope.id,
        fileName,
        filePath: `${scope.name}/${noun}/${fileName}`,
        fileTypeId: ft,
        sizeBytes: 4096 + ((si + 1) * (i + 1) * 51234) % 8_000_000,
        risk: policy.risk,
        classificationIds: uniqueCls,
        publicAccess: scope.publicAccess,
        lastModified: at,
        evidence: uniqueCls.map((c) => ({
          classificationId: c,
          snippet: snippet(c, matches),
          count: matches,
        })),
      })
    }
  })

  return out
}
