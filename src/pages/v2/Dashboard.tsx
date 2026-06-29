import { Link } from 'react-router-dom'
import {
  Database,
  ShieldCheck,
  FileSearch,
  HardDrive,
  Plug,
  Radar,
  ArrowRight,
  Check,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useDataDiscovery } from '@/store/DataDiscoveryContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  PageHeader,
  SummaryCard,
  ScanStatusBadge,
  ProviderIcon,
} from '@/components/common'
import { classifications, providerById } from '@/data'
import { cn } from '@/lib/utils'
import { formatBytes, formatDateTime } from '@/lib/format'

interface FlowStep {
  title: string
  description: string
  icon: LucideIcon
  to: string
  cta: string
}

const FLOW: FlowStep[] = [
  {
    title: 'Connect a source',
    description: 'Add cloud storage or endpoint credentials.',
    icon: Plug,
    to: '/data-discovery/sources',
    cta: 'Connect',
  },
  {
    title: 'Create a policy',
    description: 'Pick file types and classifications to detect.',
    icon: ShieldCheck,
    to: '/data-discovery/policies/new',
    cta: 'Create',
  },
  {
    title: 'Run a scan',
    description: 'Scan the targeted containers and buckets.',
    icon: Radar,
    to: '/data-discovery/scans',
    cta: 'Run',
  },
  {
    title: 'View results',
    description: 'Review and triage discovered sensitive data.',
    icon: FileSearch,
    to: '/data-discovery/results',
    cta: 'View results',
  },
]

export function Dashboard() {
  const { configurations, policies, scans, findings } = useDataDiscovery()

  const dataScanned = configurations
    .flatMap((c) => c.scopes)
    .reduce((n, s) => n + s.sizeBytes, 0)
  const activePolicies = policies.filter((p) => p.status).length
  const lastScan = scans[0]

  const done = [
    configurations.length > 0,
    policies.length > 0,
    scans.length > 0,
    findings.length > 0,
  ]
  const firstIncomplete = done.findIndex((d) => !d)
  // Always emphasize exactly one step as the recommended next action. When
  // everything is already done (-1), fall back to the last step ("View results").
  const activeIndex = firstIncomplete === -1 ? FLOW.length - 1 : firstIncomplete

  const clsCounts = classifications
    .map((c) => ({
      c,
      n: findings.filter((f) => f.classificationIds.includes(c.id)).length,
    }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
  const maxCls = Math.max(...clsCounts.map((x) => x.n), 1)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Discovery"
        description="Find and classify sensitive data across your cloud storage and endpoints."
        actions={
          <Button asChild variant="outline">
            <Link to="/data-discovery/results">
              <FileSearch className="size-4" />
              View results
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Connected sources"
          value={configurations.length}
          icon={Database}
          iconClass="bg-brand/10 text-brand"
          hint={`${new Set(configurations.map((c) => c.providerId)).size} providers`}
        />
        <SummaryCard
          label="Active policies"
          value={activePolicies}
          icon={ShieldCheck}
          iconClass="bg-brand/10 text-brand"
          hint={`${policies.length} total`}
        />
        <SummaryCard
          label="Sensitive findings"
          value={findings.length}
          icon={FileSearch}
          iconClass="bg-brand/10 text-brand"
          hint={`${findings.filter((f) => f.publicAccess).length} publicly exposed`}
        />
        <SummaryCard
          label="Data scanned"
          value={formatBytes(dataScanned)}
          icon={HardDrive}
          iconClass="bg-brand/10 text-brand"
          hint={lastScan ? `Last scan ${formatDateTime(lastScan.startedAt)}` : 'No scans yet'}
        />
      </div>

      {/* end-to-end flow */}
      <Card className="gap-0 p-0">
        <div className="border-b px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">
            End-to-end workflow
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure a source, create a policy, run a scan, and review results.
          </p>
        </div>
        <div className="grid gap-0 md:grid-cols-4">
          {FLOW.map((step, i) => {
            const isDone = done[i]
            const isActive = i === activeIndex
            const Icon = step.icon
            return (
              <div
                key={step.title}
                className={cn(
                  'relative flex flex-col gap-3 p-6',
                  i > 0 && 'border-t md:border-l md:border-t-0',
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex size-9 items-center justify-center rounded-full border',
                      isActive
                        ? 'border-brand bg-brand/10 text-brand'
                        : isDone
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
                          : 'border-border bg-secondary text-muted-foreground',
                    )}
                  >
                    {isDone ? <Check className="size-4" /> : <Icon className="size-4" />}
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Step {i + 1}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{step.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
                <Button
                  asChild
                  size="sm"
                  variant={isActive ? 'default' : isDone ? 'outline' : 'ghost'}
                  className="w-fit"
                >
                  <Link to={step.to}>
                    {isActive ? step.cta : isDone ? 'Review' : step.cta}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* classifications */}
        <Card className="gap-0 p-0 lg:col-span-3">
          <div className="border-b px-5 py-4">
            <h2 className="text-base font-semibold text-foreground">
              Findings by classification
            </h2>
          </div>
          <div className="space-y-3 p-5">
            {clsCounts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No findings yet. Run a scan to populate this view.
              </p>
            )}
            {clsCounts.map(({ c, n }) => (
              <div key={c.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{c.label}</span>
                  <span className="tabular-nums text-muted-foreground">{n}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${(n / maxCls) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* recent scans */}
        <Card className="gap-0 p-0 lg:col-span-2">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-base font-semibold text-foreground">
              Recent scans
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/data-discovery/scans">All scans</Link>
            </Button>
          </div>
          <div className="divide-y">
            {scans.slice(0, 5).map((s) => {
              const policy = policies.find((p) => p.id === s.policyId)
              const cfg = configurations.find((c) => c.id === s.configurationId)
              const provider = cfg && providerById(cfg.providerId)
              return (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3">
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
                </div>
              )
            })}
            {scans.length === 0 && (
              <p className="px-5 py-6 text-sm text-muted-foreground">
                No scans have run yet.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
