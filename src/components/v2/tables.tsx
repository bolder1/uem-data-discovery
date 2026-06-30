import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRight,
  MoreVertical,
  Play,
  Trash2,
  Plus,
  Box,
  Check,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { RiskBadge, ProviderIcon } from '@/components/common'
import { ExposurePill } from '@/components/discovery/ScopeTable'
import { useDataDiscovery } from '@/store/DataDiscoveryContext'
import { classificationById, fileTypeById, providerById } from '@/data'
import { fileTypeIcon, classificationIcon } from '@/lib/icons'
import { formatBytes, formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type {
  Configuration,
  Finding,
  FindingStatus,
  Policy,
  Scope,
} from '@/types'

// Monochrome icon chip — color is reserved for risk / status / exposure.
function IconChip({ id, kind }: { id: string; kind: 'file' | 'class' }) {
  const Icon = kind === 'file' ? fileTypeIcon(id) : classificationIcon(id)
  const label =
    kind === 'file'
      ? (fileTypeById(id)?.label ?? id)
      : (classificationById(id)?.label ?? id)
  return (
    <span
      title={label}
      aria-label={label}
      className="flex size-6 items-center justify-center rounded-md bg-secondary text-muted-foreground"
    >
      <Icon className="size-3.5" />
    </span>
  )
}

// Calm triage-status pill — gray for open/dismissed, emerald only for acknowledged.
function StatusPill({ status }: { status: FindingStatus }) {
  if (status === 'acknowledged') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        <Check className="size-3" />
        Acknowledged
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {status === 'dismissed' ? 'Dismissed' : 'Open'}
    </span>
  )
}

/* ----------------------------------- Policies ---------------------------------- */

function PolicyRow({
  p,
  cfg,
  provider,
  showSource,
  onRun,
  togglePolicy,
  deletePolicy,
}: {
  p: Policy
  cfg?: Configuration
  provider?: ReturnType<typeof providerById>
  showSource: boolean
  onRun?: (policy: Policy) => void
  togglePolicy: (id: string) => void
  deletePolicy: (id: string) => void
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  return (
    <TableRow className="hover:bg-accent/40">
      <TableCell>
        <p className="font-medium text-foreground">{p.name}</p>
        {p.description && (
          <p className="max-w-xs truncate text-xs text-muted-foreground">
            {p.description}
          </p>
        )}
      </TableCell>
      {showSource && (
        <TableCell>
          {cfg && provider ? (
            <div className="flex items-center gap-2">
              <ProviderIcon providerId={provider.id} size="sm" />
              <div className="leading-tight">
                <p className="text-sm text-foreground">{cfg.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.scopeIds.length}{' '}
                  {provider.scopeNounPlural.toLowerCase()}
                </p>
              </div>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </TableCell>
      )}
      <TableCell>
        <div className="flex items-center gap-1">
          {p.classificationIds.slice(0, 4).map((id) => (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <span>
                  <IconChip id={id} kind="class" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {classificationById(id)?.label}
              </TooltipContent>
            </Tooltip>
          ))}
          {p.classificationIds.length > 4 && (
            <span className="text-xs text-muted-foreground">
              +{p.classificationIds.length - 4}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default text-sm tabular-nums text-foreground">
              {p.fileTypeIds.length}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {p.fileTypeIds
              .map((id) => fileTypeById(id)?.label)
              .filter(Boolean)
              .join(', ')}
          </TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch
            checked={p.status}
            onCheckedChange={() => togglePolicy(p.id)}
          />
          <span className="text-xs text-muted-foreground">
            {p.status ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDateTime(p.lastRun)}
      </TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${p.name}`}
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <MoreVertical className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled={!p.status}
              onClick={() => onRun?.(p)}
            >
              <Play className="size-4" />
              Run scan now
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/data-discovery/policies/new">
                <Plus className="size-4" />
                New policy
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={(e) => {
                e.preventDefault()
                setConfirmOpen(true)
              }}
            >
              <Trash2 className="size-4" />
              Delete policy
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this policy?</AlertDialogTitle>
              <AlertDialogDescription>
                “{p.name}” will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deletePolicy(p.id)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  )
}

export function PolicyTable({
  policies,
  showSource = true,
  onRun,
}: {
  policies: Policy[]
  showSource?: boolean
  onRun?: (policy: Policy) => void
}) {
  const { configurations, togglePolicy, deletePolicy } = useDataDiscovery()
  return (
    <Table className="[&_td]:px-5 [&_td]:py-4 [&_th]:h-auto [&_th]:px-5 [&_th]:py-3.5 [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-muted-foreground">
      <TableHeader>
        <TableRow className="border-b hover:bg-transparent">
          <TableHead>Policy</TableHead>
          {showSource && <TableHead>Data Source</TableHead>}
          <TableHead>Classifications</TableHead>
          <TableHead className="text-center">File Types</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last Run</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {policies.map((p) => {
          const cfg = configurations.find((c) => c.id === p.configurationId)
          const provider = cfg && providerById(cfg.providerId)
          return (
            <PolicyRow
              key={p.id}
              p={p}
              cfg={cfg}
              provider={provider || undefined}
              showSource={showSource}
              onRun={onRun}
              togglePolicy={togglePolicy}
              deletePolicy={deletePolicy}
            />
          )
        })}
      </TableBody>
    </Table>
  )
}

/* ----------------------------------- Scopes ------------------------------------ */

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  )
}

export function ScopeTable({
  rows,
  noun,
  findingCount,
  onOpenScope,
}: {
  rows: { scope: Scope; configName?: string }[]
  noun: string
  findingCount: (scopeId: string) => number
  onOpenScope?: (scopeId: string) => void
}) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-secondary/40 hover:bg-secondary/40">
          <TableHead>{noun}</TableHead>
          <TableHead className="text-right">Objects</TableHead>
          <TableHead className="text-right">Sensitive</TableHead>
          <TableHead>Exposure</TableHead>
          <TableHead>Last Scan</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ scope, configName }) => {
          const expanded = open.has(scope.id)
          return (
            <Fragment key={scope.id}>
              <TableRow
                className="cursor-pointer hover:bg-accent/40"
                onClick={() => toggle(scope.id)}
              >
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <ChevronRight
                      className={cn(
                        'size-4 text-muted-foreground transition-transform',
                        expanded && 'rotate-90',
                      )}
                    />
                    <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                      <Box className="size-4" />
                    </span>
                    <div className="leading-tight">
                      <p className="font-medium text-foreground">{scope.name}</p>
                      {configName && (
                        <p className="text-xs text-muted-foreground">
                          {configName}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {scope.objects}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums text-foreground">
                  {scope.sensitive}
                </TableCell>
                <TableCell>
                  <ExposurePill public={scope.publicAccess} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(scope.lastScan)}
                </TableCell>
                <TableCell />
              </TableRow>
              {expanded && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="bg-secondary/40">
                    <div className="grid grid-cols-2 gap-3 py-1 sm:grid-cols-3 lg:grid-cols-6">
                      <Stat label="Objects scanned" value={scope.objects} />
                      <Stat label="Sensitive objects" value={scope.sensitive} />
                      {onOpenScope ? (
                        <div className="rounded-lg border bg-card p-3">
                          <p className="text-xs text-muted-foreground">
                            Total findings
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onOpenScope(scope.id)
                            }}
                            className="mt-0.5 text-sm font-semibold tabular-nums text-brand hover:underline"
                          >
                            {findingCount(scope.id)}
                          </button>
                        </div>
                      ) : (
                        <Stat
                          label="Total findings"
                          value={findingCount(scope.id)}
                        />
                      )}
                      <Stat label="Data scanned" value={formatBytes(scope.sizeBytes)} />
                      <div className="rounded-lg border bg-card p-3">
                        <p className="text-xs text-muted-foreground">Exposure</p>
                        <div className="mt-1">
                          <ExposurePill public={scope.publicAccess} />
                        </div>
                      </div>
                      <Stat label="Last scan" value={formatDateTime(scope.lastScan)} />
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          )
        })}
      </TableBody>
    </Table>
  )
}

/* ----------------------------------- Findings ---------------------------------- */

export function FindingsTable({
  findings,
  onSelect,
}: {
  findings: Finding[]
  onSelect?: (finding: Finding) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-secondary/40 hover:bg-secondary/40">
          <TableHead>File</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Classifications</TableHead>
          <TableHead>Risk</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Exposure</TableHead>
          <TableHead className="text-right">Size</TableHead>
          <TableHead>Last Modified</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {findings.map((f) => {
          const status = f.status ?? 'open'
          return (
          <TableRow
            key={f.id}
            className={cn(
              'cursor-pointer hover:bg-accent/40',
              status === 'dismissed' && 'opacity-60',
            )}
            onClick={() => onSelect?.(f)}
          >
            <TableCell>
              <div className="flex items-center gap-2.5">
                <IconChip id={f.fileTypeId} kind="file" />
                <div className="min-w-0 leading-tight">
                  <p className="truncate font-medium text-foreground">
                    {f.fileName}
                  </p>
                  <p className="max-w-[240px] truncate text-xs text-muted-foreground">
                    {f.filePath}
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {fileTypeById(f.fileTypeId)?.label ?? f.fileTypeId}
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {f.classificationIds.map((id) => (
                  <Tooltip key={id}>
                    <TooltipTrigger asChild>
                      <span>
                        <IconChip id={id} kind="class" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{classificationById(id)?.label}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TableCell>
            <TableCell>
              <RiskBadge risk={f.risk} />
            </TableCell>
            <TableCell>
              <StatusPill status={status} />
            </TableCell>
            <TableCell>
              <ExposurePill public={f.publicAccess} />
            </TableCell>
            <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
              {formatBytes(f.sizeBytes)}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDateTime(f.lastModified)}
            </TableCell>
          </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
