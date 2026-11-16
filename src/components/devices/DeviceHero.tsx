// The top of the device page: who and what it is, whether it's OK, and the
// vitals for its platform. iPhone shows battery and passcode; Mac shows
// FileVault and the agent. Freshness is always visible — the live product
// shows "Active" for a Mac whose data is weeks old.
import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, Copy, Laptop, MapPin, Smartphone, Tablet } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { StatusDot } from '@/components/common'
import { cn } from '@/lib/utils'
import { formatDate, formatDateTime } from '@/lib/format'
import { checkInLabel, daysSinceCheckIn, tabOf, type InventoryDevice } from '@/data/deviceInventory'
import { deviceHeader } from '@/data/deviceDetail'
import { Meter } from './shared'

const platformIcon = { iOS: Smartphone, iPadOS: Tablet, macOS: Laptop }

function Vital({ label, value, sub, tone, children }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'warn' | 'bad'; children?: ReactNode }) {
  return (
    <div className="min-w-0 px-5 py-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn('mt-1 truncate text-base font-semibold tabular-nums', tone === 'bad' && 'text-red-600', tone === 'warn' && 'text-amber-700')}>{value}</p>
      {children}
      {sub && <p className="mt-1 truncate text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate">{children}</dd>
    </div>
  )
}

export function DeviceHero({ d }: { d: InventoryDevice }) {
  const [open, setOpen] = useState(false)
  const h = deviceHeader(d)
  const ios = tabOf(d) === 'ios'
  const days = daysSinceCheckIn(d)
  const fresh = days > 7 ? 'bad' : days > 1 ? 'stale' : 'fresh'
  const Icon = platformIcon[d.platform]
  const pct = Math.round((d.storageUsedGb / d.storageTotalGb) * 100)
  const initials = d.owner?.name.split(' ').map((p) => p[0]).join('') ?? '—'

  return (
    <Card className="gap-0 overflow-hidden p-0">
      {d.lostMode && (
        <div className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-6 py-2 text-sm text-red-800">
          <MapPin className="size-4" /><span className="font-medium">Lost Mode is on.</span> The device is locked and showing a contact message.
        </div>
      )}
      <div className="flex flex-col gap-5 p-6 md:flex-row md:items-start">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl border bg-gradient-to-b from-white to-slate-100 text-slate-700 shadow-sm">
          <Icon className="size-8" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{d.name}</h1>
            <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
              fresh === 'bad' ? 'border-red-200 bg-red-50 text-red-700' : fresh === 'stale' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
              <StatusDot className={fresh === 'bad' ? 'bg-red-500' : fresh === 'stale' ? 'bg-amber-500' : 'bg-emerald-500'} />
              {fresh === 'bad' ? `Inactive · silent ${Math.floor(days)} days` : `Active · checked in ${checkInLabel(d)}`}
            </span>
          </div>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>{d.model}</span><span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1 font-mono text-xs">
              {d.serial}
              <button type="button" aria-label="Copy serial number" className="hover:text-foreground" onClick={() => navigator.clipboard?.writeText(d.serial)}><Copy className="size-3.5" /></button>
            </span>
            <span aria-hidden>·</span><span>{d.ownership}</span>
            <span aria-hidden>·</span><span>{d.enrollmentType}{d.supervised ? ', supervised' : ', not supervised'}</span>
          </p>
          <div className="flex items-center gap-2.5 pt-1">
            <span className="flex size-7 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">{initials}</span>
            <span className="min-w-0 truncate text-sm">
              {d.owner ? <><span className="font-medium">{d.owner.name}</span> <span className="text-muted-foreground">· {d.owner.email} · {d.departmentName}</span></>
                : <span className="text-muted-foreground">Shared device · {d.buildingName}</span>}
            </span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-2 divide-x divide-y border-t bg-muted/30 sm:grid-cols-3 lg:grid-cols-5 lg:divide-y-0">
        <Vital label="Operating system" value={`${d.platform} ${d.osVersion}`} sub={d.osCurrent ? 'Up to date' : 'Update available'} tone={d.osCurrent ? undefined : 'warn'} />
        <Vital label="Storage" value={`${pct}% used`} sub={`${d.storageTotalGb - d.storageUsedGb} GB free of ${d.storageTotalGb} GB`} tone={pct >= 90 ? 'warn' : undefined}>
          <Meter pct={pct} warn={pct >= 90} className="mt-1.5" />
        </Vital>
        {ios ? (
          <Vital label="Battery" value={`${d.batteryLevel}%`} sub={d.batteryLevel! < 20 ? 'Low — may switch off' : 'At last check-in'} tone={d.batteryLevel! < 20 ? 'warn' : undefined}>
            <Meter pct={d.batteryLevel!} warn={d.batteryLevel! < 20} className="mt-1.5" />
          </Vital>
        ) : (
          <Vital label="FileVault" value={d.encrypted ? 'On' : 'Off'} sub={d.encrypted ? 'Recovery key escrowed' : 'Disk is not encrypted'} tone={d.encrypted ? undefined : 'bad'} />
        )}
        {ios ? (
          <Vital label="Passcode" value={d.passcode ? 'Set' : 'Not set'} sub={d.encrypted ? 'Data protection on' : 'Data protection off'} tone={!d.passcode ? 'bad' : !d.encrypted ? 'warn' : undefined} />
        ) : (
          <Vital label="miniOrange agent" value={d.agentVersion ?? 'Not installed'} sub={d.agentVersion ? `Uninstall: ${d.uninstallPermission?.toLowerCase()}` : 'DLP and location unavailable'} tone={d.agentVersion ? undefined : 'warn'} />
        )}
        <Vital label="Last check-in" value={checkInLabel(d)} sub={formatDateTime(d.lastCheckIn)} tone={fresh === 'bad' ? 'bad' : fresh === 'stale' ? 'warn' : undefined} />
      </div>

      {open && (
        <dl className="grid gap-x-8 gap-y-2.5 border-t px-6 py-4 md:grid-cols-2">
          <Fact label="Device groups">{d.groups.join(', ')}</Fact>
          <Fact label="Profile">{h.profile}</Fact>
          <Fact label="Model identifier"><span className="font-mono text-xs">{d.modelId}</span></Fact>
          <Fact label="Enrolled">{formatDate(d.enrolledAt)} · {d.enrollmentType}</Fact>
          <Fact label="Department">{d.departmentName}</Fact>
          <Fact label="Location">{d.buildingName}</Fact>
        </dl>
      )}
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-center gap-1 border-t py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
        {open ? <>Fewer details <ChevronUp className="size-3.5" /></> : <>Groups, profile and enrollment <ChevronDown className="size-3.5" /></>}
      </button>
    </Card>
  )
}
