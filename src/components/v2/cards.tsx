import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutGrid,
  Rows3,
  MoreHorizontal,
  Play,
  Trash2,
  Plus,
  FileText,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
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
import { RiskBadge, ProviderIcon, ScanStatusBadge } from '@/components/common'
import { ExposurePill } from '@/components/discovery/ScopeTable'
import { useDataDiscovery } from '@/store/DataDiscoveryContext'
import { classificationById, fileTypeById, providerById } from '@/data'
import { fileTypeIcon, classificationIcon } from '@/lib/icons'
import { formatBytes, formatDateTime, formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Finding, FindingStatus, Policy, ScanJob } from '@/types'

/* --------------------------------- toggle --------------------------------- */

export type ListView = 'table' | 'cards'

const TOGGLE = [
  { id: 'table' as const, icon: Rows3, label: 'Table' },
  { id: 'cards' as const, icon: LayoutGrid, label: 'Cards' },
]

export function ListToggle({
  value,
  onChange,
}: {
  value: ListView
  onChange: (v: ListView) => void
}) {
  return (
    <div className="inline-flex items-center rounded-lg border bg-card p-0.5">
      {TOGGLE.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          aria-label={`${label} view`}
          aria-pressed={value === id}
          onClick={() => onChange(id)}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            value === id
              ? 'bg-secondary text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="size-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}

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

function CardGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
}

/* -------------------------------- policies -------------------------------- */

export function PolicyCards({
  policies,
  onRun,
}: {
  policies: Policy[]
  onRun?: (policy: Policy) => void
}) {
  return (
    <CardGrid>
      {policies.map((p) => (
        <PolicyCard key={p.id} policy={p} onRun={onRun} />
      ))}
    </CardGrid>
  )
}

function PolicyCard({
  policy: p,
  onRun,
}: {
  policy: Policy
  onRun?: (policy: Policy) => void
}) {
  const { configurations, togglePolicy, deletePolicy } = useDataDiscovery()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const cfg = configurations.find((c) => c.id === p.configurationId)
  const provider = cfg && providerById(cfg.providerId)

  return (
    <Card className="gap-0 p-5">
      <div className="flex items-start justify-between">
        <RiskBadge risk={p.risk} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="-mr-1 -mt-1 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={!p.status} onClick={() => onRun?.(p)}>
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
      </div>

      <p className="mt-3 font-semibold text-foreground">{p.name}</p>
      {p.description && (
        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
          {p.description}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2 border-t pt-4">
        {cfg && provider ? (
          <>
            <ProviderIcon providerId={provider.id} size="sm" />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm text-foreground">{cfg.name}</p>
              <p className="text-xs text-muted-foreground">
                {p.scopeIds.length} {provider.scopeNounPlural.toLowerCase()}
              </p>
            </div>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">No data source</span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {p.classificationIds.slice(0, 4).map((id) => (
            <IconChip key={id} id={id} kind="class" />
          ))}
          {p.classificationIds.length > 4 && (
            <span className="text-[11px] text-muted-foreground">
              +{p.classificationIds.length - 4}
            </span>
          )}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default text-xs text-muted-foreground">
              {p.fileTypeIds.length} file types
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {p.fileTypeIds.map((id) => fileTypeById(id)?.label).filter(Boolean).join(', ')}
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="mt-4 flex items-center justify-between border-t pt-4">
        <div className="flex items-center gap-2">
          <Switch checked={p.status} onCheckedChange={() => togglePolicy(p.id)} />
          <span className="text-xs text-muted-foreground">
            {p.status ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {p.lastRun ? `Ran ${formatDateTime(p.lastRun)}` : 'Never run'}
        </span>
      </div>

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
    </Card>
  )
}

/* ---------------------------------- scans --------------------------------- */

export function ScanCards({ scans }: { scans: ScanJob[] }) {
  const { policies, configurations } = useDataDiscovery()
  return (
    <CardGrid>
      {scans.map((s) => {
        const policy = policies.find((p) => p.id === s.policyId)
        const cfg = configurations.find((c) => c.id === s.configurationId)
        const provider = cfg && providerById(cfg.providerId)
        return (
          <Card key={s.id} className="gap-0 p-5">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-foreground">
                {policy?.name ?? 'Deleted policy'}
              </p>
              <ScanStatusBadge status={s.status} />
            </div>
            <div className="mt-3 flex items-center gap-2">
              {cfg && provider ? (
                <>
                  <ProviderIcon providerId={provider.id} size="sm" />
                  <span className="text-sm text-muted-foreground">{cfg.name}</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4">
              <Stat label="Objects" value={s.objectsScanned.toLocaleString()} />
              <Stat label="Sensitive" value={s.sensitiveFound.toLocaleString()} />
              <Stat label="Started" value={formatDateTime(s.startedAt)} />
              <Stat label="Duration" value={formatDuration(s.durationSec)} />
            </div>
          </Card>
        )
      })}
    </CardGrid>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium tabular-nums text-foreground">
        {value}
      </p>
    </div>
  )
}

/* -------------------------------- findings -------------------------------- */

const STATUS_LABEL: Record<FindingStatus, string> = {
  open: 'Open',
  acknowledged: 'Acknowledged',
  dismissed: 'Dismissed',
}

function StatusPill({ status }: { status: FindingStatus }) {
  return (
    <span
      className={cn(
        'rounded-full border px-2 py-0.5 text-[11px] font-medium',
        status === 'acknowledged'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-100 text-slate-600',
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

export function FindingCards({
  findings,
  onSelect,
}: {
  findings: Finding[]
  onSelect?: (finding: Finding) => void
}) {
  return (
    <CardGrid>
      {findings.map((f) => {
        const status = f.status ?? 'open'
        return (
          <Card
            key={f.id}
            className={cn(
              'cursor-pointer gap-0 p-5 transition-shadow hover:border-brand/40 hover:shadow-md',
              status === 'dismissed' && 'opacity-60',
            )}
            onClick={() => onSelect?.(f)}
          >
            <div className="flex items-start gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                <FileText className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{f.fileName}</p>
                <p className="truncate text-xs text-muted-foreground">{f.filePath}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t pt-4">
              <RiskBadge risk={f.risk} />
              <ExposurePill public={f.publicAccess} />
              <StatusPill status={status} />
            </div>

            <div className="mt-3 flex items-center gap-1">
              {f.classificationIds.map((id) => (
                <IconChip key={id} id={id} kind="class" />
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
              <span>{fileTypeById(f.fileTypeId)?.label}</span>
              <span className="tabular-nums">{formatBytes(f.sizeBytes)}</span>
            </div>
          </Card>
        )
      })}
    </CardGrid>
  )
}
