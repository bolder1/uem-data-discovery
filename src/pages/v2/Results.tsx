import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Search, FileSearch, X } from 'lucide-react'
import { useDataDiscovery } from '@/store/DataDiscoveryContext'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { PageHeader, EmptyState } from '@/components/common'
import { FindingsTable, ScopeTable } from '@/components/v2/tables'
import {
  FindingFilterBar,
  applyFilters,
  activeChips,
  initialFilterState,
  FINDING_FILTERS,
  type FilterState,
} from '@/components/v2/findingFilters'
import { ExposurePill } from '@/components/discovery/ScopeTable'
import { classificationById, fileTypeById } from '@/data'
import { formatBytes, formatDateTime } from '@/lib/format'
import type { Finding, FindingStatus } from '@/types'

export function Results() {
  const { findings, configurations, updateFindingStatus } = useDataDiscovery()

  const [searchParams, setSearchParams] = useSearchParams()
  const scan = searchParams.get('scan')
  const location = useLocation()
  const navigate = useNavigate()
  // Arriving from a "Run scan" flow carries where the user actually started —
  // land them back there instead of defaulting to the dashboard.
  const backTo = (location.state as { from?: string; fromLabel?: string } | null) ?? null

  const [tab, setTab] = useState('files')
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState<FilterState>(() =>
    initialFilterState({ source: searchParams.get('source') ?? 'all' }),
  )
  const [selected, setSelected] = useState<Finding | null>(null)

  // Changing a filter snaps its declared downstream keys back to "all", which is
  // what keeps the data type → data source → scope cascade consistent.
  const changeFilter = (key: string, value: string) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value }
      FINDING_FILTERS.find((d) => d.key === key)?.resets?.forEach((k) => {
        next[k] = 'all'
      })
      return next
    })
  }

  // Search + scan narrow first; the cascade filters apply on top and their
  // option lists are faceted against this base.
  const base = useMemo(
    () =>
      findings.filter((f) => {
        if (scan && f.scanId !== scan) return false
        if (
          q &&
          !`${f.fileName} ${f.filePath}`.toLowerCase().includes(q.toLowerCase())
        )
          return false
        return true
      }),
    [findings, scan, q],
  )
  const filtered = useMemo(
    () => applyFilters(base, filters, configurations),
    [base, filters, configurations],
  )

  const clearScan = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('scan')
      return next
    })
  }

  const chips = [
    q && { key: 'q', label: `“${q}”`, clear: () => setQ('') },
    scan && { key: 'scan', label: 'Latest scan', clear: clearScan },
    ...activeChips(filters, configurations).map((c) => ({
      ...c,
      clear: () => changeFilter(c.key, 'all'),
    })),
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[]

  const clearAll = () => {
    setQ('')
    setFilters(initialFilterState())
    if (scan) clearScan()
  }

  const scopeRows = configurations.flatMap((c) =>
    c.scopes.map((scope) => ({ scope, configName: c.name })),
  )
  const findingCount = (scopeId: string) =>
    findings.filter((f) => f.scopeId === scopeId).length

  const liveSelected = selected
    ? (findings.find((f) => f.id === selected.id) ?? selected)
    : null

  return (
    <div className="space-y-6">
      {backTo?.from && (
        <button
          type="button"
          onClick={() => navigate(backTo.from!)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to {backTo.fromLabel ?? 'where you started'}
        </button>
      )}
      <PageHeader
        breadcrumb={[
          { label: 'Data Discovery', to: '/data-discovery' },
          { label: 'Results' },
        ]}
        title="Results"
        description="Sensitive data discovered across your connected sources. Filter, drill down, and review evidence."
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="scopes">Containers &amp; Buckets</TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-4">
          <div className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search files…"
                  className="h-9 w-full rounded-lg border bg-card pl-9 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                />
              </div>
              <FindingFilterBar
                base={base}
                state={filters}
                onChange={changeFilter}
                configurations={configurations}
              />
            </div>

            {chips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {chips.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={f.clear}
                    className="inline-flex items-center gap-1 rounded-full border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    {f.label}
                    <X className="size-3" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {filtered.length ? (
            <Card className="p-0">
              <FindingsTable findings={filtered} onSelect={setSelected} />
            </Card>
          ) : (
            <EmptyState
              icon={FileSearch}
              title="No findings match these filters"
              description="Adjust the filters above to widen the search."
            />
          )}
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {findings.length} findings
          </p>
        </TabsContent>

        <TabsContent value="scopes">
          <Card className="p-0">
            <ScopeTable
              rows={scopeRows}
              noun="Container / Bucket"
              findingCount={findingCount}
              onOpenScope={(scopeId) => {
                changeFilter('scope', scopeId)
                setTab('files')
              }}
            />
          </Card>
        </TabsContent>
      </Tabs>

      <EvidenceDrawer
        finding={liveSelected}
        onClose={() => setSelected(null)}
        updateFindingStatus={updateFindingStatus}
      />
    </div>
  )
}

const STATUS_LABEL: Record<FindingStatus, string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  dismissed: 'Dismissed',
}

function EvidenceDrawer({
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
