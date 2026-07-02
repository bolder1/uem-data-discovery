import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  FileSearch,
  MoreVertical,
  Pencil,
  Play,
  Radar,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { useDataDiscovery } from '@/store/DataDiscoveryContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  PageHeader,
  EmptyState,
  ScanStatusBadge,
  AuditStamp,
  ProviderIcon,
} from '@/components/common'
import { FindingsTable } from '@/components/v2/tables'
import { EvidenceDrawer } from '@/components/v2/EvidenceDrawer'
import { PolicyDrawer } from '@/components/v2/PolicyDrawer'
import { ExposurePill } from '@/components/discovery/ScopeTable'
import { providerById, classificationById, fileTypeById } from '@/data'
import { fileTypeIcon, classificationIcon } from '@/lib/icons'
import { formatDateTime, formatDuration } from '@/lib/format'
import { policySources, policyScopeNoun } from '@/lib/policySources'
import type { Finding } from '@/types'

export function PolicyDetail() {
  const { policyId } = useParams()
  const navigate = useNavigate()
  const {
    policies,
    configurations,
    scans,
    findings,
    togglePolicy,
    deletePolicy,
    runScan,
    updateFindingStatus,
  } = useDataDiscovery()

  const [tab, setTab] = useState('overview')
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [selected, setSelected] = useState<Finding | null>(null)

  const policy = policies.find((p) => p.id === policyId)

  if (!policy) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Policy not found"
        description="It may have been deleted, or the link is out of date."
        action={
          <Button asChild>
            <Link to="/data-discovery/policies">Back to policies</Link>
          </Button>
        }
      />
    )
  }

  const sources = policySources(policy, configurations)
  const noun = policyScopeNoun(sources)
  const scopeIdSet = new Set(policy.scopeIds)
  const policyScans = scans.filter((s) => s.policyId === policy.id)
  // Everything discovered inside this policy's targets, across all its scans.
  const policyFindings = findings.filter((f) => scopeIdSet.has(f.scopeId))

  const liveSelected = selected
    ? (findings.find((f) => f.id === selected.id) ?? selected)
    : null

  const handleRun = () => {
    const scan = runScan(policy.id)
    if (scan) setTab('scans')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[
          { label: 'Data Discovery', to: '/data-discovery' },
          { label: 'Policies', to: '/data-discovery/policies' },
          { label: policy.name },
        ]}
        title={policy.name}
        description={policy.description}
        actions={
          <>
            <div className="mr-1 flex items-center gap-2">
              <Switch
                checked={policy.status}
                onCheckedChange={() => togglePolicy(policy.id)}
              />
              <span className="text-xs text-muted-foreground">
                {policy.status ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              Edit
            </Button>
            <Button disabled={!policy.status} onClick={handleRun}>
              <Play className="size-4" />
              Run scan
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="More actions"
                  className="inline-flex size-9 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <MoreVertical className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(e) => {
                    e.preventDefault()
                    setConfirmDelete(true)
                  }}
                >
                  <Trash2 className="size-4" />
                  Delete policy
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <AuditStamp at={policy.createdAt} by={policy.createdBy} />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scans">Scans ({policyScans.length})</TabsTrigger>
          <TabsTrigger value="findings">
            Findings ({policyFindings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="gap-0 p-0">
            <div className="border-b px-5 py-3">
              <h3 className="text-sm font-semibold text-foreground">
                Data sources & {noun.toLowerCase()}
              </h3>
              <p className="text-xs text-muted-foreground">
                Where this policy looks for sensitive data.
              </p>
            </div>
            <div className="divide-y">
              {sources.map((c) => {
                const p = providerById(c.providerId)
                const picked = c.scopes.filter((s) => scopeIdSet.has(s.id))
                return (
                  <div key={c.id} className="flex gap-3 px-5 py-4">
                    <ProviderIcon providerId={c.providerId} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {c.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p?.name} · {picked.length} of {c.scopes.length}{' '}
                        {p?.scopeNounPlural.toLowerCase()}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {picked.map((s) => (
                          <span
                            key={s.id}
                            className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-0.5 text-xs text-foreground"
                          >
                            {s.name}
                            {s.publicAccess && <ExposurePill public />}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
              {sources.length === 0 && (
                <p className="px-5 py-6 text-center text-sm text-muted-foreground">
                  This policy has no data sources.
                </p>
              )}
            </div>
          </Card>

          <Card className="gap-0 p-0">
            <div className="border-b px-5 py-3">
              <h3 className="text-sm font-semibold text-foreground">
                Detection criteria
              </h3>
              <p className="text-xs text-muted-foreground">
                What this policy scans for.
              </p>
            </div>
            <div className="grid gap-5 px-5 py-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  File types · {policy.fileTypeIds.length}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {policy.fileTypeIds.map((id) => {
                    const Icon = fileTypeIcon(id)
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 rounded-md border bg-secondary px-2 py-1 text-xs text-foreground"
                      >
                        <Icon className="size-3.5 text-muted-foreground" />
                        {fileTypeById(id)?.label ?? id}
                      </span>
                    )
                  })}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Classifications · {policy.classificationIds.length}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {policy.classificationIds.map((id) => {
                    const Icon = classificationIcon(id)
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 rounded-md border bg-secondary px-2 py-1 text-xs text-foreground"
                      >
                        <Icon className="size-3.5 text-muted-foreground" />
                        {classificationById(id)?.label ?? id}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="scans">
          {policyScans.length === 0 ? (
            <EmptyState
              icon={Radar}
              title="No scans yet"
              description="Run this policy to scan its targets and surface sensitive data."
              action={
                <Button disabled={!policy.status} onClick={handleRun}>
                  <Play className="size-4" />
                  Run scan
                </Button>
              }
            />
          ) : (
            <Card className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Scope</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Objects</TableHead>
                    <TableHead className="text-right">Sensitive</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policyScans.map((s) => {
                    const cfg = configurations.find(
                      (c) => c.id === s.configurationId,
                    )
                    return (
                      <TableRow
                        key={s.id}
                        onClick={() =>
                          navigate(
                            `/data-discovery/results?source=${s.configurationId}&scan=${s.id}`,
                          )
                        }
                        className="cursor-pointer hover:bg-accent/40"
                      >
                        <TableCell>
                          {cfg ? (
                            <div className="flex items-center gap-2">
                              <ProviderIcon providerId={cfg.providerId} size="sm" />
                              <span className="text-sm">{cfg.name}</span>
                            </div>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {s.scopeIds.length}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(s.startedAt)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDuration(s.durationSec)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {s.objectsScanned.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums text-foreground">
                          {s.sensitiveFound.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <ScanStatusBadge status={s.status} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="findings" className="space-y-4">
          {policyFindings.length === 0 ? (
            <EmptyState
              icon={FileSearch}
              title="No findings in this policy's targets"
              description="Run a scan to discover sensitive data in the selected targets."
            />
          ) : (
            <>
              <Card className="p-0">
                <FindingsTable findings={policyFindings} onSelect={setSelected} />
              </Card>
              <p className="text-xs text-muted-foreground">
                {policyFindings.length} findings across {policy.scopeIds.length}{' '}
                {noun.toLowerCase()}
              </p>
            </>
          )}
        </TabsContent>
      </Tabs>

      <EvidenceDrawer
        finding={liveSelected}
        onClose={() => setSelected(null)}
        updateFindingStatus={updateFindingStatus}
      />

      {editOpen && (
        <PolicyDrawer
          key={policy.id}
          open
          onOpenChange={() => setEditOpen(false)}
          policy={policy}
        />
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this policy?</AlertDialogTitle>
            <AlertDialogDescription>
              “{policy.name}” will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deletePolicy(policy.id)
                navigate('/data-discovery/policies')
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
