import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Play, Radar } from 'lucide-react'
import { useDataDiscovery } from '@/store/DataDiscoveryContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  PageHeader,
  EmptyState,
  ScanStatusBadge,
  ProviderIcon,
} from '@/components/common'
import { providerById } from '@/data'
import { formatDateTime, formatDuration } from '@/lib/format'
import { ListToggle, ScanCards, type ListView } from '@/components/v2/cards'

export function ScanJobs() {
  const { scans, policies, configurations, runScan } = useDataDiscovery()
  const navigate = useNavigate()
  const [recentId, setRecentId] = useState<string | null>(null)
  const [view, setView] = useState<ListView>('table')

  const enabledPolicies = policies.filter((p) => p.status)

  const handleRun = (policyId: string) => {
    const job = runScan(policyId)
    if (job) {
      setRecentId(job.id)
      setTimeout(() => {
        setRecentId((current) => (current === job.id ? null : current))
      }, 2500)
    }
  }

  const runAction = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Play className="size-4" />
          Run scan
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Run an enabled policy</DropdownMenuLabel>
        {enabledPolicies.length ? (
          enabledPolicies.map((p) => (
            <DropdownMenuItem key={p.id} onClick={() => handleRun(p.id)}>
              <Radar className="size-4" />
              {p.name}
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem asChild>
            <Link to="/data-discovery/policies/new">Create a policy first</Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[
          { label: 'Data Discovery', to: '/data-discovery' },
          { label: 'Scan Jobs' },
        ]}
        title="Scan Jobs"
        description="Every policy run, with what it scanned and what it found."
        actions={
          <div className="flex items-center gap-2">
            {scans.length > 0 && <ListToggle value={view} onChange={setView} />}
            {runAction}
          </div>
        }
      />

      {scans.length === 0 ? (
        <EmptyState
          icon={Radar}
          title="No scans have run yet"
          description="Run an enabled policy to scan its targets and surface sensitive data."
        />
      ) : (
        <>
          {view === 'cards' ? (
            <ScanCards scans={scans} />
          ) : (
          <Card className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40 hover:bg-secondary/40">
                  <TableHead>Policy</TableHead>
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
                {scans.map((s) => {
                  const policy = policies.find((p) => p.id === s.policyId)
                  const cfg = configurations.find(
                    (c) => c.id === s.configurationId,
                  )
                  const provider = cfg && providerById(cfg.providerId)
                  return (
                    <TableRow
                      key={s.id}
                      onClick={() =>
                        navigate(
                          `/data-discovery/results?source=${s.configurationId}&scan=${s.id}`,
                        )
                      }
                      className={
                        s.id === recentId
                          ? 'cursor-pointer ring-2 ring-brand ring-inset hover:bg-accent/40'
                          : 'cursor-pointer hover:bg-accent/40'
                      }
                    >
                      <TableCell className="font-medium text-foreground">
                        {policy?.name ?? 'Deleted policy'}
                      </TableCell>
                      <TableCell>
                        {cfg && provider ? (
                          <div className="flex items-center gap-2">
                            <ProviderIcon providerId={provider.id} size="sm" />
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
        </>
      )}
    </div>
  )
}
