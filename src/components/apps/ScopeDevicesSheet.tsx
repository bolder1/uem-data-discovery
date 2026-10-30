// Read-only audit of a scope: every device it reaches or drops, and why.
// Opened from the Scope tab's "View devices" so the tab itself stays short.
import { useState } from 'react'
import { AlertTriangle, Ban, CheckCircle2, Laptop, Search, Smartphone, Tablet } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { platformTotal, resolveScope } from '@/data/directory'
import { licensesFor, type LibraryApp } from '@/data/apps'
import { Pager } from './Pager'

const PAGE = 25
type Show = 'all' | 'in' | 'out'
const deviceIcon = { iOS: Smartphone, iPadOS: Tablet, macOS: Laptop }

export function ScopeDevicesSheet({ app, onClose }: { app: LibraryApp; onClose: () => void }) {
  const [show, setShow] = useState<Show>('all')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const { included, removed } = resolveScope(app)
  const lic = licensesFor(app)
  const short = lic && typeof lic.total === 'number' && included.length > lic.total ? included.length - lic.total : 0
  const all = [...included.map((d) => ({ d, out: false })), ...removed.map((d) => ({ d, out: true }))]
  const term = q.trim().toLowerCase()
  const rows = all
    .filter((r) => show === 'all' || (show === 'out') === r.out)
    .filter(({ d }) => !term || `${d.name} ${d.owner?.name ?? ''} ${d.model} ${d.via} ${d.excludedBy ?? ''}`.toLowerCase().includes(term))
  const pageRows = rows.slice((page - 1) * PAGE, page * PAGE)
  const Icon = deviceIcon[app.platform]
  const filters: [Show, string, number][] = [['all', 'All', all.length], ['in', 'Gets it', included.length], ['out', 'Excluded', removed.length]]

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl">
        <SheetHeader className="border-b px-6 py-4 text-left">
          <SheetTitle className="text-lg">Devices in scope</SheetTitle>
          <SheetDescription>{app.name} · {app.platform}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border px-4 py-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CheckCircle2 className="size-3.5 text-emerald-600" />Gets the app</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{included.length}<span className="ml-1 text-xs font-normal text-muted-foreground">of {platformTotal(app.platform)}</span></p>
            </div>
            <div className="rounded-lg border px-4 py-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Ban className="size-3.5 text-red-600" />Excluded</p>
              <p className={cn('mt-1 text-xl font-semibold tabular-nums', removed.length > 0 && 'text-red-600')}>{removed.length}</p>
            </div>
            <div className="rounded-lg border px-4 py-3">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><AlertTriangle className="size-3.5 text-amber-600" />Without a license</p>
              <p className={cn('mt-1 text-xl font-semibold tabular-nums', short > 0 && 'text-amber-700')}>{lic ? short : '—'}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1" role="group" aria-label="Filter devices">
              {filters.map(([k, label, n]) => (
                <button key={k} type="button" aria-pressed={show === k} onClick={() => { setShow(k); setPage(1) }}
                  className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    show === k ? 'border-primary bg-primary/5 text-foreground' : 'text-muted-foreground hover:bg-muted')}>
                  {label}<span className="tabular-nums text-muted-foreground">{n}</span>
                </button>
              ))}
            </div>
            <div className="relative ml-auto w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search device, user or reason" aria-label="Search devices" className="h-8 pl-8 text-sm" />
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60">
                  <TableHead>Device</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Why</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map(({ d, out }) => (
                  <TableRow key={d.id} className={cn(out && 'bg-red-50/40')}>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <span className={cn('font-medium', out && 'text-muted-foreground line-through decoration-red-300')}>{d.name}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{d.owner?.name ?? 'Shared device'}</TableCell>
                    <TableCell className="text-muted-foreground">{d.model}</TableCell>
                    <TableCell>
                      {out
                        ? <span className="text-sm text-red-600">Excluded · {d.excludedBy}</span>
                        : <span className="text-sm text-muted-foreground">{d.via}</span>}
                    </TableCell>
                  </TableRow>
                ))}
                {!pageRows.length && (
                  <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">{term ? `No devices match “${q}”.` : 'Nothing here.'}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            {rows.length > PAGE && <Pager page={page} size={PAGE} total={rows.length} onPage={setPage} />}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
