// Configuration profile, V2: a "profile builder".
//
// What changes from V1, and why:
//  • Top bar — header, steps and Save merge into one sticky bar, so the way
//    forward (and out) never scrolls away. The name is edited right there.
//  • 1 Details — a lone name field is a thin step. New profiles start from a
//    template; existing ones get an overview of what the profile does.
//  • 2 Settings — instead of listing all 30 payloads (most off), list only the
//    settings this profile adds, plus an "Add setting" catalog. The profile
//    reads as what it does, not what it could do.
//  • 3 Assign — Include and Exclude side by side under a live reach estimate,
//    so the outcome is visible before saving.
import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Check, Plus, Search, X, FileStack, Building2, MonitorSmartphone,
  Network, Users, Settings2, Info, Trash2, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageFooter } from '@/components/layout/PageFooter'
import { DesignSelect, configDesignLabels } from '@/components/profiles/DesignSelect'
import { useConfigDesign } from '@/lib/designVariant'
import { useProfiles } from '@/store/ProfilesContext'
import { cn } from '@/lib/utils'
import {
  blankConfig, deviceCountOf, deviceGroups, fleetSize, osLabel, payloads,
  profileCategories, levelOptions, distributionOptions,
  type ConfigProfile, type Payload, type ProfileLevel, type ProfileDistribution,
} from '@/data/profiles'
import {
  CATEGORIES, ICONS, GroupPayload, ListPayload, TargetPicker, TogglePayload, type Entry,
} from './ConfigProfileEditor'

export const STEPS = ['Details', 'Settings', 'Assign'] as const
export const byKey = (k: string) => payloads.find((p) => p.key === k)!

/** Starting points for a new profile: which payloads come pre-added. */
export const TEMPLATES = [
  { key: 'blank', label: 'Blank', icon: FileStack, blurb: 'Start empty and add settings yourself.', keys: [] as string[] },
  { key: 'baseline', label: 'Corporate baseline', icon: Building2, blurb: 'The usual floor for company phones.', keys: ['passcode', 'restrictions', 'wifi', 'lockmsg'] },
  { key: 'kiosk', label: 'Kiosk device', icon: MonitorSmartphone, blurb: 'One app, locked down, fixed Home Screen.', keys: ['kiosk', 'restrictions', 'homescreen'] },
  { key: 'network', label: 'Network & certificates', icon: Network, blurb: 'Get devices onto Wi-Fi and VPN with certificates.', keys: ['wifi', 'vpn', 'scep', 'dns'] },
]

/**
 * Everything a configuration profile editor needs, whatever its layout:
 * the draft, its settings (added / on / entries), templates, reach, save.
 * Every design version (V2–V7) is just a different layout over this.
 */
export function useProfileDraft() {
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
  const [draft, setDraft] = useState(initial)
  const set = (p: Partial<ConfigProfile>) => setDraft((d) => ({ ...d, ...p }))
  const [template, setTemplate] = useState('blank')

  // `added` = the settings listed in this profile, in the order they were added.
  const [added, setAdded] = useState<string[]>(initial.payloads)
  const [entries, setEntries] = useState<Record<string, Entry[]>>(() =>
    Object.fromEntries(initial.payloads.filter((k) => byKey(k).shape === 'list').map((k) => [k, [{ name: `Default ${byKey(k).label.toLowerCase()}` }]])),
  )
  // Toggle/group settings can be added but switched off; this holds the ones that are on.
  const [on, setOnSet] = useState<Set<string>>(() => new Set(initial.payloads.filter((k) => byKey(k).shape !== 'list')))
  const isLive = (k: string) => (byKey(k).shape === 'list' ? (entries[k]?.length ?? 0) > 0 : on.has(k))
  const live = added.filter(isLive)

  const setOn = (k: string, v: boolean) => setOnSet((s) => { const n = new Set(s); if (v) n.add(k); else n.delete(k); return n })
  const setEntriesFor = (k: string, items: Entry[]) => setEntries((e) => ({ ...e, [k]: items }))
  const addSetting = (k: string) => {
    setAdded((a) => (a.includes(k) ? a : [...a, k]))
    if (byKey(k).shape !== 'list') setOn(k, true)
  }
  const removeSetting = (k: string) => {
    setAdded((a) => a.filter((x) => x !== k))
    setOn(k, false)
    setEntries((e) => { const n = { ...e }; delete n[k]; return n })
  }
  const applyTemplate = (key: string) => {
    const t = TEMPLATES.find((x) => x.key === key)!
    setTemplate(key)
    setAdded(t.keys)
    setOnSet(new Set(t.keys.filter((k) => byKey(k).shape !== 'list')))
    setEntries(Object.fromEntries(t.keys.filter((k) => byKey(k).shape === 'list').map((k) => [k, []])))
  }

  const listUrl = `/mdm/apple/profiles${draft.os === 'macos' ? '?os=macos' : ''}`
  return {
    missing: !!profileId && !existing,
    existing, draft, set, template, applyTemplate,
    added, entries, on, isLive, live, setOn, setEntriesFor, addSetting, removeSetting,
    listUrl,
    nameMissing: !draft.name.trim(),
    reach: reachOf(draft),
    save: () => { saveConfig({ ...draft, payloads: live }); navigate(listUrl) },
    cancel: () => navigate(listUrl),
  }
}
export type ProfileDraft = ReturnType<typeof useProfileDraft>

/** The right editor for one setting, wired to the draft. */
export function PayloadEditor({ k, st }: { k: string; st: ProfileDraft }) {
  const p = byKey(k)
  if (p.shape === 'list') return <ListPayload payload={p} items={st.entries[k] ?? []} setItems={(i) => st.setEntriesFor(k, i)} />
  if (p.shape === 'group') return <GroupPayload payload={p} on={st.on.has(k)} setOn={(v) => st.setOn(k, v)} />
  return <TogglePayload payload={p} on={st.on.has(k)} setOn={(v) => st.setOn(k, v)} />
}

/**
 * Page header shared by the builder versions, in reading order:
 *   context (back to the list · prototype design switch)
 *   → title (editable name + one-line meta), with the actions on the same line
 *   → navigation (`nav`, e.g. step tabs) along the bottom edge.
 */
export function BuilderHeader({ st, nav, saveLabel }: { st: ProfileDraft; nav?: React.ReactNode; saveLabel?: string }) {
  const [design, setDesign] = useConfigDesign()
  return (
    <header className="sticky top-0 z-20 -mx-4 -mt-7 mb-6 border-b bg-background/95 px-4 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex items-center justify-between gap-3 pt-3">
        <Link to={st.listUrl} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" />Apple Profiles
        </Link>
        <DesignSelect value={design} onChange={setDesign} labels={configDesignLabels} />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pt-2 pb-4">
        <div className="min-w-0 flex-1">
          <input
            value={st.draft.name}
            onChange={(e) => st.set({ name: e.target.value })}
            placeholder="Name this profile"
            aria-label="Profile name"
            className={cn('-ml-1.5 w-full max-w-xl truncate rounded-md bg-transparent px-1.5 text-2xl font-semibold tracking-tight outline-none hover:bg-secondary/70 focus:bg-secondary focus:ring-2 focus:ring-ring/40',
              st.nameMissing && 'placeholder:text-amber-700/60')}
          />
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            <span>{osLabel[st.draft.os]} configuration profile</span>
            <span aria-hidden>·</span>
            <span>{st.live.length} {st.live.length === 1 ? 'setting' : 'settings'}</span>
            <span aria-hidden>·</span>
            <span>{st.reach.label}</span>
            {st.nameMissing && <span className="text-amber-700">· Add a name to save</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={st.cancel}>Cancel</Button>
          <Button onClick={st.save} disabled={st.nameMissing}><Check className="size-4" />{saveLabel ?? (st.existing ? 'Save changes' : 'Create profile')}</Button>
        </div>
      </div>

      {nav}
    </header>
  )
}

export function ConfigProfileEditorV2() {
  const st = useProfileDraft()
  const [step, setStep] = useState(0)
  if (st.missing) return <Navigate to="/mdm/apple/profiles" replace />
  const go = (i: number) => { if (!(i > 0 && st.nameMissing)) setStep(i) }

  return (
    <div className="flex flex-1 flex-col">
      <BuilderHeader st={st} nav={<StepTabs step={step} onPick={go} locked={st.nameMissing} />} />

      {step === 0 && (
        <DetailsStep
          draft={st.draft} set={st.set} isNew={!st.existing}
          template={st.template} onTemplate={st.applyTemplate}
        />
      )}
      {step === 1 && (
        <SettingsStep
          added={st.added} isLive={st.isLive} onAdd={st.addSetting} onRemove={st.removeSetting}
          on={st.on} setOn={st.setOn} entries={st.entries} setEntries={st.setEntriesFor}
        />
      )}
      {step === 2 && <AssignStep draft={st.draft} set={st.set} settings={st.live.length} />}

      {/* The bottom bar only moves between steps; saving lives in the header. */}
      <PageFooter wide compact>
        {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}><ArrowLeft className="size-4" />{STEPS[step - 1]}</Button>}
        {step < STEPS.length - 1 && (
          <Button className="ml-auto" variant="outline" disabled={st.nameMissing} onClick={() => go(step + 1)}>Next: {STEPS[step + 1]}<ArrowRight className="size-4" /></Button>
        )}
      </PageFooter>
    </div>
  )
}

/** Rough device reach: all devices minus exclusions, or the sum of included targets minus exclusions. */
export function reachOf(d: ConfigProfile) {
  const exc = d.excludedTargets.reduce((n, t) => n + deviceCountOf(t), 0)
  const inc = d.allDevices ? fleetSize : d.includedTargets.reduce((n, t) => n + deviceCountOf(t), 0)
  const n = Math.max(0, inc - exc)
  return { n, label: !d.allDevices && !d.includedTargets.length ? 'Not assigned' : `~${n} ${n === 1 ? 'device' : 'devices'}` }
}

// ── Top bar: steps ────────────────────────────────────────────────────────

/** Numbered underline tabs on the header's bottom edge. Steps after 1 wait for a name. */
export function StepTabs({ step, onPick, locked }: { step: number; onPick: (i: number) => void; locked: boolean }) {
  return (
    <nav aria-label="Steps" className="-mb-px flex gap-6 overflow-x-auto">
      {STEPS.map((s, i) => {
        const active = i === step
        const done = i < step
        return (
          <button key={s} type="button" onClick={() => onPick(i)} disabled={locked && i > 0} aria-current={active ? 'step' : undefined}
            className={cn('flex shrink-0 items-center gap-2 border-b-2 pb-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              active ? 'border-brand font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            <span className={cn('flex size-5 items-center justify-center rounded-full text-[11px] font-semibold',
              active ? 'bg-brand text-brand-foreground' : done ? 'bg-brand/15 text-brand' : 'bg-secondary text-muted-foreground')}>
              {done ? <Check className="size-3" /> : i + 1}
            </span>
            {s}
          </button>
        )
      })}
    </nav>
  )
}

// ── 1 · Details ───────────────────────────────────────────────────────────

export function DetailsStep({ draft, set, isNew, template, onTemplate }: {
  draft: ConfigProfile; set: (p: Partial<ConfigProfile>) => void; isNew: boolean
  template: string; onTemplate: (k: string) => void
}) {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="space-y-6">
        <Card className="gap-0 p-0">
          <div className="space-y-5 p-6">
            <div className="space-y-1.5">
              <Label htmlFor="v2-name">Name<span className="text-destructive">*</span></Label>
              <p className="text-xs text-muted-foreground">Shown on the device and in profile lists.</p>
              <Input id="v2-name" value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Corporate iPhone baseline" autoFocus={isNew} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v2-desc">Description</Label>
              <p className="text-xs text-muted-foreground">What this profile is for, so the next admin knows.</p>
              <Textarea id="v2-desc" value={draft.description} onChange={(e) => set({ description: e.target.value })} rows={3} />
            </div>
          </div>

          {/* How the profile is filed and delivered */}
          <div className="grid gap-5 border-t bg-secondary/20 p-6 sm:grid-cols-3">
            <OptionSelect id="v2-category" label="Category" help="Folder it's filed under."
              value={draft.category ?? 'None'} onChange={(v) => set({ category: v })}
              options={profileCategories.map((c) => ({ value: c, label: c }))} />
            <OptionSelect id="v2-level" label="Level" help={levelOptions.find((o) => o.value === (draft.level ?? 'device'))!.note}
              value={draft.level ?? 'device'} onChange={(v) => set({ level: v as ProfileLevel })}
              options={levelOptions} />
            <OptionSelect id="v2-dist" label="Distribution method" help={distributionOptions.find((o) => o.value === (draft.distribution ?? 'auto'))!.note}
              value={draft.distribution ?? 'auto'} onChange={(v) => set({ distribution: v as ProfileDistribution })}
              options={distributionOptions} />
          </div>
        </Card>

        {isNew && (
          <section className="space-y-3">
            <div>
              <h2 className="font-semibold">Start from</h2>
              <p className="text-sm text-muted-foreground">Templates add the usual settings for you. You can change everything on the next step.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Template">
              {TEMPLATES.map((t) => {
                const sel = template === t.key
                return (
                  <button key={t.key} type="button" role="radio" aria-checked={sel} onClick={() => onTemplate(t.key)}
                    className={cn('flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-colors',
                      sel ? 'border-brand/50 ring-1 ring-brand/30' : 'hover:border-foreground/20')}>
                    <span className="flex items-center gap-3">
                      <span className={cn('flex size-9 items-center justify-center rounded-lg', sel ? 'bg-brand/10 text-brand' : 'bg-secondary text-muted-foreground')}><t.icon className="size-4.5" /></span>
                      <span>
                        <span className="block text-sm font-medium">{t.label}</span>
                        <span className="block text-xs text-muted-foreground">{t.blurb}</span>
                      </span>
                    </span>
                    {t.keys.length > 0 && (
                      <span className="flex flex-wrap gap-1">
                        {t.keys.map((k) => <SettingChip key={k} k={k} />)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

/** Label + one-line help + dropdown, for the profile's filing and delivery options. */
function OptionSelect({ id, label, help, value, onChange, options }: {
  id: string; label: string; help: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full bg-card"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{help}</p>
    </div>
  )
}

export function SettingChip({ k }: { k: string }) {
  const Icon = ICONS[k] ?? Settings2
  return <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-xs"><Icon className="size-3" />{byKey(k).label}</span>
}

// ── 2 · Settings ──────────────────────────────────────────────────────────

export function SettingsStep({ added, isLive, onAdd, onRemove, on, setOn, entries, setEntries }: {
  added: string[]; isLive: (k: string) => boolean; onAdd: (k: string) => void; onRemove: (k: string) => void
  on: Set<string>; setOn: (k: string, v: boolean) => void
  entries: Record<string, Entry[]>; setEntries: (k: string, items: Entry[]) => void
}) {
  const [active, setActive] = useState<string | null>(added[0] ?? null)
  const [catalog, setCatalog] = useState(false)
  const payload = active && added.includes(active) ? byKey(active) : null

  return (
    <>
      <Card className="grid gap-0 overflow-hidden p-0 md:h-[max(520px,calc(100svh-230px))] md:grid-cols-[280px_1fr] md:grid-rows-[minmax(0,1fr)]">
        {/* What this profile changes */}
        <div className="flex min-h-0 flex-col border-b md:border-r md:border-b-0">
          <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">In this profile</h2>
              <p className="text-xs text-muted-foreground">{added.length} {added.length === 1 ? 'setting' : 'settings'}</p>
            </div>
            <Button size="sm" onClick={() => setCatalog(true)}><Plus className="size-4" />Add</Button>
          </div>
          <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
            {added.map((k) => {
              const p = byKey(k)
              const Icon = ICONS[k] ?? Settings2
              const sel = k === active
              const ok = isLive(k)
              return (
                <li key={k} className="group relative">
                  <button type="button" onClick={() => setActive(k)} aria-current={sel ? 'true' : undefined}
                    className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 pr-9 text-left transition-colors', sel ? 'bg-brand/10' : 'hover:bg-secondary')}>
                    <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', sel ? 'bg-card text-brand shadow-xs' : 'bg-secondary text-muted-foreground')}><Icon className="size-4" /></span>
                    <span className="min-w-0">
                      <span className={cn('block truncate text-sm', sel && 'font-medium text-brand')}>{p.label}</span>
                      <span className={cn('block text-xs', ok ? 'text-muted-foreground' : 'text-amber-700')}>
                        {!ok ? 'Not set up yet' : p.shape === 'list' ? `${entries[k].length} ${entries[k].length === 1 ? 'entry' : 'entries'}` : 'On'}
                      </span>
                    </span>
                  </button>
                  <button type="button" onClick={() => { onRemove(k); if (sel) setActive(added.find((x) => x !== k) ?? null) }}
                    aria-label={`Remove ${p.label}`}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-card hover:text-foreground focus-visible:opacity-100">
                    <X className="size-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {/* The chosen setting */}
        <div className="min-w-0 overflow-y-auto p-6">
          {payload ? (
            <>
              {payload.shape === 'toggle' && <TogglePayload payload={payload} on={on.has(payload.key)} setOn={(v) => setOn(payload.key, v)} />}
              {payload.shape === 'list' && <ListPayload payload={payload} items={entries[payload.key] ?? []} setItems={(i) => setEntries(payload.key, i)} />}
              {payload.shape === 'group' && <GroupPayload payload={payload} on={on.has(payload.key)} setOn={(v) => setOn(payload.key, v)} />}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground"><Plus className="size-6" /></span>
              <div>
                <p className="font-medium">{added.length ? 'Pick a setting on the left' : 'This profile changes nothing yet'}</p>
                <p className="text-sm text-muted-foreground">Add passcode rules, Wi-Fi, restrictions and more.</p>
              </div>
              <Button onClick={() => setCatalog(true)}><Plus className="size-4" />Add a setting</Button>
            </div>
          )}
        </div>
      </Card>

      <SettingCatalog open={catalog} onOpenChange={setCatalog} added={added} onPick={(k) => { onAdd(k); setActive(k); setCatalog(false) }} />
    </>
  )
}

/** "Add a setting": every payload by category, searchable, with what's already added marked. */
export function SettingCatalog({ open, onOpenChange, added, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; added: string[]; onPick: (k: string) => void }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string>('All')
  const match = (p: Payload) => (p.label + ' ' + p.blurb).toLowerCase().includes(q.trim().toLowerCase())
  const groups = CATEGORIES.filter(([c]) => cat === 'All' || c === cat)
    .map(([c, keys]) => [c, keys.map(byKey).filter(match)] as const)
    .filter(([, items]) => items.length)

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setQ('') }}>
      <DialogContent className="flex max-h-[85svh] flex-col gap-0 p-0 sm:max-w-3xl">
        <DialogHeader className="space-y-3 border-b px-6 pt-5 pb-4 text-left">
          <div>
            <DialogTitle>Add a setting</DialogTitle>
            <DialogDescription>Pick what this profile should change on devices.</DialogDescription>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search — try “wifi”, “passcode”, “certificate”" className="pl-9" autoFocus aria-label="Search settings" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['All', ...CATEGORIES.map(([c]) => c)].map((c) => (
              <button key={c} type="button" onClick={() => setCat(c)}
                className={cn('rounded-full border px-3 py-1 text-xs transition-colors', cat === c ? 'border-brand/40 bg-brand/10 font-medium text-brand' : 'text-muted-foreground hover:bg-secondary')}>
                {c}
              </button>
            ))}
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {groups.map(([c, items]) => (
            <section key={c} className="space-y-2">
              <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{c}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((p) => {
                  const Icon = ICONS[p.key] ?? Settings2
                  const has = added.includes(p.key)
                  return (
                    <button key={p.key} type="button" disabled={has} onClick={() => onPick(p.key)}
                      className="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors enabled:hover:border-brand/40 enabled:hover:bg-brand/5 disabled:opacity-60">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground"><Icon className="size-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2 text-sm font-medium">
                          {p.label}
                          {has && <span className="inline-flex items-center gap-0.5 text-xs font-normal text-brand"><Check className="size-3" />Added</span>}
                        </span>
                        <span className="line-clamp-2 text-xs text-muted-foreground">{p.blurb}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
          {!groups.length && <p className="py-10 text-center text-sm text-muted-foreground">No settings match “{q}”.</p>}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── 3 · Assign ────────────────────────────────────────────────────────────

export function AssignStep({ draft, set }: { draft: ConfigProfile; set: (p: Partial<ConfigProfile>) => void; settings?: number }) {
  const [side, setSide] = useState<'included' | 'excluded'>('included')
  const [picking, setPicking] = useState(false)
  const [q, setQ] = useState('')
  const [type, setType] = useState<'all' | 'group' | 'device'>('all')
  const [size, setSize] = useState(10)
  const [page, setPage] = useState(1)

  const key = side === 'included' ? 'includedTargets' : 'excludedTargets'
  const list = draft[key]
  const isGroup = (t: string) => deviceGroups.includes(t)
  const rows = list.filter((t) => t.toLowerCase().includes(q.trim().toLowerCase()) && (type === 'all' || (type === 'group') === isGroup(t)))
  const last = Math.max(1, Math.ceil(rows.length / size))
  const cur = Math.min(page, last)
  const shown = rows.slice((cur - 1) * size, cur * size)
  const everyone = side === 'included' && draft.allDevices

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <div className="flex items-center gap-2.5 rounded-md border border-brand/20 bg-brand/5 px-4 py-3 text-sm">
        <Info className="size-4 shrink-0 text-brand" />
        A device that matches any exclusion never gets this profile, even when a target includes it.
      </div>

      <Card className="gap-0 p-0">
        <div className="border-b px-4">
          <Tabs value={side} onValueChange={(v) => { setSide(v as typeof side); setQ(''); setPage(1) }}>
            <TabsList variant="line" className="h-11">
              <TabsTrigger value="included">Included ({draft.allDevices ? 'All' : draft.includedTargets.length})</TabsTrigger>
              <TabsTrigger value="excluded">Excluded ({draft.excludedTargets.length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Search this list" className="pl-9" aria-label="Search targets" />
          </div>
          <Select value={type} onValueChange={(v) => { setType(v as typeof type); setPage(1) }}>
            <SelectTrigger className="w-[170px]" aria-label="Target type"><span className="text-muted-foreground">Type:</span><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="group">Device groups</SelectItem>
              <SelectItem value="device">Devices</SelectItem>
            </SelectContent>
          </Select>
          <Button className="ml-auto" variant="outline" disabled={everyone} onClick={() => setPicking(true)}><Plus className="size-4" />Add targets</Button>
        </div>

        {side === 'included' && (
          <label className="flex items-center justify-between gap-3 border-b bg-secondary/30 px-4 py-3 text-sm">
            <span className="font-medium">All {osLabel[draft.os]} devices</span>
            <Switch checked={draft.allDevices} onCheckedChange={(v) => set({ allDevices: v })} aria-label="Target all devices" />
          </label>
        )}

        {everyone ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">Every enrolled {osLabel[draft.os]} device gets this profile, except exclusions.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-20 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((t) => (
                  <TableRow key={t}>
                    <TableCell className="font-medium">{t}</TableCell>
                    <TableCell>
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-xs">{osLabel[draft.os]} {isGroup(t) ? 'device group' : 'device'}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="icon-sm" aria-label={`Remove ${t}`} onClick={() => set({ [key]: list.filter((x) => x !== t) })}>
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!shown.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                      {list.length ? 'No targets match.' : side === 'included' ? 'No targets yet. Use Add targets to choose device groups or devices.' : 'No exclusions.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex flex-wrap items-center justify-end gap-4 border-t px-4 py-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                Rows per page:
                <Select value={String(size)} onValueChange={(v) => { setSize(Number(v)); setPage(1) }}>
                  <SelectTrigger size="sm" className="w-[72px] border-0 shadow-none" aria-label="Rows per page"><SelectValue /></SelectTrigger>
                  <SelectContent>{[10, 25, 50].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </span>
              <span className="tabular-nums">{rows.length ? (cur - 1) * size + 1 : 0}–{Math.min(cur * size, rows.length)} of {rows.length}</span>
              <span className="flex">
                <Button variant="ghost" size="icon-sm" aria-label="Previous page" disabled={cur === 1} onClick={() => setPage(cur - 1)}><ChevronLeft className="size-4" /></Button>
                <Button variant="ghost" size="icon-sm" aria-label="Next page" disabled={cur === last} onClick={() => setPage(cur + 1)}><ChevronRight className="size-4" /></Button>
              </span>
            </div>
          </>
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

export function TargetColumn({ title, icon: Icon, tone, items, everyone, empty, onAdd, onRemove }: {
  title: string; icon: typeof Users; tone: 'brand' | 'muted'; items: string[]; everyone?: string; empty: string
  onAdd: () => void; onRemove: (t: string) => void
}) {
  const total = items.reduce((n, t) => n + deviceCountOf(t), 0)
  return (
    <Card className="gap-0 p-0">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className={cn('flex size-8 items-center justify-center rounded-md', tone === 'brand' ? 'bg-brand/10 text-brand' : 'bg-secondary text-muted-foreground')}><Icon className="size-4" /></span>
          <div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">{everyone ? 'Everyone' : `${items.length} ${items.length === 1 ? 'target' : 'targets'} · ~${total} devices`}</p>
          </div>
        </div>
        {!everyone && <Button size="sm" variant="outline" onClick={onAdd}><Plus className="size-4" />Add</Button>}
      </div>
      {everyone ? (
        <p className="flex items-center gap-2 px-4 py-6 text-sm"><Check className="size-4 text-brand" />{everyone}</p>
      ) : items.length ? (
        <ul className="divide-y">
          {items.map((t) => {
            const group = deviceGroups.includes(t)
            return (
              <li key={t} className="group flex items-center gap-3 px-4 py-2.5">
                {group ? <Users className="size-4 text-muted-foreground" /> : <MonitorSmartphone className="size-4 text-muted-foreground" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{t}</span>
                  <span className="block text-xs text-muted-foreground">{group ? `Device group · ${deviceCountOf(t)} devices` : 'Device'}</span>
                </span>
                <Button variant="ghost" size="icon-sm" aria-label={`Remove ${t}`} onClick={() => onRemove(t)}><X className="size-4" /></Button>
              </li>
            )
          })}
        </ul>
      ) : (
        <button type="button" onClick={onAdd} className="m-3 rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground transition-colors hover:border-brand/40 hover:bg-brand/5 hover:text-foreground">
          {empty}
        </button>
      )}
    </Card>
  )
}
