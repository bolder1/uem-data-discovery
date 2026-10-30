// Form sections shared by every App Library surface: the Add app panel,
// the draft step panels, the scope drawer and the app's own page.
import { useId, useRef, useState } from 'react'
import {
  Info,
  Plus,
  Trash2,
  AlertTriangle,
  X,
  Search,
  FileUp,
  Link2,
  Library,
  CheckCircle2,
  Check,
  ChevronDown,
  Copy,
  Eye,
  FileText,
  ImageUp,
  Upload,
} from 'lucide-react'
import { DiscardChangesDialog, StatusDot } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  appStoreCatalog,
  attributeInfo,
  configVariables,
  countries,
  licensesFor,
  listedInSelfService,
  plistProblem,
  vppLicenses,
  type AppCategory,
  type AppSource,
  type InHouseBuild,
  type LibraryApp,
  type NotifyType,
  type Platform,
  type SelfService,
} from '@/data/apps'

type Set_ = (p: Partial<LibraryApp>) => void

/**
 * Side panels with edits ask before they close. Wire `requestClose` to the
 * Sheet's onOpenChange and Cancel button, and render `dialog` inside the panel.
 */
export function useConfirmClose(dirty: boolean, onClose: () => void) {
  const [asking, setAsking] = useState(false)
  return {
    requestClose: () => (dirty ? setAsking(true) : onClose()),
    dialog: <DiscardChangesDialog open={asking} onKeep={() => setAsking(false)} onDiscard={() => { setAsking(false); onClose() }} />,
  }
}

/** SheetContent onEscapeKeyDown: let an inline editor's Escape cancel the editor, not close the panel. */
export const keepInlineEscape = (e: KeyboardEvent) => {
  if ((e.target as HTMLElement | null)?.closest?.('[data-inline-escape]')) e.preventDefault()
}

/** iOS-style rounded icon. Real artwork when we have it, emoji fallback for in-house builds. */
export function AppIcon({ app, className }: { app: { icon: string; name?: string }; className?: string }) {
  const img = /^(https?:|blob:|data:)/.test(app.icon)
  return (
    <span className={cn('flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-[22%] border border-black/5 bg-muted text-lg shadow-xs', className)}>
      {img ? <img src={app.icon} alt="" loading="lazy" className="size-full object-cover" /> : app.icon}
    </span>
  )
}

const pillTone = {
  green: { dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  amber: { dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  red: { dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 border-red-200' },
  blue: { dot: 'bg-blue-500 animate-pulse', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  slate: { dot: 'bg-slate-400', badge: 'bg-slate-50 text-slate-600 border-slate-200' },
}

/** Status = dot + label, in the same pill shape as ConnectionStatusBadge. */
export function StatusPill({ tone, children }: { tone: keyof typeof pillTone; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium', pillTone[tone].badge)}>
      <StatusDot className={pillTone[tone].dot} />
      {children}
    </span>
  )
}

export function CategoryName({ category }: { category?: AppCategory }) {
  return category ? <span>{category.name}</span> : <span className="text-muted-foreground">—</span>
}

/** Pass the control's id as `htmlFor` so the label names it and clicking the label focuses it. */
export function Field({ label, htmlFor, hint, required, children }: { label: string; htmlFor?: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function Banner({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'success'; children: React.ReactNode }) {
  const Icon = tone === 'warn' ? AlertTriangle : tone === 'success' ? CheckCircle2 : Info
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-sm',
        tone === 'warn' && 'bg-amber-50 text-amber-900',
        tone === 'success' && 'bg-emerald-50 text-emerald-900',
        tone === 'info' && 'bg-primary/5 text-foreground',
      )}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', tone === 'info' && 'text-primary')} />
      <div>{children}</div>
    </div>
  )
}

export function SectionTitle({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="font-medium">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

function CategorySelect({ id, value, categories, onChange, onCreate }: { id?: string; value: string | null; categories: AppCategory[]; onChange: (id: string | null) => void; onCreate: (name: string) => string }) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const create = () => {
    if (!name.trim()) return
    onChange(onCreate(name.trim()))
    setCreating(false)
    setName('')
  }
  if (creating)
    return (
      <div className="flex gap-2">
        <Input id={id} autoFocus data-inline-escape placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') create(); if (e.key === 'Escape') setCreating(false) }} />
        <Button disabled={!name.trim()} onClick={create}>Create</Button>
        <Button variant="ghost" size="icon" aria-label="Cancel" onClick={() => setCreating(false)}><X className="size-4" /></Button>
      </div>
    )
  return (
    <Select value={value ?? 'none'} onValueChange={(v) => (v === '__new' ? setCreating(true) : onChange(v === 'none' ? null : v))}>
      <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No category</SelectItem>
        {categories.map((c) => <SelectItem key={c.id} value={c.id}><CategoryName category={c} /></SelectItem>)}
        <SelectSeparator />
        <SelectItem value="__new"><Plus className="size-4" />New category…</SelectItem>
      </SelectContent>
    </Select>
  )
}

export function LicenseBanner({ app }: { app: LibraryApp }) {
  const lic = licensesFor(app)
  if (!lic) return null
  return (
    <Banner tone={typeof lic.available === 'number' && lic.available < 5 ? 'warn' : 'info'}>
      Licensed through Apple Business Manager · {lic.available} of {lic.total} licenses available
    </Banner>
  )
}

/** Entry name, category, install type, license type, updates. */
export function GeneralForm({ draft, set, categories, onCreateCategory }: { draft: LibraryApp; set: Set_; categories: AppCategory[]; onCreateCategory: (n: string) => string }) {
  const id = useId()
  return (
    <div className="space-y-7">
      <div className="grid gap-x-5 gap-y-6 sm:grid-cols-2">
        <Field label="Entry name" htmlFor={`${id}-name`} required>
          <Input id={`${id}-name`} value={draft.name} onChange={(e) => set({ name: e.target.value })} aria-invalid={!draft.name.trim()} />
        </Field>
        <Field label="Category" htmlFor={`${id}-cat`}>
          <CategorySelect id={`${id}-cat`} value={draft.categoryId} categories={categories} onChange={(c) => set({ categoryId: c })} onCreate={onCreateCategory} />
        </Field>
        <Field label="Installation type" htmlFor={`${id}-install`} hint={draft.installType === 'Forced install' ? 'Installs automatically on devices in scope.' : 'Users install it from Self Service.'}>
          <Select value={draft.installType} onValueChange={(v) => set({ installType: v as LibraryApp['installType'] })}>
            <SelectTrigger id={`${id}-install`} className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Forced install">Forced install</SelectItem>
              <SelectItem value="Available">Available</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {draft.source === 'VPP' && (
          <Field label="License type" htmlFor={`${id}-license`} hint={{ Automatic: 'Device license by serial number.', Device: 'Device license.', User: 'Managed Apple ID license.' }[draft.licenseType]}>
            <Select value={draft.licenseType} onValueChange={(v) => set({ licenseType: v as LibraryApp['licenseType'] })}>
              <SelectTrigger id={`${id}-license`} className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Automatic">Automatic</SelectItem>
                <SelectItem value="Device">Device</SelectItem>
                <SelectItem value="User">User</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}
        <Field label="App updates" htmlFor={`${id}-updates`}>
          <Select value={draft.updatePolicy} onValueChange={(v) => set({ updatePolicy: v as LibraryApp['updatePolicy'] })}>
            <SelectTrigger id={`${id}-updates`} className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Automatic">Automatic</SelectItem>
              <SelectItem value="Prompt">Prompt user</SelectItem>
              <SelectItem value="Keep version">Don’t update</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  )
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}

/** Self Service preview — what users see. Jamf has none. */
export function SelfServicePreview({ draft, categories }: { draft: LibraryApp; categories: AppCategory[] }) {
  const ss = draft.selfService
  const cat = categories.find((c) => c.id === ss.displayIn[0])
  const forced = draft.installType === 'Forced install'
  const label = forced ? (draft.platform === 'macOS' ? 'Installed' : ss.reinstallButtonName || 'Reinstall') : ss.buttonName || 'Install'
  return (
    <div className="w-full max-w-[240px]">
      <div className="rounded-2xl border bg-card p-4 shadow-xs">
        {ss.featured && <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-primary">Featured</p>}
        <div className="flex items-center gap-3">
          <AppIcon app={{ icon: ss.icon ?? draft.icon }} className="size-12 rounded-xl text-2xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{draft.name || 'Untitled app'}</p>
            <p className="truncate text-xs text-muted-foreground">{cat?.name ?? 'Uncategorized'}</p>
          </div>
        </div>
        {ss.description && <p className="mt-3 line-clamp-3 text-xs text-muted-foreground">{ss.description}</p>}
        <span className="mt-3 block rounded-full bg-primary py-1.5 text-center text-xs font-semibold text-primary-foreground">{label}</span>
      </div>
    </div>
  )
}

function CopyLink({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <span className="w-28 shrink-0 text-sm">{label}</span>
      <code className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{url}</code>
      <Button variant="ghost" size="icon-sm" aria-label={`Copy ${label.toLowerCase()}`}
        onClick={() => { void navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>
        {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
      </Button>
    </div>
  )
}

/**
 * Jamf's Self Service tab, field for field. As in Jamf, iOS / iPadOS get a button
 * before and after install; macOS gets one button name, "view the description
 * first", Feature in and notifications. Forced installs are only listed after
 * they install, so everything else waits behind that switch.
 */
export function SelfServiceForm({ draft, set, categories }: { draft: LibraryApp; set: Set_; categories: AppCategory[] }) {
  const id = useId()
  const ss = draft.selfService
  const patch = (p: Partial<SelfService>) => set({ selfService: { ...ss, ...p } })
  const mac = draft.platform === 'macOS'
  const forced = draft.installType === 'Forced install'
  const listed = listedInSelfService(draft)
  const setIn = (key: 'displayIn' | 'featureIn', catId: string, on: boolean) => {
    const add = (l: string[]) => (l.includes(catId) ? l : [...l, catId])
    const drop = (l: string[]) => l.filter((x) => x !== catId)
    // Featuring in a category lists it there too; unlisting also unfeatures.
    if (key === 'featureIn') patch(on ? { featureIn: add(ss.featureIn), displayIn: add(ss.displayIn) } : { featureIn: drop(ss.featureIn) })
    else patch(on ? { displayIn: add(ss.displayIn) } : { displayIn: drop(ss.displayIn), featureIn: drop(ss.featureIn) })
  }
  const cols = mac ? 'grid-cols-[1fr_5.5rem_5.5rem]' : 'grid-cols-[1fr_5.5rem]'
  const [preview, setPreview] = useState(false)

  return (
    <div className="@container">
      <div>
        <div className="min-w-0 space-y-7">
          {forced && (
            <div className="rounded-lg border px-4 py-3">
              <ToggleRow label="Show in Self Service after it installs" hint="Forced installs aren't offered for install."
                checked={ss.showAfterInstall} onChange={(v) => patch({ showAfterInstall: v })} />
            </div>
          )}
          {listed && (
            <div className="overflow-hidden rounded-lg border">
              <button type="button" aria-expanded={preview} onClick={() => setPreview((v) => !v)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted/60">
                <Eye className="size-4 text-muted-foreground" />Preview in Self Service
                <ChevronDown className={cn('ml-auto size-4 text-muted-foreground transition-transform', preview && 'rotate-180')} />
              </button>
              {preview && (
                <div className="flex justify-center border-t bg-muted/40 px-4 py-5">
                  <SelfServicePreview draft={draft} categories={categories} />
                </div>
              )}
            </div>
          )}

          {listed && (
            <>
              <section className="space-y-4">
                <Field label="Description" htmlFor={`${id}-desc`}>
                  <Textarea id={`${id}-desc`} rows={3} value={ss.description} placeholder="Shown to users in Self Service"
                    onChange={(e) => patch({ description: e.target.value })} />
                </Field>
                <div className="flex items-center gap-3">
                  <AppIcon app={{ icon: ss.icon ?? draft.icon }} className="size-11" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Icon</p>
                    <p className="text-xs text-muted-foreground">{ss.icon ? 'Custom' : 'From the App Store'}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild className="cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
                    <label>
                      <ImageUp className="size-4" />Replace
                      <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) patch({ icon: URL.createObjectURL(f) })
                      }} />
                    </label>
                  </Button>
                  {ss.icon && <Button variant="ghost" size="sm" onClick={() => patch({ icon: null })}>Reset</Button>}
                </div>
                {mac && (
                  <ToggleRow label="Users must view the description first" checked={ss.forceDescription} onChange={(v) => patch({ forceDescription: v })} />
                )}
              </section>

              <section className="space-y-3">
                <SectionTitle title="Buttons" />
                <div className="grid gap-4 @sm:grid-cols-2">
                  <Field label={mac ? 'Button name' : 'Before install'} htmlFor={`${id}-btn`}>
                    <Input id={`${id}-btn`} value={ss.buttonName} placeholder="Install" onChange={(e) => patch({ buttonName: e.target.value })} />
                  </Field>
                  {!mac && (
                    <Field label="After install" htmlFor={`${id}-btn2`}>
                      <Input id={`${id}-btn2`} value={ss.reinstallButtonName} placeholder="Reinstall" onChange={(e) => patch({ reinstallButtonName: e.target.value })} />
                    </Field>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <SectionTitle title="Categories" />
                <div className="divide-y">
                  <ToggleRow label="Featured" hint="Shown on the Self Service home" checked={ss.featured} onChange={(v) => patch({ featured: v })} />
                  <ToggleRow label="Compliance" hint={mac ? undefined : 'Needs Device Compliance for iOS'} checked={ss.compliance} onChange={(v) => patch({ compliance: v })} />
                </div>
                {categories.length > 0 ? (
                  <div className="overflow-hidden rounded-lg border text-sm">
                    <div className={cn('grid gap-x-4 bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground', cols)}>
                      <span>Category</span><span>Display in</span>{mac && <span>Feature in</span>}
                    </div>
                    {categories.map((c) => (
                      <div key={c.id} className={cn('grid items-center gap-x-4 border-t px-3 py-2', cols)}>
                        <CategoryName category={c} />
                        <Checkbox aria-label={`Display in ${c.name}`} checked={ss.displayIn.includes(c.id)} onCheckedChange={(v) => setIn('displayIn', c.id, v === true)} />
                        {mac && <Checkbox aria-label={`Feature in ${c.name}`} checked={ss.featureIn.includes(c.id)} onCheckedChange={(v) => setIn('featureIn', c.id, v === true)} />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No categories yet.</p>
                )}
              </section>

              {mac && (
                <section className="space-y-3">
                  <SectionTitle title="Notifications" />
                  <ToggleRow label="Notify users" hint="When the app is available" checked={ss.notify} onChange={(v) => patch({ notify: v })} />
                  {ss.notify && (
                    <div className="space-y-4 rounded-lg border p-4">
                      <Field label="Show in" htmlFor={`${id}-ntype`}>
                        <Select value={ss.notifyType} onValueChange={(v) => patch({ notifyType: v as NotifyType })}>
                          <SelectTrigger id={`${id}-ntype`} className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Self Service">Self Service</SelectItem>
                            <SelectItem value="Self Service and Notification Center">Self Service and Notification Center</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Subject" htmlFor={`${id}-nsub`}>
                        <Input id={`${id}-nsub`} value={ss.notifySubject} placeholder={draft.name} onChange={(e) => patch({ notifySubject: e.target.value })} />
                      </Field>
                      <Field label="Message" htmlFor={`${id}-nmsg`}>
                        <Textarea id={`${id}-nmsg`} rows={2} value={ss.notifyMessage} placeholder="Now available in Self Service" onChange={(e) => patch({ notifyMessage: e.target.value })} />
                      </Field>
                    </div>
                  )}
                </section>
              )}

              {draft.status === 'Published' && (
                <section className="space-y-3">
                  <SectionTitle title="App links" />
                  <div className="divide-y rounded-lg border">
                    <CopyLink label="Install link" url={`selfservice://content?entity=app&id=${draft.id}&action=install`} />
                    <CopyLink label="Description link" url={`selfservice://content?entity=app&id=${draft.id}&action=view`} />
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function AttributesForm({ draft, set }: { draft: LibraryApp; set: Set_ }) {
  return (
    <div className="divide-y">
      {attributeInfo.map((a) => (
        <ToggleRow key={a.key} label={a.label} hint={a.hint} checked={draft.attributes[a.key]}
          onChange={(v) => {
            const next = { ...draft.attributes, [a.key]: v }
            if (a.key === 'hideable' && v) next.lockable = true // hideable apps are also lockable
            set({ attributes: next })
          }} />
      ))}
    </div>
  )
}

export function DomainsForm({ draft, set }: { draft: LibraryApp; set: Set_ }) {
  const [domain, setDomain] = useState('')
  const add = () => {
    const d = domain.trim()
    if (!d || draft.associatedDomains.includes(d) || draft.associatedDomains.length >= 50) return
    set({ associatedDomains: [...draft.associatedDomains, d] })
    setDomain('')
  }
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input placeholder="applinks:example.com" value={domain} onChange={(e) => setDomain(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <Button variant="outline" onClick={add} disabled={!domain.trim()}><Plus className="size-4" />Add</Button>
      </div>
      <p className="text-xs tabular-nums text-muted-foreground">{draft.associatedDomains.length} / 50</p>
      {draft.associatedDomains.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No domains added yet</p>
      ) : (
        <ul className="space-y-2">
          {draft.associatedDomains.map((d) => (
            <li key={d} className="flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2 text-sm">
              <span className="flex-1 font-mono text-xs">{d}</span>
              <Button variant="ghost" size="icon-sm" aria-label={`Remove ${d}`} onClick={() => set({ associatedDomains: draft.associatedDomains.filter((x) => x !== d) })}><Trash2 className="size-4" /></Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Managed app configuration, as in Jamf: one plist of preferences per app.
 * Type or paste it, or upload / drop a .plist. An upload lands in the same
 * editor, so what was loaded can be read and adjusted before saving.
 */
export function ConfigForm({ draft, set }: { draft: LibraryApp; set: Set_ }) {
  const id = useId()
  const area = useRef<HTMLTextAreaElement>(null)
  const [dragging, setDragging] = useState(false)
  const plist = draft.config?.plist ?? ''
  const problem = plistProblem(plist)
  const write = (text: string, fileName = draft.config?.fileName) => set({ config: text.trim() ? { plist: text, fileName } : null })
  const load = async (file?: File | null) => { if (file) write(await file.text(), file.name) }
  // Variables go in at the cursor; into an empty editor they arrive inside a starter <dict>.
  const insert = (v: string) => {
    const el = area.current
    if (!plist) { write(`<dict>\n  <key></key>\n  <string>${v}</string>\n</dict>`); return }
    const start = el?.selectionStart ?? plist.length
    const end = el?.selectionEnd ?? plist.length
    write(plist.slice(0, start) + v + plist.slice(end))
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + v.length, start + v.length) })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={`${id}-plist`}>Preferences (plist)</Label>
        <div className="flex items-center gap-1">
          {plist && <Button variant="ghost" size="sm" onClick={() => write('', undefined)}>Clear</Button>}
          <Button variant="outline" size="sm" asChild className="cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
            <label>
              <Upload className="size-4" />Upload .plist
              <input type="file" accept=".plist,.xml,application/xml,text/xml" className="sr-only"
                onChange={(e) => { void load(e.target.files?.[0]); e.target.value = '' }} />
            </label>
          </Button>
        </div>
      </div>

      <div className={cn('relative rounded-md', dragging && 'ring-2 ring-primary ring-offset-2')}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void load(e.dataTransfer.files?.[0]) }}>
        <Textarea ref={area} id={`${id}-plist`} rows={12} spellCheck={false} aria-invalid={!!problem} value={plist}
          onChange={(e) => write(e.target.value)} className="min-h-56 font-mono text-xs leading-relaxed"
          placeholder={'<dict>\n  <key>ServerURL</key>\n  <string>https://mail.acme.com</string>\n</dict>\n\nType, paste or drop a .plist file'} />
        {dragging && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-primary/10 text-sm font-medium text-primary">
            Drop to load
          </div>
        )}
      </div>

      {problem ? (
        <p className="text-xs text-destructive">{problem}</p>
      ) : draft.config?.fileName ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><FileText className="size-3.5" />Loaded from {draft.config.fileName}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Insert variable</span>
        {configVariables.map((v) => (
          <button key={v} type="button" onClick={() => insert(v)}
            className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary hover:bg-primary/20">
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------- Choosing the app (first step of Add app) ----------

export type SourceKey = 'store' | 'vpp' | 'inhouse'
export interface PickedApp {
  name: string
  bundleId: string
  publisher: string
  version: string
  icon: string
  platform: Platform
  source: AppSource
  country: string
}

export const sources: { key: SourceKey; label: string; hint: string }[] = [
  { key: 'store', label: 'App Store', hint: 'Public apps' },
  { key: 'vpp', label: 'VPP', hint: 'Apple Business Manager' },
  { key: 'inhouse', label: 'In-house', hint: 'Enterprise .ipa' },
]

function PickRow({ item, selected, onPick, meta }: { item: { name: string; publisher: string; icon: string }; selected: boolean; onPick: () => void; meta?: React.ReactNode }) {
  return (
    <button type="button" onClick={onPick} aria-pressed={selected}
      className={cn('flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60', selected && 'bg-primary/5')}>
      <AppIcon app={item} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{item.name}</span>
        <span className="block truncate text-xs text-muted-foreground">{item.publisher}</span>
      </span>
      {meta}
      <span className={cn('rounded-md px-2.5 py-1 text-xs font-medium', selected ? 'border border-primary text-primary' : 'bg-primary text-primary-foreground')}>
        {selected ? 'Selected' : 'Select'}
      </span>
    </button>
  )
}

/**
 * One picker for every source and every Apple platform — Jamf splits this
 * across Computers → Mac apps and Mobile devices → Mobile device apps.
 */
export function AppPicker({ source, onSource, value, onPick, builds, existing }: {
  source: SourceKey
  onSource: (s: SourceKey) => void
  value: PickedApp | null
  onPick: (p: PickedApp | null) => void
  builds: InHouseBuild[]
  existing: LibraryApp[]
}) {
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState('US')
  const [platform, setPlatform] = useState<Platform>('iOS')
  const [via, setVia] = useState<'library' | 'upload' | 'manifest'>('library')
  const [manifest, setManifest] = useState('')
  const id = useId()
  const q = query.trim().toLowerCase()
  const match = (s: { name: string; bundleId: string }) => !q || `${s.name} ${s.bundleId}`.toLowerCase().includes(q)
  const inLibrary = (bundleId: string) => existing.some((a) => a.bundleId === bundleId && a.platform === platform)
  const libraryTag = <span className="shrink-0 text-xs text-muted-foreground">In library</span>
  const pick = (p: Omit<PickedApp, 'country'>) => onPick({ ...p, country })

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="App source">
        {sources.map((s) => (
          <button key={s.key} type="button" role="radio" aria-checked={source === s.key}
            onClick={() => { onSource(s.key); onPick(null); setQuery('') }}
            className={cn('rounded-lg border p-3 text-left transition-colors', source === s.key ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/60')}>
            <span className="block text-sm font-medium">{s.label}</span>
            <span className="block text-xs text-muted-foreground">{s.hint}</span>
          </button>
        ))}
      </div>

      {source !== 'inhouse' && (
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or bundle ID" className="pl-9" />
          </div>
          <Select value={platform} onValueChange={(v) => { setPlatform(v as Platform); onPick(null) }}>
            <SelectTrigger className="w-28" aria-label="Platform"><SelectValue /></SelectTrigger>
            <SelectContent>{(['iOS', 'iPadOS', 'macOS'] as Platform[]).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
          {source === 'store' && (
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="w-20" aria-label="App Store country"><SelectValue /></SelectTrigger>
              <SelectContent>{countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
      )}

      {source === 'store' && (
        <div className="rounded-lg border">
          <p className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">{q ? 'Results' : 'Popular'}</p>
          <div className="divide-y">
            {appStoreCatalog.filter(match).map((a) => (
              <PickRow key={a.bundleId} item={a} selected={value?.bundleId === a.bundleId} meta={inLibrary(a.bundleId) && libraryTag}
                onPick={() => pick({ ...a, platform, source: 'App Store' })} />
            ))}
            {!appStoreCatalog.filter(match).length && <p className="p-4 text-sm text-muted-foreground">No apps match “{query}”.</p>}
          </div>
        </div>
      )}

      {source === 'vpp' && (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/60">
                <TableHead>App name</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vppLicenses.filter((l) => l.platforms.includes(platform)).filter(match).map((l) => {
                const none = l.available === 0
                const sel = value?.bundleId === l.bundleId
                return (
                  <TableRow key={l.bundleId} className={cn('cursor-pointer', sel && 'bg-primary/5', none && 'opacity-50')}
                    onClick={() => !none && pick({ ...l, platform, source: 'VPP' })}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <input type="radio" readOnly checked={sel} disabled={none} className="accent-primary" aria-label={`Select ${l.name}`} />
                        <AppIcon app={l} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{l.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{l.bundleId}{inLibrary(l.bundleId) && ' · In library'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={cn('tabular-nums', typeof l.available === 'number' && l.available < 5 && 'font-medium text-amber-700')}>{l.available}</TableCell>
                    <TableCell className="tabular-nums">{l.total}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {source === 'inhouse' && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {([['library', 'From library', Library], ['upload', 'Upload .ipa', FileUp], ['manifest', 'Manifest URL', Link2]] as const).map(([k, label, Icon]) => (
              <button key={k} type="button" aria-pressed={via === k} onClick={() => { setVia(k); onPick(null) }}
                className={cn('flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium', via === k ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted/60')}>
                <Icon className="size-4" />{label}
              </button>
            ))}
          </div>
          {via === 'library' && (
            <div className="divide-y rounded-lg border">
              {builds.filter((b) => b.status === 'Ready' && b.bundleId).map((b) => (
                <PickRow key={b.id} selected={value?.bundleId === b.bundleId}
                  item={{ name: b.name, publisher: `${b.bundleId} · ${b.version}`, icon: b.icon }}
                  onPick={() => pick({ name: b.name, bundleId: b.bundleId!, publisher: 'In-house', version: b.version!, icon: b.icon, platform: 'iOS', source: 'In-house' })} />
              ))}
            </div>
          )}
          {via === 'upload' && (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center hover:bg-muted/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2">
              <FileUp className="size-8 text-primary" />
              <span className="text-sm font-medium">Drop an .ipa file, or click to browse</span>

              {/* ponytail: fake parse — real build reads Info.plist from the .ipa */}
              <input type="file" accept=".ipa" className="sr-only" onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const base = f.name.replace(/\.ipa$/i, '')
                pick({ name: base, bundleId: `com.miniorange.${base.toLowerCase().replace(/[^a-z0-9]/g, '')}`, publisher: 'In-house', version: '1.0.0', icon: '📦', platform: 'iOS', source: 'In-house' })
              }} />
            </label>
          )}
          {via === 'manifest' && (
            <Field label="Manifest URL" htmlFor={`${id}-manifest`} hint="HTTPS link to a .plist">
              <Input id={`${id}-manifest`} placeholder="https://apps.example.com/manifest.plist" value={manifest} onChange={(e) => {
                setManifest(e.target.value)
                const ok = /^https:\/\/.+\.plist$/i.test(e.target.value.trim())
                onPick(ok ? { name: 'Manifest app', bundleId: 'com.example.manifest', publisher: 'In-house', version: '1.0', icon: '🔗', platform: 'iOS', source: 'In-house', country: 'US' } : null)
              }} />
            </Field>
          )}
        </>
      )}
    </div>
  )
}
