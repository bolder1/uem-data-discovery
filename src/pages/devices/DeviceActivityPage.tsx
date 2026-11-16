// Device Inventory → Activity. Every command sent to any Apple device, in one
// place, so an admin can answer "did the lock go out to all Sales iPhones?"
// without opening 40 device pages.
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/common'
import { Pager } from '@/components/apps/Pager'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/format'
import { tabOf } from '@/data/deviceInventory'
import { fleetCommands, isOpen, isStuck, relTime } from '@/data/deviceActivity'
import { DeliverySteps, stateLabel } from '@/components/devices/ActivityTab'

type StateFilter = 'all' | 'attention' | 'open' | 'done'
const PAGE = 15

export function DeviceActivityPage() {
  const [params, setParams] = useSearchParams()
  const deviceId = params.get('device')
  const all = useMemo(() => fleetCommands(), [])
  const [query, setQuery] = useState('')
  const [state, setState] = useState<StateFilter>('all')
  const [platform, setPlatform] = useState<'all' | 'ios' | 'macos'>('all')
  const [by, setBy] = useState('all')
  const [page, setPage] = useState(1)
  const [openRow, setOpenRow] = useState<string | null>(null)

  const people = [...new Set(all.map((x) => x.event.by))].sort()
  const q = query.trim().toLowerCase()
  const rows = all.filter(({ event: e, device: d }) =>
    (!deviceId || d.id === deviceId) &&
    (platform === 'all' || tabOf(d) === platform) &&
    (by === 'all' || e.by === by) &&
    (state === 'all' || (state === 'attention' ? e.state === 'Failed' || isStuck(e) : state === 'open' ? isOpen(e) : e.state === 'Done')) &&
    (!q || `${e.title} ${d.name} ${d.serial} ${d.owner?.email ?? ''}`.toLowerCase().includes(q)),
  )
  const scoped = all.filter((x) => !deviceId || x.device.id === deviceId)
  const stat = (f: (e: (typeof all)[number]['event']) => boolean) => scoped.filter((x) => f(x.event)).length
  const device = deviceId ? all.find((x) => x.device.id === deviceId)?.device : null
  const reset = () => setPage(1)

  const tiles: { id: StateFilter; label: string; n: number; tone?: string }[] = [
    { id: 'attention', label: 'Need follow-up', n: stat((e) => e.state === 'Failed' || isStuck(e)), tone: 'text-red-600' },
    { id: 'open', label: 'In flight', n: stat(isOpen) },
    { id: 'done', label: 'Done', n: stat((e) => e.state === 'Done') },
    { id: 'all', label: 'All commands', n: scoped.length },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={[{ label: 'Device Inventory' }, { label: 'Devices', to: '/devices' }, { label: 'Activity' }]}
        title="Device activity"
        description="Every command sent to your Apple devices — who sent it, and whether the device did it"
      />

      {device && (
        <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm">
          Showing <Link to={`/devices/${device.id}`} className="font-medium text-primary hover:underline">{device.name}</Link> only
          <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={() => { setParams({}); reset() }}><X className="size-3.5" />All devices</Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <button key={t.id} type="button" aria-pressed={state === t.id} onClick={() => { setState(t.id); reset() }}
            className={cn('rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:border-brand/40', state === t.id && 'border-brand/40 bg-brand/5')}>
            <p className="text-sm text-muted-foreground">{t.label}</p>
            <p className={cn('text-2xl font-semibold tabular-nums', t.n > 0 && t.tone)}>{t.n}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={query} onChange={(e) => { setQuery(e.target.value); reset() }} placeholder="Search action, device or user" aria-label="Search activity" className="h-9 pl-9" />
        </div>
        <Select value={platform} onValueChange={(v) => { setPlatform(v as typeof platform); reset() }}>
          <SelectTrigger className="h-9 w-36" aria-label="Platform"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All platforms</SelectItem><SelectItem value="ios">iOS</SelectItem><SelectItem value="macos">macOS</SelectItem></SelectContent>
        </Select>
        <Select value={by} onValueChange={(v) => { setBy(v); reset() }}>
          <SelectTrigger className="h-9 w-40" aria-label="Sent by"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Anyone</SelectItem>{people.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Card className="gap-0 overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60">
              <TableHead>When</TableHead><TableHead>Action</TableHead><TableHead>Device</TableHead><TableHead>Status</TableHead><TableHead>Sent by</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice((page - 1) * PAGE, page * PAGE).map(({ event: e, device: d }) => {
              const st = stateLabel(e)
              const key = `${d.id}-${e.id}`
              return [
                <TableRow key={key} className="cursor-pointer" onClick={() => setOpenRow(openRow === key ? null : key)}>
                  <TableCell className="whitespace-nowrap"><span title={formatDateTime(e.at)}>{relTime(e.at)}</span></TableCell>
                  <TableCell className="font-medium">{e.title}</TableCell>
                  <TableCell>
                    <Link to={`/devices/${d.id}`} onClick={(ev) => ev.stopPropagation()} className="hover:underline">{d.name}</Link>
                    <p className="font-mono text-xs text-muted-foreground">{d.serial}</p>
                  </TableCell>
                  <TableCell><span className={cn('rounded border px-1.5 py-0.5 text-xs font-medium', st.cls)}>{st.text}</span></TableCell>
                  <TableCell className="text-muted-foreground">{e.by}</TableCell>
                </TableRow>,
                openRow === key && (
                  <TableRow key={`${key}-x`} className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={5} className="space-y-2 py-3">
                      <DeliverySteps e={e} />
                      {e.explain && <p className="text-xs text-red-800"><span className="font-mono">{e.error}</span> — {e.explain}</p>}
                    </TableCell>
                  </TableRow>
                ),
              ]
            })}
            {!rows.length && <TableRow><TableCell colSpan={5} className="py-10 text-muted-foreground">No commands match these filters.</TableCell></TableRow>}
          </TableBody>
        </Table>
        <Pager page={page} size={PAGE} total={rows.length} onPage={setPage} />
      </Card>
    </div>
  )
}
