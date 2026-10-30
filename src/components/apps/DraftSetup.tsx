// V2 draft view: what the user already filled in, plus a "Finish setting up"
// checklist. Each step opens in a side panel; Deploy is the last step.
import { useState } from 'react'
import { AlertTriangle, ArrowRight, Check, Lock, Rocket } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { deployCopy, reach, licensesFor, scopeSummary, selfServiceSummary, setupSteps, type LibraryApp, type SetupStep, type Target } from '@/data/apps'
import { useAppLibrary } from '@/store/AppLibraryContext'
import { CategoryName } from './forms'
import { DetailCard, EditSheet, Facts, type EditKey } from './EditSheet'

const names = (ts: Target[]) => ts.map((t) => t.name).join(', ')

export function DraftSetup({ app, onDeploy }: { app: LibraryApp; onDeploy: () => void }) {
  const { categories } = useAppLibrary()
  const [open, setOpen] = useState<EditKey | null>(null)
  const reaches = reach(app)
  const lic = licensesFor(app)
  const category = categories.find((c) => c.id === app.categoryId)
  const deploy = deployCopy(app)

  const summary: Record<SetupStep['key'], string> = {
    scope: reaches ? `${scopeSummary(app)}${app.exclusions.length ? ` · excluding ${names(app.exclusions)}` : ''} · ${reaches} devices` : 'Required to deploy',
    selfService: selfServiceSummary(app, categories),
    config: app.config ? app.config.fileName ?? 'Custom preferences' : 'Managed app config',
  }
  // Same steps the library counts for "Draft · n/m".
  const steps = setupSteps(app).map((s) => ({ ...s, summary: summary[s.key] }))
  const next = steps.find((s) => !s.done && s.required) ?? null
  const doneCount = steps.filter((s) => s.done).length
  const total = steps.length

  return (
    <div className="max-w-4xl space-y-5">
      {/* What the user already filled in when creating the draft. */}
      <DetailCard title="General" onEdit={() => setOpen('general')}>
        <Facts cols={3} items={[
          ['Entry name', app.name],
          ['Installation type', app.installType],
          ['Category', <CategoryName key="c" category={category} />],
          ['App updates', app.updatePolicy],
          ...(lic ? [['Licenses', `${lic.available} of ${lic.total} available`] as [string, string]] : []),
          ['Bundle ID', app.bundleId],
        ]} />
      </DetailCard>

      {/* Finish setting up */}
      <Card className="gap-0 overflow-hidden p-0">
        <div className="flex items-center justify-between gap-4 border-b bg-muted/40 px-5 py-4">
          <div>
            <h2 className="font-semibold">{next ? 'Finish setting up' : 'Ready to deploy'}</h2>
            <p className="text-sm text-muted-foreground">{next ? 'Saved as you go. Nothing deploys until the last step.' : 'Optional steps can wait until after deploy.'}</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span><strong>{doneCount}</strong> of {total}</span>
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${(doneCount / total) * 100}%` }} />
            </div>
          </div>
        </div>

        <ol className="divide-y">
          {steps.map((s, i) => {
            const isNext = next?.key === s.key
            return (
              <li key={s.key} className={cn('flex items-center gap-4 px-5 py-4', isNext && 'bg-primary/5')}>
                <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                  s.done ? 'bg-emerald-600 text-white' : isNext ? 'bg-primary text-primary-foreground' : 'border text-muted-foreground')}>
                  {s.done ? <Check className="size-4" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    {s.label}
                    {isNext && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Next</span>}
                    {!s.required && !s.done && <span className="text-xs font-normal text-muted-foreground">Optional</span>}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{s.summary}</p>
                </div>
                <Button variant={isNext ? 'default' : 'outline'} size="sm" aria-label={`${s.done ? 'Change' : 'Set up'} ${s.label}`} onClick={() => setOpen(s.key)}>
                  {s.done ? 'Change' : 'Set up'}
                </Button>
              </li>
            )
          })}

          {/* Deploy — locked until required steps are done. */}
          <li className={cn('flex items-center gap-4 px-5 py-4', !next && 'bg-primary/5')}>
            <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', next ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground')}>
              {next ? <Lock className="size-4" /> : <Rocket className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className={cn('font-medium', next && 'text-muted-foreground')}>Deploy</p>
              <p className="text-sm text-muted-foreground">{next ? 'Set scope first' : deploy.row}</p>
              {!next && deploy.shortBy > 0 && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-amber-800">
                  <AlertTriangle className="size-4 shrink-0" />{deploy.gets} of {reaches} get a license
                </p>
              )}
            </div>
          </li>
        </ol>

        <div className="flex items-center justify-between gap-3 border-t bg-muted/40 px-5 py-3">
          <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setOpen('more')}>
            Attributes & domains
          </button>
          {next ? (
            <Button onClick={() => setOpen(next.key)}>Next: {next.label.toLowerCase()}<ArrowRight className="size-4" /></Button>
          ) : (
            <Button onClick={onDeploy}><Rocket className="size-4" />{deploy.button}</Button>
          )}
        </div>
      </Card>

      {open && <EditSheet key={open} app={app} step={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
