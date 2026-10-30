// Scope editor: one wide panel with Include and Exclude steps and the whole
// directory as a table to tick. No add buttons and no review step — Save is
// the last step. Built for hundreds of rows: search, type filter,
// "Selected only", pages, and whatever was saved before pinned to the top.
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Layers,
  Laptop,
  Search,
  Smartphone,
  User,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import {
  catalog,
  coverage,
  isUserKind,
  kindLabel,
  kindSingular,
  platformTotal,
  resolveScope,
  userDeviceTotal,
  type ScopeItem,
  type ScopeKind,
} from '@/data/directory'
import { licensesFor, reach, type LibraryApp } from '@/data/apps'
import { useAppLibrary } from '@/store/AppLibraryContext'
import { useConfirmClose } from './forms'
import { Stepper } from '@/components/common'
import { Pager } from './Pager'

type Tab = 'include' | 'exclude'
interface Row extends ScopeItem { sub?: string; count: number }

const PAGE = 25
const kindOrder: ScopeKind[] = ['Device', 'DeviceGroup', 'User', 'UserGroup']
const kindIcon: Record<ScopeKind, LucideIcon> = { Device: Smartphone, DeviceGroup: Layers, User, UserGroup: Users }
const keyOf = (t: ScopeItem) => `${t.kind}:${t.id}`
const devicesLabel = (n: number) => `${n} ${n === 1 ? 'device' : 'devices'}`

/** Every device, device group, user and user group, with how many of this platform's devices each covers. */
function useRows(platform: LibraryApp['platform']): Row[] {
  return useMemo(
    () =>
      kindOrder
        .flatMap((kind) => catalog(kind).map((o) => ({ kind, id: o.id, name: o.name, sub: o.sub, count: coverage({ kind, id: o.id, name: o.name }, platform) })))
        // Other platforms' devices can't get this app.
        .filter((r) => r.kind !== 'Device' || r.count > 0),
    [platform],
  )
}

function DirectoryTable({ tab, draft, set, rows, pinned }: {
  tab: Tab
  draft: LibraryApp
  set: (p: Partial<LibraryApp>) => void
  rows: Row[]
  pinned: Set<string>
}) {
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<ScopeKind>('Device')
  const [selectedOnly, setSelectedOnly] = useState(false)
  const [page, setPage] = useState(1)
  useEffect(() => setPage(1), [q, kind, selectedOnly])

  const list = tab === 'include' ? draft.targets : draft.exclusions
  const other = tab === 'include' ? draft.exclusions : draft.targets
  const chosen = useMemo(() => new Set(list.map(keyOf)), [list])
  const blocked = useMemo(() => new Set(other.map(keyOf)), [other])
  const write = (next: ScopeItem[]) => set(tab === 'include' ? { targets: next } : { exclusions: next })

  // Why a row can't be ticked here, if it can't.
  const lockedBy = (r: Row) =>
    blocked.has(keyOf(r)) ? (tab === 'include' ? 'Excluded' : 'Included')
      : tab === 'include' && draft.allDevices && !isUserKind(r.kind) ? 'All devices on'
      : tab === 'include' && draft.allUsers && isUserKind(r.kind) ? 'All users on'
      : null

  const term = q.trim().toLowerCase()
  const shown = useMemo(() => {
    const filtered = rows.filter((r) =>
      r.kind === kind &&
      (!selectedOnly || chosen.has(keyOf(r))) &&
      (!term || `${r.name} ${r.sub ?? ''}`.toLowerCase().includes(term)))
    // What was saved before stays on top while you edit (it doesn't jump as you tick).
    return [...filtered].sort((a, b) => Number(pinned.has(keyOf(b))) - Number(pinned.has(keyOf(a))))
  }, [rows, kind, selectedOnly, chosen, term, pinned])

  const pages = Math.max(1, Math.ceil(shown.length / PAGE))
  const p = Math.min(page, pages)
  const pageRows = shown.slice((p - 1) * PAGE, p * PAGE)
  const tickable = pageRows.filter((r) => !lockedBy(r))
  const allOnPage = tickable.length > 0 && tickable.every((r) => chosen.has(keyOf(r)))
  const someOnPage = tickable.some((r) => chosen.has(keyOf(r)))

  const toggle = (r: Row) =>
    write(chosen.has(keyOf(r)) ? list.filter((t) => keyOf(t) !== keyOf(r)) : [...list, { kind: r.kind, id: r.id, name: r.name }])
  const togglePage = () =>
    write(allOnPage
      ? list.filter((t) => !tickable.some((r) => keyOf(r) === keyOf(t)))
      : [...list, ...tickable.filter((r) => !chosen.has(keyOf(r))).map((r) => ({ kind: r.kind, id: r.id, name: r.name }))])

  const countOf = (k: ScopeKind) => rows.filter((r) => r.kind === k).length

  return (
    <div className="space-y-3">
      {/* What's selected, at a glance; the full list is one click away. */}
      {list.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-muted/30 px-3 py-2">
          <span className="mr-1 text-xs font-medium text-muted-foreground">{tab === 'include' ? 'Included' : 'Excluded'} · {list.length}</span>
          {list.slice(0, 6).map((t) => {
            const Icon = kindIcon[t.kind]
            return (
              <span key={keyOf(t)} className={cn('inline-flex items-center gap-1 rounded-full border bg-card py-0.5 pl-2 pr-1 text-xs', tab === 'exclude' && 'border-red-200 bg-red-50 text-red-900')}>
                <Icon className="size-3 opacity-60" />{t.name}
                <button type="button" aria-label={`Remove ${t.name}`} onClick={() => write(list.filter((x) => keyOf(x) !== keyOf(t)))} className="rounded-full p-0.5 hover:bg-black/5"><X className="size-3" /></button>
              </span>
            )
          })}
          {list.length > 6 && (
            <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setSelectedOnly(true)}>+{list.length - 6} more</button>
          )}
          <button type="button" className="ml-auto text-xs text-muted-foreground hover:text-foreground" onClick={() => write([])}>Clear all</button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, model or group" aria-label="Search" className="h-9 pl-9" />
        </div>
        <Button variant="outline" size="sm" aria-pressed={selectedOnly} onClick={() => setSelectedOnly((v) => !v)}
          className={cn(selectedOnly && 'border-primary bg-primary/5 text-primary hover:text-primary')}>
          <Check className="size-4" />Selected only · {list.length}
        </Button>
      </div>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by type">
        {kindOrder.map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
            className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              kind === k ? 'border-primary bg-primary/5 text-foreground' : 'text-muted-foreground hover:bg-muted')}>
            {kindLabel[k]}
            <span className="tabular-nums text-muted-foreground">{countOf(k)}</span>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60">
              <TableHead className="w-10">
                <Checkbox aria-label="Select everything on this page" disabled={!tickable.length}
                  checked={allOnPage ? true : someOnPage ? 'indeterminate' : false} onCheckedChange={togglePage} />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Devices</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((r) => {
              const Icon = kindIcon[r.kind]
              const on = chosen.has(keyOf(r))
              const lock = lockedBy(r)
              return (
                <TableRow key={keyOf(r)} data-state={on ? 'selected' : undefined}
                  className={cn(lock ? 'opacity-50' : 'cursor-pointer')} onClick={() => !lock && toggle(r)}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox aria-label={`${on ? 'Remove' : 'Select'} ${r.name}`} checked={on} disabled={!!lock} onCheckedChange={() => toggle(r)} />
                  </TableCell>
                  <TableCell>
                    <span className="flex max-w-[240px] items-center gap-2">
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">{r.name}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{kindSingular[r.kind]}</TableCell>
                  <TableCell className="max-w-[220px] truncate text-muted-foreground">
                    {lock ? <span className="font-medium text-foreground">{lock}</span> : r.sub ?? '—'}
                  </TableCell>
                  <TableCell className="tabular-nums">{r.kind === 'Device' ? '—' : devicesLabel(r.count)}</TableCell>
                </TableRow>
              )
            })}
            {!pageRows.length && (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">{selectedOnly ? 'Nothing selected yet.' : 'No matches.'}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <Pager page={p} size={PAGE} total={shown.length} onPage={setPage} />
      </div>
    </div>
  )
}

/** "All devices" and "All users", one full row each, kept apart from the table so filters never hide them. */
function EveryoneOptions({ draft, set }: { draft: LibraryApp; set: (p: Partial<LibraryApp>) => void }) {
  const p = draft.platform
  const options = [
    { key: 'allDevices', icon: p === 'macOS' ? Laptop : Smartphone, name: `All ${p} devices`, details: 'Includes devices enrolled later', count: platformTotal(p) },
    { key: 'allUsers', icon: Users, name: 'All users', details: 'Every device with an assigned user', count: userDeviceTotal(p) },
  ] as const
  // Turning on "all" drops the specific picks it now covers.
  const toggle = (key: 'allDevices' | 'allUsers', on: boolean) => set({
    [key]: on,
    ...(on ? { targets: draft.targets.filter((t) => (key === 'allDevices' ? isUserKind(t.kind) : !isUserKind(t.kind))) } : {}),
  })
  return (
    <div className="divide-y overflow-hidden rounded-lg border">
      {options.map((o) => (
        <label key={o.key} className={cn('flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40', draft[o.key] && 'bg-primary/5 hover:bg-primary/5')}>
          <Checkbox checked={draft[o.key]} onCheckedChange={(v) => toggle(o.key, v === true)} />
          <o.icon className={cn('size-4 shrink-0', draft[o.key] ? 'text-primary' : 'text-muted-foreground')} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{o.name}</span>
            <span className="block text-xs text-muted-foreground">{o.details}</span>
          </span>
          <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{devicesLabel(o.count)}</span>
        </label>
      ))}
    </div>
  )
}

/** Scope items as chips — the read-only view on the app page. */
export function ScopeChips({ items, platform, tone }: { items: ScopeItem[]; platform: LibraryApp['platform']; tone?: 'exclude' }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((t) => {
        const Icon = kindIcon[t.kind]
        return (
          <span key={`${t.kind}:${t.id}`}
            className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm',
              tone === 'exclude' ? 'border-red-200 bg-red-50 text-red-900' : 'bg-card')}>
            <Icon className="size-3.5 opacity-60" />
            {t.name}
            {t.kind !== 'Device' && <span className="text-xs tabular-nums opacity-60">{coverage(t, platform)}</span>}
          </span>
        )
      })}
    </div>
  )
}

export function ScopeEditorSheet({ app, onClose }: { app: LibraryApp; onClose: () => void }) {
  const { updateApp } = useAppLibrary()
  const [draft, setDraft] = useState(app)
  const [tab, setTab] = useState<Tab>('include')
  const set = (p: Partial<LibraryApp>) => setDraft((d) => ({ ...d, ...p }))
  const dirty = JSON.stringify([draft.allDevices, draft.allUsers, draft.targets, draft.exclusions]) !== JSON.stringify([app.allDevices, app.allUsers, app.targets, app.exclusions])
  const { requestClose, dialog } = useConfirmClose(dirty, onClose)
  const rows = useRows(app.platform)
  // Snapshot of what was saved, so it stays pinned to the top of each tab.
  const [pinned] = useState(() => ({ include: new Set(app.targets.map(keyOf)), exclude: new Set(app.exclusions.map(keyOf)) }))

  const { included, total } = resolveScope(draft)
  const before = app.status === 'Published' ? reach(app) : null
  const lic = licensesFor(draft)
  const short = lic && typeof lic.total === 'number' && included.length > lic.total ? included.length - lic.total : 0
  const includeCount = draft.targets.length + Number(draft.allDevices) + Number(draft.allUsers)
  const p = app.platform
  const save = () => { updateApp(draft, `Scope changed — now reaches ${included.length} devices`); onClose() }

  return (
    <Sheet open onOpenChange={(o) => !o && requestClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-4xl">
        <SheetHeader className="space-y-4 border-b px-6 pt-4 pb-0 text-left">
          <div>
            <SheetTitle className="text-lg">Scope</SheetTitle>
            <SheetDescription>{app.name} · {p}</SheetDescription>
          </div>
          <Stepper className="max-w-md pb-4" current={tab === 'include' ? 0 : 1} onStepClick={(i) => setTab(i === 0 ? 'include' : 'exclude')}
            steps={[
              { key: 'include', label: 'Include', description: `${includeCount} selected` },
              { key: 'exclude', label: 'Exclude', description: draft.exclusions.length ? `${draft.exclusions.length} selected` : 'Optional' },
            ]} />
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {tab === 'include' && (
            <>
              <EveryoneOptions draft={draft} set={set} />
              <p className="pt-1 text-xs font-medium text-muted-foreground">Or choose specific devices and users</p>
            </>
          )}
          <DirectoryTable key={tab} tab={tab} draft={draft} set={set} rows={rows} pinned={tab === 'include' ? pinned.include : pinned.exclude} />
        </div>

        <SheetFooter className="flex-row flex-wrap items-center justify-between gap-3 border-t px-6 py-3">
          <div className="min-w-0 text-sm">
            <span className="text-lg font-semibold tabular-nums">{included.length}</span>
            <span className="text-muted-foreground"> of {total} {p} devices get this app</span>
            {before !== null && before !== included.length && (
              <span className={cn('ml-2 text-xs font-medium tabular-nums', included.length > before ? 'text-emerald-700' : 'text-red-600')}>
                {included.length > before ? '+' : '−'}{Math.abs(included.length - before)}
              </span>
            )}
            {short > 0 && (
              <span className="ml-3 inline-flex items-center gap-1 text-xs text-amber-800"><AlertTriangle className="size-3.5" />{short} without a license</span>
            )}
          </div>
          <div className="flex gap-2">
            {tab === 'include' ? (
              <>
                <Button variant="ghost" onClick={requestClose}>Cancel</Button>
                {/* Save is the main path; exclusions are an optional extra step. */}
                <Button variant="outline" onClick={() => setTab('exclude')}>Add exclusions<ArrowRight className="size-4" /></Button>
                <Button disabled={!dirty} onClick={save}><Check className="size-4" />Save</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setTab('include')}><ArrowLeft className="size-4" />Back</Button>
                <Button disabled={!dirty} onClick={save}><Check className="size-4" />Save</Button>
              </>
            )}
          </div>
        </SheetFooter>
        {dialog}
      </SheetContent>
    </Sheet>
  )
}
