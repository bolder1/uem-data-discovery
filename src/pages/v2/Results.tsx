import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, FileSearch, ShieldAlert, Globe, HardDrive, X } from 'lucide-react'
import { useDataDiscovery } from '@/store/DataDiscoveryContext'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import {
  PageHeader,
  SummaryCard,
  EmptyState,
  RiskBadge,
} from '@/components/common'
import { FindingsTable, ScopeTable } from '@/components/v2/tables'
import { ListToggle, FindingCards, type ListView } from '@/components/v2/cards'
import { ExposurePill } from '@/components/discovery/ScopeTable'
import { classifications, classificationById, fileTypeById } from '@/data'
import { formatBytes, formatDateTime } from '@/lib/format'
import type { Finding, FindingStatus } from '@/types'

export function Results() {
  const { findings, configurations, updateFindingStatus } = useDataDiscovery()

  const [searchParams, setSearchParams] = useSearchParams()
  const scan = searchParams.get('scan')

  const [tab, setTab] = useState('files')
  const [q, setQ] = useState('')
  const [source, setSource] = useState(() => searchParams.get('source') ?? 'all')
  const [cls, setCls] = useState('all')
  const [risk, setRisk] = useState('all')
  const [exposure, setExposure] = useState('all')
  const [scope, setScope] = useState('all')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState<Finding | null>(null)
  const [view, setView] = useState<ListView>('table')

  const filtered = useMemo(() => {
    return findings.filter((f) => {
      if (scan && f.scanId !== scan) return false
      if (source !== 'all' && f.configurationId !== source) return false
      if (cls !== 'all' && !f.classificationIds.includes(cls)) return false
      if (risk !== 'all' && f.risk !== risk) return false
      if (exposure === 'public' && !f.publicAccess) return false
      if (exposure === 'private' && f.publicAccess) return false
      if (scope !== 'all' && f.scopeId !== scope) return false
      if (status !== 'all' && (f.status ?? 'open') !== status) return false
      if (q && !`${f.fileName} ${f.filePath}`.toLowerCase().includes(q.toLowerCase()))
        return false
      return true
    })
  }, [findings, scan, source, cls, risk, exposure, scope, status, q])

  const clearScan = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('scan')
      return next
    })
  }

  const elevated = findings.filter(
    (f) => f.risk === 'high' || f.risk === 'critical',
  ).length
  const exposed = findings.filter((f) => f.publicAccess).length
  const dataScanned = configurations
    .flatMap((c) => c.scopes)
    .reduce((n, s) => n + s.sizeBytes, 0)

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
      <PageHeader
        breadcrumb={[
          { label: 'Data Discovery', to: '/data-discovery' },
          { label: 'Results' },
        ]}
        title="Results"
        description="Sensitive data discovered across your connected sources. Filter, drill down, and review evidence."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Sensitive files"
          value={findings.length}
          icon={FileSearch}
          iconClass="bg-brand/10 text-brand"
        />
        <SummaryCard
          label="High & critical"
          value={elevated}
          icon={ShieldAlert}
          iconClass="bg-brand/10 text-brand"
        />
        <SummaryCard
          label="Publicly exposed"
          value={exposed}
          icon={Globe}
          iconClass="bg-brand/10 text-brand"
        />
        <SummaryCard
          label="Data scanned"
          value={formatBytes(dataScanned)}
          icon={HardDrive}
          iconClass="bg-brand/10 text-brand"
        />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="scopes">Containers &amp; Buckets</TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-4">
          {scan && (
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-secondary px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                Showing findings from the latest scan
              </span>
              <button
                type="button"
                onClick={clearScan}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                <X className="size-3.5" />
                Clear
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search files…"
                className="h-9 w-full rounded-lg border bg-card pl-9 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </div>
            <FilterSelect
              value={source}
              onChange={setSource}
              placeholder="Source"
              options={[
                { value: 'all', label: 'All sources' },
                ...configurations.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            <FilterSelect
              value={scope}
              onChange={setScope}
              placeholder="Scope"
              options={[
                { value: 'all', label: 'All scopes' },
                ...configurations
                  .flatMap((c) => c.scopes)
                  .map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
            <FilterSelect
              value={cls}
              onChange={setCls}
              placeholder="Classification"
              options={[
                { value: 'all', label: 'All classifications' },
                ...classifications.map((c) => ({ value: c.id, label: c.abbr })),
              ]}
            />
            <FilterSelect
              value={risk}
              onChange={setRisk}
              placeholder="Risk"
              options={[
                { value: 'all', label: 'All risk' },
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'critical', label: 'Critical' },
              ]}
            />
            <FilterSelect
              value={exposure}
              onChange={setExposure}
              placeholder="Exposure"
              options={[
                { value: 'all', label: 'All exposure' },
                { value: 'public', label: 'Public' },
                { value: 'private', label: 'Private' },
              ]}
            />
            <FilterSelect
              value={status}
              onChange={setStatus}
              placeholder="Status"
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'open', label: 'Open' },
                { value: 'acknowledged', label: 'Acknowledged' },
                { value: 'dismissed', label: 'Dismissed' },
              ]}
            />
            <ListToggle value={view} onChange={setView} />
          </div>

          {filtered.length ? (
            view === 'cards' ? (
              <FindingCards findings={filtered} onSelect={setSelected} />
            ) : (
              <Card className="p-0">
                <FindingsTable findings={filtered} onSelect={setSelected} />
              </Card>
            )
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
                setScope(scopeId)
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

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  options: { value: string; label: string }[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[150px] bg-card">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
