// Shared iPad tab — five more single-form designs (V3–V7), each a different take
// on "less text, clearer form". All edit the same SharedIpadSettings, so you can
// flip between them from the Design dropdown without losing values.
//   V3 Settings list — dense grouped rows, like iPadOS Settings.
//   V4 Tiles         — every setting shows its value; click a tile to change it.
//   V5 Live preview  — compact form beside an iPad that reflects the choices.
//   V6 Sentence      — the whole form reads as one paragraph with blanks.
//   V7 Presets       — pick a ready setup, then adjust only what differs.
import { useState } from 'react'
import {
  AtSign, Check, ChevronDown, HardDrive, Lock, LogIn, Store, Timer, UserRound, Users, UsersRound, MonitorSmartphone, Pencil,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { users } from '@/data/directory'
import type { SharedIpadSettings, Timed } from '@/data/profiles'
import { Chip, EmailChips, Stepper, perPersonGb, timedText } from './SharedIpadTabV2'

type Props = { value: SharedIpadSettings; onChange: (p: Partial<SharedIpadSettings>) => void }

// ── Shared bits ───────────────────────────────────────────────────────────

const ownerList = (cur: string) => (cur && !users.some((u) => u.email === cur) ? [cur, ...users.map((u) => u.email)] : users.map((u) => u.email))

function OwnerSelect({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn('w-full', !value && 'border-amber-400', className)} aria-label="Device owner"><SelectValue placeholder="Choose owner" /></SelectTrigger>
      <SelectContent className="max-h-72">{ownerList(value).map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
    </Select>
  )
}

/** Timer as one dropdown: Off or a common duration. Values not in the list show as-is. */
const TIMER_OPTS: [string, Timed | null][] = [
  ['off', null], ['30s', { on: true, value: '30', unit: 'seconds' }], ['1m', { on: true, value: '1', unit: 'minutes' }],
  ['2m', { on: true, value: '2', unit: 'minutes' }], ['5m', { on: true, value: '5', unit: 'minutes' }],
  ['15m', { on: true, value: '15', unit: 'minutes' }], ['30m', { on: true, value: '30', unit: 'minutes' }],
]
const timerKey = (t: Timed) => (!t.on ? 'off' : `${t.value}${t.unit === 'seconds' ? 's' : 'm'}`)

function TimerSelect({ value, onChange, label, className, size = 'default', disabled }: { value: Timed; onChange: (t: Timed) => void; label: string; className?: string; size?: 'sm' | 'default'; disabled?: boolean }) {
  const k = timerKey(value)
  const known = TIMER_OPTS.some(([o]) => o === k)
  return (
    <Select value={k} disabled={disabled} onValueChange={(v) => { const t = TIMER_OPTS.find(([o]) => o === v)?.[1]; onChange(t ?? { ...value, on: false }) }}>
      <SelectTrigger size={size} className={cn('w-[120px]', className)} aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent>
        {!known && <SelectItem value={k}>{timedText(value)}</SelectItem>}
        {TIMER_OPTS.map(([o, t]) => <SelectItem key={o} value={o}>{t ? timedText(t) : 'Never'}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

/** Small "iPadOS 17+" marker. */
const Os = ({ v }: { v: string }) => <span className="rounded border px-1 text-[10px] leading-4 text-muted-foreground">{v}</span>

/** The on/off header every version shares, kept to one line. */
function MasterRow({ s, set, children }: { s: SharedIpadSettings; set: Props['onChange']; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', s.enabled ? 'bg-brand text-brand-foreground' : 'bg-secondary text-muted-foreground')}><UsersRound className="size-4.5" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Shared iPad</p>
        <p className="truncate text-xs text-muted-foreground">{children ?? (s.enabled ? 'On · several people per iPad' : 'Off · one person per iPad')}</p>
      </div>
      <Switch checked={s.enabled} onCheckedChange={(v) => set({ enabled: v })} aria-label="Enable Shared iPad" />
    </div>
  )
}

// ── V3 · Settings list ────────────────────────────────────────────────────

export function SharedIpadV3({ value: s, onChange: set }: Props) {
  return (
    <div className="space-y-5">
      <MasterRow s={s} set={set} />
      {s.enabled && (
        <>
          <List title="Access">
            <Line label="Owner" required><OwnerSelect value={s.owner} onChange={(v) => set({ owner: v })} className="w-[230px]" /></Line>
            <Line label="Sign-in" os="iPadOS 14.5+">
              <Seg value={s.guestOnly ? 'guest' : 'account'} onChange={(v) => set({ guestOnly: v === 'guest' })} options={[['account', 'Accounts'], ['guest', 'Guests only']]} />
            </Line>
            {!s.guestOnly && (
              <Line label="Domain" os="iPadOS 16+">
                <Input value={s.signInDomain} onChange={(e) => set({ signInDomain: e.target.value })} placeholder="company.com" className="h-8 w-[230px]" aria-label="Sign-in domain" />
              </Line>
            )}
          </List>

          <PeopleAndStorage s={s} set={set} />

          <List title="Timers">
            <Line label="Guest session timeout" os="iPadOS 14.5+"><TimerSelect size="sm" value={s.guestTimeout} onChange={(t) => set({ guestTimeout: t })} label="Guest session timeout" /></Line>
            <Line label="User session timeout" os="iPadOS 14.5+" hint={s.guestOnly ? 'not used with Guests only' : undefined}>
              <TimerSelect size="sm" disabled={s.guestOnly} value={s.userTimeout} onChange={(t) => set({ userTimeout: t })} label="User session timeout" />
            </Line>
            <Line label="Auto-lock" os="iPadOS 17+"><TimerSelect size="sm" value={s.autoLock} onChange={(t) => set({ autoLock: t })} label="Auto-lock" /></Line>
            <Line label="Passcode after lock" os="iPadOS 17+"><TimerSelect size="sm" value={s.passcodeAfterLock} onChange={(t) => set({ passcodeAfterLock: t })} label="Passcode after lock" /></Line>
          </List>
        </>
      )}
    </div>
  )
}

/**
 * Who can sign in and how much space each gets, in one card: the storage choice
 * sits under the people it divides between.
 *   Per person — set how many people share the iPad; space splits evenly.
 *   Size each  — give every person a fixed amount (MB), whatever the head count.
 * Guests-only iPads have no named people, so only "Size each" applies there.
 */
function PeopleAndStorage({ s, set }: { s: SharedIpadSettings; set: Props['onChange'] }) {
  const listed = s.allowedUsers.length
  const count = Number(s.userCount) || 0
  const mode = s.quotaOn || s.guestOnly ? 'quota' : 'people'
  return (
    <List title={s.guestOnly ? 'Storage' : 'People & storage'}>
      {!s.guestOnly && (
        <Line label="Allowed people" os="iPadOS 17+" stacked>
          <EmailChips value={s.allowedUsers} onChange={(v) => set({ allowedUsers: v })} />
          <p className="text-xs text-muted-foreground">{listed ? (listed === 1 ? 'Only this person can sign in.' : `Only these ${listed} people can sign in.`) : 'Leave empty to let anyone in the domain sign in.'}</p>
        </Line>
      )}
      <Line label="Storage" os="iPadOS 13.4+">
        <Seg value={mode} onChange={(v) => set({ quotaOn: v === 'quota' })} options={[['people', 'Per person'], ['quota', 'Size each']]} disabled={s.guestOnly ? ['people'] : []} />
      </Line>
      {mode === 'quota' ? (
        <Line label="Space for each person" indent>
          <span className="flex items-center gap-1.5"><Input type="number" min={0} value={s.quotaMb} onChange={(e) => set({ quotaMb: e.target.value })} placeholder="4096" className="h-8 w-24" aria-label="Space for each person in MB" /><span className="text-xs text-muted-foreground">MB</span></span>
        </Line>
      ) : (
        <Line label="People sharing" indent hint={`~${perPersonGb(count)} GB each`}>
          <span className="flex items-center gap-2">
            {listed > 0 && listed !== count && (
              <button type="button" onClick={() => set({ userCount: String(listed) })} className="text-xs font-medium text-brand hover:underline">Match list ({listed})</button>
            )}
            <Stepper value={count} onChange={(n) => set({ userCount: String(n) })} label="Number of people sharing" />
          </span>
        </Line>
      )}
    </List>
  )
}

function List({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h4 className="px-4 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{title}</h4>
      <div className="divide-y overflow-hidden rounded-xl border bg-card">{children}</div>
    </section>
  )
}

function Line({ label, os, required, hint, indent, stacked, children }: {
  label: string; os?: string; required?: boolean; hint?: string; indent?: boolean; stacked?: boolean; children: React.ReactNode
}) {
  return (
    <div className={cn('px-4 py-2.5', stacked ? 'space-y-2' : 'flex min-h-12 items-center justify-between gap-3', indent && 'bg-secondary/30 pl-8')}>
      <span className="flex items-center gap-1.5 text-sm">
        {label}{required && <span className="text-destructive">*</span>}{os && <Os v={os} />}
        {hint && <span className="text-xs text-muted-foreground">· {hint}</span>}
      </span>
      {children}
    </div>
  )
}

function Seg({ value, onChange, options, disabled = [] }: { value: string; onChange: (v: string) => void; options: [string, string][]; disabled?: string[] }) {
  return (
    <div className="inline-flex rounded-lg bg-secondary p-0.5" role="radiogroup">
      {options.map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} disabled={disabled.includes(v)} onClick={() => onChange(v)}
          className={cn('rounded-md px-3 py-1 text-sm transition-colors disabled:opacity-40', value === v ? 'bg-card font-medium shadow-xs' : 'text-muted-foreground hover:text-foreground')}>
          {l}
        </button>
      ))}
    </div>
  )
}

// ── V4 · Tiles ────────────────────────────────────────────────────────────

export function SharedIpadV4({ value: s, onChange: set }: Props) {
  const people = Number(s.userCount) || 0
  return (
    <div className="space-y-4">
      <MasterRow s={s} set={set} />
      {s.enabled && (
        <div className="grid grid-cols-2 gap-3">
          <Tile icon={UserRound} label="Owner" value={s.owner ? s.owner.split('@')[0] : 'Not set'} warn={!s.owner} wide>
            <OwnerSelect value={s.owner} onChange={(v) => set({ owner: v })} />
          </Tile>
          <Tile icon={LogIn} label="Who uses it" value={s.guestOnly ? 'Guests' : 'Signed-in people'}>
            <div className="flex flex-col gap-1.5">
              <Chip on={!s.guestOnly} onClick={() => set({ guestOnly: false })}>Signed-in people</Chip>
              <Chip on={s.guestOnly} onClick={() => set({ guestOnly: true })}>Guests only</Chip>
            </div>
          </Tile>
          <Tile icon={HardDrive} label="Space" value={s.quotaOn ? (s.quotaMb ? `${Math.round(Number(s.quotaMb) / 1024)} GB each` : 'Size each') : s.guestOnly ? 'Guest only' : `${people} people`}>
            <div className="space-y-2">
              {!s.guestOnly && <Chip on={!s.quotaOn} onClick={() => set({ quotaOn: false })}>Fit people</Chip>}
              <Chip on={s.quotaOn} onClick={() => set({ quotaOn: true })}>Size each</Chip>
              {s.quotaOn
                ? <Input type="number" value={s.quotaMb} onChange={(e) => set({ quotaMb: e.target.value })} placeholder="MB" className="h-8" aria-label="Quota MB" />
                : !s.guestOnly && <Stepper value={people} onChange={(n) => set({ userCount: String(n) })} label="Number of people" />}
            </div>
          </Tile>
          {!s.guestOnly && (
            <Tile icon={AtSign} label="Sign-in domain" value={s.signInDomain ? `@${s.signInDomain}` : 'None'}>
              <Input value={s.signInDomain} onChange={(e) => set({ signInDomain: e.target.value })} placeholder="company.com" aria-label="Sign-in domain" />
            </Tile>
          )}
          {!s.guestOnly && (
            <Tile icon={Users} label="Allowed people" value={s.allowedUsers.length ? `${s.allowedUsers.length} ${s.allowedUsers.length === 1 ? 'person' : 'people'}` : 'Anyone'} wide>
              <EmailChips value={s.allowedUsers} onChange={(v) => set({ allowedUsers: v })} />
            </Tile>
          )}
          <Tile icon={Timer} label={s.guestOnly ? 'Guest sign-out' : 'Sign-out'} value={timedOrNever(s.guestOnly ? s.guestTimeout : s.userTimeout)}>
            <TimerSelect value={s.guestOnly ? s.guestTimeout : s.userTimeout} onChange={(t) => set(s.guestOnly ? { guestTimeout: t } : { userTimeout: t })} label="Sign-out" className="w-full" />
          </Tile>
          <Tile icon={Lock} label="Auto-lock" value={timedOrNever(s.autoLock)}>
            <TimerSelect value={s.autoLock} onChange={(t) => set({ autoLock: t })} label="Auto-lock" className="w-full" />
          </Tile>
        </div>
      )}
    </div>
  )
}

const timedOrNever = (t: Timed) => (t.on && t.value ? timedText(t) : 'Never')

/** Shows a value; clicking opens a small popover to change it. */
function Tile({ icon: Icon, label, value, warn, wide, children }: { icon: typeof Users; label: string; value: string; warn?: boolean; wide?: boolean; children: React.ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={cn('group flex items-start gap-3 rounded-xl border bg-card p-3.5 text-left transition-colors hover:border-brand/40 hover:bg-brand/5', wide && 'col-span-2', warn && 'border-amber-300')}>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground group-hover:bg-brand/10 group-hover:text-brand"><Icon className="size-4" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted-foreground">{label}</span>
            <span className={cn('block truncate font-medium', warn && 'text-amber-700')}>{value}</span>
          </span>
          <Pencil className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {children}
      </PopoverContent>
    </Popover>
  )
}

// ── V5 · Live preview ─────────────────────────────────────────────────────

export function SharedIpadV5({ value: s, onChange: set }: Props) {
  const people = s.guestOnly ? 0 : Math.min(Number(s.userCount) || 0, 6)
  return (
    <div className="space-y-4">
      <MasterRow s={s} set={set} />
      {s.enabled && (
        <div className="grid gap-5 sm:grid-cols-[1fr_190px]">
          <div className="space-y-4">
            <Mini label="Owner" required><OwnerSelect value={s.owner} onChange={(v) => set({ owner: v })} /></Mini>
            <Mini label="Who uses it">
              <Seg value={s.guestOnly ? 'guest' : 'account'} onChange={(v) => set({ guestOnly: v === 'guest' })} options={[['account', 'Signed-in people'], ['guest', 'Guests']]} />
            </Mini>
            {!s.guestOnly && (
              <div className="grid grid-cols-2 gap-3">
                <Mini label="Domain"><Input value={s.signInDomain} onChange={(e) => set({ signInDomain: e.target.value })} placeholder="company.com" aria-label="Sign-in domain" /></Mini>
                <Mini label="People per iPad"><Stepper value={Number(s.userCount) || 0} onChange={(n) => set({ userCount: String(n), quotaOn: false })} label="Number of people" /></Mini>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Mini label="Auto-lock"><TimerSelect value={s.autoLock} onChange={(t) => set({ autoLock: t })} label="Auto-lock" className="w-full" /></Mini>
              <Mini label={s.guestOnly ? 'Guest sign-out' : 'Sign-out'}>
                <TimerSelect value={s.guestOnly ? s.guestTimeout : s.userTimeout} onChange={(t) => set(s.guestOnly ? { guestTimeout: t } : { userTimeout: t })} label="Sign-out" className="w-full" />
              </Mini>
            </div>
            <More>
              <Mini label="Allowed people"><EmailChips value={s.allowedUsers} onChange={(v) => set({ allowedUsers: v })} /></Mini>
              <Mini label="Fixed space each (MB)"><Input type="number" value={s.quotaOn ? s.quotaMb : ''} onChange={(e) => set({ quotaOn: !!e.target.value, quotaMb: e.target.value })} placeholder="Off" aria-label="Quota MB" /></Mini>
              <Mini label="Passcode after lock"><TimerSelect value={s.passcodeAfterLock} onChange={(t) => set({ passcodeAfterLock: t })} label="Passcode after lock" /></Mini>
            </More>
          </div>

          {/* The iPad lock screen, as people will see it */}
          <figure className="space-y-2">
            <div className="aspect-[3/4] rounded-[20px] border-[6px] border-foreground/85 bg-gradient-to-b from-sky-100 to-indigo-100 p-3 text-center shadow-sm">
              <p className="mt-3 text-2xl font-light tabular-nums text-foreground/80">9:41</p>
              {s.guestOnly ? (
                <div className="mt-6 space-y-2">
                  <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-white/80"><UserRound className="size-5 text-muted-foreground" /></span>
                  <p className="text-xs font-medium">Guest</p>
                  <span className="inline-block rounded-full bg-white/80 px-3 py-1 text-[10px]">Start session</span>
                </div>
              ) : (
                <div className="mt-6 space-y-2">
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {Array.from({ length: Math.max(1, people) }, (_, i) => (
                      <span key={i} className="flex size-7 items-center justify-center rounded-full bg-white/80 text-[10px] font-medium text-muted-foreground">{String.fromCharCode(65 + i)}</span>
                    ))}
                  </div>
                  <div className="mx-auto w-[85%] rounded-md bg-white/85 px-2 py-1 text-left text-[10px] text-muted-foreground">
                    name<span className="text-foreground">@{s.signInDomain || '…'}</span>
                  </div>
                </div>
              )}
            </div>
            <figcaption className="text-center text-xs text-muted-foreground">
              {s.autoLock.on && s.autoLock.value ? `Locks after ${timedText(s.autoLock)}` : 'Never auto-locks'}
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  )
}

function Mini({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-medium text-muted-foreground">{label}{required && <span className="text-destructive"> *</span>}</span>
      {children}
    </label>
  )
}

/** Rarely-changed settings, folded away. */
function More({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
        More options <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="space-y-3 border-t p-3">{children}</div>}
    </div>
  )
}

// ── V6 · Sentence ─────────────────────────────────────────────────────────

export function SharedIpadV6({ value: s, onChange: set }: Props) {
  return (
    <div className="space-y-4">
      <MasterRow s={s} set={set} />
      {s.enabled && (
        <div className="rounded-xl border bg-card p-5 text-[15px] leading-[2.6]">
          These iPads belong to{' '}
          <Blank><OwnerSelect value={s.owner} onChange={(v) => set({ owner: v })} className="inline-flex h-8 w-[220px]" /></Blank>.{' '}
          {' '}They're used by{' '}
          <Blank>
            <Select value={s.guestOnly ? 'guest' : 'account'} onValueChange={(v) => set({ guestOnly: v === 'guest' })}>
              <SelectTrigger size="sm" className="inline-flex w-[200px]" aria-label="Who uses it"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="account">people who sign in</SelectItem><SelectItem value="guest">guests only</SelectItem></SelectContent>
            </Select>
          </Blank>
          {!s.guestOnly && (
            <>
              {' '}with <Blank><span className="inline-flex items-center rounded-md border px-2"><AtSign className="size-3.5 text-muted-foreground" /><input value={s.signInDomain} onChange={(e) => set({ signInDomain: e.target.value })} placeholder="company.com" aria-label="Sign-in domain" className="h-7 w-28 bg-transparent px-1 text-sm outline-none" /></span></Blank> accounts,
              {' '}with room for <Blank><Stepper value={Number(s.userCount) || 0} onChange={(n) => set({ userCount: String(n), quotaOn: false })} label="Number of people" /></Blank> people
            </>
          )}
          . Sign them out after{' '}
          <Blank><TimerSelect size="sm" value={s.guestOnly ? s.guestTimeout : s.userTimeout} onChange={(t) => set(s.guestOnly ? { guestTimeout: t } : { userTimeout: t })} label="Sign-out" className="inline-flex" /></Blank>
          {' '}idle, lock the screen after{' '}
          <Blank><TimerSelect size="sm" value={s.autoLock} onChange={(t) => set({ autoLock: t })} label="Auto-lock" className="inline-flex" /></Blank>
          {' '}and ask for the passcode after{' '}
          <Blank><TimerSelect size="sm" value={s.passcodeAfterLock} onChange={(t) => set({ passcodeAfterLock: t })} label="Passcode after lock" className="inline-flex" /></Blank>.
        </div>
      )}
      {s.enabled && !s.guestOnly && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Only let these people sign in (leave empty for anyone):</p>
          <EmailChips value={s.allowedUsers} onChange={(v) => set({ allowedUsers: v })} />
        </div>
      )}
    </div>
  )
}

const Blank = ({ children }: { children: React.ReactNode }) => <span className="mx-0.5 inline-block align-middle leading-normal">{children}</span>

// ── V7 · Presets ──────────────────────────────────────────────────────────

const SETUPS: { key: string; label: string; icon: typeof Users; blurb: string; apply: Partial<SharedIpadSettings> }[] = [
  { key: 'team', label: 'Team iPads', icon: Users, blurb: 'Colleagues sign in · 4 people · lock 2 min',
    apply: { guestOnly: false, quotaOn: false, userCount: '4', autoLock: { on: true, value: '2', unit: 'minutes' }, userTimeout: { on: true, value: '30', unit: 'minutes' } } },
  { key: 'store', label: 'Store floor', icon: Store, blurb: 'Staff sign in · 10 people · sign out 5 min',
    apply: { guestOnly: false, quotaOn: false, userCount: '10', userTimeout: { on: true, value: '5', unit: 'minutes' }, autoLock: { on: true, value: '1', unit: 'minutes' } } },
  { key: 'kiosk', label: 'Guest kiosk', icon: MonitorSmartphone, blurb: 'No sign-in · wiped after 5 min idle',
    apply: { guestOnly: true, quotaOn: false, guestTimeout: { on: true, value: '5', unit: 'minutes' }, autoLock: { on: false, value: '', unit: 'minutes' } } },
]

export function SharedIpadV7({ value: s, onChange: set }: Props) {
  const [picked, setPicked] = useState<string | null>(null)
  const [adjust, setAdjust] = useState(false)
  return (
    <div className="space-y-4">
      <MasterRow s={s} set={set} />
      {s.enabled && (
        <>
          <div className="grid gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Setup">
            {SETUPS.map((p) => {
              const sel = picked === p.key
              return (
                <button key={p.key} type="button" role="radio" aria-checked={sel} onClick={() => { setPicked(p.key); set(p.apply) }}
                  className={cn('relative flex flex-col items-start gap-2 rounded-xl border bg-card p-3.5 text-left transition-colors', sel ? 'border-brand/50 ring-1 ring-brand/30' : 'hover:border-foreground/20')}>
                  {sel && <Check className="absolute top-3 right-3 size-4 text-brand" />}
                  <span className={cn('flex size-9 items-center justify-center rounded-lg', sel ? 'bg-brand/10 text-brand' : 'bg-secondary text-muted-foreground')}><p.icon className="size-4.5" /></span>
                  <span className="text-sm font-medium">{p.label}</span>
                  <span className="text-xs text-muted-foreground">{p.blurb}</span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
            <span className="w-16 shrink-0 text-sm text-muted-foreground">Owner<span className="text-destructive">*</span></span>
            <OwnerSelect value={s.owner} onChange={(v) => set({ owner: v })} />
          </div>

          <div className="rounded-xl border bg-card">
            <button type="button" onClick={() => setAdjust(!adjust)} aria-expanded={adjust} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
              <span>
                <span className="block text-sm font-medium">Adjust</span>
                <span className="block text-xs text-muted-foreground">
                  {s.guestOnly ? 'Guests' : `${s.userCount || 0} people${s.signInDomain ? ` · @${s.signInDomain}` : ''}`} · lock {timedOrNever(s.autoLock)} · sign-out {timedOrNever(s.guestOnly ? s.guestTimeout : s.userTimeout)}
                </span>
              </span>
              <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', adjust && 'rotate-180')} />
            </button>
            {adjust && (
              <div className="divide-y border-t">
                <Line label="Who uses it"><Seg value={s.guestOnly ? 'guest' : 'account'} onChange={(v) => set({ guestOnly: v === 'guest' })} options={[['account', 'Sign in'], ['guest', 'Guests']]} /></Line>
                {!s.guestOnly && <Line label="People"><Stepper value={Number(s.userCount) || 0} onChange={(n) => set({ userCount: String(n) })} label="Number of people" /></Line>}
                {!s.guestOnly && <Line label="Domain"><Input value={s.signInDomain} onChange={(e) => set({ signInDomain: e.target.value })} placeholder="company.com" className="h-8 w-[200px]" aria-label="Sign-in domain" /></Line>}
                <Line label="Sign-out"><TimerSelect size="sm" value={s.guestOnly ? s.guestTimeout : s.userTimeout} onChange={(t) => set(s.guestOnly ? { guestTimeout: t } : { userTimeout: t })} label="Sign-out" /></Line>
                <Line label="Auto-lock"><TimerSelect size="sm" value={s.autoLock} onChange={(t) => set({ autoLock: t })} label="Auto-lock" /></Line>
                <Line label="Passcode after lock"><TimerSelect size="sm" value={s.passcodeAfterLock} onChange={(t) => set({ passcodeAfterLock: t })} label="Passcode after lock" /></Line>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
