import { useMemo } from 'react'
import { ShieldCheck, ShieldAlert, Boxes, MonitorSmartphone, Plus, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatBytes } from '@/lib/format'
import { platformLabel } from './PlatformIcon'
import { AppIcon } from './AppIcon'
import { AppRowMenu, policyCountOf } from './AppRowMenu'
import { Header, Toolbar } from './ViewChrome'
import type { AppMgmtViewProps } from './appMgmtView'

// Cards — an app-store style gallery. Big, scannable tiles with status at a
// glance and actions surfaced on hover. A tile opens the full details drawer.
export function CardsView(props: AppMgmtViewProps) {
  const {
    os,
    onSwitchOs,
    query,
    onQueryChange,
    rows,
    appPolicies,
    onUpload,
    onOpenDetails,
    onOpenUpdate,
    onAssign,
    onRequestDelete,
    view,
    onChangeView,
  } = props

  const valid = useMemo(() => new Set(appPolicies.map((p) => p.id)), [appPolicies])

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

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card px-6 py-16 text-center text-sm text-muted-foreground">
          No {platformLabel(os)} applications{query.trim() ? ' match this search' : ' yet'}.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((app) => {
            const head = app.versions[0]
            const policies = policyCountOf(app, valid)
            const devices = head?.installedDevices ?? 0
            return (
              <div
                key={app.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpenDetails(app.id)}
                onKeyDown={(e) =>
                  (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onOpenDetails(app.id))
                }
                className="group flex cursor-pointer flex-col rounded-2xl border bg-card p-4 shadow-sm outline-none transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <AppIcon app={app} size="lg" showPlatformBadge />
                  <div className="flex items-center gap-1">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                        devices > 0
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : policies > 0
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                      )}
                    >
                      {devices > 0 ? 'Deployed' : policies > 0 ? 'Ready' : 'Needs policy'}
                    </span>
                    <AppRowMenu
                      app={app}
                      onOpenDetails={onOpenDetails}
                      onOpenUpdate={onOpenUpdate}
                      onAssign={onAssign}
                      onRequestDelete={onRequestDelete}
                    />
                  </div>
                </div>

                <div className="mt-3 min-w-0">
                  <p className="truncate text-[15px] font-semibold text-foreground">{app.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{app.publisher}</p>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  v{head?.version ?? '—'} · {head ? formatBytes(head.sizeBytes) : '—'} · {app.packageType}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {policies > 0 ? (
                    <Tag icon={ShieldCheck}>{policies} {policies === 1 ? 'policy' : 'policies'}</Tag>
                  ) : (
                    <Tag icon={ShieldAlert} amber>Unassigned</Tag>
                  )}
                  <Tag icon={Boxes}>{head?.publishedGroups ?? 0} groups</Tag>
                  <Tag icon={MonitorSmartphone}>{devices.toLocaleString()} devices</Tag>
                </div>

                <div className="mt-4 flex gap-2 border-t pt-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAssign(app)
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-brand/40 py-1.5 text-xs font-medium text-brand transition-colors hover:bg-brand/10"
                  >
                    <Plus className="size-3.5" />
                    {policies > 0 ? 'Edit policies' : 'Assign policy'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenDetails(app.id)
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                  >
                    <Info className="size-3.5" />
                    Details
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Tag({
  icon: Icon,
  amber,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  amber?: boolean
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        amber
          ? 'border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
          : 'bg-secondary text-muted-foreground',
      )}
    >
      <Icon className="size-3" />
      {children}
    </span>
  )
}
