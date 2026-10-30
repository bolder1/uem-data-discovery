import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus,
  Search,
  MoreVertical,
  Settings2,
  Crosshair,
  Trash2,
  Package,
  Tag,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  FileUp,
  Link2,
  AlertTriangle,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PageHeader, EmptyState } from '@/components/common'
import { AppIcon, CategoryName, ScopeDrawer } from '@/components/apps/AppDrawer'
import { CreateAppDialog } from '@/components/apps/CreateAppDialog'
import { StatusPill, useConfirmClose } from '@/components/apps/forms'
import { CategoryChip, PlatformChip, SourceChip, Truncated } from '@/components/apps/chips'
import { useAppLibrary } from '@/store/AppLibraryContext'
import { cn } from '@/lib/utils'
import {
  daysUntil,
  reach,
  setupSteps,
  type InHouseBuild,
  type LibraryApp,
} from '@/data/apps'

/** The page to show: the requested one, pulled back when rows disappear under it. */
const clampPage = (page: number, total: number, size: number) => Math.min(page, Math.max(1, Math.ceil(total / size)))

function Pagination({ total, page, size, onPage, onSize }: { total: number; page: number; size: number; onPage: (p: number) => void; onSize: (s: number) => void }) {
  const last = Math.max(1, Math.ceil(total / size))
  const from = total ? (page - 1) * size + 1 : 0
  const to = Math.min(page * size, total)
  return (
    <div className="flex flex-wrap items-center justify-end gap-4 border-t px-4 py-2 text-sm text-muted-foreground">
      <span className="flex items-center gap-2">
        Rows per page:
        <Select value={String(size)} onValueChange={(v) => onSize(Number(v))}>
          <SelectTrigger size="sm" aria-label="Rows per page" className="w-[72px] border-0 shadow-none"><SelectValue /></SelectTrigger>
          <SelectContent>{[10, 25, 50].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
        </Select>
      </span>
      <span className="tabular-nums">{from}–{to} of {total}</span>
      <span className="flex">
        <Button variant="ghost" size="icon-sm" aria-label="First page" disabled={page === 1} onClick={() => onPage(1)}><ChevronsLeft className="size-4" /></Button>
        <Button variant="ghost" size="icon-sm" aria-label="Previous page" disabled={page === 1} onClick={() => onPage(page - 1)}><ChevronLeft className="size-4" /></Button>
        <Button variant="ghost" size="icon-sm" aria-label="Next page" disabled={page === last} onClick={() => onPage(page + 1)}><ChevronRight className="size-4" /></Button>
        <Button variant="ghost" size="icon-sm" aria-label="Last page" disabled={page === last} onClick={() => onPage(last)}><ChevronsRight className="size-4" /></Button>
      </span>
    </div>
  )
}

function ScopeCell({ app, onClick }: { app: LibraryApp; onClick: () => void }) {
  const none = !app.allDevices && !app.allUsers && !app.targets.length
  const label = none ? 'No scope' : app.allDevices ? 'All devices' : app.allUsers ? 'All users' : `${app.targets.length} target${app.targets.length > 1 ? 's' : ''}`
  // Only a missing scope gets an icon, so it stands out.
  const n = reach(app)
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onClick() }} className="group flex items-center gap-2.5 text-left">
      {none && <AlertTriangle className="size-4 shrink-0 text-amber-600" />}
      <span>
        <span className={cn('block text-sm font-medium group-hover:underline', none && 'text-amber-700')}>{label}</span>
        {!none && <span className="block text-xs tabular-nums text-muted-foreground">{n} {n === 1 ? 'device' : 'devices'}</span>}
      </span>
    </button>
  )
}

/** One status per app, worst news first. The table pill and the Status filter both use it. */
const statuses = ['Draft', 'No devices', 'Failed', 'Installing', 'Installed', 'Available'] as const
type AppStatus = (typeof statuses)[number]
function statusOf(app: LibraryApp): AppStatus {
  const { pending, failed } = app.stats
  return app.status === 'Draft' ? 'Draft'
    : !reach(app) ? 'No devices'
    : failed > 0 ? 'Failed'
    : app.installType === 'Available' ? 'Available'
    : pending > 0 ? 'Installing'
    : 'Installed'
}
const statusTone = { Draft: 'amber', 'No devices': 'slate', Failed: 'red', Installing: 'blue', Installed: 'green', Available: 'green' } as const

function StatusCell({ app }: { app: LibraryApp }) {
  const n = reach(app)
  const { installed, pending, failed } = app.stats
  const status = statusOf(app)
  const pill = <StatusPill tone={statusTone[status]}>{status === 'Failed' ? `${failed} failed` : status}</StatusPill>
  const detail = app.status === 'Draft'
    ? (setupSteps(app).every((x) => x.done || !x.required) ? 'Ready to deploy' : 'Scope not set yet')
    : n ? `${installed} of ${n} installed${pending ? ` · ${pending} pending` : ''}${failed ? ` · ${failed} failed` : ''}` : 'Nothing in scope'
  return (
    <Tooltip>
      <TooltipTrigger asChild><span className="inline-flex">{pill}</span></TooltipTrigger>
      <TooltipContent>{detail}</TooltipContent>
    </Tooltip>
  )
}

function AddBuildSheet({ onAdd, onClose }: { onAdd: (b: InHouseBuild) => void; onClose: () => void }) {
  const [via, setVia] = useState<'upload' | 'manifest'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const urlOk = /^https:\/\/.+\.plist$/i.test(url.trim())
  const { requestClose, dialog } = useConfirmClose(!!file || !!url.trim(), onClose)
  return (
    <Sheet open onOpenChange={(o) => !o && requestClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-6 py-4 text-left">
          <SheetTitle className="text-lg">Add in-house app</SheetTitle>
          <SheetDescription>Upload a signed .ipa, or point to a manifest you host yourself.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-2 gap-2">
            {([['upload', 'Upload .ipa', FileUp], ['manifest', 'Manifest URL', Link2]] as const).map(([k, label, Icon]) => (
              <button key={k} type="button" aria-pressed={via === k} onClick={() => setVia(k)}
                className={cn('flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium', via === k ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted/60')}>
                <Icon className="size-4" />{label}
              </button>
            ))}
          </div>
          {via === 'upload' ? (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center hover:bg-muted/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2">
              <FileUp className="size-8 text-primary" />
              <span className="text-sm font-medium">{file ? file.name : 'Drop an .ipa file, or click to browse'}</span>
              <span className="text-xs text-muted-foreground">Unused uploads are cleared after 24 hours.</span>
              <input type="file" accept=".ipa" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="mf">Manifest URL</Label>
              <Input id="mf" placeholder="https://apps.example.com/manifest.plist" value={url} onChange={(e) => setUrl(e.target.value)} />
              {url && !urlOk && <p className="text-xs text-destructive">Must be an HTTPS link ending in .plist.</p>}
            </div>
          )}
        </div>
        <SheetFooter className="flex-row justify-end gap-2 border-t px-6 py-3">
          <Button variant="outline" onClick={requestClose}><X className="size-4" />Cancel</Button>
          <Button
            disabled={via === 'upload' ? !file : !urlOk}
            onClick={() =>
              onAdd(
                via === 'upload'
                  ? { id: `b-${Date.now()}`, name: file!.name, bundleId: null, version: null, status: 'Processing', delivery: null, signingExpires: null, sizeMb: Math.round(file!.size / 1e5) / 10, icon: '📄' }
                  : { id: `b-${Date.now()}`, name: url.split('/').pop()!.replace('.plist', ''), bundleId: 'com.example.manifest', version: '1.0', status: 'Ready', delivery: 'Manifest URL', signingExpires: null, icon: '🔗' },
              )
            }
          >
            <Plus className="size-4" />Add
          </Button>
        </SheetFooter>
        {dialog}
      </SheetContent>
    </Sheet>
  )
}

function InHouseTab({ builds, apps, setBuilds }: { builds: InHouseBuild[]; apps: LibraryApp[]; setBuilds: (f: (b: InHouseBuild[]) => InHouseBuild[]) => void }) {
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [pageWanted, setPage] = useState(1)
  const [size, setSize] = useState(25)
  const q = query.trim().toLowerCase()
  const rows = builds.filter((b) => !q || `${b.name} ${b.bundleId ?? ''}`.toLowerCase().includes(q))
  useEffect(() => setPage(1), [query, size])
  const page = clampPage(pageWanted, rows.length, size)
  const expiring = builds.filter((b) => b.signingExpires && daysUntil(b.signingExpires) <= 30)
  const usedBy = (b: InHouseBuild) => apps.filter((a) => a.source === 'In-house' && a.bundleId === b.bundleId).length

  return (
    <div className="space-y-4">
      {expiring.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            {expiring.map((b) => b.name).join(', ')} {expiring.length === 1 ? 'stops' : 'stop'} launching on devices when signing expires in{' '}
            {Math.min(...expiring.map((b) => daysUntil(b.signingExpires!)))} days. Upload a re-signed build to keep {expiring.length === 1 ? 'it' : 'them'} working.
          </p>
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or bundle ID" className="h-9 pl-9" />
        </div>
        <Button onClick={() => setAdding(true)}><Plus className="size-4" />Add in-house app</Button>
      </div>
      <Card className="gap-0 overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60">
              <TableHead>App</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Bundle ID</TableHead>
              <TableHead>Latest build</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Signing expires</TableHead>
              <TableHead>Used by apps</TableHead>
              <TableHead className="w-16 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice((page - 1) * size, page * size).map((b) => {
              const days = b.signingExpires ? daysUntil(b.signingExpires) : null
              return (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <AppIcon app={b} />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{b.name}</p>
                        {b.sizeMb && <p className="text-xs text-muted-foreground">{b.sizeMb} MB · Frees up in about 24 h if unused</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusPill tone={b.status === 'Ready' ? 'green' : b.status === 'Processing' ? 'amber' : 'red'}>{b.status}</StatusPill>
                  </TableCell>
                  <TableCell className="text-sm">{b.bundleId ?? '—'}</TableCell>
                  <TableCell className="tabular-nums">{b.version ?? '—'}</TableCell>
                  <TableCell>{b.delivery ?? '—'}</TableCell>
                  <TableCell className={cn('tabular-nums', days !== null && days <= 30 && 'font-medium text-amber-700')}>
                    {b.signingExpires ? new Date(b.signingExpires).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    {days !== null && days <= 30 && <span className="block text-xs">in {days} days</span>}
                  </TableCell>
                  <TableCell className="tabular-nums">{b.bundleId ? usedBy(b) : '—'}</TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${b.name}`}><MoreVertical className="size-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem variant="destructive" disabled={!!b.bundleId && usedBy(b) > 0} onSelect={() => setBuilds((list) => list.filter((x) => x.id !== b.id))}>
                          <Trash2 className="size-4" />Delete{b.bundleId && usedBy(b) > 0 ? ' (in use)' : ''}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <Pagination total={rows.length} page={page} size={size} onPage={setPage} onSize={setSize} />
      </Card>
      {adding && <AddBuildSheet onClose={() => setAdding(false)} onAdd={(b) => { setBuilds((list) => [b, ...list]); setAdding(false) }} />}
    </div>
  )
}

export function AppLibrary() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const tab = params.get('tab') === 'in-house' ? 'in-house' : 'apps'
  const setParam = (k: string, v: string | null) =>
    setParams((p) => { const n = new URLSearchParams(p); if (v) n.set(k, v); else n.delete(k); return n }, { replace: true })
  const { apps, builds, categories, setBuilds, patchApps, deleteApps } = useAppLibrary()

  const [query, setQuery] = useState('')
  const [platform, setPlatform] = useState('all')
  const [source, setSource] = useState('all')
  const [category, setCategory] = useState(() => params.get('category') ?? 'all')
  const [status, setStatus] = useState('all')
  const [pageWanted, setPage] = useState(1)
  const [size, setSize] = useState(25)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [scoping, setScoping] = useState<LibraryApp | null>(null)
  const [adding, setAdding] = useState(false)
  // Confirm dialogs keep a snapshot, so their text doesn't change while they animate closed.
  const [deleting, setDeleting] = useState<{ open: boolean; apps: LibraryApp[] }>({ open: false, apps: [] })
  const [forcing, setForcing] = useState({ open: false, count: 0, devices: 0 })

  // "Name · 2" for later entries of the same app on the same platform (as in the live product).
  const entryNo = useMemo(() => {
    const seen = new Map<string, number>()
    const out = new Map<string, number>()
    ;[...apps].sort((a, b) => a.addedAt.localeCompare(b.addedAt)).forEach((a) => {
      const k = `${a.bundleId}|${a.platform}`
      const n = (seen.get(k) ?? 0) + 1
      seen.set(k, n)
      out.set(a.id, n)
    })
    return out
  }, [apps])

  const q = query.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      apps.filter(
        (a) =>
          (platform === 'all' || a.platform === platform) &&
          (source === 'all' || a.source === source) &&
          (category === 'all' || (a.categoryId ?? 'none') === category) &&
          (status === 'all' || statusOf(a) === status) &&
          (!q || `${a.name} ${a.bundleId}`.toLowerCase().includes(q)),
      ),
    [apps, platform, source, category, q, status],
  )
  // New filters start a new result set: back to page 1, and drop a selection the admin can no longer see.
  useEffect(() => {
    setPage(1)
    setSelected(new Set())
  }, [query, platform, source, category, size, status])
  const page = clampPage(pageWanted, filtered.length, size)
  const rows = filtered.slice((page - 1) * size, page * size)
  const filtersActive = !!q || [platform, source, category, status].some((v) => v !== 'all')
  const open = (a: LibraryApp) => navigate(`/mdm/apple/app-library/${a.id}`)
  const catOf = (id: string | null) => categories.find((c) => c.id === id)

  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const bulkPatch = (p: Partial<LibraryApp>, what: string) => {
    patchApps(selected, p, what)
    setSelected(new Set())
  }
  const askDelete = (ids: string[]) => setDeleting({ open: true, apps: apps.filter((a) => ids.includes(a.id)) })
  const askForce = () => setForcing({
    open: true,
    count: selected.size,
    devices: apps.filter((a) => selected.has(a.id) && a.status === 'Published').reduce((n, a) => n + reach(a), 0),
  })
  const deletingApps = deleting.apps
  const allDrafts = deletingApps.length > 0 && deletingApps.every((a) => a.status === 'Draft')

  // One "Add app" button for every source and platform; the source is chosen inside the flow.
  const addMenu = <Button onClick={() => setAdding(true)}><Plus className="size-4" />Add app</Button>

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[{ label: 'Mobile Device Management' }, { label: 'Apple' }, { label: 'App Library' }]}
        title="Apple App Library"
        description="App Store, VPP and in-house apps for iPhone, iPad and Mac"
      />

      <Tabs value={tab} onValueChange={(v) => setParam('tab', v === 'in-house' ? v : null)}>
        <TabsList variant="line" className="border-b">
          <TabsTrigger value="apps" className="flex-none px-4">Apps</TabsTrigger>
          <TabsTrigger value="in-house" className="flex-none px-4">In-house apps</TabsTrigger>
        </TabsList>

        <TabsContent value="apps" className="mt-5 space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or bundle ID" className="h-9 pl-9" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger aria-label="Platform" className="h-9 w-[130px] bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All platforms</SelectItem>
                  <SelectItem value="iPadOS">iPadOS</SelectItem>
                  <SelectItem value="iOS">iOS</SelectItem>
                  <SelectItem value="macOS">macOS</SelectItem>
                </SelectContent>
              </Select>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger aria-label="Source" className="h-9 w-[130px] bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  <SelectItem value="App Store">App Store</SelectItem>
                  <SelectItem value="VPP">VPP</SelectItem>
                  <SelectItem value="In-house">In-house</SelectItem>
                </SelectContent>
              </Select>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger aria-label="Category" className="h-9 w-[150px] bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}><CategoryName category={c} /></SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger aria-label="Status" className="h-9 w-[140px] bg-card"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statuses.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
              {filtersActive && (
                <Button variant="ghost" size="sm" onClick={() => { setQuery(''); setPlatform('all'); setSource('all'); setCategory('all'); setStatus('all') }}>Clear</Button>
              )}
              {addMenu}
            </div>
          </div>

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-primary/5 px-4 py-2 text-sm">
              <span className="mr-2 font-medium">{selected.size} selected</span>
              <Select value="" onValueChange={(v) => bulkPatch({ categoryId: v === 'none' ? null : v }, `Category set to ${catOf(v)?.name ?? 'none'}`)}>
                <SelectTrigger size="sm" className="w-auto gap-1.5 bg-card"><Tag className="size-4" /><span>Set category</span></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}><CategoryName category={c} /></SelectItem>)}
                </SelectContent>
              </Select>
              {/* Forced install pushes to every device in scope, so it asks first. */}
              <Select value="" onValueChange={(v) => (v === 'Forced install' ? askForce() : bulkPatch({ installType: 'Available' }, 'Install type set to Available'))}>
                <SelectTrigger size="sm" className="w-auto bg-card"><span>Set install type</span></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Forced install">Forced install</SelectItem>
                  <SelectItem value="Available">Available</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => askDelete([...selected])}><Trash2 className="size-4" />Delete</Button>
              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}><X className="size-4" />Clear selection</Button>
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              icon={Package}
              title={apps.length ? 'No apps match these filters' : 'No apps yet'}
              description={apps.length ? 'Adjust the search or filters to widen the results.' : 'Add an App Store, VPP or in-house app to start distributing it.'}
              action={apps.length ? undefined : addMenu}
            />
          ) : (
            <Card className="gap-0 overflow-hidden p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead className="w-10">
                      <Checkbox aria-label="Select all on page" checked={allOnPage}
                        onCheckedChange={(v) => setSelected((s) => { const n = new Set(s); rows.forEach((r) => (v ? n.add(r.id) : n.delete(r.id))); return n })} />
                    </TableHead>
                    <TableHead>App</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((a) => {
                    const n = entryNo.get(a.id) ?? 1
                    return (
                      <TableRow key={a.id} className="cursor-pointer [&>td]:py-3" data-state={selected.has(a.id) ? 'selected' : undefined} onClick={() => open(a)}>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox aria-label={`Select ${a.name}`} checked={selected.has(a.id)} onCheckedChange={() => toggle(a.id)} />
                        </TableCell>
                        <TableCell>
                          <div className="flex min-w-[180px] max-w-[248px] items-center gap-3">
                            <AppIcon app={a} className="size-10" />
                            <div className="min-w-0 flex-1">
                              {/* The name is the keyboard target; the row click is a mouse shortcut. */}
                              <Link to={`/mdm/apple/app-library/${a.id}`} onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 font-medium hover:underline focus-visible:underline focus-visible:outline-none">
                                <Truncated text={a.name} />
                                {n > 1 && <span className="shrink-0 rounded bg-muted px-1 text-[10px] font-semibold text-muted-foreground">#{n}</span>}
                              </Link>
                              <Truncated text={a.bundleId} className="font-mono text-[11px] text-muted-foreground" />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><PlatformChip platform={a.platform} /></TableCell>
                        <TableCell><SourceChip source={a.source} /></TableCell>
                        <TableCell className="max-w-40"><CategoryChip category={catOf(a.categoryId)} /></TableCell>
                        <TableCell><ScopeCell app={a} onClick={() => setScoping(a)} /></TableCell>
                        <TableCell><StatusCell app={a} /></TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${a.name}`}><MoreVertical className="size-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => open(a)}><Settings2 className="size-4" />Settings</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setScoping(a)}><Crosshair className="size-4" />Scope</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onSelect={() => askDelete([a.id])}><Trash2 className="size-4" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <Pagination total={filtered.length} page={page} size={size} onPage={setPage} onSize={setSize} />
            </Card>
          )}
        </TabsContent>

        <TabsContent value="in-house" className="mt-5">
          <InHouseTab builds={builds} apps={apps} setBuilds={setBuilds} />
        </TabsContent>
      </Tabs>

      {scoping && <ScopeDrawer key={scoping.id} app={scoping} onClose={() => setScoping(null)} />}
      {adding && (
        <CreateAppDialog onClose={() => setAdding(false)} onCreated={(a) => navigate(`/mdm/apple/app-library/${a.id}?new=1`)} />
      )}
      <AlertDialog open={deleting.open} onOpenChange={(o) => !o && setDeleting((d) => ({ ...d, open: false }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingApps.length === 1 ? deletingApps[0].name : `${deletingApps.length} apps`}?</AlertDialogTitle>
            <AlertDialogDescription>
              {allDrafts
                ? `${deletingApps.length === 1 ? 'This draft was' : 'These drafts were'} never deployed.`
                : `Removed from the library and uninstalled from every device in scope. VPP licenses are released.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deletingApps.length > 1 && (
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-3 text-sm">
              {deletingApps.map((a) => (
                <li key={a.id} className="flex items-center gap-2">
                  <AppIcon app={a} className="size-5" />
                  <span className="min-w-0 flex-1 truncate">{a.name}</span>
                  <span className="text-xs text-muted-foreground">{a.platform}{a.status === 'Draft' && ' · Draft'}</span>
                </li>
              ))}
            </ul>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive"
              onClick={() => { deleteApps(new Set(deletingApps.map((a) => a.id))); setSelected(new Set()) }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={forcing.open} onOpenChange={(o) => !o && setForcing((f) => ({ ...f, open: false }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force install {forcing.count} {forcing.count === 1 ? 'app' : 'apps'}?</AlertDialogTitle>
            <AlertDialogDescription>
              {forcing.devices ? `Installs automatically on ${forcing.devices} devices in scope. Users can't skip it.` : 'They install automatically once deployed. Users can’t skip it.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => bulkPatch({ installType: 'Forced install' }, 'Install type set to Forced install')}>Force install</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
