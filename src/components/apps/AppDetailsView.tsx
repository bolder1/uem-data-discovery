// A deployed app, laid out like the product's device page: a summary card
// (what it is, how it's doing, "View all" for the rest), then tabs. Tabs are
// read-only; the button beside them edits the open tab in a side panel.
import { useEffect, useMemo, useState } from 'react'
import { useBlocker, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Copy,
  Crosshair,
  Download,
  Fingerprint,
  GitBranch,
  Globe,
  KeyRound,
  ListChecks,
  Store,
  Tag as TagIcon,
  Zap,
  type LucideIcon,
  Plus,
  X,
  Pencil,
  Undo2,
  Layers,
  MonitorSmartphone,
  Smartphone,
  User as UserIcon,
  Users as UsersIcon,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DiscardDraftDialog, StatusDot } from '@/components/common'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'
import { coverage, kindSingular, platformTotal, resolveScope, userDeviceTotal, type ScopeItem, type ScopeKind } from '@/data/directory'
import { attributeInfo, keyCount, licensesFor, listedInSelfService, reach, variablesIn, type LibraryApp } from '@/data/apps'
import { useAppLibrary } from '@/store/AppLibraryContext'
import { HistoryList, ScopeDrawer } from './AppDrawer'
import { AppIcon, CategoryName, SelfServicePreview, StatusPill } from './forms'
import { EditSheet, type EditKey } from './EditSheet'
import { Pager } from './Pager'
import { PageFooter } from '@/components/layout/PageFooter'
import { ScopeDevicesSheet } from './ScopeDevicesSheet'
import { EmptyPanel, NoConfigArt, NoDevicesArt, NoDomainsArt, NoScopeArt, NotListedArt } from './EmptyArt'
import { CategoryChip, Chip, InstallTypeChip, PlatformChip, SourceChip, Truncated } from './chips'

type Row = [string, React.ReactNode]
const Muted = ({ children }: { children: React.ReactNode }) => <span className="font-normal text-muted-foreground">{children}</span>
const yesNo = (v: boolean) => (v ? 'Yes' : 'No')

const LIST_PAGE = 25

/** A tab's content: a header with its title and its own Edit, then the body. */
function SectionCard({ title, onEdit, aside, children }: { title: string; onEdit?: () => void; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex min-h-13 items-center justify-between gap-3 border-b bg-muted/30 px-5 py-2.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {aside}
        {onEdit && (
          <Button variant="outline" size="sm" aria-label={`Edit ${title.toLowerCase()}`} onClick={onEdit}>
            <Pencil className="size-4" />Edit
          </Button>
        )}
      </div>
      {children}
    </section>
  )
}


/** Label-left, value-right rows, as on the device page. */
function DetailRows({ rows }: { rows: Row[] }) {
  return (
    <dl className="divide-y">
      {rows.map(([k, v]) => (
        <div key={k} className="grid gap-1 px-5 py-3.5 text-sm sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-6">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="min-w-0 break-words font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <span className="flex min-w-0 items-center gap-1">
      <Truncated text={value} className="font-mono text-xs" />
      <Button variant="ghost" size="icon-sm" className="-my-1 size-6 shrink-0" aria-label="Copy bundle ID"
        onClick={() => { void navigator.clipboard?.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>
        {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
      </Button>
    </span>
  )
}


/** Icon tile, small label, then the value — the same shape for every fact. */
function Fact({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-card text-muted-foreground shadow-xs">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="min-w-0 text-sm font-medium">{children}</div>
      </div>
    </div>
  )
}

type SummaryProps = { app: LibraryApp; actions: React.ReactNode; headingRef: React.Ref<HTMLHeadingElement> }

/** Every app fact, behind "View all" on the revamped headers. */
function AllDetails({ app }: { app: LibraryApp }) {
  const lic = licensesFor(app)
  return (
    <div className="grid gap-5 border-t bg-muted/30 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
      <Fact icon={Store} label="Source"><SourceChip source={app.source} /></Fact>
      <Fact icon={Fingerprint} label="Bundle ID"><CopyValue value={app.bundleId} /></Fact>
      <Fact icon={Building2} label="Publisher"><Truncated text={app.publisher} /></Fact>
      <Fact icon={GitBranch} label="Version"><Truncated text={app.version} /></Fact>
      {app.source !== 'In-house' && <Fact icon={Globe} label="App Store"><Truncated text={app.country} /></Fact>}
      {lic && <Fact icon={KeyRound} label="Licenses"><Truncated text={`${lic.available} of ${lic.total} available`} /></Fact>}
      <Fact icon={CalendarDays} label="Added"><Truncated text={formatDate(app.addedAt)} /></Fact>
    </div>
  )
}

function ViewAllToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <Button variant="ghost" size="sm" className="text-primary hover:text-primary" aria-expanded={open} onClick={onToggle}>
      {open ? 'View less' : 'View all'}
      <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
    </Button>
  )
}

/** Revamped header: icon tiles and chips for the key facts, the rest behind "View all". */
export function AppSummary({ app, actions, headingRef }: SummaryProps) {
  const { categories } = useAppLibrary()
  const [all, setAll] = useState(false)
  const n = reach(app)
  const category = categories.find((c) => c.id === app.categoryId)
  const { installed, pending, failed } = app.stats
  const pct = (x: number) => `${n ? (x / n) * 100 : 0}%`

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-4 lg:w-64 lg:shrink-0 lg:border-r lg:pr-6 xl:w-72">
          <AppIcon app={app} className="size-16 rounded-[22%] text-3xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <h1 ref={headingRef} tabIndex={-1} className="text-xl font-semibold tracking-tight outline-none">
              <Truncated text={app.name} />
            </h1>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusPill tone="green">Deployed</StatusPill>
              <PlatformChip platform={app.platform} />
              <Chip>{`v${app.version}`}</Chip>
            </div>
          </div>
        </div>

        <div className="grid min-w-0 flex-1 gap-x-6 gap-y-5 sm:grid-cols-3">
          <Fact icon={Download} label="Installed">
            {n ? (
              <div className="space-y-1.5">
                <p className="tabular-nums">
                  <span className="text-base font-semibold">{installed}</span>
                  <span className="text-muted-foreground"> / {n}</span>
                  {failed > 0 && <span className="text-xs font-medium text-red-600"> · {failed} failed</span>}
                </p>
                <div className="flex h-1.5 max-w-40 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div className="bg-emerald-500" style={{ width: pct(installed) }} />
                  <div className="bg-amber-400" style={{ width: pct(pending) }} />
                  <div className="bg-red-500" style={{ width: pct(failed) }} />
                </div>
              </div>
            ) : (
              <Muted>No devices in scope</Muted>
            )}
          </Fact>
          <Fact icon={Zap} label="Install type"><InstallTypeChip type={app.installType} /></Fact>
          <Fact icon={TagIcon} label="Category"><CategoryChip category={category} /></Fact>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-start lg:self-center">
          <ViewAllToggle open={all} onToggle={() => setAll((v) => !v)} />
          {actions}
        </div>
      </div>

      {all && <AllDetails app={app} />}
    </Card>
  )
}

/** Classic V2 header: the first summary card — plain labels and values, no icon tiles or chips. */
export function AppSummaryPlain({ app, actions, headingRef }: SummaryProps) {
  const { categories } = useAppLibrary()
  const [all, setAll] = useState(false)
  const n = reach(app)
  const lic = licensesFor(app)
  const { installed, failed } = app.stats
  const key: Row[] = [
    ['Installed', n ? <span key="i">{installed} of {n}{failed > 0 && <span className="text-red-600"> · {failed} failed</span>}</span> : <Muted key="i">No devices in scope</Muted>],
    ['Install type', app.installType],
    ['Category', <CategoryName key="c" category={categories.find((c) => c.id === app.categoryId)} />],
  ]
  const rest: Row[] = [
    ['Source', app.source],
    ['Version', app.version],
    ['Bundle ID', <Truncated key="b" text={app.bundleId} />],
    ['Publisher', <Truncated key="p" text={app.publisher} />],
    ...(app.source !== 'In-house' ? [['App Store', app.country] as Row] : []),
    ...(lic ? [['Licenses', `${lic.available} of ${lic.total} available`] as Row] : []),
    ['Added', formatDate(app.addedAt)],
  ]
  return (
    <Card className="gap-0 bg-muted/30 p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex min-w-0 items-center gap-4 lg:w-72 lg:shrink-0 lg:self-stretch lg:border-r lg:pr-6">
          <AppIcon app={app} className="size-14 rounded-[22%] text-3xl" />
          <div className="min-w-0 space-y-1.5">
            <h1 ref={headingRef} tabIndex={-1} className="text-xl font-semibold leading-tight tracking-tight outline-none">{app.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone="green">Deployed</StatusPill>
              <span className="text-xs text-muted-foreground">{app.platform} · v{app.version}</span>
            </div>
          </div>
        </div>
        <dl className="grid min-w-0 flex-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2 2xl:grid-cols-3">
          {(all ? [...key, ...rest] : key).map(([k, v]) => (
            <div key={k} className="grid min-w-0 grid-cols-[96px_minmax(0,1fr)] gap-3">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="min-w-0 font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex shrink-0 items-center gap-2 lg:-mt-1">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary" aria-expanded={all} onClick={() => setAll((v) => !v)}>
            {all ? 'View less' : 'View all'}
            <ChevronDown className={cn('size-4 transition-transform', all && 'rotate-180')} />
          </Button>
          {actions}
        </div>
      </div>
    </Card>
  )
}

/**
 * Revamped V2 header: everything at a glance, no "View all".
 * Identity and chips up top, a one-line meta row, then a strip of numbers.
 */
/** Icon, name, a row of chips and a one-line meta — the top of Revamped V2, also used bare as the Classic header. */
export function AppIdentity({ app, actions, headingRef, className }: SummaryProps & { className?: string }) {
  const { categories } = useAppLibrary()
  const category = categories.find((c) => c.id === app.categoryId)
  const draft = app.status === 'Draft'
  const meta = [
    app.publisher,
    `v${app.version}`,
    `Added ${formatDate(app.addedAt)}`,
    ...(app.source !== 'In-house' ? [`App Store ${app.country}`] : []),
  ]
  return (
    <div className={cn('flex gap-4', className)}>
      <AppIcon app={app} className="size-16 rounded-[22%] text-3xl" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold leading-tight tracking-tight outline-none">{app.name}</h1>
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill tone={draft ? 'amber' : 'green'}>{draft ? 'Draft' : 'Deployed'}</StatusPill>
          <PlatformChip platform={app.platform} />
          <SourceChip source={app.source} />
          <InstallTypeChip type={app.installType} />
          {category && <CategoryChip category={category} />}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="max-w-64"><CopyValue value={app.bundleId} /></span>
          {meta.map((m) => <span key={m} className="flex items-center gap-2"><span aria-hidden>·</span>{m}</span>)}
        </div>
      </div>
    </div>
  )
}

export function AppSummaryAlt({ app, actions, headingRef }: SummaryProps) {
  const [all, setAll] = useState(false)
  const n = reach(app)
  const lic = licensesFor(app)
  const { installed, pending, failed } = app.stats
  const pct = (x: number) => (n ? Math.round((x / n) * 100) : 0)
  const numbers: { label: string; value: number; sub?: string; tone?: 'amber' | 'red'; bar?: boolean }[] = [
    { label: 'In scope', value: n, sub: `of ${platformTotal(app.platform)}` },
    { label: 'Installed', value: installed, sub: n ? `${pct(installed)}%` : undefined, bar: true },
    { label: 'Pending', value: pending, tone: pending ? 'amber' : undefined },
    { label: 'Failed', value: failed, tone: failed ? 'red' : undefined },
    ...(lic && typeof lic.available === 'number' ? [{ label: 'Licenses left', value: lic.available, sub: `of ${lic.total}` }] : []),
  ]

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <AppIdentity app={app} headingRef={headingRef} className="p-5"
        actions={<><ViewAllToggle open={all} onToggle={() => setAll((v) => !v)} />{actions}</>} />
      {/* gap-px over a border-coloured background draws the dividers in both the 2-column and row layouts. */}
      <dl className="grid grid-cols-2 gap-px border-t bg-border sm:flex">
        {numbers.map((k) => (
          <div key={k.label} className="space-y-1 bg-card px-5 py-3.5 sm:flex-1">
            <dt className="text-xs text-muted-foreground">{k.label}</dt>
            <dd className={cn('text-xl font-semibold tabular-nums', k.tone === 'amber' && 'text-amber-600', k.tone === 'red' && 'text-red-600')}>
              {k.value}
              {k.sub && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{k.sub}</span>}
            </dd>
            {k.bar && n > 0 && (
              <div className="flex h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div className="bg-emerald-500" style={{ width: `${(installed / n) * 100}%` }} />
                <div className="bg-amber-400" style={{ width: `${(pending / n) * 100}%` }} />
                <div className="bg-red-500" style={{ width: `${(failed / n) * 100}%` }} />
              </div>
            )}
          </div>
        ))}
      </dl>
      {all && <AllDetails app={app} />}
    </Card>
  )
}

type DeviceStatus = 'Failed' | 'Pending' | 'Installed' | 'Not installed'
const statusOrder: DeviceStatus[] = ['Failed', 'Pending', 'Installed', 'Not installed']

/** Spread the app's install counts over the devices in scope (prototype data), problems first. */
function useDeviceStatuses(app: LibraryApp) {
  return useMemo(() => {
    const { installed, pending, failed } = app.stats
    const rows = resolveScope(app).included.map((d, i) => ({
      device: d,
      status: (i < installed ? 'Installed' : i < installed + pending ? 'Pending' : i < installed + pending + failed ? 'Failed' : 'Not installed') as DeviceStatus,
    }))
    return rows.sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status))
  }, [app])
}

const statusDot: Record<DeviceStatus, string> = {
  Installed: 'bg-emerald-500',
  Pending: 'bg-amber-400',
  Failed: 'bg-red-500',
  'Not installed': 'bg-slate-300',
}

function Overview({ app, onScope }: { app: LibraryApp; onScope: () => void }) {
  const rows = useDeviceStatuses(app)
  const [filter, setFilter] = useState<DeviceStatus | 'All'>('All')
  const [page, setPage] = useState(1)
  const n = rows.length
  if (!n)
    return (
      <Card className="p-0">
        <EmptyPanel art={<NoDevicesArt app={app} />} title="No devices in scope yet"
          action={<Button onClick={onScope}><Crosshair className="size-4" />Set scope</Button>}>
          {app.installType === 'Available'
            ? `Choose who gets ${app.name} and it shows up in their Self Service.`
            : `Choose who gets ${app.name} and it starts installing on their devices right away.`}
        </EmptyPanel>
      </Card>
    )

  const count = (s: DeviceStatus) => rows.filter((r) => r.status === s).length
  const filters = (['All', ...statusOrder] as const).filter((s) => s === 'All' || count(s) > 0)
  const shown = rows.filter((r) => filter === 'All' || r.status === filter)
  const visible = shown.slice((page - 1) * LIST_PAGE, page * LIST_PAGE)
  const pct = (s: DeviceStatus) => `${(count(s) / n) * 100}%`
  const available = app.installType === 'Available'

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="space-y-4 border-b px-5 py-4">
        <p>
          <span className="text-3xl font-semibold tabular-nums">{count('Installed')}</span>
          <span className="text-muted-foreground"> of {n} devices {available ? 'installed from Self Service' : 'installed'}</span>
        </p>
        <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          {(['Installed', 'Pending', 'Failed'] as const).map((s) => <div key={s} className={statusDot[s]} style={{ width: pct(s) }} />)}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter devices by status">
          {filters.map((s) => (
            <button key={s} type="button" aria-pressed={filter === s} onClick={() => { setFilter(s); setPage(1) }}
              className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors',
                filter === s ? 'border-primary bg-primary/5 text-foreground' : 'text-muted-foreground hover:bg-muted')}>
              {s !== 'All' && <StatusDot className={statusDot[s]} />}
              {s}
              <span className={cn('tabular-nums', s === 'Failed' ? 'text-red-600' : 'text-foreground', 'font-medium')}>{s === 'All' ? n : count(s)}</span>
            </button>
          ))}
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60">
            <TableHead>Device</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map(({ device: d, status }) => (
            <TableRow key={d.id}>
              <TableCell className="font-medium">{d.name}</TableCell>
              <TableCell className="text-muted-foreground">{d.owner?.name ?? 'Shared device'}</TableCell>
              <TableCell className="text-muted-foreground">{d.model}</TableCell>
              <TableCell>
                {status === 'Installed' ? <StatusPill tone="green">Installed</StatusPill>
                  : status === 'Pending' ? <StatusPill tone="amber">Pending</StatusPill>
                  : status === 'Failed' ? <StatusPill tone="red">Failed</StatusPill>
                  : <span className="text-sm text-muted-foreground">Not installed</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {shown.length > LIST_PAGE && <Pager page={page} size={LIST_PAGE} total={shown.length} onPage={setPage} />}
    </Card>
  )
}

/** The rules, with a one-line result; the device-by-device audit opens in a side panel. */
// Scope as a list of rules: only what is actually set, one row each, so one rule
// or two hundred read the same way. Rows are ordered devices, device groups, users, user groups.
interface Rule { key: string; icon: LucideIcon; name: string; kind: string; devices: number }
const ruleIcon: Record<ScopeKind, LucideIcon> = { Device: Smartphone, DeviceGroup: Layers, User: UserIcon, UserGroup: UsersIcon }
const ruleOrder: ScopeKind[] = ['Device', 'DeviceGroup', 'User', 'UserGroup']
const RULES_SHOWN = 6
const ruleOf = (t: ScopeItem, p: LibraryApp['platform']): Rule =>
  ({ key: `${t.kind}:${t.id}`, icon: ruleIcon[t.kind], name: t.name, kind: kindSingular[t.kind], devices: coverage(t, p) })
function includeRules(app: LibraryApp): Rule[] {
  const p = app.platform
  return [
    ...(app.allDevices ? [{ key: 'all-devices', icon: MonitorSmartphone, name: `All ${p} devices`, kind: 'Every managed device', devices: platformTotal(p) }] : []),
    ...(app.allUsers ? [{ key: 'all-users', icon: UsersIcon, name: 'All users', kind: 'Every user with a device', devices: userDeviceTotal(p) }] : []),
    ...[...app.targets].sort((a, b) => ruleOrder.indexOf(a.kind) - ruleOrder.indexOf(b.kind)).map((t) => ruleOf(t, p)),
  ]
}

function RuleList({ title, rules, exclude }: { title: string; rules: Rule[]; exclude?: boolean }) {
  const [all, setAll] = useState(false)
  const shown = all ? rules : rules.slice(0, RULES_SHOWN)
  return (
    <div className="border-b px-5 py-4 last:border-b-0">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title} <span className="tabular-nums">· {rules.length} {rules.length === 1 ? 'rule' : 'rules'}</span>
      </p>
      <ul className="divide-y">
        {shown.map((r) => (
          <li key={r.key} className="flex items-center gap-3 py-2.5">
            <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/50', exclude && 'border-red-200 bg-red-50 text-red-700')}>
              <r.icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <Truncated text={r.name} className="text-sm font-medium" />
              <span className="block text-xs text-muted-foreground">{exclude ? `Excluded ${r.kind.toLowerCase()}` : r.kind}</span>
            </span>
            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{r.devices} {r.devices === 1 ? 'device' : 'devices'}</span>
          </li>
        ))}
      </ul>
      {rules.length > RULES_SHOWN && (
        <Button variant="ghost" size="sm" className="-ml-2 mt-1" onClick={() => setAll((v) => !v)}>
          {all ? 'Show fewer' : `Show all ${rules.length}`}<ChevronDown className={cn('size-4 transition-transform', all && 'rotate-180')} />
        </Button>
      )}
    </div>
  )
}

function ScopeTab({ app, onEdit }: { app: LibraryApp; onEdit: () => void }) {
  const [auditing, setAuditing] = useState(false)
  const { included, removed } = resolveScope(app)
  const nobody = !app.allDevices && !app.allUsers && !app.targets.length
  const lic = licensesFor(app)
  const short = lic && typeof lic.total === 'number' && included.length > lic.total ? included.length - lic.total : 0
  return (
    <SectionCard title="Who gets it" onEdit={nobody ? undefined : onEdit}>
      {nobody ? (
        <EmptyPanel art={<NoScopeArt app={app} />} title="Nobody gets this app yet"
          action={<Button onClick={onEdit}><Crosshair className="size-4" />Choose who gets it</Button>}>
          Pick devices, users or their groups. You can exclude some afterwards.
        </EmptyPanel>
      ) : (
      <>
      <RuleList title="Gets it" rules={includeRules(app)} />
      {app.exclusions.length > 0 && <RuleList title="Except" exclude rules={app.exclusions.map((t) => ruleOf(t, app.platform))} />}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 px-5 py-3">
        <p className="text-sm">
          <span className="font-semibold tabular-nums">{included.length}</span>
          <span className="text-muted-foreground"> of {platformTotal(app.platform)} {app.platform} devices get it</span>
          {removed.length > 0 && <span className="text-muted-foreground"> · {removed.length} excluded</span>}
          {short > 0 && <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-800"><AlertTriangle className="size-3.5" />{short} without a license</span>}
        </p>
        {(included.length > 0 || removed.length > 0) && (
          <Button variant="outline" size="sm" onClick={() => setAuditing(true)}><ListChecks className="size-4" />View devices</Button>
        )}
      </div>
      </>
      )}
      {auditing && <ScopeDevicesSheet app={app} onClose={() => setAuditing(false)} />}
    </SectionCard>
  )
}

function SelfServiceTab({ app, onEdit }: { app: LibraryApp; onEdit: () => void }) {
  const { categories } = useAppLibrary()
  const ss = app.selfService
  const mac = app.platform === 'macOS'
  const listed = listedInSelfService(app)
  const forced = app.installType === 'Forced install'
  const listedIn = categories.filter((c) => ss.displayIn.includes(c.id)).map((c) => c.name)
  const rows: Row[] = [
    ['Listed', !listed ? <Muted key="l">Not shown in Self Service</Muted> : forced ? 'After it installs' : 'Available to install'],
    ...(listed
      ? ([
          ['Categories', listedIn.length ? listedIn.join(', ') : <Muted key="c">None</Muted>],
          ...(mac ? [['Featured in', categories.filter((c) => ss.featureIn.includes(c.id)).map((c) => c.name).join(', ') || <Muted key="f">None</Muted>] as Row] : []),
          ['Featured', yesNo(ss.featured)],
          ['Compliance', yesNo(ss.compliance)],
          [mac ? 'Button' : 'Buttons', mac ? ss.buttonName || 'Install' : `${ss.buttonName || 'Install'} · ${ss.reinstallButtonName || 'Reinstall'}`],
          ['Description', ss.description || <Muted key="d">None</Muted>],
          ...(mac
            ? ([
                ['Must view description', yesNo(ss.forceDescription)],
                ['Notifications', ss.notify ? `${ss.notifyType}${ss.notifySubject ? ` · “${ss.notifySubject}”` : ''}` : 'Off'],
              ] as Row[])
            : []),
        ] as Row[])
      : []),
  ]
  return (
    <div className={cn('grid items-start gap-6', listed && 'lg:grid-cols-[minmax(0,1fr)_240px]')}>
      <SectionCard title="Self Service listing" onEdit={listed ? onEdit : undefined}>
        {listed ? <DetailRows rows={rows} /> : (
          <EmptyPanel art={<NotListedArt app={app} />} title="Not in Self Service"
            action={<Button onClick={onEdit}><Store className="size-4" />Set up Self Service</Button>}>
            {forced
              ? 'Forced installs arrive on their own. List it after install so people can find and reinstall it.'
              : 'List it in a category so people can find it and install it themselves.'}
          </EmptyPanel>
        )}
      </SectionCard>
      {listed && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Preview</p>
          <SelfServicePreview draft={app} categories={categories} />
        </div>
      )}
    </div>
  )
}

function ConfigTab({ app, onEdit }: { app: LibraryApp; onEdit: () => void }) {
  const c = app.config
  const vars = c ? variablesIn(c.plist) : []
  return (
    <SectionCard title="Managed configuration" onEdit={c ? onEdit : undefined}>
      {c ? (
        <>
          <DetailRows rows={[
            ['Source', c.fileName ? `Uploaded · ${c.fileName}` : 'Entered in the console'],
            ['Keys', String(keyCount(c.plist))],
            ['Variables', vars.length ? <span key="v" className="font-mono text-xs">{vars.join(', ')}</span> : <Muted key="v">None</Muted>],
          ]} />
          <pre className="overflow-auto border-t bg-muted/30 px-5 py-4 text-xs leading-relaxed">{c.plist}</pre>
        </>
      ) : (
        <EmptyPanel art={<NoConfigArt app={app} />} title="No managed configuration"
          action={<Button onClick={onEdit}><Plus className="size-4" />Add configuration</Button>}>
          Pre-fill server addresses, sign-in and settings so the app is ready on first launch.
        </EmptyPanel>
      )}
    </SectionCard>
  )
}

type Attrs = LibraryApp['attributes']

/** Switches edit the page draft; the page footer saves or discards it. */
function AttributesTab({ app, attrs, onChange }: { app: LibraryApp; attrs: Attrs; onChange: (a: Attrs) => void }) {
  const toggle = (key: keyof Attrs, on: boolean) => {
    const next = { ...attrs, [key]: on }
    if (key === 'hideable' && on) next.lockable = true // hideable apps are also lockable
    onChange(next)
  }
  return (
    <SectionCard title="Attributes">
      <ul className="divide-y">
        {attributeInfo.map((a) => {
          const edited = attrs[a.key] !== app.attributes[a.key]
          return (
            <li key={a.key} className={cn('flex items-center justify-between gap-6 px-5 py-3.5 transition-colors', edited && 'bg-amber-50/60')}>
              <label htmlFor={`attr-${a.key}`} className="min-w-0 cursor-pointer">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {a.label}
                  {edited && <EditedTag />}
                </span>
                <span className="block text-xs text-muted-foreground">{a.hint}</span>
              </label>
              <Switch id={`attr-${a.key}`} checked={attrs[a.key]} onCheckedChange={(v) => toggle(a.key, v)} />
            </li>
          )
        })}
      </ul>
    </SectionCard>
  )
}

const EditedTag = ({ children = 'Edited' }: { children?: string }) => (
  <span className="rounded bg-amber-100 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">{children}</span>
)

const DOMAIN = /^(applinks|webcredentials|activitycontinuation|appclips):[a-z0-9-]+(\.[a-z0-9-]+)+(\?mode=developer)?$/i
const MAX_DOMAINS = 50

/** Add or remove domains in the page draft; the page footer saves them. */
function DomainsTab({ app, domains, onChange }: { app: LibraryApp; domains: string[]; onChange: (d: string[]) => void }) {
  const [value, setValue] = useState('')
  const d = value.trim()
  const full = domains.length >= MAX_DOMAINS
  const error = !d ? null : domains.includes(d) ? 'Already added.' : !DOMAIN.test(d) ? 'Use the form applinks:example.com' : null
  const add = () => {
    if (!d || error || full) return
    onChange([...domains, d])
    setValue('')
  }
  const removed = app.associatedDomains.filter((x) => !domains.includes(x))

  return (
    <SectionCard title="Associated domains" aside={<span className="text-xs tabular-nums text-muted-foreground">{domains.length} / {MAX_DOMAINS}</span>}>
      <div className="space-y-1.5 border-b px-5 py-4">
        <div className="flex gap-2">
          <Input aria-label="Associated domain" placeholder="applinks:example.com" value={value} aria-invalid={!!error}
            onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} className="font-mono text-sm" />
          <Button onClick={add} disabled={!d || !!error || full}><Plus className="size-4" />Add</Button>
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : full && <p className="text-xs text-muted-foreground">Limit of {MAX_DOMAINS} reached.</p>}
      </div>
      {domains.length || removed.length ? (
        <ul className="divide-y">
          {domains.map((x) => {
            const added = !app.associatedDomains.includes(x)
            return (
              <li key={x} className={cn('flex items-center gap-3 py-2 pl-5 pr-3', added && 'bg-amber-50/60')}>
                <Globe className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate font-mono text-sm">{x}</span>
                {added && <EditedTag>New</EditedTag>}
                <Button variant="ghost" size="icon-sm" aria-label={`Remove ${x}`} onClick={() => onChange(domains.filter((y) => y !== x))}><X className="size-4" /></Button>
              </li>
            )
          })}
          {/* Removed but not saved yet: shown struck through so the change is visible, with an undo. */}
          {removed.map((x) => (
            <li key={x} className="flex items-center gap-3 bg-amber-50/60 py-2 pl-5 pr-3">
              <Globe className="size-4 shrink-0 text-muted-foreground/60" />
              <span className="min-w-0 flex-1 truncate font-mono text-sm text-muted-foreground line-through">{x}</span>
              <EditedTag>Removed</EditedTag>
              <Button variant="ghost" size="icon-sm" aria-label={`Keep ${x}`} onClick={() => onChange([...domains, x])}><Undo2 className="size-4" /></Button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyPanel art={<NoDomainsArt app={app} />} title="No associated domains">
          Link your domains so universal links and passkeys open straight in this app. Try <span className="font-mono text-foreground">applinks:acme.com</span>.
        </EmptyPanel>
      )}
    </SectionCard>
  )
}

/** One save bar for the whole page, in the shell's footer row while anything on it is unsaved. */
function SaveBar({ count, where, onDiscard, onSave }: { count: number; where: string[]; onDiscard: () => void; onSave: () => void }) {
  return (
    <PageFooter>
      <p className="min-w-0 flex-1 truncate text-sm">
        <span className="font-medium text-amber-800">{count} unsaved {count === 1 ? 'change' : 'changes'}</span>
        <span className="text-muted-foreground"> · {where.join(', ')}</span>
      </p>
      <Button variant="outline" onClick={onDiscard}><Undo2 className="size-4" />Discard</Button>
      <Button onClick={onSave}><Check className="size-4" />Save changes</Button>
    </PageFooter>
  )
}

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'general', label: 'General' },
  { key: 'scope', label: 'Scope' },
  { key: 'self-service', label: 'Self Service' },
  { key: 'configuration', label: 'App configuration' },
  { key: 'attributes', label: 'Attributes' },
  { key: 'domains', label: 'Associated domains' },
  { key: 'history', label: 'History' },
]

export function AppDetailsView({ app }: { app: LibraryApp }) {
  const { categories, updateApp } = useAppLibrary()
  const [params, setParams] = useSearchParams()
  const tab = tabs.some((t) => t.key === params.get('tab')) ? params.get('tab')! : 'overview'
  const setTab = (t: string) => setParams((p) => { const n = new URLSearchParams(p); n.set('tab', t); return n }, { replace: true })
  const [editing, setEditing] = useState<EditKey | null>(null)
  const [scoping, setScoping] = useState(false)
  const [attrs, setAttrs] = useState(app.attributes)
  const [domains, setDomains] = useState(app.associatedDomains)
  useEffect(() => setAttrs(app.attributes), [app.attributes])
  useEffect(() => setDomains(app.associatedDomains), [app.associatedDomains])
  const attrChanges = attributeInfo.filter((a) => attrs[a.key] !== app.attributes[a.key])
  const domainsAdded = domains.filter((d) => !app.associatedDomains.includes(d))
  const domainsRemoved = app.associatedDomains.filter((d) => !domains.includes(d))
  const attrsDirty = attrChanges.length > 0
  const domainsDirty = domainsAdded.length + domainsRemoved.length > 0
  const changeCount = attrChanges.length + domainsAdded.length + domainsRemoved.length
  const dirty = changeCount > 0
  const discard = () => { setAttrs(app.attributes); setDomains(app.associatedDomains) }
  const save = () => {
    const what = [
      ...(attrsDirty ? [`Attributes: ${attrChanges.map((a) => `${a.label} ${attrs[a.key] ? 'on' : 'off'}`).join(', ')}`] : []),
      ...(domainsDirty ? [`Associated domains: ${[...domainsAdded.map((d) => `+${d}`), ...domainsRemoved.map((d) => `−${d}`)].join(', ')}`] : []),
    ].join('; ')
    updateApp({ ...app, attributes: attrs, associatedDomains: domains }, what)
  }
  // Unsaved inline edits: ask before leaving the page.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname)
  // Scope on a deployed app goes through the drawer's review step: it changes real devices.
  const edit = (step: EditKey) => () => (step === 'scope' ? setScoping(true) : setEditing(step))

  return (
    <>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="line" className="w-full justify-start overflow-x-auto border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="flex-none px-3">
              {t.label}
              {((t.key === 'attributes' && attrsDirty) || (t.key === 'domains' && domainsDirty)) && <span className="size-1.5 rounded-full bg-amber-500" aria-label="Unsaved changes" />}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview"><Overview app={app} onScope={() => setScoping(true)} /></TabsContent>
          <TabsContent value="general">
            <SectionCard title="General settings" onEdit={edit('general')}>
              <DetailRows rows={[
                ['Entry name', app.name],
                ['Category', <CategoryName key="c" category={categories.find((c) => c.id === app.categoryId)} />],
                ['Installation type', app.installType],
                ...(app.source === 'VPP' ? [['License type', app.licenseType] as Row] : []),
                ['App updates', app.updatePolicy === 'Keep version' ? 'Don’t update' : app.updatePolicy === 'Prompt' ? 'Prompt user' : 'Automatic'],
              ]} />
            </SectionCard>
          </TabsContent>
          <TabsContent value="scope"><ScopeTab app={app} onEdit={edit('scope')} /></TabsContent>
          <TabsContent value="self-service" className="max-w-5xl"><SelfServiceTab app={app} onEdit={edit('selfService')} /></TabsContent>
          <TabsContent value="configuration"><ConfigTab app={app} onEdit={edit('config')} /></TabsContent>
          <TabsContent value="attributes"><AttributesTab app={app} attrs={attrs} onChange={setAttrs} /></TabsContent>
          <TabsContent value="domains"><DomainsTab app={app} domains={domains} onChange={setDomains} /></TabsContent>
          <TabsContent value="history">
            <SectionCard title="History"><div className="px-6 py-5"><HistoryList app={app} /></div></SectionCard>
          </TabsContent>
        </div>
      </Tabs>

      {dirty && (
        <SaveBar count={changeCount} onDiscard={discard} onSave={save}
          where={[...(attrsDirty ? ['Attributes'] : []), ...(domainsDirty ? ['Associated domains'] : [])]} />
      )}
      <DiscardDraftDialog blocker={blocker} title="Discard unsaved changes?" />

      {editing && <EditSheet key={editing} app={app} step={editing} onClose={() => setEditing(null)} />}
      {scoping && <ScopeDrawer app={app} onClose={() => setScoping(false)} />}
    </>
  )
}
