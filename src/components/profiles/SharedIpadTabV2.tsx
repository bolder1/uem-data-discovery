// Shared iPad tab, V2 ("guided"). Same settings as V1, ordered by how an admin
// decides them:
//   1. Who owns the iPads.
//   2. How people use them — sign in with their account, or guest only.
//      This one choice decides which other fields exist, so it comes first.
//   3. How the space is split — fit N people, or a fixed size each.
//      (Number of users and storage quota cancel each other out, so it's one choice.)
//   4. Timers — every timeout as quick presets, with Custom for exact values.
// A summary line on top says, in plain words, what the iPads will do.
import { useState } from 'react'
import { AtSign, HardDrive, KeyRound, LogIn, Timer, UserRound, Users, X } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { users } from '@/data/directory'
import type { SharedIpadSettings, Timed } from '@/data/profiles'

type Patch = (p: Partial<SharedIpadSettings>) => void

/** Quick timer choices. `null` = off. */
const PRESETS: { label: string; v: Pick<Timed, 'value' | 'unit'> | null }[] = [
  { label: 'Off', v: null },
  { label: '30 sec', v: { value: '30', unit: 'seconds' } },
  { label: '1 min', v: { value: '1', unit: 'minutes' } },
  { label: '5 min', v: { value: '5', unit: 'minutes' } },
  { label: '15 min', v: { value: '15', unit: 'minutes' } },
]

/** Rough storage per person on a 64 GB iPad, after ~14 GB of system. */
export const perPersonGb = (n: number) => (n > 0 ? Math.max(1, Math.floor(50 / n)) : 0)
export const timedText = (t: Timed) => `${t.value} ${t.unit === 'seconds' ? 'sec' : 'min'}`

export function SharedIpadTabV2({ value: s, onChange: set }: { value: SharedIpadSettings; onChange: Patch }) {
  const owners = s.owner && !users.some((u) => u.email === s.owner) ? [s.owner, ...users.map((u) => u.email)] : users.map((u) => u.email)
  const people = Number(s.userCount) || 0

  // One sentence that reads back the choices.
  const summary = [
    s.guestOnly ? 'Anyone can use a guest session; everything is wiped at sign-out' : `People sign in with ${s.signInDomain ? `@${s.signInDomain}` : 'their Managed Apple'} accounts`,
    s.quotaOn ? (s.quotaMb ? `${s.quotaMb} MB each` : 'fixed space each') : !s.guestOnly && people ? `room for ${people} ${people === 1 ? 'person' : 'people'}` : null,
    s.autoLock.on && s.autoLock.value ? `locks after ${timedText(s.autoLock)}` : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="space-y-5">
      {/* On/off */}
      <div className={cn('rounded-xl border p-4 transition-colors', s.enabled && 'border-brand/30 bg-brand/5')}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', s.enabled ? 'bg-brand/10 text-brand' : 'bg-secondary text-muted-foreground')}><Users className="size-5" /></span>
            <div>
              <h3 className="font-medium">Shared iPad</h3>
              <p className="text-sm text-muted-foreground">Several people use the same iPad, each with their own data.</p>
            </div>
          </div>
          <Switch checked={s.enabled} onCheckedChange={(v) => set({ enabled: v })} aria-label="Enable Shared iPad" />
        </div>
        {s.enabled && <p className="mt-3 border-t border-brand/20 pt-3 text-sm">{summary}.</p>}
      </div>

      {!s.enabled ? (
        <p className="px-1 text-sm text-muted-foreground">Off — each iPad belongs to one person. Turn on to share iPads between people, like store or classroom devices.</p>
      ) : (
        <>
          {/* 1 · Owner */}
          <Step n={1} icon={UserRound} title="Who owns these iPads" lead="This account manages the iPads and gets their alerts.">
            <Select value={s.owner} onValueChange={(v) => set({ owner: v })}>
              <SelectTrigger className={cn('w-full', !s.owner && 'border-amber-400')} aria-label="Device owner"><SelectValue placeholder="Choose the device owner (required)" /></SelectTrigger>
              <SelectContent className="max-h-72">{owners.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </Step>

          {/* 2 · How people use them */}
          <Step n={2} icon={LogIn} title="How do people use them?" lead="This decides which of the settings below apply.">
            <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Session type">
              <Card2 selected={!s.guestOnly} onSelect={() => set({ guestOnly: false })} title="They sign in" body="Each person uses their Managed Apple Account. Their data stays on the iPad." />
              <Card2 selected={s.guestOnly} onSelect={() => set({ guestOnly: true })} title="Guest sessions only" body="No sign-in. Everything is wiped when the guest signs out." badge="iPadOS 14.5+" />
            </div>
            {!s.guestOnly && (
              <div className="space-y-4 pt-1">
                <Field label="Sign-in domain" badge="iPadOS 16+" note={s.signInDomain ? <>People type only their name — e.g. <span className="font-medium text-foreground">priya</span>@{s.signInDomain}</> : 'Filled in after the @, so people type only their name.'}>
                  <div className="flex items-center rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring/40">
                    <AtSign className="ml-3 size-4 text-muted-foreground" />
                    <input value={s.signInDomain} onChange={(e) => set({ signInDomain: e.target.value.replace(/^@/, '') })} placeholder="company.com" aria-label="Sign-in domain"
                      className="h-9 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" />
                  </div>
                </Field>
                <Field label="Who can sign in" badge="iPadOS 17+" note={s.allowedUsers.length ? `Only these ${s.allowedUsers.length} can sign in.` : 'Empty = anyone in your organization.'}>
                  <EmailChips value={s.allowedUsers} onChange={(v) => set({ allowedUsers: v })} />
                </Field>
              </div>
            )}
          </Step>

          {/* 3 · Space */}
          <Step n={3} icon={HardDrive} title="How to split the iPad's space" lead="Pick one — they can't both apply.">
            <div className="grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Storage split">
              <Card2 selected={!s.quotaOn} onSelect={() => set({ quotaOn: false })} disabled={s.guestOnly}
                title="Fit a number of people" body={s.guestOnly ? 'Guest sessions keep no data between people.' : 'The iPad divides its space evenly.'} badge="iPadOS 13.4+" />
              <Card2 selected={s.quotaOn} onSelect={() => set({ quotaOn: true })} title="Fixed space per person" body="Each person gets the same set amount." badge="iPadOS 13.4+" />
            </div>
            {!s.quotaOn && !s.guestOnly && (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Stepper value={people} onChange={(n) => set({ userCount: String(n) })} label="Number of people" />
                <span className="text-sm text-muted-foreground">{people ? <>about <span className="font-medium text-foreground">{perPersonGb(people)} GB</span> each on a 64 GB iPad</> : 'Set at least 1.'}</span>
              </div>
            )}
            {s.quotaOn && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {[2048, 4096, 8192].map((mb) => (
                  <Chip key={mb} on={s.quotaMb === String(mb)} onClick={() => set({ quotaMb: String(mb) })}>{mb / 1024} GB</Chip>
                ))}
                <div className="flex items-center gap-1.5">
                  <Input type="number" min={1} value={s.quotaMb} onChange={(e) => set({ quotaMb: e.target.value })} placeholder="Custom" className="h-8 w-28" aria-label="Quota per person in MB" />
                  <span className="text-sm text-muted-foreground">MB</span>
                </div>
              </div>
            )}
          </Step>

          {/* 4 · Timers */}
          <Step n={4} icon={Timer} title="Timers" lead="When the iPad signs people out or locks itself.">
            <div className="divide-y rounded-lg border">
              {s.guestOnly
                ? <TimerRow label="Sign the guest out after" badge="iPadOS 14.5+" value={s.guestTimeout} onChange={(v) => set({ guestTimeout: v })} />
                : <TimerRow label="Sign people out after" badge="iPadOS 14.5+" value={s.userTimeout} onChange={(v) => set({ userTimeout: v })} />}
              <TimerRow label="Lock the screen after" badge="iPadOS 17+" value={s.autoLock} onChange={(v) => set({ autoLock: v })} />
              <TimerRow label="Ask for the passcode after" badge="iPadOS 17+" icon={KeyRound} value={s.passcodeAfterLock} onChange={(v) => set({ passcodeAfterLock: v })} disabled={!s.autoLock.on} disabledNote="Turn on screen lock first." />
            </div>
          </Step>
        </>
      )}
    </div>
  )
}

// ── Pieces ────────────────────────────────────────────────────────────────

function Step({ n, icon: Icon, title, lead, children }: { n: number; icon: typeof Users; title: string; lead: string; children: React.ReactNode }) {
  return (
    <section className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-card text-xs font-semibold text-muted-foreground">{n}</span>
        <span className="mt-1 w-px flex-1 bg-border" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-3 pb-2">
        <div>
          <h4 className="flex items-center gap-1.5 text-sm font-semibold"><Icon className="size-4 text-muted-foreground" />{title}</h4>
          <p className="text-xs text-muted-foreground">{lead}</p>
        </div>
        {children}
      </div>
    </section>
  )
}

function Card2({ selected, onSelect, title, body, badge, disabled }: { selected: boolean; onSelect: () => void; title: string; body: string; badge?: string; disabled?: boolean }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onSelect} disabled={disabled}
      className={cn('flex gap-3 rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        selected ? 'border-brand/50 bg-brand/5 ring-1 ring-brand/30' : 'enabled:hover:border-foreground/20 enabled:hover:bg-secondary/40')}>
      <span className={cn('mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border', selected ? 'border-brand' : 'border-input')}>
        {selected && <span className="size-2 rounded-full bg-brand" />}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
          {title}
          {badge && <span className="rounded border px-1 text-[10px] font-normal text-muted-foreground">{badge}</span>}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{body}</span>
      </span>
    </button>
  )
}

function Field({ label, badge, note, children }: { label: string; badge?: string; note?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-sm font-medium">{label}{badge && <span className="rounded border px-1 text-[10px] font-normal text-muted-foreground">{badge}</span>}</p>
      {children}
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  )
}

export function Chip({ on, onClick, disabled, children }: { on: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={on}
      className={cn('h-8 rounded-full border px-3 text-sm transition-colors disabled:opacity-40',
        on ? 'border-brand/50 bg-brand/10 font-medium text-brand' : 'text-muted-foreground enabled:hover:bg-secondary enabled:hover:text-foreground')}>
      {children}
    </button>
  )
}

/** − n + control for small counts. */
export function Stepper({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="inline-flex h-9 items-center rounded-md border" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} className="h-full px-3 text-muted-foreground hover:bg-secondary" aria-label="Fewer">−</button>
      <input value={value || ''} onChange={(e) => onChange(Math.max(0, Number(e.target.value.replace(/\D/g, '')) || 0))} inputMode="numeric" aria-label={label}
        className="h-full w-12 border-x bg-transparent text-center text-sm tabular-nums outline-none" />
      <button type="button" onClick={() => onChange(value + 1)} className="h-full px-3 text-muted-foreground hover:bg-secondary" aria-label="More">+</button>
    </div>
  )
}

/** A timer as preset chips; "Custom" reveals an exact value + unit. */
export function TimerRow({ label, badge, value, onChange, disabled, disabledNote, icon: Icon = Timer }: {
  label: string; badge: string; value: Timed; onChange: (v: Timed) => void; disabled?: boolean; disabledNote?: string; icon?: typeof Timer
}) {
  const matchIdx = PRESETS.findIndex((p) => (p.v === null ? !value.on : value.on && p.v.value === value.value && p.v.unit === value.unit))
  const [custom, setCustom] = useState(value.on && matchIdx === -1)
  const isCustom = custom || (value.on && matchIdx === -1)
  return (
    <div className={cn('space-y-2 px-3 py-3', disabled && 'opacity-60')}>
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Icon className="size-3.5 text-muted-foreground" />{label}
        <span className="rounded border px-1 text-[10px] font-normal text-muted-foreground">{badge}</span>
      </p>
      {disabled && disabledNote && <p className="text-xs text-muted-foreground">{disabledNote}</p>}
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((p, i) => (
          <Chip key={p.label} disabled={disabled} on={!isCustom && matchIdx === i}
            onClick={() => { setCustom(false); onChange(p.v ? { on: true, ...p.v } : { ...value, on: false }) }}>
            {p.label}
          </Chip>
        ))}
        <Chip disabled={disabled} on={isCustom} onClick={() => { setCustom(true); onChange({ ...value, on: true }) }}>Custom</Chip>
        {isCustom && !disabled && (
          <span className="flex items-center gap-1.5">
            <Input type="number" min={1} value={value.value} onChange={(e) => onChange({ ...value, value: e.target.value })} className="h-8 w-20" aria-label={`${label} value`} autoFocus />
            <Select value={value.unit} onValueChange={(u) => onChange({ ...value, unit: u as Timed['unit'] })}>
              <SelectTrigger size="sm" className="w-[104px]" aria-label={`${label} unit`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="seconds">seconds</SelectItem>
                <SelectItem value="minutes">minutes</SelectItem>
              </SelectContent>
            </Select>
          </span>
        )}
      </div>
    </div>
  )
}

/** Emails as removable chips; Enter or comma adds, suggestions come from the directory. */
export function EmailChips({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState('')
  const add = () => {
    const t = text.trim().replace(/,$/, '')
    if (t && !value.includes(t)) onChange([...value, t])
    setText('')
  }
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring/40">
      {value.map((e) => (
        <span key={e} className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs">
          {e}
          <button type="button" aria-label={`Remove ${e}`} onClick={() => onChange(value.filter((x) => x !== e))} className="text-muted-foreground hover:text-foreground"><X className="size-3" /></button>
        </span>
      ))}
      <input list="shared-ipad-users-v2" value={text} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
          if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1))
        }}
        onBlur={add} placeholder={value.length ? 'Add another' : 'Type an email or pick a person'}
        className="min-w-40 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" aria-label="Add a person who can sign in" />
      <datalist id="shared-ipad-users-v2">{users.slice(0, 60).map((u) => <option key={u.id} value={u.email}>{u.name}</option>)}</datalist>
    </div>
  )
}
