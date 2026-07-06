import { Link } from 'react-router-dom'
import {
  Database,
  ShieldCheck,
  ShieldAlert,
  FileSearch,
  Globe,
  Cloud,
  AppWindow,
  Laptop,
  Radar,
  ArrowRight,
  Play,
  Plus,
  Lock,
  type LucideIcon,
} from 'lucide-react'
import { useDataDiscovery } from '@/store/DataDiscoveryContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  PageHeader,
  SummaryCard,
  EmptyState,
  ScanStatusBadge,
  ProviderIcon,
} from '@/components/common'
import { classifications, classificationById, providerById } from '@/data'
import { cn } from '@/lib/utils'
import { formatBytes, formatDateTime } from '@/lib/format'
import type { ProviderCategory } from '@/types'

const DD = '/data-discovery'

const CATEGORIES: { id: ProviderCategory; label: string; icon: LucideIcon }[] = [
  { id: 'Cloud Storage', label: 'Cloud Storage', icon: Cloud },
  { id: 'Database', label: 'Databases', icon: Database },
  { id: 'SaaS', label: 'SaaS', icon: AppWindow },
  { id: 'Endpoint', label: 'Endpoint', icon: Laptop },
]

export function Dashboard() {
  const { configurations, policies, findings, togglePolicy, runScan } =
    useDataDiscovery()

  // ── Aggregates ────────────────────────────────────────────────────────────
  const dataScanned = configurations
    .flatMap((c) => c.scopes)
    .reduce((n, s) => n + s.sizeBytes, 0)
  const providerCount = new Set(configurations.map((c) => c.providerId)).size
  const openFindings = findings.filter(
    (f) => (f.status ?? 'open') === 'open',
  ).length
  const exposed = findings.filter((f) => f.publicAccess).length
  const isFresh = configurations.length === 0

  // First-run state: a short invitation instead of the full hub.
  if (isFresh) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Data Discovery"
          description="Find and classify sensitive data across your cloud storage, databases, SaaS apps, and endpoints."
        />
        <EmptyState
          icon={Database}
          title="Connect your first data source"
          description="Add a cloud bucket, database, or SaaS app to start discovering sensitive data. Then create a policy and run a scan."
          action={
            <Button asChild>
              <Link to={`${DD}/sources`}>
                <Plus className="size-4" />
                Connect a source
              </Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Discovery"
        description="Your sensitive-data posture across every connected source — at a glance."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link to={`${DD}/sources`}>
                <Plus className="size-4" />
                Connect source
              </Link>
            </Button>
            <Button asChild>
              <Link to={`${DD}/results`}>
                <FileSearch className="size-4" />
                View results
              </Link>
            </Button>
          </div>
        }
      />

      {/* ── Posture KPIs ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Sensitive findings"
          value={findings.length}
          icon={FileSearch}
          iconClass="bg-brand/10 text-brand"
          hint={`across ${configurations.length} sources`}
        />
        <SummaryCard
          label="Open findings"
          value={openFindings}
          icon={ShieldAlert}
          iconClass="bg-brand/10 text-brand"
          hint="awaiting review"
        />
        <SummaryCard
          label="Publicly exposed"
          value={exposed}
          icon={Globe}
          iconClass="bg-amber-50 text-amber-600"
          hint="open to the internet"
        />
        <SummaryCard
          label="Connected sources"
          value={configurations.length}
          icon={Database}
          iconClass="bg-brand/10 text-brand"
          hint={`${providerCount} providers · ${formatBytes(dataScanned)} scanned`}
        />
      </div>

      {/* ── Charts: classifications · exposure · scan trend ──────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ClassificationsCard />
        <ExposureCard exposed={exposed} total={findings.length} />
        <ScanTrendCard />
      </div>

      {/* ── Source shortcuts ─────────────────────────────────────────────── */}
      <SourceShortcuts />

      {/* ── Database activity · Recent scans ─────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DatabaseActivity />
        <RecentScans />
      </div>

      {/* ── Policies ─────────────────────────────────────────────────────── */}
      <PoliciesPanel
        policies={[...policies].sort((a, b) => Number(b.status) - Number(a.status))}
        togglePolicy={togglePolicy}
        runScan={runScan}
      />
    </div>
  )
}

/* --------------------------------- panel chrome --------------------------- */

function PanelHeader({
  title,
  icon: Icon,
  to,
  cta = 'View all',
}: {
  title: string
  icon?: LucideIcon
  to?: string
  cta?: string
}) {
  return (
    <div className="flex items-center justify-between border-b px-5 py-3.5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {Icon && <Icon className="size-4 text-muted-foreground" />}
        {title}
      </h2>
      {to && (
        <Button asChild variant="ghost" size="sm">
          <Link to={to}>
            {cta}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      )}
    </div>
  )
}

/* ------------------------------- classifications -------------------------- */

function ClassificationsCard() {
  const { findings } = useDataDiscovery()
  const rows = classifications
    .map((c) => ({
      c,
      n: findings.filter((f) => f.classificationIds.includes(c.id)).length,
    }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 6)
  const max = Math.max(...rows.map((x) => x.n), 1)

  return (
    <Card className="gap-0 p-0">
      <PanelHeader title="Top classifications" to="/data-discovery/results" />
      <div className="space-y-2.5 p-5">
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No findings yet. Run a scan to populate this view.
          </p>
        )}
        {rows.map(({ c, n }) => (
          <div key={c.id} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{c.abbr}</span>
              <span className="tabular-nums text-muted-foreground">{n}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${(n / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ---------------------------------- exposure ------------------------------ */

function ExposureCard({ exposed, total }: { exposed: number; total: number }) {
  const priv = Math.max(total - exposed, 0)
  const pct = total ? Math.round((exposed / total) * 100) : 0
  return (
    <Card className="gap-0 p-0">
      <PanelHeader title="Exposure" />
      <div className="space-y-4 p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-semibold tabular-nums text-foreground">
              {pct}%
            </p>
            <p className="text-xs text-muted-foreground">of findings public</p>
          </div>
          <p className="text-sm text-muted-foreground">{total} total</p>
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-amber-500"
            style={{ width: `${total ? (exposed / total) * 100 : 0}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-card p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Globe className="size-3.5 text-amber-500" />
              Public
            </p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
              {exposed}
            </p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="size-3.5 text-slate-400" />
              Private
            </p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
              {priv}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}

/* -------------------------------- scan trend ------------------------------ */

function ScanTrendCard() {
  const { scans } = useDataDiscovery()
  // Most-recent scans, oldest → newest, so the trend reads left-to-right.
  const trend = [...scans].reverse().slice(-8)
  const max = Math.max(...trend.map((s) => s.sensitiveFound), 1)

  return (
    <Card className="gap-0 p-0">
      <PanelHeader title="Scan activity" icon={Radar} to="/data-discovery/scans" />
      <div className="p-5">
        {trend.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scans have run yet.</p>
        ) : (
          <>
            <div className="flex h-28 items-end gap-1.5">
              {trend.map((s) => (
                <div
                  key={s.id}
                  className="group relative flex flex-1 flex-col items-center justify-end"
                  title={`${s.sensitiveFound} sensitive · ${formatDateTime(s.startedAt)}`}
                >
                  <div
                    className={cn(
                      'w-full rounded-t-sm transition-colors',
                      s.status === 'failed'
                        ? 'bg-red-200'
                        : 'bg-brand/70 group-hover:bg-brand',
                    )}
                    style={{
                      height: `${Math.max((s.sensitiveFound / max) * 100, 4)}%`,
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Sensitive files found per scan, last {trend.length} runs
            </p>
          </>
        )}
      </div>
    </Card>
  )
}

/* ------------------------------ source shortcuts -------------------------- */

function SourceShortcuts() {
  const { configurations } = useDataDiscovery()
  return (
    <Card className="gap-0 p-0">
      <PanelHeader
        title="Data sources"
        icon={Database}
        to="/data-discovery/sources"
        cta="Browse all"
      />
      <div className="grid gap-px overflow-hidden bg-border sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.map(({ id, label, icon: Icon }) => {
          const cfgs = configurations.filter(
            (c) => providerById(c.providerId)?.category === id,
          )
          // Consistent with the catalog cards and DB panel: count discovered
          // sensitive objects across scopes, not just synthesized file findings.
          const sensitive = cfgs
            .flatMap((c) => c.scopes)
            .reduce((n, s) => n + s.sensitive, 0)
          return (
            <Link
              key={id}
              to={`/data-discovery/sources?category=${encodeURIComponent(id)}`}
              className="group flex items-center gap-3 bg-card p-5 transition-colors hover:bg-accent/40"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors group-hover:bg-brand/10 group-hover:text-brand">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {cfgs.length} connected · {sensitive} sensitive
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </Card>
  )
}

/* ------------------------------ database activity ------------------------- */

function DatabaseActivity() {
  const { configurations, findings } = useDataDiscovery()
  const rows = configurations
    .filter((c) => providerById(c.providerId)?.category === 'Database')
    .map((c) => {
      const provider = providerById(c.providerId)!
      const lastScan = c.scopes
        .map((s) => s.lastScan)
        .filter(Boolean)
        .sort()
        .at(-1)
      return {
        cfg: c,
        provider,
        scopes: c.scopes.length,
        sensitive: findings.filter((f) => f.configurationId === c.id).length,
        columns: c.scopes.reduce((n, s) => n + s.sensitive, 0),
        lastScan,
      }
    })
    .sort((a, b) => b.columns - a.columns)
    .slice(0, 5)

  return (
    <Card className="gap-0 p-0">
      <PanelHeader
        title="Database activity"
        icon={Database}
        to="/data-discovery/sources?category=Database"
      />
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">
          No databases connected yet.
        </p>
      ) : (
        <div className="divide-y">
          {rows.map(({ cfg, provider, scopes, columns, lastScan }) => (
            <Link
              key={cfg.id}
              to={`/data-discovery/results?source=${cfg.id}`}
              className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-accent/40"
            >
              <ProviderIcon providerId={provider.id} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {cfg.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {scopes} {provider.scopeNounPlural.toLowerCase()} ·{' '}
                  {columns} sensitive {provider.scopeNoun === 'collection' ? 'fields' : 'columns'}
                </p>
              </div>
              <span
                className={cn(
                  'shrink-0 text-xs',
                  lastScan ? 'text-muted-foreground' : 'text-amber-600',
                )}
              >
                {lastScan ? formatDateTime(lastScan) : 'Never scanned'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}

/* -------------------------------- recent scans ---------------------------- */

function RecentScans() {
  const { scans, policies, configurations } = useDataDiscovery()
  return (
    <Card className="gap-0 p-0">
      <PanelHeader title="Recent scans" icon={Radar} to="/data-discovery/scans" />
      {scans.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">
          No scans have run yet.
        </p>
      ) : (
        <div className="divide-y">
          {scans.slice(0, 5).map((s) => {
            const policy = policies.find((p) => p.id === s.policyId)
            const cfg = configurations.find((c) => c.id === s.configurationId)
            const provider = cfg && providerById(cfg.providerId)
            return (
              <Link
                key={s.id}
                to={`/data-discovery/results?source=${s.configurationId}&scan=${s.id}`}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-accent/40"
              >
                {provider && <ProviderIcon providerId={provider.id} size="sm" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {policy?.name ?? 'Deleted policy'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(s.startedAt)} · {s.sensitiveFound} sensitive
                  </p>
                </div>
                <ScanStatusBadge status={s.status} />
              </Link>
            )
          })}
        </div>
      )}
    </Card>
  )
}

/* --------------------------------- policies ------------------------------- */

function PoliciesPanel({
  policies,
  togglePolicy,
  runScan,
}: {
  policies: ReturnType<typeof useDataDiscovery>['policies']
  togglePolicy: (id: string) => void
  runScan: (policyId: string) => unknown
}) {
  return (
    <Card className="gap-0 p-0">
      <PanelHeader
        title="Policies"
        icon={ShieldCheck}
        to="/data-discovery/policies"
        cta="Manage"
      />
      {policies.length === 0 ? (
        <div className="flex items-center justify-between px-5 py-6">
          <p className="text-sm text-muted-foreground">No policies yet.</p>
          <Button asChild size="sm">
            <Link to="/data-discovery/policies/new">
              <Plus className="size-4" />
              Create policy
            </Link>
          </Button>
        </div>
      ) : (
        <div className="divide-y">
          {policies.slice(0, 4).map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-5 py-3">
              <Switch
                checked={p.status}
                onCheckedChange={() => togglePolicy(p.id)}
                aria-label={p.status ? 'Enabled' : 'Disabled'}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {p.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.classificationIds
                    .map((id) => classificationById(id)?.abbr)
                    .filter(Boolean)
                    .join(' · ')}
                  {p.lastRun ? ` — ran ${formatDateTime(p.lastRun)}` : ' — never run'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={!p.status}
                onClick={() => runScan(p.id)}
                className="shrink-0"
              >
                <Play className="size-4" />
                <span className="hidden sm:inline">Run</span>
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
