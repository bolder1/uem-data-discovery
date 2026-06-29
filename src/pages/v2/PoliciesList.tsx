import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, ShieldCheck, ShieldAlert, ToggleRight } from 'lucide-react'
import { useDataDiscovery } from '@/store/DataDiscoveryContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader, SummaryCard, EmptyState } from '@/components/common'
import { PolicyTable } from '@/components/v2/tables'
import { ListToggle, PolicyCards, type ListView } from '@/components/v2/cards'
import { PolicyDrawer } from '@/components/v2/PolicyDrawer'
import type { Policy } from '@/types'

export function PoliciesList() {
  const { policies, runScan } = useDataDiscovery()
  const navigate = useNavigate()
  const location = useLocation()
  const [view, setView] = useState<ListView>('table')

  // The "/policies/new" route (and the seven links across the app that point
  // at it) open the create drawer over the list — no separate page.
  const fromRoute = location.pathname.endsWith('/new')
  const [createOpen, setCreateOpen] = useState(fromRoute)
  const seedConfigId = (location.state as { configurationId?: string } | null)
    ?.configurationId
  useEffect(() => {
    if (fromRoute) setCreateOpen(true)
  }, [fromRoute])

  const closeCreate = () => {
    setCreateOpen(false)
    if (fromRoute) navigate('/data-discovery/policies', { replace: true })
  }

  const enabled = policies.filter((p) => p.status).length
  const elevated = policies.filter(
    (p) => p.risk === 'high' || p.risk === 'critical',
  ).length

  const onRun = (policy: Policy) => {
    runScan(policy.id)
    navigate('/data-discovery/scans')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[
          { label: 'Data Discovery', to: '/data-discovery' },
          { label: 'Policies' },
        ]}
        title="Policies"
        description="Define what to scan for — file types, classifications, and which data sources to target."
        actions={
          <div className="flex items-center gap-2">
            {policies.length > 0 && <ListToggle value={view} onChange={setView} />}
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Create policy
            </Button>
          </div>
        }
      />

      {policies.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No policies yet"
          description="Create your first policy to start discovering sensitive data across your connected sources."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Create policy
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard
              label="Total policies"
              value={policies.length}
              icon={ShieldCheck}
              iconClass="bg-brand/10 text-brand"
            />
            <SummaryCard
              label="Enabled"
              value={enabled}
              icon={ToggleRight}
              iconClass="bg-brand/10 text-brand"
            />
            <SummaryCard
              label="High / critical risk"
              value={elevated}
              icon={ShieldAlert}
              iconClass="bg-brand/10 text-brand"
            />
          </div>

          {view === 'cards' ? (
            <PolicyCards policies={policies} onRun={onRun} />
          ) : (
            <Card className="p-0">
              <PolicyTable policies={policies} onRun={onRun} />
            </Card>
          )}
        </>
      )}

      {createOpen && (
        <PolicyDrawer open onOpenChange={closeCreate} initialConfigId={seedConfigId} />
      )}
    </div>
  )
}
