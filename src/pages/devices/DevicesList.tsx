// Device Inventory → Devices, iOS and macOS. Same structure as the live product
// (platform tabs, search, device type, actions, bulk action, customize, filter)
// with its gaps closed: one column model for both platforms, health and last
// check-in on every row, and row menus that only offer what the device can do.
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ChevronDown, Columns3, Download, History, Laptop, ListFilter, MapPin, MoreVertical, Plus, RefreshCw, Search, Smartphone, Tablet, X,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PageHeader, StatusDot } from '@/components/common'
import { Pager } from '@/components/apps/Pager'
import { cn } from '@/lib/utils'
import {
  HEALTH_META, checkInLabel, deviceHealth, healthOrder, inventory, isOffline, tabOf,
  type DeviceHealth, type InventoryDevice, type Ownership, type PlatformTab,
} from '@/data/deviceInventory'
import { actionGroups, actionsFor } from '@/data/deviceActions'

const PAGE_SIZE = 10
const platformIcon = { iOS: Smartphone, iPadOS: Tablet, macOS: Laptop }

type Row = { d: InventoryDevice; health: DeviceHealth }

/* ── columns: one model, per-platform defaults ────────────── */

interface Column {
  id: string
  label: string
  platforms: PlatformTab[]
  locked?: boolean
  cell: (r: Row) => ReactNode
}

const Muted = ({ children }: { children: ReactNode }) => <span className="text-muted-foreground">{children}</span>

const columns: Column[] = [
  { id: 'device', label: 'Device', platforms: ['ios', 'macos'], locked: true, cell: ({ d }) => {
    const Icon = platformIcon[d.platform]
    return (
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground"><Icon className="size-4" /></span>
        <div className="min-w-0">
          {/* The name is the keyboard target; the row click is a mouse shortcut. */}
          <Link to={`/devices/${d.id}`} onClick={(e) => e.stopPropagation()} className="block max-w-56 truncate font-medium hover:underline focus-visible:underline focus-visible:outline-none">{d.name}</Link>
          <p className="font-mono text-xs text-muted-foreground">{d.serial}</p>
        </div>
      </div>
    )
  } },
  { id: 'user', label: 'User', platforms: ['ios', 'macos'], cell: ({ d }) => d.owner
    ? <div className="min-w-0"><p className="max-w-48 truncate">{d.owner.email}</p><p className="text-xs text-muted-foreground">{d.departmentName}</p></div>
    : <Muted>Shared · {d.buildingName}</Muted> },
  { id: 'status', label: 'Status', platforms: ['ios', 'macos'], cell: ({ d, health }) => (
    <div className="flex flex-col items-start gap-1">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium"><StatusDot className={HEALTH_META[health].dot} />{health}</span>
      {d.lostMode && <span className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700"><MapPin className="size-3" />Lost Mode</span>}
    </div>
  ) },
  { id: 'checkin', label: 'Last check-in', platforms: ['ios', 'macos'], cell: ({ d }) => <span className={cn('tabular-nums', isOffline(d) ? 'text-red-600' : 'text-muted-foreground')}>{checkInLabel(d)}</span> },
  { id: 'version', label: 'Version', platforms: ['ios', 'macos'], cell: ({ d }) => (
    <div><span className="tabular-nums">{d.osVersion}</span>{!d.osCurrent && <p className="text-xs text-amber-700">Update available</p>}</div>
  ) },
  { id: 'model', label: 'Model', platforms: ['ios', 'macos'], cell: ({ d }) => <div><p>{d.model}</p><p className="font-mono text-xs text-muted-foreground">{d.modelId}</p></div> },
  { id: 'ownership', label: 'Ownership', platforms: ['ios', 'macos'], cell: ({ d }) => <span>{d.ownership}</span> },
  { id: 'enrollment', label: 'Enrollment', platforms: ['ios', 'macos'], cell: ({ d }) => <span>{d.enrollmentType}{d.supervised ? '' : <Muted> · unsupervised</Muted>}</span> },
  { id: 'groups', label: 'Device groups', platforms: ['ios', 'macos'], cell: ({ d }) => (
    <div className="flex items-center gap-1">
      <span className="max-w-36 truncate rounded bg-secondary px-1.5 py-0.5 text-xs">{d.groups[0]}</span>
      {d.groups.length > 1 && <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground" title={d.groups.slice(1).join(', ')}>+{d.groups.length - 1}</span>}
    </div>
  ) },
  { id: 'profile', label: 'Profile', platforms: ['ios', 'macos'], cell: ({ d }) => d.profileName ?? <Muted>None</Muted> },
  { id: 'agent', label: 'Agent', platforms: ['macos'], cell: ({ d }) => d.agentVersion ? <span className="tabular-nums">{d.agentVersion}</span> : <Muted>Not installed</Muted> },
  { id: 'uninstall', label: 'Uninstall permission', platforms: ['macos'], cell: ({ d }) => d.uninstallPermission ?? <Muted>—</Muted> },
]

const defaultColumns: Record<PlatformTab, string[]> = {
  ios: ['device', 'user', 'status', 'checkin', 'version', 'model', 'ownership', 'groups', 'profile'],
  macos: ['device', 'user', 'status', 'checkin', 'version', 'model', 'ownership', 'groups', 'agent'],
}

/* ── customize columns sheet ──────────────────────────────── */

function CustomizeSheet({ tab, visible, onSave, onClose }: { tab: PlatformTab; visible: string[]; onSave: (ids: string[]) => void; onClose: () => void }) {
  const [sel, setSel] = useState(visible)
  const available = columns.filter((c) => c.platforms.includes(tab))
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-sm">
        <SheetHeader className="border-b px-6 py-4 text-left">
          <SheetTitle className="text-lg">Customize columns</SheetTitle>
          <SheetDescription>Choose what the {tab === 'ios' ? 'iOS' : 'macOS'} table shows. Saved for this tab only.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-1 overflow-y-auto px-6 py-4">
          {available.map((c) => (
            <label key={c.id} className={cn('flex items-center gap-3 rounded-md px-2 py-2 text-sm', !c.locked && 'cursor-pointer hover:bg-muted/50')}>
              <Checkbox checked={sel.includes(c.id)} disabled={c.locked} onCheckedChange={() => toggle(c.id)} />
              <span className={cn(c.locked && 'text-muted-foreground')}>{c.label}{c.locked && ' (always shown)'}</span>
            </label>
          ))}
          <button type="button" className="mt-2 px-2 text-sm font-medium text-primary hover:underline" onClick={() => setSel(defaultColumns[tab])}>Reset to default</button>
        </div>
        <SheetFooter className="flex-row justify-end gap-2 border-t px-6 py-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave(sel); onClose() }}>Save</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

/* ── page ─────────────────────────────────────────────────── */

interface Filters { ownership: Ownership | 'all'; group: string; lost: boolean }
const noFilters: Filters = { ownership: 'all', group: 'all', lost: false }

export function DevicesList() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab: PlatformTab = params.get('os') === 'macos' ? 'macos' : 'ios'
  const [query, setQuery] = useState('')
  const [deviceType, setDeviceType] = useState<'all' | 'abm'>('all')
  const [health, setHealth] = useState<DeviceHealth | 'all'>('all')
  const [filters, setFilters] = useState<Filters>(noFilters)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [cols, setCols] = useState(defaultColumns)
  const [customizing, setCustomizing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const rows: Row[] = useMemo(() => inventory.map((d) => ({ d, health: deviceHealth(d) })), [])
  const inTab = useMemo(() => rows.filter((r) => tabOf(r.d) === tab), [rows, tab])
  const groupNames = useMemo(() => [...new Set(inTab.flatMap((r) => r.d.groups))].sort(), [inTab])

  const q = query.trim().toLowerCase()
  const visible = inTab.filter(({ d, health: h }) =>
    (deviceType === 'all' || d.enrollmentType === 'ABM') &&
    (health === 'all' || h === health) &&
    (filters.ownership === 'all' || d.ownership === filters.ownership) &&
    (filters.group === 'all' || d.groups.includes(filters.group)) &&
    (!filters.lost || d.lostMode) &&
    (!q || [d.name, d.serial, d.model, d.modelId, d.owner?.name, d.owner?.email].some((v) => v?.toLowerCase().includes(q))),
  )
  const pageRows = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const shownCols = columns.filter((c) => c.platforms.includes(tab) && cols[tab].includes(c.id))
  const filterCount = Number(filters.ownership !== 'all') + Number(filters.group !== 'all') + Number(filters.lost)
  const count = (h: DeviceHealth) => inTab.filter((r) => r.health === h).length

  // Any filter change returns to page 1 and clears the selection, so bulk actions never hit hidden rows.
  const reset = () => { setPage(1); setSelected(new Set()) }
  const switchTab = (t: PlatformTab) => { setParams(t === 'macos' ? { os: 'macos' } : {}); setHealth('all'); setFilters(noFilters); setQuery(''); reset() }
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => selected.has(r.d.id))
  const togglePage = () => setSelected((s) => { const n = new Set(s); pageRows.forEach((r) => (allOnPage ? n.delete(r.d.id) : n.add(r.d.id))); return n })
  const toggleRow = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const say = (m: string) => { setNotice(m); setTimeout(() => setNotice(null), 3200) }

  const platformLabel = tab === 'ios' ? 'iOS' : 'macOS'

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={[{ label: 'Device Inventory' }, { label: 'Devices' }]}
        title="Devices"
        description="Manage and monitor your organization's Apple devices"
        actions={<>
          <Button variant="outline" asChild><Link to="/devices/activity"><History className="size-4" />Activity</Link></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button>Actions<ChevronDown className="size-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuItem onSelect={() => say(`Sync requested for ${inTab.length} ${platformLabel} devices.`)}>
                <RefreshCw className="size-4" /><div><p>Sync devices</p><p className="text-xs text-muted-foreground">Refresh the status of all devices</p></div>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => say('Export started. The CSV downloads when it is ready.')}>
                <Download className="size-4" /><div><p>Export device list</p><p className="text-xs text-muted-foreground">Download the current view as CSV</p></div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <Plus className="size-4" /><div><p>Enroll {platformLabel} device</p><p className="text-xs text-muted-foreground">Guided step-by-step enrollment</p></div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>}
      />

      {/* Platform tabs — counts tell you where the fleet is before you click. */}
      <div role="tablist" aria-label="Platform" className="flex gap-6 border-b">
        {(['ios', 'macos'] as const).map((t) => {
          const n = rows.filter((r) => tabOf(r.d) === t).length
          return (
            <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => switchTab(t)}
              className={cn('-mb-px flex items-center gap-2 border-b-2 px-1 pb-2.5 text-sm font-medium transition-colors',
                tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
              {t === 'ios' ? 'iOS' : 'macOS'}<span className="rounded bg-secondary px-1.5 text-xs tabular-nums text-muted-foreground">{n}</span>
            </button>
          )
        })}
      </div>

      {/* Health strip doubles as the quickest filter. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {healthOrder.map((h) => (
          <button key={h} type="button" aria-pressed={health === h} onClick={() => { setHealth(health === h ? 'all' : h); reset() }}
            className={cn('flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:border-brand/40',
              health === h && 'border-brand/40 bg-brand/5')}>
            <span className="flex items-center gap-2 text-sm"><StatusDot className={HEALTH_META[h].dot} />{h}</span>
            <span className="text-lg font-semibold tabular-nums">{count(h)}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={query} onChange={(e) => { setQuery(e.target.value); reset() }}
            placeholder="Search name, serial, model or user" aria-label="Search devices" className="h-9 pl-9" />
        </div>
        <Select value={deviceType} onValueChange={(v) => { setDeviceType(v as 'all' | 'abm'); reset() }}>
          <SelectTrigger className="h-9 w-40" aria-label="Device type"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All devices</SelectItem><SelectItem value="abm">ABM devices</SelectItem></SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9"><ListFilter className="size-4" />Filter{filterCount > 0 && <span className="rounded bg-primary px-1.5 text-xs text-primary-foreground">{filterCount}</span>}</Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 space-y-4">
            <div className="space-y-1.5">
              <Label>Ownership</Label>
              <Select value={filters.ownership} onValueChange={(v) => { setFilters({ ...filters, ownership: v as Filters['ownership'] }); reset() }}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Any</SelectItem><SelectItem value="Company owned">Company owned</SelectItem><SelectItem value="BYOD">BYOD</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Device group</Label>
              <Select value={filters.group} onValueChange={(v) => { setFilters({ ...filters, group: v }); reset() }}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Any</SelectItem>{groupNames.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {tab === 'ios' && (
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={filters.lost} onCheckedChange={(c) => { setFilters({ ...filters, lost: !!c }); reset() }} />Only devices in Lost Mode</label>
            )}
            {filterCount > 0 && <Button variant="ghost" size="sm" onClick={() => { setFilters(noFilters); reset() }}>Clear filters</Button>}
          </PopoverContent>
        </Popover>

        <Button variant="outline" size="sm" className="h-9" onClick={() => setCustomizing(true)}><Columns3 className="size-4" />Columns</Button>

        {(q || health !== 'all' || filterCount > 0 || deviceType !== 'all') && (
          <Button variant="ghost" size="sm" className="h-9" onClick={() => { setQuery(''); setHealth('all'); setFilters(noFilters); setDeviceType('all'); reset() }}>
            <X className="size-4" />Clear all
          </Button>
        )}
      </div>

      {/* Bulk bar appears only with a selection, instead of a dead "Bulk Action" select. */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand/30 bg-brand/5 px-4 py-2 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <span className="text-muted-foreground">·</span>
          {['Sync', 'Lock', 'Restart'].map((a) => (
            <Button key={a} size="sm" variant="outline" onClick={() => { say(`${a} sent to ${selected.size} devices. Runs on each device's next check-in.`); setSelected(new Set()) }}>{a}</Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => say('Add to group is not in this prototype yet.')}>Add to group</Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>Clear selection</Button>
        </div>
      )}

      <Card className="gap-0 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead className="w-10"><Checkbox checked={allOnPage} onCheckedChange={togglePage} aria-label="Select all on this page" /></TableHead>
                {shownCols.map((c) => <TableHead key={c.id} className="whitespace-nowrap">{c.label}</TableHead>)}
                <TableHead className="w-16 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.d.id} data-state={selected.has(r.d.id) ? 'selected' : undefined} className="cursor-pointer" onClick={() => navigate(`/devices/${r.d.id}`)}>
                  <TableCell onClick={(e) => e.stopPropagation()}><Checkbox checked={selected.has(r.d.id)} onCheckedChange={() => toggleRow(r.d.id)} aria-label={`Select ${r.d.name}`} /></TableCell>
                  {shownCols.map((c) => <TableCell key={c.id}>{c.cell(r)}</TableCell>)}
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}><RowMenu d={r.d} onSend={say} onOpen={() => navigate(`/devices/${r.d.id}`)} /></TableCell>
                </TableRow>
              ))}
              {!pageRows.length && (
                <TableRow><TableCell colSpan={shownCols.length + 2} className="py-10 text-muted-foreground">No {platformLabel} devices match these filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <Pager page={page} size={PAGE_SIZE} total={visible.length} onPage={setPage} />
      </Card>

      {customizing && <CustomizeSheet tab={tab} visible={cols[tab]} onClose={() => setCustomizing(false)} onSave={(ids) => setCols({ ...cols, [tab]: ids })} />}
      {notice && <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg">{notice}</div>}
    </div>
  )
}

/** Grouped, state-aware row menu: the same catalog and rules as the detail page. */
function RowMenu({ d, onSend, onOpen }: { d: InventoryDevice; onSend: (m: string) => void; onOpen: () => void }) {
  const items = actionsFor(d).filter((x) => !x.action.toggle && !x.action.input)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${d.name}`}><MoreVertical className="size-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem onSelect={onOpen}>Open device</DropdownMenuItem>
        {actionGroups.map((g) => {
          const inGroup = items.filter((x) => x.action.group === g)
          if (!inGroup.length) return null
          return (
            <div key={g}>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">{g}</DropdownMenuLabel>
              {inGroup.map(({ action: a, enabled, reason }) => (
                <DropdownMenuItem key={a.id} disabled={!enabled} variant={a.danger ? 'destructive' : 'default'}
                  onSelect={() => (a.confirm ? onOpen() : onSend(`${a.label} sent to ${d.name}.`))}>
                  <a.icon className="size-4" />
                  <div className="min-w-0"><p>{a.label}{a.confirm && '…'}</p>{reason && <p className="text-xs text-muted-foreground">{reason}</p>}</div>
                </DropdownMenuItem>
              ))}
            </div>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
