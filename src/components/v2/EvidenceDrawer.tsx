import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { RiskBadge } from '@/components/common'
import { ExposurePill } from '@/components/discovery/ScopeTable'
import { classificationById, fileTypeById } from '@/data'
import { formatBytes, formatDateTime } from '@/lib/format'
import type { Finding, FindingStatus } from '@/types'

const STATUS_LABEL: Record<FindingStatus, string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  dismissed: 'Dismissed',
}

export function EvidenceDrawer({
  finding,
  onClose,
  updateFindingStatus,
}: {
  finding: Finding | null
  onClose: () => void
  updateFindingStatus: (id: string, status: FindingStatus) => void
}) {
  const exportEvidence = (f: Finding) => {
    const blob = new Blob([JSON.stringify(f, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = f.fileName + '.evidence.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const currentStatus: FindingStatus = finding?.status ?? 'open'

  return (
    <Sheet open={!!finding} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {finding && (
          <>
            <SheetHeader>
              <SheetTitle className="break-all">{finding.fileName}</SheetTitle>
              <SheetDescription className="break-all">
                {finding.filePath}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-5 px-4 pb-6">
              <div className="flex flex-wrap items-center gap-2">
                <RiskBadge risk={finding.risk} />
                <ExposurePill public={finding.publicAccess} />
                <span className="rounded-full border bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  {fileTypeById(finding.fileTypeId)?.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Meta label="Size" value={formatBytes(finding.sizeBytes)} />
                <Meta
                  label="Last modified"
                  value={formatDateTime(finding.lastModified)}
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Classifications
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {finding.classificationIds.map((id) => (
                    <span
                      key={id}
                      className="rounded-md border bg-secondary px-2 py-1 text-xs font-medium"
                    >
                      {classificationById(id)?.label}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Evidence
                </p>
                <div className="space-y-2">
                  {finding.evidence.map((e, i) => (
                    <div key={i} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          {classificationById(e.classificationId)?.label}
                        </span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {e.count.toLocaleString()} matches
                        </span>
                      </div>
                      <code className="mt-1.5 block rounded bg-secondary px-2 py-1 font-mono text-xs text-foreground">
                        {e.snippet}
                      </code>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Matched values are redacted. Full evidence is available in the
                  audit log to authorised reviewers.
                </p>
              </div>

              <div className="border-t pt-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </span>
                  <span className="rounded-full border bg-secondary px-2 py-0.5 text-xs font-medium text-foreground">
                    {STATUS_LABEL[currentStatus]}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateFindingStatus(
                        finding.id,
                        currentStatus === 'acknowledged' ? 'open' : 'acknowledged',
                      )
                    }
                  >
                    {currentStatus === 'acknowledged' ? 'Reopen' : 'Acknowledge'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateFindingStatus(
                        finding.id,
                        currentStatus === 'dismissed' ? 'open' : 'dismissed',
                      )
                    }
                  >
                    {currentStatus === 'dismissed' ? 'Reopen' : 'Dismiss'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportEvidence(finding)}
                  >
                    Export evidence
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
