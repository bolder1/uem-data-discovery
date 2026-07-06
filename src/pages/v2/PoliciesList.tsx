import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Plus,
  ShieldCheck,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useDataDiscovery } from '@/store/DataDiscoveryContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader, EmptyState } from '@/components/common'
import { PolicyTable } from '@/components/v2/tables'
import { PolicyDrawer } from '@/components/v2/PolicyDrawer'
import { useRunScanDialog } from '@/components/v2/RunScanDialog'
import { classifications } from '@/data'
import type { Policy } from '@/types'

const PAGE_SIZE = 8

export function PoliciesList() {
  const { policies, configurations } = useDataDiscovery()
  const navigate = useNavigate()
  const location = useLocation()
  const { start: startScan, dialog: runScanDialog } = useRunScanDialog()

  // The "/policies/new" route (and the links across the app that point at it)
  // open the create drawer over the list — no separate page.
  const fromRoute = location.pathname.endsWith('/new')
  const [createOpen, setCreateOpen] = useState(fromRoute)
  const seedConfigId = (location.state as { configurationId?: string } | null)
    ?.configurationId
  useEffect(() => {
    if (fromRoute) setCreateOpen(true)
  }, [fromRoute])

  const closeCreate = () => {
    setCreateOpen(false)
    if (fromRoute) navigate('/data-discovery/policies', { replace: true })
  }

  // Filters + search
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [source, setSource] = useState('all')
  const [cls, setCls] = useState('all')
  const [page, setPage] = useState(1)

  const q = query.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      policies.filter((p) => {
        if (status === 'enabled' && !p.status) return false
        if (status === 'disabled' && p.status) return false
        if (source !== 'all') {
          const ids = p.configurationIds ?? [p.configurationId]
          if (!ids.includes(source)) return false
        }
        if (cls !== 'all' && !p.classificationIds.includes(cls)) return false
        if (q && !`${p.name} ${p.description ?? ''}`.toLowerCase().includes(q))
          return false
        return true
      }),
    [policies, status, source, cls, q],
  )

  // Reset to the first page whenever the filters change.
  useEffect(() => {
    setPage(1)
  }, [query, status, source, cls])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const start = (safePage - 1) * PAGE_SIZE
  const pageRows = filtered.slice(start, start + PAGE_SIZE)

  const filtersActive =
    !!q || status !== 'all' || source !== 'all' || cls !== 'all'
  const reset = () => {
    setQuery('')
    setStatus('all')
    setSource('all')
    setCls('all')
  }

  const onRun = (policy: Policy) => {
    startScan(policy.id, policy.name)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[
          { label: 'Data Discovery', to: '/data-discovery' },
          { label: 'Policies' },
        ]}
        title="Policies"
        description="Define what to scan for — file types, classifications, and which data sources to target."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Create policy
          </Button>
        }
      />

      {policies.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No policies yet"
          description="Create your first policy to start discovering sensitive data across your connected sources."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Create policy
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search policies…"
                className="h-9 pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 w-[150px] bg-card">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="h-9 w-[170px] bg-card">
                  <SelectValue placeholder="Data source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {configurations.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={cls} onValueChange={setCls}>
                <SelectTrigger className="h-9 w-[170px] bg-card">
                  <SelectValue placeholder="Classification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classifications</SelectItem>
                  {classifications.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.abbr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filtersActive && (
                <Button variant="ghost" size="sm" onClick={reset}>
                  Clear
                </Button>
              )}
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No policies match these filters"
              description="Adjust the search or filters above to widen the results."
            />
          ) : (
            <>
              <Card className="p-0">
                <PolicyTable policies={pageRows} onRun={onRun} />
              </Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Showing {start + 1}–{start + pageRows.length} of {filtered.length}
                </p>
                {pageCount > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage === 1}
                      onClick={() => setPage(safePage - 1)}
                    >
                      <ChevronLeft className="size-4" />
                      Prev
                    </Button>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      Page {safePage} of {pageCount}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={safePage === pageCount}
                      onClick={() => setPage(safePage + 1)}
                    >
                      Next
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {createOpen && (
        <PolicyDrawer open onOpenChange={closeCreate} initialConfigId={seedConfigId} />
      )}

      {runScanDialog}
    </div>
  )
}
