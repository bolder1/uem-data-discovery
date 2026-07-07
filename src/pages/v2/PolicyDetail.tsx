import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Play, Trash2, Pencil, MoreVertical, ShieldCheck, FileSearch } from 'lucide-react'
import { useDataDiscovery } from '@/store/DataDiscoveryContext'
import { classificationById, fileTypeById, providerById } from '@/data'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { PageHeader, AuditStamp, EmptyState, ProviderIcon } from '@/components/common'
import { FindingsTable } from '@/components/v2/tables'
import { PolicyDrawer } from '@/components/v2/PolicyDrawer'
import { ScanHistorySection } from '@/components/v2/ScanHistorySection'
import { useRunScanDialog } from '@/components/v2/RunScanDialog'
import { fileTypeIcon, classificationIcon } from '@/lib/icons'
import type { ScanJob } from '@/types'

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
      {children}
    </span>
  )
}

function SectionCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <Card className="gap-3 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </Card>
  )
}

export function PolicyDetail() {
  const { policyId } = useParams()
  const navigate = useNavigate()
  const { policies, configurations, findings, scans, togglePolicy, deletePolicy } =
    useDataDiscovery()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const { start: startScan, dialog: runScanDialog } = useRunScanDialog()

  const policy = policies.find((p) => p.id === policyId)

  if (!policy) {
    return (
      <div className="pt-10">
        <EmptyState
          icon={ShieldCheck}
          title="Policy not found"
          description="This policy may have been deleted."
          action={
            <Button asChild>
              <Link to="/data-discovery/policies">Back to policies</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const targetConfigIds = policy.configurationIds ?? [policy.configurationId]
  const selectedConfigs = configurations.filter((c) => targetConfigIds.includes(c.id))
  const provider = providerById(selectedConfigs[0]?.providerId ?? '')
  const scopeNoun = provider?.scopeNounPlural ?? 'Scopes'
  const policyFindings = findings.filter((f) => targetConfigIds.includes(f.configurationId))
  const policyScans = scans.filter((s) => s.policyId === policy.id)

  const onRun = () => {
    startScan(policy.id, policy.name)
  }

  const onOpenScan = (scan: ScanJob) => {
    navigate(`/data-discovery/results?source=${scan.configurationId}&scan=${scan.id}`, {
      state: { from: `/data-discovery/policies/${policy.id}`, fromLabel: policy.name },
    })
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
            <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5">
              <span className="text-sm text-muted-foreground">
                {policy.status ? 'Enabled' : 'Disabled'}
              </span>
              <Switch
                checked={policy.status}
                onCheckedChange={() => togglePolicy(policy.id)}
              />
            </div>
            <Button onClick={onRun} disabled={!policy.status}>
              <Play className="size-4" />
              Run scan now
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Actions for ${policy.name}`}
                  className="inline-flex size-9 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <MoreVertical className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Pencil className="size-4" />
                  Edit policy
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
          </>
        }
      />

      <SectionCard title={`Sources & ${scopeNoun.toLowerCase()}`}>
        <div className="space-y-2">
          {selectedConfigs.map((c) => {
            const p = providerById(c.providerId)
            const selectedScopes = c.scopes.filter((s) => policy.scopeIds.includes(s.id))
            return (
              <div key={c.id} className="rounded-lg border">
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <ProviderIcon providerId={c.providerId} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {c.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {selectedScopes.length} of {c.scopes.length}{' '}
                      {p?.scopeNounPlural.toLowerCase()} selected
                    </p>
                  </div>
                </div>
                {selectedScopes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 border-t bg-secondary/30 px-3 py-2.5">
                    {selectedScopes.map((s) => (
                      <Chip key={s.id}>{s.name}</Chip>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="File types">
          <div className="flex flex-wrap gap-1.5">
            {policy.fileTypeIds.map((id) => {
              const Icon = fileTypeIcon(id)
              return (
                <Chip key={id}>
                  <Icon className="size-3.5" />
                  {fileTypeById(id)?.label ?? id}
                </Chip>
              )
            })}
          </div>
        </SectionCard>

        <SectionCard title="Classifications">
          <div className="flex flex-wrap gap-1.5">
            {policy.classificationIds.map((id) => {
              const Icon = classificationIcon(id)
              return (
                <Chip key={id}>
                  <Icon className="size-3.5" />
                  {classificationById(id)?.label ?? id}
                </Chip>
              )
            })}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="gap-0 p-0">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <p className="text-sm font-medium">
              {policyFindings.length} sensitive files discovered
            </p>
          </div>
          {policyFindings.length ? (
            <FindingsTable findings={policyFindings} />
          ) : (
            <div className="p-6">
              <EmptyState
                icon={FileSearch}
                title="No findings yet"
                description="Run a scan to surface sensitive data for this policy."
              />
            </div>
          )}
        </Card>

        <ScanHistorySection scans={policyScans} onOpenScan={onOpenScan} />
      </div>

      <AuditStamp at={policy.createdAt} by={policy.createdBy} />

      {runScanDialog}

      {editOpen && (
        <PolicyDrawer
          open
          editPolicy={policy}
          onOpenChange={(o) => {
            if (!o) setEditOpen(false)
          }}
        />
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
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
              variant="destructive"
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
