import { useState } from 'react'
import { Upload, Trash2, ChevronDown, PackageMinus } from 'lucide-react'
import { useApplicationManagement } from '@/store/ApplicationManagementContext'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatBytes, formatDate } from '@/lib/format'
import type { AppVersion, ManagedApp } from '@/types'
import { platformLabel } from './PlatformIcon'
import { AppIcon } from './AppIcon'

export function AppDetailsDrawer({
  app,
  onOpenChange,
  onUpdate,
  onRequestDeleteApp,
  onRequestDeleteVersion,
  skin,
}: {
  app: ManagedApp | null
  onOpenChange: (open: boolean) => void
  onUpdate: (app: ManagedApp) => void
  onRequestDeleteApp: (app: ManagedApp) => void
  onRequestDeleteVersion: (app: ManagedApp, version: AppVersion) => void
  /** 'product' re-skins the drawer to match the live product. */
  skin?: 'product'
}) {
  const product = skin === 'product'
  const { uninstallVersion, appPolicies } = useApplicationManagement()
  const [openVersion, setOpenVersion] = useState<string | null>(null)

  if (!app) return null
  const headId = app.versions[0]?.id
  const activeVersion = openVersion ?? headId ?? null
  const policies = (app.policyIds ?? [])
    .map((id) => appPolicies.find((p) => p.id === id))
    .filter(Boolean)

  return (
    <Sheet open={!!app} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        data-skin={product ? 'product' : undefined}
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
      >
        {/* header */}
        <SheetHeader className="gap-0 border-b px-6 py-5 pr-14">
          <div className="flex items-start gap-4">
            <AppIcon app={app} size="lg" showPlatformBadge />
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg leading-tight">{app.name}</SheetTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">{app.publisher}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {platformLabel(app.platform)} · {app.packageType}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onUpdate(app)}>
              <Upload className="size-4" />
              Update App
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onRequestDeleteApp(app)}
            >
              <Trash2 className="size-4" />
              Delete app
            </Button>
          </div>
        </SheetHeader>

        {/* version history */}
        <div className="flex-1 overflow-y-auto">
          <p className="px-6 pt-5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Version history · {app.versions.length}
          </p>
          {app.versions.map((v) => {
            const isHead = v.id === headId
            const isOpen = v.id === activeVersion
            const installed = v.installedDevices > 0
            return (
              <div key={v.id} className="border-b last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpenVersion(isOpen ? '' : v.id)}
                  className="flex w-full items-center gap-3 px-6 py-3.5 text-left transition-colors hover:bg-secondary/50"
                >
                  <span className="text-sm font-semibold text-foreground">
                    App Version {v.version}
                  </span>
                  {isHead && (
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                      Current
                    </span>
                  )}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatBytes(v.sizeBytes)}
                  </span>
                  <ChevronDown
                    className={cn(
                      'size-4 shrink-0 text-muted-foreground transition-transform',
                      isOpen && 'rotate-180',
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="space-y-4 px-6 pb-5">
                    {/* the three per-version actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!installed}
                        onClick={() => uninstallVersion(app.id, v.id)}
                      >
                        <PackageMinus className="size-4" />
                        {installed ? 'Uninstall version' : 'Not installed'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => onRequestDeleteVersion(app, v)}
                      >
                        <Trash2 className="size-4" />
                        Delete version
                      </Button>
                    </div>

                    <dl className="divide-y divide-border rounded-lg border bg-card">
                      <Row k="Size" v={formatBytes(v.sizeBytes)} />
                      <Row k="Uploaded on" v={formatDate(v.uploadedAt)} />
                      <Row
                        k="Groups added"
                        v={`${v.publishedGroups} ${v.publishedGroups === 1 ? 'group' : 'groups'}`}
                      />
                      <Row
                        k="Policies"
                        v={`${policies.length} ${policies.length === 1 ? 'policy' : 'policies'}`}
                      />
                      <Row k="Supported architectures" v={v.architectures.join(', ')} />
                      <Row k="Publisher" v={app.publisher} />
                      {app.bundleId && <Row k="Bundle identifier" v={app.bundleId} mono />}
                    </dl>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Row({
  k,
  v,
  mono,
  capitalize,
}: {
  k: string
  v: string
  mono?: boolean
  capitalize?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
      <dt className="shrink-0 text-sm text-muted-foreground">{k}</dt>
      <dd
        className={cn(
          'text-right text-sm font-medium text-foreground',
          mono && 'font-mono text-xs',
          capitalize && 'capitalize',
        )}
      >
        {v}
      </dd>
    </div>
  )
}
