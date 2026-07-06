import type { ReactNode } from 'react'
import { LayoutGrid, Rows3 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { ProviderIcon, ScanStatusBadge } from '@/components/common'
import { useDataDiscovery } from '@/store/DataDiscoveryContext'
import { providerById } from '@/data'
import { formatDateTime, formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ScanJob } from '@/types'

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

function CardGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
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
