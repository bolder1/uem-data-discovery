import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, FileSearch, X } from 'lucide-react'
import { useDataDiscovery } from '@/store/DataDiscoveryContext'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader, EmptyState } from '@/components/common'
import { FindingsTable, ScopeTable } from '@/components/v2/tables'
import { EvidenceDrawer } from '@/components/v2/EvidenceDrawer'
import {
  FindingFilterBar,
  applyFilters,
  activeChips,
  initialFilterState,
  FINDING_FILTERS,
  type FilterState,
} from '@/components/v2/findingFilters'
import type { Finding } from '@/types'

export function Results() {
  const { findings, configurations, updateFindingStatus } = useDataDiscovery()

  const [searchParams, setSearchParams] = useSearchParams()
  const scan = searchParams.get('scan')

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

