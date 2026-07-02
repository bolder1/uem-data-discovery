import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  Plus,
  LayoutGrid,
  Table2,
  Search,
  ArrowUpDown,
  CalendarClock,
} from 'lucide-react'
import { providers, providerById } from '@/data'
import { useDataDiscovery } from '@/store/DataDiscoveryContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PageHeader,
  ProviderIcon,
  ConnectionStatusBadge,
} from '@/components/common'
import { ConfigureDrawer } from '@/components/v2/ConfigureDrawer'
import { formatBytes, formatDate, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Provider, ProviderCategory } from '@/types'

type View = 'catalog' | 'connections'

const VIEWS: { id: View; icon: typeof LayoutGrid; label: string }[] = [
  { id: 'catalog', icon: LayoutGrid, label: 'Catalog' },
  { id: 'connections', icon: Table2, label: 'Connections' },
]

const CATEGORIES: (ProviderCategory | 'all')[] = [
  'all',
  'Cloud Storage',
  'Database',
  'SaaS',
  'Endpoint',
]

const STATUSES = [
  { value: 'all', label: 'Any status' },
  { value: 'connected', label: 'Connected' },
  { value: 'not-connected', label: 'Not connected' },
  { value: 'coming-soon', label: 'Coming soon' },
]

const SORTS = [
  { value: 'default', label: 'Default order' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'sources', label: 'Most sources' },
  { value: 'data', label: 'Most data' },
  { value: 'sensitive', label: 'Most sensitive' },
  { value: 'recent', label: 'Recently added' },
]

const statusOf = (comingSoon: boolean | undefined, count: number) =>
  comingSoon ? 'coming-soon' : count > 0 ? 'connected' : 'not-connected'

function useStats() {
  const { configurations } = useDataDiscovery()
  return (p: Provider) => {
    const cfgs = configurations.filter((c) => c.providerId === p.id)
    const allScopes = cfgs.flatMap((c) => c.scopes)
    const lastAdded = cfgs.length
      ? cfgs.map((c) => c.createdAt).sort().at(-1)
      : undefined
    return {
      count: cfgs.length,
      scopes: allScopes.length,
      sensitive: allScopes.reduce((n, s) => n + s.sensitive, 0),
      data: allScopes.reduce((n, s) => n + s.sizeBytes, 0),
      lastAdded,
    }
  }
}

/* --------------------------------- segmented ------------------------------ */

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; icon?: typeof LayoutGrid; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex items-center rounded-lg border bg-card p-0.5">
      {options.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            value === id
              ? 'bg-secondary text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {Icon && <Icon className="size-3.5" />}
          <span className={Icon ? 'hidden sm:inline' : undefined}>{label}</span>
        </button>
      ))}
    </div>
  )
}

function CategoryChips({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {CATEGORIES.map((c) => (
        <button
          key={c}
          type="button"
          aria-pressed={value === c}
          onClick={() => onChange(c)}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            value === c
              ? 'border-brand bg-brand/10 text-brand'
              : 'border-border bg-card text-muted-foreground hover:text-foreground',
          )}
        >
          {c === 'all' ? 'All' : c}
        </button>
      ))}
    </div>
  )
}

/* ---------------------------------- page ---------------------------------- */

export function SourcesCatalog() {
  const [searchParams] = useSearchParams()
  const initialCategory = searchParams.get('category') ?? 'all'

  const [view, setView] = useState<View>('catalog')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(initialCategory)
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('default')

  const reset = () => {
    setQuery('')
    setCategory('all')
    setStatus('all')
    setSort('default')
  }
  const filtersActive =
    !!query.trim() || category !== 'all' || status !== 'all' || sort !== 'default'

  const filters = { query, category, status, sort }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Data Sources"
        description="Connect cloud storage, databases, SaaS apps, and endpoints, then scan them for sensitive data."
        actions={<Segmented options={VIEWS} value={view} onChange={setView} />}
      />

      {/* Filter bar — shared across both views */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search data sources…"
              className="h-9 pl-9"
            />
          </div>
          <div className="flex items-center gap-3">
            {view === 'catalog' && (
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 w-full lg:w-40">
                  <SelectValue placeholder="Any status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="h-9 w-full gap-2 lg:w-44">
                <ArrowUpDown className="size-3.5 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CategoryChips value={category} onChange={setCategory} />
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={reset}>
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {view === 'catalog' ? (
        <CatalogView filters={filters} reset={reset} filtersActive={filtersActive} />
      ) : (
        <ConnectionsView filters={filters} />
      )}
    </div>
  )
}

type Filters = { query: string; category: string; status: string; sort: string }

/* ------------------------------------ catalog ----------------------------- */

const CARD_SURFACE =
  'group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card p-4 text-card-foreground shadow-sm animate-in fade-in fill-mode-both duration-300'
const CARD_INTERACTIVE =
  'cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg focus-visible:-translate-y-1 focus-visible:border-brand/40 focus-visible:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40'

function CardGlow() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/[0.08] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
      />
    </>
  )
}

function StatusLine({ comingSoon, count }: { comingSoon?: boolean; count: number }) {
  const dot = 'size-1.5 shrink-0 rounded-full'
  if (comingSoon)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className={cn(dot, 'bg-amber-400')} />
        Coming soon
      </span>
    )
  if (count > 0)
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
        <span className={cn(dot, 'bg-emerald-500')} />
        {count} connected
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn(dot, 'bg-muted-foreground/40')} />
      Not connected
    </span>
  )
}

function CatalogView({
  filters,
  reset,
  filtersActive,
}: {
  filters: Filters
  reset: () => void
  filtersActive: boolean
}) {
  const navigate = useNavigate()
  const stats = useStats()
  const [configureProvider, setConfigureProvider] = useState<Provider | null>(null)

  const q = filters.query.trim().toLowerCase()
  let rows = providers
    .map((p) => ({ p, st: stats(p) }))
    .filter(({ p, st }) => {
      const matchesQuery =
        !q || `${p.name} ${p.vendor} ${p.category}`.toLowerCase().includes(q)
      const matchesCategory =
        filters.category === 'all' || p.category === filters.category
      const matchesStatus =
        filters.status === 'all' ||
        statusOf(p.comingSoon, st.count) === filters.status
      return matchesQuery && matchesCategory && matchesStatus
    })

  if (filters.sort !== 'default') {
    rows = [...rows].sort((a, b) => {
      switch (filters.sort) {
        case 'name':
          return a.p.name.localeCompare(b.p.name)
        case 'sources':
          return b.st.scopes - a.st.scopes
        case 'data':
          return b.st.data - a.st.data
        case 'sensitive':
          return b.st.sensitive - a.st.sensitive
        case 'recent':
          return (b.st.lastAdded ?? '').localeCompare(a.st.lastAdded ?? '')
        default:
          return 0
      }
    })
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
        No data sources match these filters.
        {filtersActive && (
          <Button variant="outline" size="sm" onClick={reset}>
            Clear filters
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      <p className="-mt-2 text-xs text-muted-foreground">
        Showing {rows.length} of {providers.length} sources
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {rows.map(({ p, st }, i) => {
          const { count, lastAdded } = st
          const configured = !p.comingSoon && count > 0
          const delay = { animationDelay: `${Math.min(i, 10) * 25}ms` }

          const icon = (
            <ProviderIcon
              providerId={p.id}
              size="md"
              muted={!configured}
              liftOnHover={!configured && !p.comingSoon}
            />
          )

          const body = (
            <div className="relative flex flex-1 flex-col">
              <div className="flex items-center gap-3">
                {icon}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-tight text-foreground">
                    {p.name}
                  </p>
                  <div className="mt-1">
                    <StatusLine comingSoon={p.comingSoon} count={count} />
                  </div>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 flex-1 text-xs leading-relaxed text-muted-foreground">
                {p.description}
              </p>
            </div>
          )

          if (configured) {
            return (
              <Link
                key={p.id}
                to={`/data-discovery/sources/${p.id}`}
                style={delay}
                aria-label={`${p.name}, ${count} connected — open details`}
                className={cn(CARD_SURFACE, CARD_INTERACTIVE)}
              >
                <CardGlow />
                {body}
                <div className="relative mt-3 flex items-center justify-between gap-2 border-t pt-3">
                  <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarClock aria-hidden className="size-3.5 shrink-0" />
                    <span className="truncate">Modified {formatDate(lastAdded)}</span>
                  </span>
                  <ArrowRight
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand"
                  />
                </div>
              </Link>
            )
          }

          if (!p.comingSoon) {
            return (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                style={delay}
                aria-label={`Configure ${p.name}`}
                onClick={() => setConfigureProvider(p)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setConfigureProvider(p)
                  }
                }}
                className={cn(CARD_SURFACE, CARD_INTERACTIVE)}
              >
                <CardGlow />
                {body}
                <div className="relative mt-3 flex items-center justify-between gap-2 border-t pt-3 text-xs font-medium text-brand">
                  <span className="inline-flex items-center gap-1.5">
                    <Plus aria-hidden className="size-3.5" />
                    Configure
                  </span>
                  <ArrowRight
                    aria-hidden
                    className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </div>
              </div>
            )
          }

          return (
            <div
              key={p.id}
              style={delay}
              className={cn(CARD_SURFACE, 'border-dashed bg-muted/40 shadow-none')}
            >
              <span className="absolute right-2 top-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                Soon
              </span>
              {body}
              <div className="mt-3 border-t border-dashed pt-3 text-xs text-muted-foreground">
                Available soon
              </div>
            </div>
          )
        })}
      </div>

      {configureProvider && (
        <ConfigureDrawer
          provider={configureProvider}
          open
          onOpenChange={(o) => {
            if (!o) setConfigureProvider(null)
          }}
          onAdded={() =>
            navigate(`/data-discovery/sources/${configureProvider.id}`)
          }
        />
      )}
    </>
  )
}

/* ---------------------------------- connections --------------------------- */

function ConnectionsView({ filters }: { filters: Filters }) {
  const { configurations, findings } = useDataDiscovery()
  const navigate = useNavigate()

  const q = filters.query.trim().toLowerCase()
  let rows = configurations.map((c) => {
    const provider = providerById(c.providerId)
    return {
      cfg: c,
      provider,
      scopes: c.scopes.length,
      sensitive: c.scopes.reduce((n, s) => n + s.sensitive, 0),
      findings: findings.filter((f) => f.configurationId === c.id).length,
      data: c.scopes.reduce((n, s) => n + s.sizeBytes, 0),
      lastScan: c.scopes.map((s) => s.lastScan).filter(Boolean).sort().at(-1),
    }
  })

  rows = rows.filter(({ cfg, provider }) => {
    const matchesQuery =
      !q ||
      `${cfg.name} ${provider?.name ?? ''} ${provider?.category ?? ''}`
        .toLowerCase()
        .includes(q)
    const matchesCategory =
      filters.category === 'all' || provider?.category === filters.category
    return matchesQuery && matchesCategory
  })

  if (filters.sort !== 'default') {
    rows = [...rows].sort((a, b) => {
      switch (filters.sort) {
        case 'name':
          return a.cfg.name.localeCompare(b.cfg.name)
        case 'sources':
          return b.scopes - a.scopes
        case 'data':
          return b.data - a.data
        case 'sensitive':
          return b.sensitive - a.sensitive
        case 'recent':
          return b.cfg.createdAt.localeCompare(a.cfg.createdAt)
        default:
          return 0
      }
    })
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
        No connections match these filters.
      </div>
    )
  }

  return (
    <>
      <p className="-mt-2 text-xs text-muted-foreground">
        {rows.length} {rows.length === 1 ? 'connection' : 'connections'}
      </p>
      <Card className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40 hover:bg-secondary/40">
              <TableHead>Connection</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Scopes</TableHead>
              <TableHead>Sensitive</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Last scan</TableHead>
              <TableHead className="w-10 text-center" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ cfg, provider, scopes, sensitive, data, lastScan }) => (
              <TableRow
                key={cfg.id}
                className="cursor-pointer hover:bg-accent/40"
                onClick={() =>
                  navigate(`/data-discovery/sources/${cfg.providerId}`)
                }
              >
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <ProviderIcon providerId={cfg.providerId} size="sm" />
                    <div className="min-w-0 leading-tight">
                      <p className="truncate font-medium text-foreground">
                        {cfg.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {provider?.name}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <ConnectionStatusBadge status={cfg.status} />
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {scopes}
                </TableCell>
                <TableCell className="font-medium tabular-nums text-foreground">
                  {sensitive}
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {formatBytes(data)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {lastScan ? formatDateTime(lastScan) : '—'}
                </TableCell>
                <TableCell className="text-center">
                  <ArrowRight className="inline size-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  )
}
