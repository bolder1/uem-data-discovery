// Configuration profile page — five more designs (V3–V7), each a different way
// to think about the same job. All share useProfileDraft, so switching versions
// from the Design dropdown is purely a layout change.
//   V3 One page       — no steps; Details, Settings, Assign stacked, settings expand in place.
//   V4 Live summary   — edit on the left, a sticky "what devices get" panel with a readiness check.
//   V5 Focus wizard   — one question per screen, big type, progress bar.
//   V6 Three columns  — Details | Settings | Assign side by side, nothing hidden.
//   V7 Table          — every setting in one table with on/off; edit in a side sheet.
import { useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronDown, CircleSlash, Pencil, Plus, Search, Settings2, Smartphone, Users, X,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { PageFooter } from '@/components/layout/PageFooter'
import { DesignSelect, configDesignLabels } from '@/components/profiles/DesignSelect'
import { useConfigDesign } from '@/lib/designVariant'
import { cn } from '@/lib/utils'
import { deviceCountOf, deviceGroups, fleetSize, osLabel, payloads } from '@/data/profiles'
import { CATEGORIES, ICONS, TargetPicker } from './ConfigProfileEditor'
import {
  AssignStep, BuilderHeader, PayloadEditor, SettingCatalog, SettingChip, SettingsStep, StepTabs, TEMPLATES, TargetColumn,
  byKey, useProfileDraft, type ProfileDraft,
} from './ConfigProfileEditorV2'

const categoryOf = (k: string) => CATEGORIES.find(([, keys]) => keys.includes(k))?.[0] ?? 'Other'
const statusOf = (st: ProfileDraft, k: string) =>
  !st.isLive(k) ? 'Not set up' : byKey(k).shape === 'list' ? `${st.entries[k].length} ${st.entries[k].length === 1 ? 'entry' : 'entries'}` : 'On'

// ── Shared pieces ─────────────────────────────────────────────────────────

function DescriptionField({ st }: { st: ProfileDraft }) {
  return (
    <Textarea value={st.draft.description} onChange={(e) => st.set({ description: e.target.value })} rows={2}
      placeholder="What this profile is for, so the next admin knows" aria-label="Description" />
  )
}

function TemplateGrid({ st, cols = 2 }: { st: ProfileDraft; cols?: 1 | 2 | 4 }) {
  return (
    <div className={cn('grid gap-2.5', cols === 2 && 'sm:grid-cols-2', cols === 4 && 'sm:grid-cols-2 xl:grid-cols-4')} role="radiogroup" aria-label="Template">
      {TEMPLATES.map((t) => {
        const sel = st.template === t.key
        return (
          <button key={t.key} type="button" role="radio" aria-checked={sel} onClick={() => st.applyTemplate(t.key)}
            className={cn('flex items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors', sel ? 'border-brand/50 ring-1 ring-brand/30' : 'hover:border-foreground/20')}>
            <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-md', sel ? 'bg-brand/10 text-brand' : 'bg-secondary text-muted-foreground')}><t.icon className="size-4" /></span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{t.label}</span>
              <span className="block text-xs text-muted-foreground">{t.blurb}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** Added settings as expandable rows; each opens its editor in place. */
function SettingsAccordion({ st, compact }: { st: ProfileDraft; compact?: boolean }) {
  const [open, setOpen] = useState<string | null>(null)
  const [catalog, setCatalog] = useState(false)
  return (
    <div className="space-y-2">
      {st.added.map((k) => {
        const Icon = ICONS[k] ?? Settings2
        const isOpen = open === k
        const ok = st.isLive(k)
        return (
          <div key={k} className={cn('overflow-hidden rounded-xl border bg-card transition-shadow', isOpen && 'shadow-sm ring-1 ring-brand/20')}>
            <div className="flex items-center gap-3 px-3 py-2.5">
              <button type="button" onClick={() => setOpen(isOpen ? null : k)} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground"><Icon className="size-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{byKey(k).label}</span>
                  <span className={cn('block text-xs', ok ? 'text-muted-foreground' : 'text-amber-700')}>{statusOf(st, k)}</span>
                </span>
                <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
              </button>
              <Button variant="ghost" size="icon-sm" aria-label={`Remove ${byKey(k).label}`} onClick={() => { st.removeSetting(k); if (isOpen) setOpen(null) }}><X className="size-4" /></Button>
            </div>
            {isOpen && <div className={cn('border-t', compact ? 'p-4' : 'p-6')}><PayloadEditor k={k} st={st} /></div>}
          </div>
        )
      })}
      <button type="button" onClick={() => setCatalog(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm text-muted-foreground transition-colors hover:border-brand/40 hover:bg-brand/5 hover:text-foreground">
        <Plus className="size-4" />Add a setting
      </button>
      <SettingCatalog open={catalog} onOpenChange={setCatalog} added={st.added} onPick={(k) => { st.addSetting(k); setOpen(k); setCatalog(false) }} />
    </div>
  )
}

// ── V3 · One page ─────────────────────────────────────────────────────────

export function ConfigProfileV3() {
  const st = useProfileDraft()
  const [current, setCurrent] = useState(0)
  const refs = useRef<(HTMLElement | null)[]>([])
  if (st.missing) return <Navigate to="/mdm/apple/profiles" replace />
  const jump = (i: number) => { setCurrent(i); refs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  return (
    <div className="flex flex-1 flex-col">
      <BuilderHeader st={st} nav={<StepTabs step={current} onPick={jump} locked={false} />} />
      <div className="mx-auto w-full max-w-4xl space-y-12 pb-16">
        <Block refCb={(el) => { refs.current[0] = el }} n={1} title="Details" lead="The name is in the header. Add a note for other admins.">
          <DescriptionField st={st} />
          {!st.existing && <><p className="pt-2 text-sm font-medium">Start from</p><TemplateGrid st={st} cols={4} /></>}
        </Block>
        <Block refCb={(el) => { refs.current[1] = el }} n={2} title="Settings" lead="Only what you add here changes on devices. Open a setting to edit it.">
          <SettingsAccordion st={st} />
        </Block>
        <Block refCb={(el) => { refs.current[2] = el }} n={3} title="Assign" lead="Who gets this profile.">
          <AssignStep draft={st.draft} set={st.set} settings={st.live.length} />
        </Block>
      </div>
    </div>
  )
}

function Block({ refCb, n, title, lead, children }: { refCb: (el: HTMLElement | null) => void; n: number; title: string; lead: string; children: React.ReactNode }) {
  return (
    <section ref={refCb} className="scroll-mt-48 space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-brand-foreground">{n}</span>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{lead}</p>
        </div>
      </div>
      <div className="space-y-3 pl-10">{children}</div>
    </section>
  )
}

// ── V4 · Live summary ─────────────────────────────────────────────────────

export function ConfigProfileV4() {
  const st = useProfileDraft()
  const [step, setStep] = useState(0)
  if (st.missing) return <Navigate to="/mdm/apple/profiles" replace />

  return (
    <div className="flex flex-1 flex-col">
      <BuilderHeader st={st} nav={<StepTabs step={step} onPick={setStep} locked={false} />} />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          {step === 0 && (
            <div className="space-y-5">
              <Card className="gap-2 p-5"><p className="text-sm font-medium">Description</p><DescriptionField st={st} /></Card>
              {!st.existing && <div className="space-y-2"><p className="text-sm font-medium">Start from</p><TemplateGrid st={st} /></div>}
            </div>
          )}
          {step === 1 && (
            <SettingsStep added={st.added} isLive={st.isLive} onAdd={st.addSetting} onRemove={st.removeSetting}
              on={st.on} setOn={st.setOn} entries={st.entries} setEntries={st.setEntriesFor} />
          )}
          {step === 2 && <AssignStep draft={st.draft} set={st.set} settings={st.live.length} />}
        </div>
        <SummaryPanel st={st} onJump={setStep} />
      </div>
    </div>
  )
}

/** What devices will get, and whether the profile is ready — always in view. */
function SummaryPanel({ st, onJump }: { st: ProfileDraft; onJump: (i: number) => void }) {
  const unset = st.added.filter((k) => !st.isLive(k))
  const assigned = st.draft.allDevices || st.draft.includedTargets.length > 0
  const checks: [string, boolean, number][] = [
    ['Has a name', !st.nameMissing, 0],
    ['Changes at least one setting', st.live.length > 0, 1],
    ['Assigned to devices', assigned, 2],
  ]
  return (
    <aside className="space-y-4 xl:sticky xl:top-56 xl:self-start">
      <Card className="gap-4 p-5">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">What devices get</p>
          <p className="mt-1 text-xl font-semibold">{st.live.length} {st.live.length === 1 ? 'setting' : 'settings'}</p>
          <p className="text-sm text-muted-foreground">on {st.reach.label.toLowerCase()}</p>
        </div>
        {st.live.length > 0 && <div className="flex flex-wrap gap-1">{st.live.map((k) => <SettingChip key={k} k={k} />)}</div>}
        {unset.length > 0 && (
          <button type="button" onClick={() => onJump(1)} className="flex w-full items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {unset.map((k) => byKey(k).label).join(', ')} {unset.length === 1 ? 'isn’t' : 'aren’t'} set up yet, so {unset.length === 1 ? 'it' : 'they'} won’t be sent.
          </button>
        )}
      </Card>
      <Card className="gap-2 p-5">
        <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Ready to save</p>
        {checks.map(([label, ok, step]) => (
          <button key={label} type="button" onClick={() => onJump(step)} className="flex items-center gap-2.5 rounded-md py-1 text-left text-sm hover:text-brand">
            <span className={cn('flex size-5 items-center justify-center rounded-full', ok ? 'bg-brand text-brand-foreground' : 'border border-dashed text-muted-foreground')}>
              {ok && <Check className="size-3" />}
            </span>
            <span className={cn(!ok && 'text-muted-foreground')}>{label}</span>
          </button>
        ))}
      </Card>
    </aside>
  )
}

// ── V5 · Focus wizard ─────────────────────────────────────────────────────

const QUESTIONS = ['Name', 'Starting point', 'Settings', 'Who gets it', 'Review']

export function ConfigProfileV5() {
  const st = useProfileDraft()
  const [design, setDesign] = useConfigDesign()
  const [q, setQ] = useState(0)
  const [editing, setEditing] = useState<string | null>(null)
  if (st.missing) return <Navigate to="/mdm/apple/profiles" replace />
  // Existing profiles skip "Starting point".
  const order = st.existing ? [0, 2, 3, 4] : [0, 1, 2, 3, 4]
  const pos = order.indexOf(q)
  const next = () => { if (!(q === 0 && st.nameMissing) && pos < order.length - 1) setQ(order[pos + 1]) }
  const back = () => pos > 0 && setQ(order[pos - 1])
  const pct = Math.round(((pos + 1) / order.length) * 100)

  return (
    <div className="flex flex-1 flex-col" onKeyDown={(e) => { if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) next() }}>
      {/* Thin chrome: exit, progress, design switch. */}
      <div className="sticky top-0 z-20 -mx-4 -mt-7 mb-10 border-b bg-background/95 px-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-3 py-3">
          <Button variant="ghost" size="sm" onClick={st.cancel}><X className="size-4" />Exit</Button>
          <span className="text-sm text-muted-foreground">{QUESTIONS[q]} · {pos + 1} of {order.length}</span>
          <DesignSelect value={design} onChange={setDesign} labels={configDesignLabels} />
        </div>
        <div className="-mx-4 h-1 bg-secondary sm:-mx-6"><div className="h-full bg-brand transition-[width]" style={{ width: `${pct}%` }} /></div>
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-8 pb-10">
        {q === 0 && (
          <Question title="What should we call this profile?" hint="Admins see this name in lists and reports.">
            <Input value={st.draft.name} onChange={(e) => st.set({ name: e.target.value })} placeholder="e.g. Corporate iPhone baseline" autoFocus className="h-14 text-xl" />
            <DescriptionField st={st} />
          </Question>
        )}
        {q === 1 && (
          <Question title="Where do you want to start?" hint="A template adds the usual settings. You can change everything next.">
            <TemplateGrid st={st} />
          </Question>
        )}
        {q === 2 && (
          <Question title="What should it change on devices?" hint="Tap to add or remove. Added settings can be fine-tuned with the pencil.">
            {CATEGORIES.map(([cat, keys]) => (
              <div key={cat} className="space-y-2">
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{cat}</p>
                <div className="flex flex-wrap gap-2">
                  {keys.map((k) => {
                    const Icon = ICONS[k] ?? Settings2
                    const on = st.added.includes(k)
                    return (
                      <span key={k} className={cn('inline-flex items-center rounded-full border text-sm transition-colors', on ? 'border-brand/50 bg-brand/10 text-brand' : 'hover:bg-secondary')}>
                        <button type="button" aria-pressed={on} onClick={() => (on ? st.removeSetting(k) : st.addSetting(k))} className="flex items-center gap-1.5 py-1.5 pr-2 pl-3">
                          {on ? <Check className="size-3.5" /> : <Icon className="size-3.5 text-muted-foreground" />}{byKey(k).label}
                        </button>
                        {on && (
                          <button type="button" onClick={() => setEditing(k)} aria-label={`Fine-tune ${byKey(k).label}`} className="mr-1 rounded-full p-1 hover:bg-brand/15">
                            <Pencil className="size-3" />
                          </button>
                        )}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </Question>
        )}
        {q === 3 && (
          <Question title="Who should get it?" hint="Exclusions always win.">
            <div className="grid gap-3 sm:grid-cols-2">
              <BigChoice selected={st.draft.allDevices} onClick={() => st.set({ allDevices: true })} icon={Smartphone} title={`All ${osLabel[st.draft.os]} devices`} body={`~${fleetSize} devices today`} />
              <BigChoice selected={!st.draft.allDevices} onClick={() => st.set({ allDevices: false })} icon={Users} title="Some groups" body="Pick device groups below" />
            </div>
            <div className="space-y-1 rounded-xl border bg-card p-2">
              {deviceGroups.map((g) => {
                const inc = st.draft.includedTargets.includes(g)
                const exc = st.draft.excludedTargets.includes(g)
                return (
                  <div key={g} className="flex items-center gap-3 rounded-md px-2 py-1.5">
                    <span className="flex-1 text-sm">{g} <span className="text-xs text-muted-foreground">· {deviceCountOf(g)} devices</span></span>
                    {!st.draft.allDevices && (
                      <label className="flex items-center gap-1.5 text-xs">
                        <Checkbox checked={inc} disabled={exc} onCheckedChange={(v) => st.set({ includedTargets: v ? [...st.draft.includedTargets, g] : st.draft.includedTargets.filter((x) => x !== g) })} />Include
                      </label>
                    )}
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Checkbox checked={exc} disabled={inc} onCheckedChange={(v) => st.set({ excludedTargets: v ? [...st.draft.excludedTargets, g] : st.draft.excludedTargets.filter((x) => x !== g) })} />Exclude
                    </label>
                  </div>
                )
              })}
            </div>
          </Question>
        )}
        {q === 4 && (
          <Question title="Look right?" hint="Click any line to change it.">
            <div className="divide-y rounded-xl border bg-card">
              <ReviewLine label="Name" onClick={() => setQ(0)}>{st.draft.name}</ReviewLine>
              <ReviewLine label="Changes" onClick={() => setQ(2)}>
                {st.live.length ? <span className="flex flex-wrap gap-1">{st.live.map((k) => <SettingChip key={k} k={k} />)}</span> : <span className="text-amber-700">Nothing yet</span>}
              </ReviewLine>
              <ReviewLine label="Goes to" onClick={() => setQ(3)}>{st.reach.label}</ReviewLine>
            </div>
          </Question>
        )}
      </div>

      <PageFooter compact>
        <Button variant="ghost" onClick={back} disabled={pos === 0}><ArrowLeft className="size-4" />Back</Button>
        <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">Press Enter ↵ to continue</span>
        {q === 4
          ? <Button onClick={st.save} disabled={st.nameMissing}><Check className="size-4" />{st.existing ? 'Save changes' : 'Create profile'}</Button>
          : <Button onClick={next} disabled={q === 0 && st.nameMissing}>Continue<ArrowRight className="size-4" /></Button>}
      </PageFooter>

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
          <SheetHeader className="border-b px-6 py-4 text-left">
            <SheetTitle>{editing ? byKey(editing).label : ''}</SheetTitle>
            <SheetDescription>Fine-tune this setting.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">{editing && <PayloadEditor k={editing} st={st} />}</div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function Question({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{hint}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function BigChoice({ selected, onClick, icon: Icon, title, body }: { selected: boolean; onClick: () => void; icon: typeof Users; title: string; body: string }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onClick}
      className={cn('flex flex-col items-start gap-3 rounded-xl border bg-card p-5 text-left transition-colors', selected ? 'border-brand/50 ring-2 ring-brand/30' : 'hover:border-foreground/20')}>
      <span className={cn('flex size-10 items-center justify-center rounded-lg', selected ? 'bg-brand text-brand-foreground' : 'bg-secondary text-muted-foreground')}><Icon className="size-5" /></span>
      <span><span className="block font-medium">{title}</span><span className="block text-sm text-muted-foreground">{body}</span></span>
    </button>
  )
}

function ReviewLine({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-start gap-4 px-5 py-4 text-left hover:bg-secondary/50">
      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 text-sm font-medium">{children}</span>
      <Pencil className="size-4 text-muted-foreground" />
    </button>
  )
}

// ── V6 · Three columns ────────────────────────────────────────────────────

export function ConfigProfileV6() {
  const st = useProfileDraft()
  const [picking, setPicking] = useState<'included' | 'excluded' | null>(null)
  if (st.missing) return <Navigate to="/mdm/apple/profiles" replace />
  const d = st.draft

  return (
    <div className="flex flex-1 flex-col">
      <BuilderHeader st={st} />
      <div className="grid gap-4 lg:h-[calc(100svh-230px)] lg:grid-cols-[280px_1fr_320px]">
        <Column n={1} title="Details">
          <DescriptionField st={st} />
          {!st.existing && <><p className="pt-2 text-xs font-medium text-muted-foreground">Start from</p><TemplateGrid st={st} cols={1} /></>}
        </Column>
        <Column n={2} title="Settings" meta={`${st.live.length} on`}>
          <SettingsAccordion st={st} compact />
        </Column>
        <Column n={3} title="Assign" meta={st.reach.label}>
          <div className="inline-flex w-full rounded-lg bg-secondary p-0.5" role="radiogroup">
            {[[true, 'All devices'], [false, 'Some']].map(([v, l]) => (
              <button key={String(v)} type="button" role="radio" aria-checked={d.allDevices === v} onClick={() => st.set({ allDevices: v as boolean })}
                className={cn('flex-1 rounded-md py-1.5 text-sm', d.allDevices === v ? 'bg-card font-medium shadow-xs' : 'text-muted-foreground')}>{l as string}</button>
            ))}
          </div>
          <TargetColumn title="Include" icon={Users} tone="brand" items={d.allDevices ? [] : d.includedTargets}
            everyone={d.allDevices ? `All ${osLabel[d.os]} devices` : undefined} empty="Add who gets it."
            onAdd={() => setPicking('included')} onRemove={(t) => st.set({ includedTargets: d.includedTargets.filter((x) => x !== t) })} />
          <TargetColumn title="Exclude" icon={CircleSlash} tone="muted" items={d.excludedTargets} empty="No exclusions."
            onAdd={() => setPicking('excluded')} onRemove={(t) => st.set({ excludedTargets: d.excludedTargets.filter((x) => x !== t) })} />
        </Column>
      </div>
      {picking && (
        <TargetPicker side={picking} taken={[...d.includedTargets, ...d.excludedTargets]} onClose={() => setPicking(null)}
          onAdd={(p) => { st.set(picking === 'included' ? { includedTargets: [...d.includedTargets, ...p] } : { excludedTargets: [...d.excludedTargets, ...p] }); setPicking(null) }} />
      )}
    </div>
  )
}

function Column({ n, title, meta, children }: { n: number; title: string; meta?: string; children: React.ReactNode }) {
  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-secondary/30">
      <div className="flex items-center gap-2.5 border-b bg-card px-4 py-3">
        <span className="flex size-6 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-brand-foreground">{n}</span>
        <h2 className="flex-1 text-sm font-semibold">{title}</h2>
        {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">{children}</div>
    </section>
  )
}

// ── V7 · Table ────────────────────────────────────────────────────────────

export function ConfigProfileV7() {
  const st = useProfileDraft()
  const [q, setQ] = useState('')
  const [only, setOnly] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [picking, setPicking] = useState<'included' | 'excluded' | null>(null)
  if (st.missing) return <Navigate to="/mdm/apple/profiles" replace />
  const d = st.draft
  const rows = payloads.filter((p) => (p.label + p.blurb).toLowerCase().includes(q.trim().toLowerCase()) && (!only || st.added.includes(p.key)))
  const toggle = (k: string, v: boolean) => {
    if (!v) return st.removeSetting(k)
    st.addSetting(k)
    if (byKey(k).shape === 'list') setEditing(k)
  }

  return (
    <div className="flex flex-1 flex-col">
      <BuilderHeader st={st} />

      {/* Who it applies to — one line */}
      <Card className="mb-4 flex-row flex-wrap items-center gap-2 px-4 py-3">
        <span className="mr-1 text-sm font-medium">Applies to</span>
        {d.allDevices
          ? <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-sm text-brand">All {osLabel[d.os]} devices</span>
          : d.includedTargets.map((t) => <Pill key={t} onRemove={() => st.set({ includedTargets: d.includedTargets.filter((x) => x !== t) })}>{t}</Pill>)}
        {!d.allDevices && <Button size="sm" variant="ghost" onClick={() => setPicking('included')}><Plus className="size-4" />Include</Button>}
        {d.excludedTargets.map((t) => <Pill key={t} muted onRemove={() => st.set({ excludedTargets: d.excludedTargets.filter((x) => x !== t) })}>except {t}</Pill>)}
        <Button size="sm" variant="ghost" onClick={() => setPicking('excluded')}><CircleSlash className="size-4" />Exclude</Button>
        <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">All devices<Switch checked={d.allDevices} onCheckedChange={(v) => st.set({ allDevices: v })} aria-label="All devices" /></label>
      </Card>

      <Card className="gap-0 p-0">
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search settings" className="pl-9" aria-label="Search settings" />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground"><Switch checked={only} onCheckedChange={setOnly} aria-label="In this profile only" />In this profile only · {st.added.length}</label>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">In profile</TableHead>
              <TableHead>Setting</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => {
              const Icon = ICONS[p.key] ?? Settings2
              const inP = st.added.includes(p.key)
              return (
                <TableRow key={p.key} className={cn(!inP && 'text-muted-foreground')}>
                  <TableCell><Switch checked={inP} onCheckedChange={(v) => toggle(p.key, v)} aria-label={`Include ${p.label}`} /></TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2.5">
                      <Icon className="size-4 shrink-0" />
                      <span className="min-w-0"><span className={cn('block font-medium', inP && 'text-foreground')}>{p.label}</span><span className="block max-w-md truncate text-xs text-muted-foreground">{p.blurb}</span></span>
                    </span>
                  </TableCell>
                  <TableCell>{categoryOf(p.key)}</TableCell>
                  <TableCell>{inP ? <span className={cn('text-sm', st.isLive(p.key) ? 'text-foreground' : 'text-amber-700')}>{statusOf(st, p.key)}</span> : '—'}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon-sm" disabled={!inP} aria-label={`Edit ${p.label}`} onClick={() => setEditing(p.key)}><Pencil className="size-4" /></Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {!rows.length && <p className="py-10 text-center text-sm text-muted-foreground">No settings match.</p>}
      </Card>

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
          <SheetHeader className="border-b px-6 py-4 text-left">
            <SheetTitle>{editing ? byKey(editing).label : ''}</SheetTitle>
            <SheetDescription>{editing ? categoryOf(editing) : ''}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">{editing && <PayloadEditor k={editing} st={st} />}</div>
        </SheetContent>
      </Sheet>
      {picking && (
        <TargetPicker side={picking} taken={[...d.includedTargets, ...d.excludedTargets]} onClose={() => setPicking(null)}
          onAdd={(p) => { st.set(picking === 'included' ? { includedTargets: [...d.includedTargets, ...p] } : { excludedTargets: [...d.excludedTargets, ...p] }); setPicking(null) }} />
      )}
    </div>
  )
}

function Pill({ children, muted, onRemove }: { children: React.ReactNode; muted?: boolean; onRemove: () => void }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full py-0.5 pr-1 pl-2.5 text-sm', muted ? 'bg-secondary text-muted-foreground' : 'bg-brand/10 text-brand')}>
      {children}
      <button type="button" onClick={onRemove} aria-label={`Remove ${children}`} className="rounded-full p-0.5 hover:bg-black/5"><X className="size-3" /></button>
    </span>
  )
}
