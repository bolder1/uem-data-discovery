import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  Plus,
  Search,
  ArrowUpDown,
  CalendarClock,
  Cloud,
  Database,
  AppWindow,
  Laptop,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react'
import { providers } from '@/data'
import { useDataDiscovery } from '@/store/DataDiscoveryContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader, ProviderIcon, EmptyState } from '@/components/common'
import { ConfigureDrawer } from '@/components/v2/ConfigureDrawer'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Provider, ProviderCategory } from '@/types'

const CATEGORY_META: { id: ProviderCategory; label: string; icon: LucideIcon }[] = [
  { id: 'Cloud Storage', label: 'Cloud Storage', icon: Cloud },
  { id: 'Database', label: 'Database', icon: Database },
  { id: 'SaaS', label: 'SaaS', icon: AppWindow },
  { id: 'Endpoint', label: 'Endpoint', icon: Laptop },
]

const CATEGORIES: (ProviderCategory | 'all')[] = [
  'all',
  'Cloud Storage',
  'Database',
  'SaaS',
  'Endpoint',
]

const SORTS = [
  { value: 'default', label: 'Default order' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'sources', label: 'Most sources' },
  { value: 'data', label: 'Most data' },
  { value: 'sensitive', label: 'Most sensitive' },
  { value: 'recent', label: 'Recently added' },
]

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
// Data Sources has exactly two switch tabs: Catalog (browse & connect every
// supported connector — no inner pages, configuring is always an overlay
// drawer) and Already Configured (the roster of what's connected, in the
// classic per-provider card style, linking into each provider's detail page).

export function SourcesCatalog() {
  const [searchParams] = useSearchParams()
  const { configurations } = useDataDiscovery()
  const initialTab = searchParams.get('tab') === 'configured' ? 'configured' : 'catalog'
  const initialCategory = searchParams.get('category') ?? 'all'

  const [tab, setTab] = useState(initialTab)
  const configuredCount = configurations.length
  const configuredProviderCount = new Set(configurations.map((c) => c.providerId)).size

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Data Sources"
        description="Connect cloud storage, databases, SaaS apps, and endpoints, then scan them for sensitive data."
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="catalog">
            <LayoutGrid className="size-4" />
            Catalog
          </TabsTrigger>
          <TabsTrigger value="configured">
            Already Configured
            {configuredProviderCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {configuredProviderCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="pt-5">
          <CatalogTab
            initialCategory={tab === 'catalog' ? initialCategory : 'all'}
            onConfigured={() => setTab('configured')}
          />
        </TabsContent>

        <TabsContent value="configured" className="pt-5">
          <ConfiguredTab
            initialCategory={tab === 'configured' ? initialCategory : 'all'}
            configuredCount={configuredCount}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/* ------------------------------------ catalog tab -------------------------- */

function CatalogTab({
  initialCategory,
  onConfigured,
}: {
  initialCategory: string
  onConfigured: () => void
}) {
  const stats = useStats()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(initialCategory)
  const [sort, setSort] = useState('default')
  const [configureProvider, setConfigureProvider] = useState<Provider | null>(null)

  const reset = () => {
    setQuery('')
    setCategory('all')
    setSort('default')
  }
  const filtersActive = !!query.trim() || category !== 'all' || sort !== 'default'

  const q = query.trim().toLowerCase()
  const withStats = providers
    .map((p) => ({ p, st: stats(p) }))
    .filter(({ p }) => {
      const matchesQuery =
        !q || `${p.name} ${p.vendor} ${p.category}`.toLowerCase().includes(q)
      const matchesCategory = category === 'all' || p.category === category
      return matchesQuery && matchesCategory
    })

  const sorted = (rows: typeof withStats) => {
    if (sort === 'default') return rows
    return [...rows].sort((a, b) => {
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

  const sections =
    category === 'all'
      ? CATEGORY_META.map((c) => ({
          ...c,
          rows: sorted(withStats.filter(({ p }) => p.category === c.id)),
        })).filter((s) => s.rows.length > 0)
      : [
          {
            ...CATEGORY_META.find((c) => c.id === category)!,
            rows: sorted(withStats),
          },
        ]

  const totalShown = withStats.length

  return (
    <div className="flex flex-col gap-6">
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CategoryChips value={category} onChange={setCategory} />
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={reset}>
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {totalShown === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          No data sources match these filters.
          {filtersActive && (
            <Button variant="outline" size="sm" onClick={reset}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {sections.map((section) => (
            <div key={section.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <section.icon className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">
                  {section.label}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {section.rows.length}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {section.rows.map(({ p, st }, i) => (
                  <CatalogCard
                    key={p.id}
                    provider={p}
                    count={st.count}
                    lastAdded={st.lastAdded}
                    delay={Math.min(i, 10) * 25}
                    onConfigure={() => setConfigureProvider(p)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {configureProvider && (
        <ConfigureDrawer
          provider={configureProvider}
          open
          onOpenChange={(o) => {
            if (!o) setConfigureProvider(null)
          }}
          onAdded={onConfigured}
        />
      )}
    </div>
  )
}

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

function CatalogCard({
  provider: p,
  count,
  lastAdded,
  delay,
  onConfigure,
}: {
  provider: Provider
  count: number
  lastAdded?: string
  delay: number
  onConfigure: () => void
}) {
  const configured = !p.comingSoon && count > 0
  const style = { animationDelay: `${delay}ms` }

  // Catalog icons are always grayscale — colour is reserved for the status
  // dot and the "Already Configured" tab, so the catalog stays calm and
  // scannable regardless of connection state.
  const body = (
    <div className="relative flex flex-1 flex-col gap-3">
      <div className="flex items-start gap-3">
        <ProviderIcon providerId={p.id} size="md" muted />
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="truncate text-sm font-semibold leading-tight text-foreground">
            {p.name}
          </p>
          <div className="mt-1.5">
            <StatusLine comingSoon={p.comingSoon} count={count} />
          </div>
        </div>
      </div>
      <p className="line-clamp-2 flex-1 text-xs leading-relaxed text-muted-foreground">
        {p.description}
      </p>
      {configured && lastAdded && (
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
          <CalendarClock aria-hidden className="size-3 shrink-0" />
          Last added {formatDate(lastAdded)}
        </span>
      )}
    </div>
  )

  if (p.comingSoon) {
    return (
      <div style={style} className={cn(CARD_SURFACE, 'border-dashed bg-muted/40 shadow-none')}>
        <span className="absolute right-2 top-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
          Soon
        </span>
        {body}
        <div className="mt-3 border-t border-dashed pt-3 text-xs text-muted-foreground">
          Available soon
        </div>
      </div>
    )
  }

  // Catalog cards always configure — whether it's a brand-new type or one
  // you already have connections for. Drilling into existing connections
  // lives on the Already Configured tab.
  return (
    <button
      type="button"
      style={style}
      aria-label={
        configured ? `Add another ${p.name} connection` : `Configure ${p.name}`
      }
      onClick={onConfigure}
      className={cn(CARD_SURFACE, CARD_INTERACTIVE, 'text-left')}
    >
      <CardGlow />
      {body}
      <div className="relative -mx-4 -mb-4 mt-3 flex items-center justify-between gap-2 rounded-b-xl border-t bg-secondary/40 px-4 py-2.5 text-xs font-medium text-brand transition-colors group-hover:bg-brand/10">
        <span className="inline-flex items-center gap-1.5">
          <Plus aria-hidden className="size-3.5" />
          {configured ? 'Add another' : 'Configure'}
        </span>
        <ArrowRight
          aria-hidden
          className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </div>
    </button>
  )
}

/* --------------------------------- configured tab -------------------------- */
// The classic card view — unchanged from the original catalog flow: a
// configured provider is a Link straight into its detail page.

function ConfiguredTab({
  initialCategory,
  configuredCount,
}: {
  initialCategory: string
  configuredCount: number
}) {
  const stats = useStats()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(initialCategory)
  const [sort, setSort] = useState('default')

  const reset = () => {
    setQuery('')
    setCategory('all')
    setSort('default')
  }
  const filtersActive = !!query.trim() || category !== 'all' || sort !== 'default'

  const q = query.trim().toLowerCase()
  let rows = providers
    .map((p) => ({ p, st: stats(p) }))
    .filter(({ p, st }) => !p.comingSoon && st.count > 0)
    .filter(({ p }) => {
      const matchesQuery =
        !q || `${p.name} ${p.vendor} ${p.category}`.toLowerCase().includes(q)
      const matchesCategory = category === 'all' || p.category === category
      return matchesQuery && matchesCategory
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

  if (configuredCount === 0) {
    return (
      <EmptyState
        icon={Database}
        title="No data sources connected yet"
        description="Switch to the Catalog tab to connect your first cloud storage, database, SaaS app, or endpoint."
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{configuredCount}</span>{' '}
        {configuredCount === 1 ? 'source' : 'sources'} configured across{' '}
        <span className="font-medium text-foreground">{rows.length}</span> connector{' '}
        {rows.length === 1 ? 'type' : 'types'}.
      </p>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search connected sources…"
              className="h-9 pl-9"
            />
          </div>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CategoryChips value={category} onChange={setCategory} />
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={reset}>
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          No connected sources match these filters.
          {filtersActive && (
            <Button variant="outline" size="sm" onClick={reset}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {rows.map(({ p, st }, i) => (
            <Link
              key={p.id}
              to={`/data-discovery/sources/${p.id}`}
              style={{ animationDelay: `${Math.min(i, 10) * 25}ms` }}
              aria-label={`${p.name}, ${st.count} connected — open details`}
              className={cn(CARD_SURFACE, CARD_INTERACTIVE)}
            >
              <CardGlow />
              <div className="relative flex flex-1 flex-col">
                <div className="flex items-center gap-3">
                  <ProviderIcon providerId={p.id} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight text-foreground">
                      {p.name}
                    </p>
                    <div className="mt-1">
                      <StatusLine count={st.count} />
                    </div>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 flex-1 text-xs leading-relaxed text-muted-foreground">
                  {p.description}
                </p>
              </div>
              <div className="relative mt-3 flex items-center justify-between gap-2 border-t pt-3">
                <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarClock aria-hidden className="size-3.5 shrink-0" />
                  <span className="truncate">Modified {formatDate(st.lastAdded)}</span>
                </span>
                <ArrowRight
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
