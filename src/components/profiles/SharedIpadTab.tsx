// Shared iPad tab of the onboarding sheet.
// Same settings as the live product, regrouped into four short sections, and
// every field that is switched off by another setting says which one — instead
// of only turning grey.
import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Row, Section, SubRow } from './SettingsRows'
import { users } from '@/data/directory'
import type { SharedIpadSettings, Timed } from '@/data/profiles'

type Set = (p: Partial<SharedIpadSettings>) => void

export function SharedIpadTab({ value: s, onChange: set }: { value: SharedIpadSettings; onChange: Set }) {
  const off = !s.enabled
  // Why a field is unavailable, or null when it is editable.
  const userCountBlocked = s.guestOnly ? 'Not used with Guest Session Only.' : s.quotaOn ? 'Set by the storage quota below.' : null
  const userTimeoutBlocked = s.guestOnly ? 'Guest sessions have no signed-in users.' : null
  const ownerOptions = s.owner && !users.some((u) => u.email === s.owner) ? [s.owner, ...users.map((u) => u.email)] : users.map((u) => u.email)

  return (
    <div className="space-y-6">
      {/* Master switch */}
      <div className={cn('flex items-start justify-between gap-4 rounded-lg border p-4 transition-colors', s.enabled && 'border-brand/30 bg-brand/5')}>
        <div className="space-y-0.5">
          <h3 className="font-medium">Shared iPad</h3>
          <p className="text-sm text-muted-foreground">Several people share one iPad, each with a Managed Apple Account.</p>
        </div>
        <Switch checked={s.enabled} onCheckedChange={(v) => set({ enabled: v })} aria-label="Enable Shared iPad" />
      </div>

      {off && <p className="text-sm text-muted-foreground">Turn on Shared iPad to set who can use these iPads and how sessions behave.</p>}

      <fieldset disabled={off} className={cn('space-y-7', off && 'pointer-events-none opacity-50')} aria-hidden={off}>
        <Section title="Owner & sign-in">
          <Row label="Device owner" required hint="The account that manages this iPad and receives its alerts.">
            <Select value={s.owner} onValueChange={(v) => set({ owner: v })} disabled={off}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Choose a user" /></SelectTrigger>
              <SelectContent className="max-h-72">{ownerOptions.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </Row>
          <Row label="Number of users" since="iPadOS 13.4+" hint="How many people's data the iPad keeps at once." blocked={userCountBlocked}>
            <Input type="number" min={1} value={s.userCount} onChange={(e) => set({ userCount: e.target.value })} disabled={!!userCountBlocked} />
          </Row>
          {!s.guestOnly && (
            <>
              <Row label="Default sign-in domain" since="iPadOS 16+" hint="Pre-filled after the @ so users type only their name.">
                <Input value={s.signInDomain} onChange={(e) => set({ signInDomain: e.target.value })} placeholder="company.com" />
              </Row>
              <Row label="Allowed users" since="iPadOS 17+" hint="Leave empty to let anyone in your organization sign in." stacked>
                <EmailChips value={s.allowedUsers} onChange={(v) => set({ allowedUsers: v })} />
              </Row>
            </>
          )}
        </Section>

        <Section title="Sessions">
          <Row label="Guest Session Only" since="iPadOS 14.5+" hint="No sign-in; everything is wiped when the guest signs out.">
            <Switch checked={s.guestOnly} onCheckedChange={(v) => set({ guestOnly: v })} aria-label="Guest Session Only" />
          </Row>
          {s.guestOnly && (
            <div className="flex items-start gap-2.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              Turning on guest sessions recalculates the storage space settings below. Sign-in domain and allowed users don't apply.
            </div>
          )}
          <TimedRow label="Guest session timeout" since="iPadOS 14.5+" hint="Sign the guest out after this much idle time." value={s.guestTimeout} onChange={(v) => set({ guestTimeout: v })} units />
          <TimedRow label="User session timeout" since="iPadOS 14.5+" hint="Sign a user out after this much idle time." value={s.userTimeout} onChange={(v) => set({ userTimeout: v })} blocked={userTimeoutBlocked} units />
        </Section>

        <Section title="Storage">
          <Row label="Use storage quota size" since="iPadOS 13.4+" hint="Give each user a fixed amount of space instead of splitting it evenly.">
            <Switch checked={s.quotaOn} onCheckedChange={(v) => set({ quotaOn: v })} aria-label="Use storage quota size" />
          </Row>
          {s.quotaOn && (
            <SubRow label="Quota per user" note="Overrides Number of users.">
              <div className="flex items-center gap-2">
                <Input type="number" min={1} value={s.quotaMb} onChange={(e) => set({ quotaMb: e.target.value })} placeholder="e.g. 4096" />
                <span className="text-sm text-muted-foreground">MB</span>
              </div>
            </SubRow>
          )}
        </Section>

        <Section title="Lock">
          <TimedRow label="Auto-lock" since="iPadOS 17+" hint="Lock the screen after this much idle time." value={s.autoLock} onChange={(v) => set({ autoLock: v })} units />
          <TimedRow label="Require passcode after lock" since="iPadOS 17+" hint="How long after locking the passcode is asked for." value={s.passcodeAfterLock} onChange={(v) => set({ passcodeAfterLock: v })} units />
        </Section>
      </fieldset>
    </div>
  )
}

/** Switch row that reveals a duration (value + seconds/minutes) when on. */
function TimedRow({ label, since, hint, value, onChange, blocked, units }: {
  label: string; since?: string; hint?: string; value: Timed; onChange: (v: Timed) => void; blocked?: string | null; units?: boolean
}) {
  const on = value.on && !blocked
  return (
    <>
      <Row label={label} since={since} hint={hint} blocked={blocked}>
        <Switch checked={on} disabled={!!blocked} onCheckedChange={(v) => onChange({ ...value, on: v })} aria-label={label} />
      </Row>
      {on && (
        <SubRow label="Duration">
          <div className="flex gap-2">
            <Input type="number" min={1} value={value.value} onChange={(e) => onChange({ ...value, value: e.target.value })} placeholder="0" aria-label={`${label} duration`} />
            {units && (
              <Select value={value.unit} onValueChange={(u) => onChange({ ...value, unit: u as Timed['unit'] })}>
                <SelectTrigger className="w-[120px] shrink-0" aria-label={`${label} unit`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="seconds">Seconds</SelectItem>
                  <SelectItem value="minutes">Minutes</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </SubRow>
      )}
    </>
  )
}

/** Emails as removable chips; Enter or comma adds, suggestions come from the directory. */
function EmailChips({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
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
          <button type="button" aria-label={`Remove ${e}`} onClick={() => onChange(value.filter((x) => x !== e))} className="text-muted-foreground hover:text-foreground">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        list="shared-ipad-users"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() }
          if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1))
        }}
        onBlur={add}
        placeholder={value.length ? '' : 'Type an email or pick a user'}
        className="min-w-40 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        aria-label="Add allowed user"
      />
      <datalist id="shared-ipad-users">
        {users.slice(0, 60).map((u) => <option key={u.id} value={u.email}>{u.name}</option>)}
      </datalist>
    </div>
  )
}
