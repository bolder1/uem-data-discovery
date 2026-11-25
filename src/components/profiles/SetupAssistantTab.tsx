// Setup Assistant tab of the onboarding sheet.
// 36 screens are too many for one flat list, so they're grouped (Welcome &
// account, Security & privacy…), each group skippable at once, with search and
// an All / Skipped / Shown filter. A skipped screen is struck through — it
// won't appear during enrollment.
import { useState } from 'react'
import { Search } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { setupScreenGroups, setupScreens, type OnboardingProfile } from '@/data/profiles'
import { Row, Section } from './SettingsRows'

type Patch = (p: Partial<OnboardingProfile>) => void
type Filter = 'all' | 'skipped' | 'shown'

/**
 * Tick or untick a set of screens at once — used by "Skip all" (every screen)
 * and by each group's checkbox (that group's screens). Given the screens skipped
 * today, the screens being changed, and whether the box was just ticked, return
 * the new list of skipped screens.
 */
function toggleScreens(skipped: string[], screens: string[], checked: boolean): string[] {
  // TODO(human)
  return skipped
}

/** A checkbox state for a set of screens: all skipped, some, or none. */
const stateOf = (skipped: string[], screens: string[]) => {
  const n = screens.filter((s) => skipped.includes(s)).length
  return n === screens.length ? true : n ? ('indeterminate' as const) : false
}

export function SetupAssistantTab({ draft, set }: { draft: OnboardingProfile; set: Patch }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const skipped = draft.skippedScreens
  const setSkipped = (v: string[]) => set({ skippedScreens: v })
  const total = setupScreens.length
  const pct = Math.round((skipped.length / total) * 100)

  const visible = (s: string) =>
    s.toLowerCase().includes(q.trim().toLowerCase()) &&
    (filter === 'all' || (filter === 'skipped') === skipped.includes(s))
  const counts: Record<Filter, number> = { all: total, skipped: skipped.length, shown: total - skipped.length }

  return (
    <div className="space-y-7">
      <Section title="Restore & recovery">
        <Row label="Use this profile when restoring from backup" since="iOS 26.0+" hint="A device restored from a backup re-enrolls with this profile instead of the one in the backup.">
          <Switch checked={draft.restoreFromBackup} onCheckedChange={(v) => set({ restoreFromBackup: v })} aria-label="Use this profile when restoring from backup" />
        </Row>
        <Row label="Return to Service" since="iOS 26.0+" hint="After an erase, the device rejoins Wi-Fi and enrolls again on its own, with no one at the screen.">
          <Switch checked={draft.returnToService} onCheckedChange={(v) => set({ returnToService: v })} aria-label="Return to Service" />
        </Row>
      </Section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Setup screens</h4>
            <p className="mt-1 text-sm text-muted-foreground">Tick a screen to skip it. Skipped screens don't appear while the device enrolls.</p>
          </div>
          <div className="w-40 space-y-1 text-right">
            <p className="text-sm"><span className="font-semibold tabular-nums">{skipped.length}</span><span className="text-muted-foreground"> of {total} skipped</span></p>
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
              <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a screen" className="pl-9" aria-label="Find a screen" />
          </div>
          <div className="inline-flex rounded-md border p-0.5" role="radiogroup" aria-label="Show screens">
            {(['all', 'skipped', 'shown'] as const).map((f) => (
              <button key={f} type="button" role="radio" aria-checked={filter === f} onClick={() => setFilter(f)}
                className={cn('rounded px-2.5 py-1 text-sm capitalize transition-colors', filter === f ? 'bg-brand/10 font-medium text-brand' : 'text-muted-foreground hover:bg-secondary')}>
                {f} <span className="tabular-nums opacity-70">{counts[f]}</span>
              </button>
            ))}
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 rounded-md border bg-secondary/50 px-3 py-2 text-sm font-medium">
          <Checkbox checked={stateOf(skipped, setupScreens)} onCheckedChange={(v) => setSkipped(toggleScreens(skipped, setupScreens, v === true))} />
          Skip all screens
        </label>

        {/* Groups */}
        {setupScreenGroups.map((g) => {
          const items = g.screens.filter(visible)
          if (!items.length) return null
          const n = g.screens.filter((s) => skipped.includes(s)).length
          return (
            <div key={g.title} className="overflow-hidden rounded-lg border bg-card">
              <label className="flex cursor-pointer items-center gap-2.5 border-b bg-secondary/30 px-3 py-2">
                <Checkbox checked={stateOf(skipped, g.screens)} onCheckedChange={(v) => setSkipped(toggleScreens(skipped, g.screens, v === true))} aria-label={`Skip all ${g.title} screens`} />
                <span className="flex-1 text-sm font-medium">{g.title}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{n} of {g.screens.length} skipped</span>
              </label>
              <div className="grid gap-x-4 p-1.5 sm:grid-cols-2">
                {items.map((s) => {
                  const on = skipped.includes(s)
                  return (
                    <label key={s} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-secondary/60">
                      <Checkbox checked={on} onCheckedChange={(v) => setSkipped(v === true ? [...skipped, s] : skipped.filter((x) => x !== s))} />
                      <span className={cn('truncate', on && 'text-muted-foreground line-through decoration-muted-foreground/40')}>{s}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
        {!setupScreenGroups.some((g) => g.screens.some(visible)) && (
          <p className="py-6 text-center text-sm text-muted-foreground">No screens match.</p>
        )}
      </section>
    </div>
  )
}
