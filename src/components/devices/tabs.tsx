// The quieter device-page tabs: Apps and Groups & policies.
import { useState } from 'react'
import { Layers, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusDot } from '@/components/common'
import { formatDateTime } from '@/lib/format'
import type { InventoryDevice } from '@/data/deviceInventory'
import { deviceApps, groupsAndPolicies } from '@/data/deviceDetail'

/* ── Apps ─────────────────────────────────────────────────── */

const appDot = { Installed: 'bg-emerald-500', Pending: 'bg-blue-500', Failed: 'bg-red-500' }

export function AppsTab({ d, onRetry }: { d: InventoryDevice; onRetry: (name: string) => void }) {
  const apps = deviceApps(d)
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<'managed' | 'all'>('managed')
  const q = query.trim().toLowerCase()
  const rows = apps.filter((a) => (scope === 'all' || a.managed) && (!q || a.name.toLowerCase().includes(q)))
  const failed = apps.filter((a) => a.status === 'Failed').length
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search apps" aria-label="Search apps" className="h-9 pl-9" />
        </div>
        <Select value={scope} onValueChange={(v) => setScope(v as 'managed' | 'all')}>
          <SelectTrigger className="h-9 w-44" aria-label="Which apps"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="managed">Managed ({apps.filter((a) => a.managed).length})</SelectItem>
            <SelectItem value="all">All apps ({apps.length})</SelectItem>
          </SelectContent>
        </Select>
        {failed > 0 && <span className="text-sm text-red-600">{failed} failed to install</span>}
        <span className="ml-auto text-xs text-muted-foreground">From the last inventory · {formatDateTime(d.lastCheckIn)}</span>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60">
              <TableHead>App</TableHead><TableHead>Version</TableHead><TableHead>Status</TableHead><TableHead>Source</TableHead><TableHead>Size</TableHead>
              <TableHead className="w-24 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.name}>
                <TableCell><p className="font-medium">{a.name}</p><p className="text-xs text-muted-foreground">{a.managed ? 'Managed' : 'Unmanaged'}</p></TableCell>
                <TableCell className="tabular-nums">{a.version}</TableCell>
                <TableCell><span className="inline-flex items-center gap-1.5 text-xs font-medium"><StatusDot className={appDot[a.status]} />{a.status}</span></TableCell>
                <TableCell className="text-muted-foreground">{a.source}</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">{a.sizeMb >= 1000 ? `${(a.sizeMb / 1024).toFixed(1)} GB` : `${a.sizeMb} MB`}</TableCell>
                <TableCell className="text-center">{a.status === 'Failed' ? <Button size="sm" variant="outline" onClick={() => onRetry(a.name)}>Retry</Button> : <span className="text-muted-foreground">—</span>}</TableCell>
              </TableRow>
            ))}
            {!rows.length && <TableRow><TableCell colSpan={6} className="py-8 text-muted-foreground">No apps match.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

/* ── Groups & policies (iOS had none in the live product) ── */

/** Policies named on the row once the list has to fold. Up to one more than this are shown in full. */
const SHOWN = 3

/** A group's policies as pills. A long list shows the first few and a count that opens the whole list. */
function PolicyPills({ group, policies }: { group: string; policies: string[] }) {
  // Folding starts at two hidden names: "+1 more" would take the room of the pill it hides.
  const shown = policies.length > SHOWN + 1 ? policies.slice(0, SHOWN) : policies
  const rest = policies.length - shown.length
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((p) => <span key={p} className="rounded bg-secondary px-1.5 py-0.5 text-xs">{p}</span>)}
      {rest > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" aria-label={`Show all ${policies.length} policies applied through ${group}`}
              className="rounded border border-dashed px-1.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:border-brand/40 hover:bg-brand/5 hover:text-foreground data-[state=open]:border-brand/40 data-[state=open]:bg-brand/5 data-[state=open]:text-foreground">
              +{rest} more
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64">
            <p className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">{policies.length} policies through {group}</p>
            <ul className="max-h-64 space-y-1.5 overflow-y-auto px-3 py-2.5 text-sm">
              {policies.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}

export function GroupsTab({ d }: { d: InventoryDevice }) {
  const groups = groupsAndPolicies(d)
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/60"><TableHead>Group</TableHead><TableHead>Type</TableHead><TableHead>Policies applied through it</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((g) => (
            <TableRow key={g.name}>
              <TableCell><span className="inline-flex items-center gap-2 font-medium"><Layers className="size-4 text-muted-foreground" />{g.name}</span></TableCell>
              <TableCell className="text-muted-foreground">{g.smart ? 'Smart' : 'Static'}</TableCell>
              <TableCell>
                {g.policies.length
                  ? <PolicyPills group={g.name} policies={g.policies} />
                  : <span className="text-muted-foreground">No policies through this group</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

