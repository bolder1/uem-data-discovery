// Configuration profile editor: a full page with a 3-step stepper.
//   1. Name & description
//   2. Profile Enforcer: payload rail on the left, the chosen payload's form on the right
//   3. Targets: included / excluded device groups and devices
// Mirrors the live product's flow; layout follows DESIGN.md (one screen per decision).
import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Check, ChevronRight, Info, Plus, Search, Trash2, Users, X,
  FileBadge, Airplay, Printer, Calendar, Signal, FileKey, Eye, Contact, FolderTree, Server,
  Globe, Type, LayoutGrid, MonitorSmartphone, MessageSquareText, Mail, Activity, Bell,
  KeyRound, Route, Repeat, Ban, BadgeCheck, Fingerprint, Tv, ShieldHalf, Filter, Link,
  Wifi, Settings2, type LucideIcon,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { PageHeader, EmptyState } from '@/components/common'
import { PageFooter } from '@/components/layout/PageFooter'
import { DesignSelect, configDesignLabels } from '@/components/profiles/DesignSelect'
import { useConfigDesign } from '@/lib/designVariant'
import { useProfiles } from '@/store/ProfilesContext'
import { cn } from '@/lib/utils'
import {
  blankConfig, deviceGroups, osLabel, payloads, targetDevices,
  type ConfigProfile, type Payload, type PayloadField,
} from '@/data/profiles'

const STEPS = [
  { key: 'name', label: 'Name & description' },
  { key: 'enforcer', label: 'Profile Enforcer', description: 'Payloads and settings' },
  { key: 'targets', label: 'Targets' },
]

/** The rail's groups. Every payload key appears exactly once. */
export const CATEGORIES: [string, string[]][] = [
  ['Security', ['passcode', 'restrictions', 'lockmsg', 'kiosk', 'advanced']],
  ['Network', ['wifi', 'vpn', 'proxy', 'dns', 'cellular', 'relay', 'netusage', 'webfilter']],
  ['Certificates', ['acme', 'certificate', 'scep', 'ct']],
  ['Accounts', ['mail', 'caldav', 'carddav', 'directory', 'sso', 'domains']],
  ['Device & apps', ['homescreen', 'notifications', 'webclips', 'airplay', 'airprint', 'tvremote', 'font']],
]

export const ICONS: Record<string, LucideIcon> = {
  acme: FileBadge, airplay: Airplay, airprint: Printer, caldav: Calendar, cellular: Signal,
  certificate: FileKey, ct: Eye, carddav: Contact, directory: FolderTree, dns: Server,
  domains: Globe, font: Type, homescreen: LayoutGrid, kiosk: MonitorSmartphone,
  lockmsg: MessageSquareText, mail: Mail, netusage: Activity, notifications: Bell,
  passcode: KeyRound, proxy: Route, relay: Repeat, restrictions: Ban, scep: BadgeCheck,
  sso: Fingerprint, tvremote: Tv, vpn: ShieldHalf, webfilter: Filter, webclips: Link,
  wifi: Wifi, advanced: Settings2,
}

/** One added entry of a list-shaped payload (a Wi-Fi network, a passcode rule…). */
export interface Entry { name: string }

export function ConfigProfileEditorV1() {
  const { profileId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { configProfiles, saveConfig } = useProfiles()

  const existing = profileId ? configProfiles.find((p) => p.id === profileId) : undefined
  const initial = useMemo<ConfigProfile>(
    () => existing ?? blankConfig(params.get('os') === 'macos' ? 'macos' : 'ios'),
    // Only on mount — later store updates shouldn't reset the draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const [design, setDesign] = useConfigDesign()
  const [step, setStepRaw] = useState(0)
  // Furthest step opened. An existing profile is already complete, so every step is open.
  const [reached, setReached] = useState(existing ? STEPS.length - 1 : 0)
  const setStep = (i: number) => { setStepRaw(i); setReached((r) => Math.max(r, i)) }
  const [draft, setDraft] = useState(initial)
  const set = (p: Partial<ConfigProfile>) => setDraft((d) => ({ ...d, ...p }))

  // Payload state: toggles that are on, and entries of list payloads.
  const [enabled, setEnabled] = useState<Set<string>>(
    () => new Set(initial.payloads.filter((k) => payloads.find((p) => p.key === k)?.shape !== 'list')),
  )
  const [entries, setEntries] = useState<Record<string, Entry[]>>(() =>
    Object.fromEntries(
      initial.payloads
        .filter((k) => payloads.find((p) => p.key === k)?.shape === 'list')
        .map((k) => [k, [{ name: `Default ${payloads.find((p) => p.key === k)!.label.toLowerCase()}` }]]),
    ),
  )
  const isConfigured = (key: string) => enabled.has(key) || (entries[key]?.length ?? 0) > 0
  const configuredCount = payloads.filter((p) => isConfigured(p.key)).length

  if (profileId && !existing) return <Navigate to="/mdm/apple/profiles" replace />

  const listUrl = `/mdm/apple/profiles${draft.os === 'macos' ? '?os=macos' : ''}`
  const nameProblem = !draft.name.trim() ? 'Name is required.' : null
  const last = step === STEPS.length - 1

  const save = () => {
    saveConfig({ ...draft, payloads: payloads.map((p) => p.key).filter(isConfigured) })
    navigate(listUrl)
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'Apple Profiles', to: listUrl }, { label: existing ? existing.name : 'New profile' }]}
        title={`${existing ? 'Edit' : 'Create'} ${osLabel[draft.os]} profile`}
        description="Configure policies, passcode rules and restrictions for your Apple devices."
        actions={<DesignSelect value={design} onChange={setDesign} labels={configDesignLabels} />}
      />

      <ProgressBar
        current={step}
        reached={nameProblem ? 0 : reached}
        onPick={setStep}
        summaries={[
          draft.name.trim() || 'Not named yet',
          `${configuredCount} ${configuredCount === 1 ? 'payload' : 'payloads'} on`,
          draft.allDevices
            ? `All devices${draft.excludedTargets.length ? ` · ${draft.excludedTargets.length} excluded` : ''}`
            : `${draft.includedTargets.length} included · ${draft.excludedTargets.length} excluded`,
        ]}
      />

      {step === 0 && <NameStep draft={draft} set={set} />}
      {step === 1 && (
        <EnforcerStep
          enabled={enabled}
          setEnabled={setEnabled}
          entries={entries}
          setEntries={setEntries}
          isConfigured={isConfigured}
        />
      )}
      {step === 2 && <TargetsStep draft={draft} set={set} />}

      <PageFooter wide>
        {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)}><ArrowLeft className="size-4" />Previous</Button>}
        <div className="ml-auto flex items-center gap-2">
          {step === 0 && nameProblem && <span className="text-sm text-destructive">{nameProblem}</span>}
          <Button variant="ghost" onClick={() => navigate(listUrl)}><X className="size-4" />Cancel</Button>
          {last ? (
            <Button onClick={save}><Check className="size-4" />{existing ? 'Save profile' : 'Create profile'}</Button>
          ) : (
            <Button disabled={step === 0 && !!nameProblem} onClick={() => setStep(step + 1)}>Next<ArrowRight className="size-4" /></Button>
          )}
        </div>
      </PageFooter>
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────

/**
 * The three steps as one segmented bar. Each segment says what's inside it
 * (name, payloads on, targets), so the bar doubles as the profile's summary.
 * Segments up to `reached` are clickable.
 */
function ProgressBar({ current, reached, onPick, summaries }: {
  current: number; reached: number; onPick: (i: number) => void; summaries: string[]
}) {
  return (
    <nav aria-label="Profile steps" className="grid grid-cols-3 overflow-hidden rounded-xl border bg-card shadow-xs">
      {STEPS.map((s, i) => {
        const active = i === current
        const done = i < current || (i <= reached && i !== current)
        const open = i <= reached
        return (
          <button
            key={s.key}
            type="button"
            disabled={!open}
            onClick={() => onPick(i)}
            aria-current={active ? 'step' : undefined}
            className={cn(
              'relative flex min-w-0 items-center gap-3 px-4 py-3 text-left transition-colors sm:px-5',
              i > 0 && 'border-l',
              active ? 'bg-brand/5' : open ? 'hover:bg-secondary/60' : 'cursor-not-allowed',
            )}
          >
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                active && 'border-brand bg-brand text-brand-foreground',
                !active && done && 'border-brand/40 bg-brand/10 text-brand',
                !active && !done && 'text-muted-foreground',
              )}
            >
              {done && !active ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className="min-w-0">
              <span className={cn('block truncate text-sm font-medium', !open && 'text-muted-foreground')}>{s.label}</span>
              <span className="hidden truncate text-xs text-muted-foreground sm:block">{summaries[i]}</span>
            </span>
            {/* Active underline, the way a tab shows it's selected. */}
            {active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand" />}
          </button>
        )
      })}
    </nav>
  )
}

// ── Step 1 ────────────────────────────────────────────────────────────────

function NameStep({ draft, set }: { draft: ConfigProfile; set: (p: Partial<ConfigProfile>) => void }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="space-y-5 p-6">
        <div className="space-y-1.5">
          <Label htmlFor="cp-name">Name<span className="text-destructive">*</span></Label>
          <Input id="cp-name" value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Corporate iPhone baseline" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cp-desc">Description</Label>
          <Textarea id="cp-desc" value={draft.description} onChange={(e) => set({ description: e.target.value })} rows={4} placeholder="What this profile is for" />
        </div>
      </Card>
      <Card className="space-y-2 bg-secondary/40 p-5 text-sm">
        <h3 className="font-medium">About configuration profiles</h3>
        <ul className="list-disc space-y-1.5 pl-4 text-muted-foreground">
          <li>Push passcode rules, Wi-Fi, VPN, certificates and restrictions.</li>
          <li>Turn on only the payloads you need; everything else is left alone.</li>
          <li>Choose who gets it on the Targets step.</li>
        </ul>
      </Card>
    </div>
  )
}

// ── Step 2 ────────────────────────────────────────────────────────────────

function EnforcerStep({
  enabled, setEnabled, entries, setEntries, isConfigured,
}: {
  enabled: Set<string>
  setEnabled: (fn: (s: Set<string>) => Set<string>) => void
  entries: Record<string, Entry[]>
  setEntries: (fn: (e: Record<string, Entry[]>) => Record<string, Entry[]>) => void
  isConfigured: (key: string) => boolean
}) {
  // Open on the first payload that's on, so editing lands on real settings.
  const [active, setActive] = useState(() => CATEGORIES.flatMap(([, k]) => k).find(isConfigured) ?? 'passcode')
  const [filter, setFilter] = useState('')
  const [onlyOn, setOnlyOn] = useState(false)
  const shown = payloads.filter((p) => p.label.toLowerCase().includes(filter.trim().toLowerCase()) && (!onlyOn || isConfigured(p.key)))
  const payload = payloads.find((p) => p.key === active)!
  const configuredCount = payloads.filter((p) => isConfigured(p.key)).length
  const setOn = (key: string, v: boolean) =>
    setEnabled((s) => {
      const n = new Set(s)
      if (v) n.add(key)
      else n.delete(key)
      return n
    })

  return (
    // Fixed height on md+: the rail and the form each scroll on their own, so the
    // chosen payload's form never ends up off-screen above a long rail.
    <Card className="grid gap-0 overflow-hidden p-0 md:h-[max(520px,calc(100svh-340px))] md:grid-cols-[260px_1fr] md:grid-rows-[minmax(0,1fr)]">
      {/* Rail */}
      <div className="flex min-h-0 flex-col border-b md:border-r md:border-b-0">
        <div className="space-y-2 border-b p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find a payload" className="h-8 pl-8" aria-label="Find a payload" />
          </div>
          <label className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Configured only · {configuredCount}</span>
            <Switch checked={onlyOn} onCheckedChange={setOnlyOn} aria-label="Show configured payloads only" />
          </label>
        </div>
        <nav className="max-h-[480px] flex-1 space-y-4 overflow-y-auto p-2 md:max-h-none">
          {CATEGORIES.map(([cat, keys]) => {
            const items = shown.filter((p) => keys.includes(p.key))
            if (!items.length) return null
            const on = keys.filter(isConfigured).length
            return (
              <div key={cat} className="space-y-0.5">
                <p className="flex items-center justify-between px-3 pt-1 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {cat}
                  {on > 0 && <span className="rounded-full bg-brand/10 px-1.5 text-[10px] tabular-nums text-brand normal-case">{on} on</span>}
                </p>
                {items.map((p) => {
                  const Icon = ICONS[p.key] ?? Settings2
                  const sel = p.key === active
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setActive(p.key)}
                      aria-current={sel ? 'true' : undefined}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-left text-sm transition-colors',
                        sel ? 'bg-brand/10 font-medium text-brand' : 'hover:bg-secondary',
                      )}
                    >
                      <Icon className={cn('size-4 shrink-0', !sel && 'text-muted-foreground')} />
                      <span className="flex-1 truncate">{p.label}</span>
                      {isConfigured(p.key) && <span className="size-1.5 rounded-full bg-brand" aria-label="Configured" />}
                      {p.shape === 'group' && <ChevronRight className="size-3.5 text-muted-foreground" />}
                    </button>
                  )
                })}
              </div>
            )
          })}
          {!shown.length && <p className="px-3 py-6 text-center text-sm text-muted-foreground">No payloads match.</p>}
        </nav>
      </div>

      {/* Form */}
      <div className="min-w-0 overflow-y-auto p-6">
        {payload.shape === 'toggle' && (
          <TogglePayload
            payload={payload}
            on={enabled.has(payload.key)}
            setOn={(v) => setOn(payload.key, v)}
          />
        )}
        {payload.shape === 'list' && (
          <ListPayload
            payload={payload}
            items={entries[payload.key] ?? []}
            setItems={(items) => setEntries((e) => ({ ...e, [payload.key]: items }))}
          />
        )}
        {payload.shape === 'group' && (
          <GroupPayload
            payload={payload}
            on={enabled.has(payload.key)}
            setOn={(v) => setOn(payload.key, v)}
          />
        )}
      </div>
    </Card>
  )
}

function PayloadHeader({ payload, right }: { payload: Payload; right?: React.ReactNode }) {
  const Icon = ICONS[payload.key] ?? Settings2
  return (
    <div className="mb-6 flex items-start justify-between gap-4 border-b pb-4">
      <div className="flex gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"><Icon className="size-5" /></span>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{payload.label}</h2>
          <p className="max-w-xl text-sm text-muted-foreground">{payload.blurb}</p>
        </div>
      </div>
      {right}
    </div>
  )
}

export function TogglePayload({ payload, on, setOn }: { payload: Payload; on: boolean; setOn: (v: boolean) => void }) {
  return (
    <>
      <PayloadHeader payload={payload} right={<Switch checked={on} onCheckedChange={setOn} aria-label={`Turn on ${payload.label}`} />} />
      <fieldset disabled={!on} className={cn('space-y-5 transition-opacity', !on && 'opacity-50')}>
        {(payload.fields ?? []).map((f) => <FieldRow key={f.label} field={f} />)}
      </fieldset>
    </>
  )
}

export function ListPayload({ payload, items, setItems }: { payload: Payload; items: Entry[]; setItems: (i: Entry[]) => void }) {
  const [adding, setAdding] = useState(false)
  return (
    <>
      <PayloadHeader
        payload={payload}
        right={items.length > 0 && <Button size="sm" onClick={() => setAdding(true)}><Plus className="size-4" />Add</Button>}
      />
      {items.length === 0 ? (
        <EmptyState
          icon={Plus}
          title={`No ${payload.label.toLowerCase()} configured`}
          description="Nothing from this payload is sent to devices until you add one."
          action={<Button onClick={() => setAdding(true)}><Plus className="size-4" />Add {payload.label.toLowerCase()}</Button>}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-16 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{it.name}</TableCell>
                <TableCell className="text-center">
                  <Button variant="ghost" size="icon-sm" aria-label={`Remove ${it.name}`} onClick={() => setItems(items.filter((_, j) => j !== i))}>
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {adding && <AddEntrySheet payload={payload} onClose={() => setAdding(false)} onAdd={(e) => { setItems([...items, e]); setAdding(false) }} />}
    </>
  )
}

function AddEntrySheet({ payload, onClose, onAdd }: { payload: Payload; onClose: () => void; onAdd: (e: Entry) => void }) {
  const [name, setName] = useState('')
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-b px-6 py-4 text-left">
          <SheetTitle className="text-lg">Add {payload.label.toLowerCase()}</SheetTitle>
          <SheetDescription>{payload.blurb}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <div className="space-y-1.5">
            <Label htmlFor="entry-name">Name<span className="text-destructive">*</span></Label>
            <Input id="entry-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {(payload.fields ?? []).map((f) => <FieldRow key={f.label} field={f} stacked />)}
          </div>
          {!payload.fields && <p className="text-sm text-muted-foreground">Detailed settings for this payload come next.</p>}
        </div>
        <SheetFooter className="flex-row justify-end gap-2 border-t px-6 py-3">
          <Button variant="outline" onClick={onClose}><X className="size-4" />Cancel</Button>
          <Button disabled={!name.trim()} onClick={() => onAdd({ name: name.trim() })}><Plus className="size-4" />Add</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function GroupPayload({ payload, on, setOn }: { payload: Payload; on: boolean; setOn: (v: boolean) => void }) {
  return (
    <>
      <PayloadHeader payload={payload} right={<Switch checked={on} onCheckedChange={setOn} aria-label={`Turn on ${payload.label}`} />} />
      <div className="grid gap-3 sm:grid-cols-2">
        {payload.children?.map((c) => (
          <Card key={c} className={cn('flex-row items-center justify-between gap-3 px-4 py-3', !on && 'opacity-50')}>
            <span className="text-sm font-medium">{c}</span>
            <Button variant="outline" size="sm" disabled={!on}>Configure</Button>
          </Card>
        ))}
      </div>
    </>
  )
}

/** One setting: label + OS badge on the left, control on the right. */
function FieldRow({ field, stacked }: { field: PayloadField; stacked?: boolean }) {
  const [value, setValue] = useState<string>(field.kind === 'allowdeny' ? 'Allow' : field.kind === 'yesno' ? 'No' : field.options?.[0] ?? '')
  const label = (
    <div className="flex flex-wrap items-center gap-2">
      <Label className="text-sm">{field.label}{field.required && <span className="text-destructive">*</span>}</Label>
      {field.since && <span className="rounded border px-1.5 text-[11px] text-muted-foreground">{field.since}</span>}
    </div>
  )
  const control = (() => {
    switch (field.kind) {
      case 'select':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{field.options?.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select>
        )
      case 'yesno':
      case 'allowdeny': {
        const opts = field.kind === 'yesno' ? ['Yes', 'No'] : ['Allow', 'Deny']
        return (
          <div className="inline-flex rounded-md border p-0.5" role="radiogroup" aria-label={field.label}>
            {opts.map((o) => (
              <button key={o} type="button" role="radio" aria-checked={value === o} onClick={() => setValue(o)}
                className={cn('rounded px-3 py-1 text-sm transition-colors', value === o ? 'bg-brand/10 font-medium text-brand' : 'text-muted-foreground hover:bg-secondary')}>
                {o}
              </button>
            ))}
          </div>
        )
      }
      case 'number':
        return <Input type="number" min={0} placeholder={field.placeholder} className="w-full" />
      case 'chips':
        return <Input placeholder={field.placeholder ? `${field.placeholder}, …` : 'Comma-separated'} className="w-full" />
      default:
        return <Input placeholder={field.placeholder} className="w-full" />
    }
  })()

  if (stacked) return <div className="space-y-1.5">{label}{control}</div>
  return (
    <div className="grid items-center gap-2 sm:grid-cols-[1fr_minmax(0,320px)] sm:gap-6">
      {label}
      <div className="sm:justify-self-end sm:w-full">{control}</div>
    </div>
  )
}

// ── Step 3 ────────────────────────────────────────────────────────────────

function TargetsStep({ draft, set }: { draft: ConfigProfile; set: (p: Partial<ConfigProfile>) => void }) {
  const [side, setSide] = useState<'included' | 'excluded'>('included')
  const [picking, setPicking] = useState(false)
  const key = side === 'included' ? 'includedTargets' : 'excludedTargets'
  const list = draft[key]
  const everyone = side === 'included' && draft.allDevices
  const [q, setQ] = useState('')
  const [type, setType] = useState<'all' | 'group' | 'device'>('all')
  const isGroup = (t: string) => deviceGroups.includes(t)
  const rows = list.filter((t) =>
    t.toLowerCase().includes(q.trim().toLowerCase()) && (type === 'all' || (type === 'group') === isGroup(t)),
  )

  return (
    <div className="space-y-4">
      {/* Coverage first: the one switch that decides most of the answer. */}
      <Card className={cn('flex-row items-center justify-between gap-4 px-5 py-4 transition-colors', draft.allDevices && 'border-brand/30 bg-brand/5')}>
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"><MonitorSmartphone className="size-5" /></span>
          <div>
            <p className="font-medium">All {osLabel[draft.os]} devices</p>
            <p className="text-sm text-muted-foreground">
              {draft.allDevices ? 'Every enrolled device gets this profile, except the exclusions below.' : 'Off — only the targets you include below get this profile.'}
            </p>
          </div>
        </div>
        <Switch checked={draft.allDevices} onCheckedChange={(v) => set({ allDevices: v })} aria-label="Target all devices" />
      </Card>

      <Card className="gap-0 p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4">
          <Tabs value={side} onValueChange={(v) => { setSide(v as typeof side); setQ('') }}>
            <TabsList variant="line" className="h-11">
              <TabsTrigger value="included">Included ({draft.allDevices ? 'All' : draft.includedTargets.length})</TabsTrigger>
              <TabsTrigger value="excluded">Excluded ({draft.excludedTargets.length})</TabsTrigger>
            </TabsList>
          </Tabs>
          <span className="flex items-center gap-1.5 py-2 text-xs text-muted-foreground">
            <Info className="size-3.5" />Exclusions always win over inclusions.
          </span>
        </div>

        {!everyone && (
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search this list" className="pl-9" aria-label="Search targets" />
            </div>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger className="w-[180px]" aria-label="Target type"><span className="text-muted-foreground">Type:</span><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="group">Device groups</SelectItem>
                <SelectItem value="device">Devices</SelectItem>
              </SelectContent>
            </Select>
            <Button className="ml-auto" size="sm" onClick={() => setPicking(true)}><Plus className="size-4" />Add targets</Button>
          </div>
        )}

        {everyone ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Included: all {osLabel[draft.os]} devices. Turn the switch above off to pick groups or devices instead.
          </p>
        ) : list.length === 0 ? (
          <EmptyState
            icon={Users}
            className="m-4 border-0"
            title={`No ${side} targets yet`}
            description={side === 'included' ? 'Choose device groups or individual devices.' : 'Leave empty to exclude nobody.'}
            action={<Button onClick={() => setPicking(true)}><Plus className="size-4" />Add targets</Button>}
          />
        ) : rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No targets match.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-16 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => (
                <TableRow key={t}>
                  <TableCell className="font-medium">{t}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-0.5 text-xs">
                      {isGroup(t) ? <Users className="size-3.5" /> : <MonitorSmartphone className="size-3.5" />}
                      {osLabel[draft.os]} {isGroup(t) ? 'device group' : 'device'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon-sm" aria-label={`Remove ${t}`} onClick={() => set({ [key]: list.filter((x) => x !== t) })}>
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {picking && (
        <TargetPicker
          side={side}
          taken={[...draft.includedTargets, ...draft.excludedTargets]}
          onClose={() => setPicking(false)}
          onAdd={(picked) => { set({ [key]: [...list, ...picked] }); setPicking(false) }}
        />
      )}
    </div>
  )
}

export function TargetPicker({ side, taken, onClose, onAdd }: { side: string; taken: string[]; onClose: () => void; onAdd: (t: string[]) => void }) {
  const [tab, setTab] = useState<'groups' | 'devices'>('groups')
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const source = (tab === 'groups' ? deviceGroups : targetDevices).filter((t) => !taken.includes(t) && t.toLowerCase().includes(q.trim().toLowerCase()))
  const toggle = (t: string, on: boolean) => setPicked((p) => (on ? [...p, t] : p.filter((x) => x !== t)))

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-6 py-4 text-left">
          <SheetTitle className="text-lg">Add targets · {side === 'included' ? 'Included' : 'Excluded'}</SheetTitle>
          <SheetDescription>Pick device groups or individual devices.</SheetDescription>
        </SheetHeader>
        <div className="space-y-3 border-b px-6 py-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList variant="line">
              <TabsTrigger value="groups">Device groups</TabsTrigger>
              <TabsTrigger value="devices">Devices</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="pl-9" aria-label="Search targets" />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {source.map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-secondary">
              <Checkbox checked={picked.includes(t)} onCheckedChange={(v) => toggle(t, v === true)} />
              {t}
            </label>
          ))}
          {!source.length && <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nothing left to add.</p>}
        </div>
        <SheetFooter className="flex-row items-center justify-end gap-2 border-t px-6 py-3">
          <span className="mr-auto text-sm tabular-nums text-muted-foreground">{picked.length} selected</span>
          <Button variant="outline" onClick={onClose}><X className="size-4" />Cancel</Button>
          <Button disabled={!picked.length} onClick={() => onAdd(picked)}><Plus className="size-4" />Add</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
