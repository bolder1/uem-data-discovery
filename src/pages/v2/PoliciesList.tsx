import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, ShieldCheck } from 'lucide-react'
import { useDataDiscovery } from '@/store/DataDiscoveryContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader, EmptyState } from '@/components/common'
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
  const [editPolicy, setEditPolicy] = useState<Policy | null>(null)
  const seedConfigId = (location.state as { configurationId?: string } | null)
    ?.configurationId
  useEffect(() => {
    if (fromRoute) setCreateOpen(true)
  }, [fromRoute])

  const closeCreate = () => {
    setCreateOpen(false)
    if (fromRoute) navigate('/data-discovery/policies', { replace: true })
  }

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
          {view === 'cards' ? (
            <PolicyCards policies={policies} onRun={onRun} onEdit={setEditPolicy} />
          ) : (
            <Card className="p-0">
              <PolicyTable policies={policies} onRun={onRun} onEdit={setEditPolicy} />
            </Card>
          )}
        </>
      )}

      {createOpen && (
        <PolicyDrawer open onOpenChange={closeCreate} initialConfigId={seedConfigId} />
      )}
      {editPolicy && (
        <PolicyDrawer
          key={editPolicy.id}
          open
          onOpenChange={() => setEditPolicy(null)}
          policy={editPolicy}
        />
      )}
    </div>
  )
}
