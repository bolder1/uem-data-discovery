import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Plus,
  LayoutGrid,
  Columns2,
  Search,
  ArrowUpDown,
  CalendarClock,
} from 'lucide-react'
import { providers } from '@/data'
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
import { PageHeader, ProviderIcon } from '@/components/common'
import { ProviderDetail } from '@/pages/v2/ProviderDetail'
import { ConfigureDrawer } from '@/components/v2/ConfigureDrawer'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Provider } from '@/types'

type View = 'cards' | 'split'

const VIEWS: {
  id: View
  icon: typeof LayoutGrid
  label: string
  disabled?: boolean
}[] = [
  { id: 'cards', icon: LayoutGrid, label: 'Cards' },
  { id: 'split', icon: Columns2, label: 'Split', disabled: true },
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

function ViewToggle({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  return (
    <div className="inline-flex items-center rounded-lg border bg-card p-0.5">
      {VIEWS.map(({ id, icon: Icon, label, disabled }) => (
        <button
          key={id}
          type="button"
          aria-label={`${label} view`}
          aria-pressed={value === id}
          disabled={disabled}
          title={disabled ? `${label} view is off for now` : undefined}
          onClick={() => !disabled && onChange(id)}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            value === id
              ? 'bg-secondary text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
            disabled && 'cursor-not-allowed opacity-40 hover:text-muted-foreground',
          )}
        >
          <Icon className="size-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}

export function SourcesCatalog() {
  const [view, setView] = useState<View>('cards')
  const stats = useStats()

  return (
    <div
      className={cn(
        'flex flex-col gap-6',
        view === 'split' && 'lg:min-h-0 lg:flex-1',
      )}
    >
      <PageHeader
        className="shrink-0"
        title="Data Sources"
        description="Connect cloud storage and endpoints, then scan them for sensitive data. Pick a source to add a configuration."
        actions={<ViewToggle value={view} onChange={setView} />}
      />

      {view === 'cards' && <CardsView stats={stats} />}
      {view === 'split' && <SplitView stats={stats} />}
    </div>
  )
}

type Stats = (p: Provider) => {
  count: number
  scopes: number
  sensitive: number
  data: number
  lastAdded: string | undefined
}

/* ------------------------------------ Cards ------------------------------------ */
/* Compact 4-up grid. Not-yet-connected sources offer a first-time Configure
   action right on the card; after the discovery flow returns we go to detail. */

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

function CardsView({ stats }: { stats: Stats }) {
  const navigate = useNavigate()
  const [configureProvider, setConfigureProvider] = useState<Provider | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('default')

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
            placeholder="Search data sources…"
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
          No data sources match these filters.
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

/* ------------------------------------ Split ------------------------------------ */
/* Disabled for now (kept for later). Master–detail: left list, right inner page. */

function SplitView({ stats }: { stats: Stats }) {
  const [selectedId, setSelectedId] = useState(providers[0].id)

  return (
    <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[280px_1fr]">
      <Card className="gap-0 p-2 lg:overflow-y-auto">
        {providers.map((p) => {
          const on = p.id === selectedId
          const st = stats(p)
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              className={cn(
                'flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                on ? 'bg-brand/5' : 'hover:bg-secondary/60',
              )}
            >
              <ProviderIcon providerId={p.id} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.comingSoon ? 'Coming soon' : `${st.count} configured`}
                </p>
              </div>
            </button>
          )
        })}
      </Card>

      <div className="min-w-0 lg:overflow-y-auto">
        <ProviderDetail key={selectedId} providerId={selectedId} embedded />
      </div>
    </div>
  )
}
