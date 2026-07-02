import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, FileSearch, X } from 'lucide-react'
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
import { PageHeader, EmptyState } from '@/components/common'
import { FindingsTable, ScopeTable } from '@/components/v2/tables'
import { ListToggle, FindingCards, type ListView } from '@/components/v2/cards'
import { EvidenceDrawer } from '@/components/v2/EvidenceDrawer'
import { classifications } from '@/data'
import type { Finding } from '@/types'

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

