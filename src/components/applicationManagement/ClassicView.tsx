import {
  Upload,
  Search,
  MoreVertical,
  Info,
  ShieldCheck,
  Trash2,
  Package,
  CheckCircle2,
  MonitorSmartphone,
  Clock,
  X,
  AppWindow,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { PageHeader, SummaryCard, EmptyState } from '@/components/common'
import { formatBytes, formatDate } from '@/lib/format'
import type { AppPlatform } from '@/types'
import { PlatformIcon, platformLabel } from './PlatformIcon'
import { AppIcon } from './AppIcon'
import { ViewSwitcher } from './ViewSwitcher'
import { PoliciesCell } from './PoliciesCell'
import { GroupAddedCell } from './GroupAddedCell'
import type { AppMgmtViewProps } from './appMgmtView'

export function ClassicView(props: AppMgmtViewProps) {
  const {
    view,
    onChangeView,
    os,
    onSwitchOs,
    winCount,
    macCount,
    query,
    onQueryChange,
    rows,
    summary,
    recentId,
    appPolicies,
    selected,
    onToggleRow,
    onToggleAll,
    allVisibleSelected,
    someVisibleSelected,
    onClearSelection,
    selectedIds,
    onUpload,
    onOpenDetails,
    onOpenUpdate,
    onAssign,
    onRequestDelete,
  } = props

  const q = query.trim()

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[
          { label: 'Mobile Device Management' },
          { label: 'Application Management' },
        ]}
        title="Application Management"
        description="Upload and deploy Windows (MSI) and macOS applications across your enrolled devices."
        actions={
          <div className="flex items-center gap-3">
            <ViewSwitcher view={view} onChange={onChangeView} />
            <Button onClick={onUpload}>
              <Upload className="size-4" />
              Upload {platformLabel(os)} App
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total applications"
          value={summary.total}
          icon={Package}
          iconClass="bg-brand/10 text-brand"
        />
        <SummaryCard
          label="Policies assigned"
          value={summary.assigned}
          icon={CheckCircle2}
          iconClass="bg-brand/10 text-brand"
        />
        <SummaryCard
          label="Devices covered"
          value={summary.devices.toLocaleString()}
          icon={MonitorSmartphone}
          iconClass="bg-brand/10 text-brand"
        />
        <SummaryCard
          label="Unassigned"
          value={summary.unassigned}
          icon={Clock}
          iconClass="bg-brand/10 text-brand"
        />
      </div>

      <Tabs value={os} onValueChange={(v) => onSwitchOs(v as AppPlatform)}>
        <TabsList>
          <TabsTrigger value="windows">
            <PlatformIcon platform="windows" bare className="size-3.5" />
            Windows
            <Badge variant="secondary" className="ml-1 tabular-nums">
              {winCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="macos">
            <PlatformIcon platform="macos" bare className="size-3.5" />
            macOS
            <Badge variant="secondary" className="ml-1 tabular-nums">
              {macCount}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* toolbar / selection bar */}
      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand/30 bg-brand/5 px-3 py-2">
          <span className="text-sm font-medium text-foreground">
            {selected.size} selected
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onRequestDelete({ kind: 'bulk', ids: selectedIds })}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={onClearSelection}>
              <X className="size-4" />
              Clear
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search by app name or publisher…"
            className="h-9 pl-9"
          />
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={AppWindow}
          title={
            q
              ? 'No applications match this search'
              : `No ${platformLabel(os)} applications yet`
          }
          description={
            q
              ? 'Adjust your search to widen the results.'
              : `Upload a ${platformLabel(os)} package to deploy it across your enrolled devices.`
          }
          action={
            !q && (
              <Button onClick={onUpload}>
                <Upload className="size-4" />
                Upload {platformLabel(os)} App
              </Button>
            )
          }
        />
      ) : (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      allVisibleSelected
                        ? true
                        : someVisibleSelected
                          ? 'indeterminate'
                          : false
                    }
                    onCheckedChange={onToggleAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Group added</TableHead>
                <TableHead>Uploaded on</TableHead>
                <TableHead>Policies</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((app) => {
                const head = app.versions[0]
                const isSel = selected.has(app.id)
                return (
                  <TableRow
                    key={app.id}
                    onClick={() => onOpenDetails(app.id)}
                    data-state={isSel ? 'selected' : undefined}
                    className={
                      app.id === recentId
                        ? 'cursor-pointer ring-2 ring-brand ring-inset hover:bg-accent/40'
                        : 'cursor-pointer hover:bg-accent/40'
                    }
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSel}
                        onCheckedChange={() => onToggleRow(app.id)}
                        aria-label={`Select ${app.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <AppIcon app={app} size="sm" showPlatformBadge />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{app.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {app.publisher}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {head?.version ?? '—'}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {head ? formatBytes(head.sizeBytes) : '—'}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      <GroupAddedCell count={head?.publishedGroups ?? 0} appId={app.id} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {head ? formatDate(head.uploadedAt) : '—'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <PoliciesCell
                        app={app}
                        appPolicies={appPolicies}
                        onAssign={() => onAssign(app)}
                      />
                    </TableCell>
                    <TableCell
                      className="text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Actions for ${app.name}`}
                            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          >
                            <MoreVertical className="size-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onOpenDetails(app.id)}>
                            <Info className="size-4" />
                            Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onOpenUpdate(app)}>
                            <Upload className="size-4" />
                            Update
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAssign(app)}>
                            <ShieldCheck className="size-4" />
                            Assign policies
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={(e) => {
                              e.preventDefault()
                              onRequestDelete({ kind: 'app', app })
                            }}
                          >
                            <Trash2 className="size-4" />
                            Delete
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
    </div>
  )
}
