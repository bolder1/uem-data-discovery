import { useEffect, useMemo, useState, type ComponentType } from 'react'
import {
  AppWindow,
  ShieldCheck,
  ShieldAlert,
  MonitorSmartphone,
  Upload,
  Trash2,
  PackageMinus,
  Plus,
  Calendar,
  HardDrive,
  Boxes,
  Layers,
  Check,
  ChevronDown,
} from 'lucide-react'
import { useApplicationManagement } from '@/store/ApplicationManagementContext'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { formatBytes, formatDate } from '@/lib/format'
import type { AppVersion, ManagedApp } from '@/types'
import { platformLabel } from './PlatformIcon'
import { AppIcon } from './AppIcon'
import { Header, Toolbar } from './ViewChrome'
import { policyCountOf } from './AppRowMenu'
import type { AppMgmtViewProps } from './appMgmtView'

type Filter = 'all' | 'assigned' | 'unassigned'

// Workspace — a master-detail experience. The left rail lists app cards; picking
// one drives a persistent detail panel on the right (versions, policies, groups,
// actions) so nothing hides behind a drawer. Includes multi-select + Bulk Action.
export function WorkspaceView(props: AppMgmtViewProps) {
  const {
    os,
    onSwitchOs,
    query,
    onQueryChange,
    rows,
    appPolicies,
    recentId,
    selected,
    onToggleRow,
    selectedIds,
    onUpload,
    onOpenUpdate,
    onAssign,
    onRequestDelete,
    view,
    onChangeView,
  } = props

  const { uninstallVersion } = useApplicationManagement()
  const valid = useMemo(() => new Set(appPolicies.map((p) => p.id)), [appPolicies])

  const [filter, setFilter] = useState<Filter>('all')
  const shown = useMemo(() => {
    if (filter === 'assigned') return rows.filter((a) => policyCountOf(a, valid) > 0)
    if (filter === 'unassigned') return rows.filter((a) => policyCountOf(a, valid) === 0)
    return rows
  }, [rows, filter, valid])

  const [selectedId, setSelectedId] = useState<string | null>(rows[0]?.id ?? null)
  useEffect(() => {
    if (recentId && rows.some((r) => r.id === recentId)) setSelectedId(recentId)
  }, [recentId, rows])
  useEffect(() => {
    if (!shown.some((r) => r.id === selectedId)) setSelectedId(shown[0]?.id ?? null)
  }, [shown, selectedId])

  const selectedApp = rows.find((a) => a.id === selectedId) ?? null
  const assignedCount = rows.filter((a) => policyCountOf(a, valid) > 0).length

  const allShownSelected = shown.length > 0 && shown.every((a) => selected.has(a.id))
  const someShownSelected = shown.some((a) => selected.has(a.id))
  const toggleAllShown = () => {
    const target = !allShownSelected
    shown.forEach((a) => selected.has(a.id) !== target && onToggleRow(a.id))
  }

  return (
    <div className="space-y-5">
      <Header view={view} onChangeView={onChangeView} />
      <Toolbar
        os={os}
        onSwitchOs={onSwitchOs}
        query={query}
        onQueryChange={onQueryChange}
        onUpload={onUpload}
      />

      {/* filters + bulk */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            All <Count>{rows.length}</Count>
          </FilterChip>
          <FilterChip active={filter === 'assigned'} onClick={() => setFilter('assigned')}>
            Assigned <Count>{assignedCount}</Count>
          </FilterChip>
          <FilterChip active={filter === 'unassigned'} onClick={() => setFilter('unassigned')}>
            Unassigned <Count>{rows.length - assignedCount}</Count>
          </FilterChip>
        </div>
        <BulkBar
          count={selectedIds.length}
          allSelected={allShownSelected}
          someSelected={someShownSelected}
          onToggleAll={toggleAllShown}
          onDelete={() =>
            selectedIds.length > 0 && onRequestDelete({ kind: 'bulk', ids: selectedIds })
          }
        />
      </div>

      {/* master-detail */}
      <div className="grid gap-4 lg:grid-cols-[minmax(320px,400px)_1fr]">
        <div className="flex flex-col gap-2 lg:max-h-[calc(100vh-300px)] lg:overflow-y-auto lg:pr-1">
          {shown.length === 0 ? (
            <EmptyList query={query} os={os} onUpload={onUpload} />
          ) : (
            shown.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                selected={app.id === selectedId}
                bulkSelected={selected.has(app.id)}
                fresh={app.id === recentId}
                policies={policyCountOf(app, valid)}
                onSelect={() => setSelectedId(app.id)}
                onToggleBulk={() => onToggleRow(app.id)}
              />
            ))
          )}
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          {selectedApp ? (
            <DetailPanel
              app={selectedApp}
              policyNames={(selectedApp.policyIds ?? [])
                .map((id) => appPolicies.find((p) => p.id === id)?.name)
                .filter((n): n is string => Boolean(n))}
              onUpdate={() => onOpenUpdate(selectedApp)}
              onAssign={() => onAssign(selectedApp)}
              onDeleteApp={() => onRequestDelete({ kind: 'app', app: selectedApp })}
              onUninstall={(v) => uninstallVersion(selectedApp.id, v.id)}
              onDeleteVersion={(v) =>
                onRequestDelete({ kind: 'version', app: selectedApp, version: v })
              }
            />
          ) : (
            <DetailEmpty />
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function BulkBar({
  count,
  allSelected,
  someSelected,
  onToggleAll,
  onDelete,
}: {
  count: number
  allSelected: boolean
  someSelected: boolean
  onToggleAll: () => void
  onDelete: () => void
}) {
  const disabled = count === 0
  return (
    <div className="ml-auto flex items-center gap-2.5">
      <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-muted-foreground">
        <Checkbox
          checked={allSelected ? true : someSelected ? 'indeterminate' : false}
          onCheckedChange={onToggleAll}
          aria-label="Select all visible"
        />
        Select all
      </label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors',
              disabled
                ? 'cursor-not-allowed border-border bg-secondary/40 text-muted-foreground'
                : 'border-border bg-card text-foreground hover:bg-secondary',
            )}
          >
            Bulk Action{count > 0 ? ` (${count})` : ''}
            <ChevronDown className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 className="size-4" />
            Delete selected
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function AppCard({
  app,
  selected,
  bulkSelected,
  fresh,
  policies,
  onSelect,
  onToggleBulk,
}: {
  app: ManagedApp
  selected: boolean
  bulkSelected: boolean
  fresh: boolean
  policies: number
  onSelect: () => void
  onToggleBulk: () => void
}) {
  const head = app.versions[0]
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(e) =>
        (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect())
      }
      className={cn(
        'group w-full cursor-pointer rounded-xl border bg-card p-3 text-left shadow-sm outline-none transition-all focus-visible:ring-2 focus-visible:ring-brand/40',
        selected ? 'border-brand ring-2 ring-brand/25' : 'hover:border-brand/40 hover:shadow',
        fresh && !selected && 'border-brand/40',
        bulkSelected && !selected && 'bg-brand/[0.04]',
      )}
    >
      <div className="flex items-start gap-3">
        <span onClick={(e) => e.stopPropagation()} className="pt-0.5">
          <Checkbox
            checked={bulkSelected}
            onCheckedChange={onToggleBulk}
            aria-label={`Select ${app.name}`}
          />
        </span>
        <AppIcon app={app} size="md" showPlatformBadge />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{app.name}</p>
            {fresh && (
              <span className="rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-medium text-brand">
                New
              </span>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">{app.publisher}</p>
          <div className="mt-2 flex items-center gap-2.5 text-[11px] text-muted-foreground">
            <span className="tabular-nums">v{head?.version ?? '—'}</span>
            <span className="text-border">•</span>
            <span className="tabular-nums">{head ? formatBytes(head.sizeBytes) : '—'}</span>
            <span className="text-border">•</span>
            <span className="inline-flex items-center gap-1">
              <Boxes className="size-3" />
              {head?.publishedGroups ?? 0}
            </span>
          </div>
        </div>
        {policies > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            <ShieldCheck className="size-3" />
            {policies}
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            <ShieldAlert className="size-3" />
            None
          </span>
        )}
      </div>
    </div>
  )
}

function EmptyList({
  query,
  os,
  onUpload,
}: {
  query: string
  os: ManagedApp['platform']
  onUpload: () => void
}) {
  const searching = query.trim().length > 0
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-12 text-center">
      <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <AppWindow className="size-5" />
      </span>
      <p className="text-sm font-semibold text-foreground">
        {searching ? 'No applications match this filter' : `No ${platformLabel(os)} applications yet`}
      </p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        {searching
          ? 'Try a different search or clear the assignment filter.'
          : `Upload a ${platformLabel(os)} package to deploy it across your devices.`}
      </p>
      {!searching && (
        <Button onClick={onUpload} size="sm" className="mt-4 gap-2">
          <Upload className="size-4" />
          Upload {platformLabel(os)} App
        </Button>
      )}
    </div>
  )
}

function DetailPanel({
  app,
  policyNames,
  onUpdate,
  onAssign,
  onDeleteApp,
  onUninstall,
  onDeleteVersion,
}: {
  app: ManagedApp
  policyNames: string[]
  onUpdate: () => void
  onAssign: () => void
  onDeleteApp: () => void
  onUninstall: (v: AppVersion) => void
  onDeleteVersion: (v: AppVersion) => void
}) {
  const head = app.versions[0]
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="border-b bg-gradient-to-b from-secondary/40 to-transparent px-6 py-5">
        <div className="flex items-start gap-4">
          <AppIcon app={app} size="lg" showPlatformBadge />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-foreground">{app.name}</h2>
            <p className="truncate text-sm text-muted-foreground">{app.publisher}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {platformLabel(app.platform)} · {app.packageType}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={onUpdate}>
            <Upload className="size-4" />
            Update
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={onAssign}>
            <ShieldCheck className="size-4" />
            Assign policies
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDeleteApp}
          >
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
        <Fact icon={Layers} label="Version" value={head?.version ?? '—'} />
        <Fact icon={HardDrive} label="Size" value={head ? formatBytes(head.sizeBytes) : '—'} />
        <Fact
          icon={MonitorSmartphone}
          label="Devices"
          value={(head?.installedDevices ?? 0).toLocaleString()}
        />
        <Fact icon={Boxes} label="Groups" value={(head?.publishedGroups ?? 0).toLocaleString()} />
      </div>

      <Section
        title="Policies"
        action={
          <button
            type="button"
            onClick={onAssign}
            className="text-xs font-medium text-brand hover:underline"
          >
            Manage
          </button>
        }
      >
        {policyNames.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {policyNames.map((name, i) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 rounded-full border bg-secondary/60 px-2.5 py-1 text-xs font-medium text-foreground"
              >
                <ShieldCheck className="size-3.5 text-muted-foreground" />
                {name}
                {i === 0 && (
                  <span className="rounded bg-brand/10 px-1 text-[10px] text-brand">Active</span>
                )}
              </span>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-dashed bg-secondary/30 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">No policies assigned yet.</p>
            <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={onAssign}>
              <Plus className="size-3.5" />
              Assign
            </Button>
          </div>
        )}
      </Section>

      <Section title={`Version history · ${app.versions.length}`}>
        <div className="space-y-2">
          {app.versions.map((v, i) => {
            const installed = v.installedDevices > 0
            return (
              <div key={v.id} className="rounded-lg border bg-card px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    App Version {v.version}
                  </span>
                  {i === 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                      <Check className="size-3" />
                      Current
                    </span>
                  )}
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                    {formatBytes(v.sizeBytes)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3" />
                    {formatDate(v.uploadedAt)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MonitorSmartphone className="size-3" />
                    {v.installedDevices.toLocaleString()} devices
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5"
                    disabled={!installed}
                    onClick={() => onUninstall(v)}
                  >
                    <PackageMinus className="size-3.5" />
                    {installed ? 'Uninstall' : 'Not installed'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onDeleteVersion(v)}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </Section>
    </div>
  )
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="bg-card px-4 py-3">
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="border-t px-6 py-4">
      <div className="mb-2.5 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function DetailEmpty() {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
      <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <AppWindow className="size-6" />
      </span>
      <p className="text-sm font-semibold text-foreground">Select an application</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Pick an app on the left to see its versions, policies and deployment at a glance.
      </p>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-brand/40 bg-brand/10 text-brand'
          : 'border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function Count({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-black/5 px-1.5 text-[11px] tabular-nums dark:bg-white/10">
      {children}
    </span>
  )
}
