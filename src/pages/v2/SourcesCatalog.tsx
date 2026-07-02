import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpDown,
  Boxes,
  CalendarClock,
  DatabaseZap,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Store,
  Trash2,
} from 'lucide-react'
import { providerById, providers } from '@/data'
import { useDataDiscovery } from '@/store/DataDiscoveryContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ConnectionStatusBadge,
  EmptyState,
  PageHeader,
  ProviderIcon,
} from '@/components/common'
import { ConfigureDrawer } from '@/components/v2/ConfigureDrawer'
import { STATUS_META, formatBytes, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Configuration, ConnectionStatus, Provider } from '@/types'

/* The page splits into two jobs-to-be-done:
   — "Configured": everything already connected, as a dense manageable table.
   — "Connector Store": the marketplace of every connector we can add.
   The active tab lives in the URL (?tab=…) so deep links and back/forward
   keep working; first visit lands on whichever tab has something to show. */

export function SourcesCatalog() {
  const { configurations } = useDataDiscovery()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab =
    searchParams.get('tab') ?? (configurations.length ? 'configured' : 'store')
  const setTab = (v: string) =>
    setSearchParams(
      (p) => {
        p.set('tab', v)
        return p
      },
      { replace: true },
    )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Data Sources"
        description="Manage your configured connectors, or browse the store to connect a new source."
        actions={
          tab === 'configured' && configurations.length > 0 ? (
            <Button onClick={() => setTab('store')}>
              <Plus className="size-4" />
              Add connector
            </Button>
          ) : undefined
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList>
          <TabsTrigger value="configured">
            <Boxes className="size-4" />
            Configured
            <span className="ml-1 text-xs text-muted-foreground">
              {configurations.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="store">
            <Store className="size-4" />
            Connector Store
            <span className="ml-1 text-xs text-muted-foreground">
              {providers.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configured" className="flex flex-col gap-4">
          <ConfiguredTab onBrowseStore={() => setTab('store')} />
        </TabsContent>
        <TabsContent value="store" className="flex flex-col gap-4">
          <StoreTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* ---------------------------------- Configured ---------------------------------- */
/* One row per connection across all providers. Rows open the provider detail;
   per-row actions cover edit and removal (with a dependency-naming confirm). */

const CONNECTION_STATUSES = Object.entries(STATUS_META) as [
  ConnectionStatus,
  { label: string },
][]

function ConfiguredTab({ onBrowseStore }: { onBrowseStore: () => void }) {
  const navigate = useNavigate()
  const { configurations, policies, deleteConfiguration } = useDataDiscovery()
  const [query, setQuery] = useState('')
  const [providerFilter, setProviderFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editConfig, setEditConfig] = useState<Configuration | null>(null)
  const [removeConfig, setRemoveConfig] = useState<Configuration | null>(null)

  if (configurations.length === 0) {
    return (
      <EmptyState
        icon={DatabaseZap}
        title="No connectors configured yet"
        description="Connect your first data source from the connector store, then create a policy and run a scan."
        action={
          <Button onClick={onBrowseStore}>
            <Store className="size-4" />
            Browse connector store
          </Button>
        }
      />
    )
  }

  // Only providers that actually have connections show up as filter options.
  const connectedProviders = providers.filter((p) =>
    configurations.some((c) => c.providerId === p.id),
  )

  const q = query.trim().toLowerCase()
  const rows = configurations
    .filter((c) => {
      const provider = providerById(c.providerId)
      const matchesQuery =
        !q ||
        `${c.name} ${provider?.name ?? ''} ${provider?.vendor ?? ''}`
          .toLowerCase()
          .includes(q)
      const matchesProvider =
        providerFilter === 'all' || c.providerId === providerFilter
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter
      return matchesQuery && matchesProvider && matchesStatus
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const dependentPolicyCount = (cfg: Configuration) =>
    policies.filter((p) =>
      (p.configurationIds ?? [p.configurationId]).includes(cfg.id),
    ).length

  const filtersActive =
    !!q || providerFilter !== 'all' || statusFilter !== 'all'
  const reset = () => {
    setQuery('')
    setProviderFilter('all')
    setStatusFilter('all')
  }

  const editProvider = editConfig && providerById(editConfig.providerId)
  const removeDependents = removeConfig ? dependentPolicyCount(removeConfig) : 0

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search configured connectors…"
            className="h-9 pl-9"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex">
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="h-9 w-full lg:w-48">
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {connectedProviders.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-full lg:w-40">
              <SelectValue placeholder="Any status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any status</SelectItem>
              {CONNECTION_STATUSES.map(([value, meta]) => (
                <SelectItem key={value} value={value}>
                  {meta.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          No configured connectors match these filters.
          {filtersActive && (
            <Button variant="outline" size="sm" onClick={reset}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <Card className="gap-0 overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                <TableHead>Configuration</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead className="text-right">Sensitive</TableHead>
                <TableHead className="text-right">Data</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-12 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((cfg) => {
                const provider = providerById(cfg.providerId)
                if (!provider) return null
                const sensitive = cfg.scopes.reduce((n, s) => n + s.sensitive, 0)
                const size = cfg.scopes.reduce((n, s) => n + s.sizeBytes, 0)
                return (
                  <TableRow
                    key={cfg.id}
                    className="cursor-pointer hover:bg-accent/40"
                    onClick={() =>
                      navigate(`/data-discovery/sources/${provider.id}`)
                    }
                  >
                    <TableCell>
                      <p className="font-medium text-foreground">{cfg.name}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <ProviderIcon providerId={provider.id} size="sm" />
                        <div className="leading-tight">
                          <p className="text-sm text-foreground">
                            {provider.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {provider.category}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ConnectionStatusBadge status={cfg.status} pill />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {cfg.scopes.length}{' '}
                      {(cfg.scopes.length === 1
                        ? provider.scopeNoun
                        : provider.scopeNounPlural
                      ).toLowerCase()}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right tabular-nums',
                        sensitive > 0
                          ? 'font-medium text-foreground'
                          : 'text-muted-foreground',
                      )}
                    >
                      {sensitive}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                      {formatBytes(size)}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(cfg.createdAt)}
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        by {cfg.createdBy}
                      </p>
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Actions for ${cfg.name}`}
                            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          >
                            <MoreVertical className="size-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              navigate(`/data-discovery/sources/${provider.id}`)
                            }
                          >
                            <ArrowRight className="size-4" />
                            Open source
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditConfig(cfg)}>
                            <Pencil className="size-4" />
                            Edit configuration
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setRemoveConfig(cfg)}
                          >
                            <Trash2 className="size-4" />
                            Remove connection
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {editConfig && editProvider && (
        <ConfigureDrawer
          provider={editProvider}
          editConfig={editConfig}
          open
          onOpenChange={(o) => {
            if (!o) setEditConfig(null)
          }}
        />
      )}

      <AlertDialog
        open={!!removeConfig}
        onOpenChange={(o) => {
          if (!o) setRemoveConfig(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove connection?</AlertDialogTitle>
            <AlertDialogDescription>
              “{removeConfig?.name}” will be removed. {removeDependents}{' '}
              {removeDependents === 1 ? 'policy targets' : 'policies target'}{' '}
              this connection and will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeConfig) deleteConfiguration(removeConfig.id)
                setRemoveConfig(null)
              }}
            >
              Remove connection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/* ------------------------------------ Store ------------------------------------ */
/* Marketplace of every connector. Not-yet-connected sources offer a first-time
   Configure action right on the card; connected ones link to their detail page. */

// Connection status as a quiet line under the provider name (dot + short text),
// not a pill to the right of the name — so the name keeps the full card width
// and never gets squeezed on narrow / laptop screens.
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

const CATEGORIES = [...new Set(providers.map((p) => p.category))]

const STATUSES = [
  { value: 'all', label: 'Any status' },
  { value: 'connected', label: 'Connected' },
  { value: 'not-connected', label: 'Not connected' },
  { value: 'coming-soon', label: 'Coming soon' },
]

// "by data / by buckets" → these are orderings, not filters (you don't filter
// "= 5 buckets"), so they live here as sorts. Bucket/folder/container counts all
// roll up to `scopes`, which is provider-agnostic.
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

// Shared card surface so every state looks identical; the two actionable
// states layer on the interactive (glass lift) classes, coming-soon stays flat.
const CARD_SURFACE =
  'group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card p-4 text-card-foreground shadow-sm animate-in fade-in fill-mode-both duration-300'
const CARD_INTERACTIVE =
  'cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg focus-visible:-translate-y-1 focus-visible:border-brand/40 focus-visible:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40'

// Glassy hover polish: a faint brand wash + a lit top edge, fading in on
// hover/focus. Decorative only (aria-hidden), sits behind the card content.
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

function StoreTab() {
  const navigate = useNavigate()
  const { configurations } = useDataDiscovery()
  const [configureProvider, setConfigureProvider] = useState<Provider | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('default')

  const stats = (p: Provider) => {
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

  const q = query.trim().toLowerCase()
  let rows = providers
    .map((p) => ({ p, st: stats(p) }))
    .filter(({ p, st }) => {
      const matchesQuery =
        !q || `${p.name} ${p.vendor} ${p.category}`.toLowerCase().includes(q)
      const matchesCategory = category === 'all' || p.category === category
      const matchesStatus =
        status === 'all' || statusOf(p.comingSoon, st.count) === status
      return matchesQuery && matchesCategory && matchesStatus
    })

  if (sort !== 'default') {
    rows = [...rows].sort((a, b) => {
      switch (sort) {
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

  const reset = () => {
    setQuery('')
    setCategory('all')
    setStatus('all')
    setSort('default')
  }
  const filtersActive =
    !!q || category !== 'all' || status !== 'all' || sort !== 'default'

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search connectors…"
            className="h-9 pl-9"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:flex">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 w-full lg:w-44">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          No connectors match these filters.
          {filtersActive && (
            <Button variant="outline" size="sm" onClick={reset}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {rows.map(({ p, st }, i) => {
            const { count, lastAdded } = st
            const configured = !p.comingSoon && count > 0
            const delay = { animationDelay: `${Math.min(i, 10) * 25}ms` }

            // Icon colour is the at-a-glance status signal: full category colour
            // when configured, greyed otherwise. Not-configured re-tints on
            // hover ("configure me and I light up"); coming-soon stays grey.
            const icon = (
              <ProviderIcon
                providerId={p.id}
                size="md"
                muted={!configured}
                liftOnHover={!configured && !p.comingSoon}
              />
            )

            // Every state shares the same skeleton — avatar header, description,
            // and a one-line footer — so the grid stays consistent regardless of
            // connection state.
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

            // CONFIGURED — whole card links to the detail page; footer shows the
            // last-modified date with a link affordance.
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

            // NOT-CONFIGURED — whole card opens the Configure drawer (keyboard
            // accessible). Footer is the Configure affordance.
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

            // COMING-SOON — a different *kind* of object: a dashed, flat
            // placeholder on a muted surface with a greyed icon. Inert; no
            // hover, no click. (No opacity hack — it would dim the text too.)
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
      )}

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
