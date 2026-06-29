import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck, Play } from 'lucide-react'
import {
  classifications,
  fileTypes,
  providerById,
  classificationById,
  fileTypeById,
} from '@/data'
import { useDataDiscovery } from '@/store/DataDiscoveryContext'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Stepper, RiskBadge, AuditStamp, ProviderIcon } from '@/components/common'
import { ExposurePill } from '@/components/discovery/ScopeTable'
import { SearchableSelect, type SelectOption } from '@/components/v2/SearchableSelect'
import { fileTypeIcon, classificationIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { formatBytes, RISK_META } from '@/lib/format'
import type { Policy, Risk } from '@/types'

const STEPS = [
  { key: 'setup', label: 'Setup' },
  { key: 'filetypes', label: 'File types' },
  { key: 'classification', label: 'Classification' },
  { key: 'scope', label: 'Scope' },
  { key: 'review', label: 'Review' },
]

const RISK_ORDER: Risk[] = ['low', 'medium', 'high', 'critical']

// Colourful risk picker — colours match the RiskBadge shown elsewhere.
const RISK_TEXT: Record<Risk, string> = {
  low: 'text-slate-600',
  medium: 'text-amber-600',
  high: 'text-orange-600',
  critical: 'text-red-600',
}

function RiskSelect({ value, onChange }: { value: Risk; onChange: (r: Risk) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Risk)}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RISK_ORDER.map((r) => (
          <SelectItem key={r} value={r}>
            <span className={cn('flex items-center gap-2 font-medium', RISK_TEXT[r])}>
              <span className={cn('size-2 rounded-full', RISK_META[r].dot)} />
              {RISK_META[r].label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function useToggleSet(init?: () => Set<string>) {
  const [set, setSet] = useState<Set<string>>(init ?? (() => new Set()))
  const toggle = (id: string) =>
    setSet((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  return [set, setSet, toggle] as const
}

export function PolicyDrawer({
  open,
  onOpenChange,
  initialConfigId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-select a connection (e.g. arriving from "Create policy" on a source). */
  initialConfigId?: string
}) {
  const navigate = useNavigate()
  const { configurations, addPolicy, runScan } = useDataDiscovery()

  const initialCfg = initialConfigId
    ? configurations.find((c) => c.id === initialConfigId)
    : undefined

  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [risk, setRisk] = useState<Risk>('medium')
  const [enabled, setEnabled] = useState(true)
  const [fileTypeSet, setFileTypeSet, toggleFileType] = useToggleSet()
  const [classSet, setClassSet, toggleClass] = useToggleSet()
  const [scopeSet, setScopeSet, toggleScope] = useToggleSet(
    () => new Set(initialCfg?.scopes.map((s) => s.id) ?? []),
  )
  const [configurationId, setConfigurationId] = useState(initialCfg?.id ?? '')
  const [confirmClose, setConfirmClose] = useState(false)
  const [saved, setSaved] = useState<Policy | null>(null)

  const cfg = configurations.find((c) => c.id === configurationId)
  const provider = cfg && providerById(cfg.providerId)

  const selectConfig = (id: string) => {
    setConfigurationId(id)
    const c = configurations.find((x) => x.id === id)
    setScopeSet(new Set(c?.scopes.map((s) => s.id) ?? []))
  }

  const dirty =
    !saved &&
    (name.trim().length > 0 ||
      !!configurationId ||
      fileTypeSet.size > 0 ||
      classSet.size > 0)

  const canNext =
    step === 0
      ? name.trim().length > 0 && !!configurationId
      : step === 1
        ? fileTypeSet.size > 0
        : step === 2
          ? classSet.size > 0
          : step === 3
            ? scopeSet.size > 0
            : true

  const requestClose = () => {
    if (dirty) setConfirmClose(true)
    else onOpenChange(false)
  }

  const handleCreate = () => {
    const policy = addPolicy({
      name: name.trim(),
      description: description.trim() || undefined,
      risk,
      status: enabled,
      fileTypeIds: [...fileTypeSet],
      classificationIds: [...classSet],
      configurationId,
      scopeIds: [...scopeSet],
    })
    setSaved(policy)
  }

  // ---- option lists (built once per render) -------------------------------
  const sourceOptions: SelectOption[] = configurations.map((c) => {
    const p = providerById(c.providerId)
    return {
      id: c.id,
      label: c.name,
      description: `${p?.name ?? c.providerId} · ${c.scopes.length} ${
        p?.scopeNounPlural.toLowerCase() ?? 'targets'
      }`,
      keywords: p?.name,
    }
  })
  const fileTypeOptions: SelectOption[] = fileTypes
  const classOptions: SelectOption[] = classifications.map((c) => ({
    id: c.id,
    label: c.label,
    description: c.description,
    keywords: c.abbr,
  }))
  const scopeOptions: SelectOption[] =
    cfg?.scopes.map((s) => ({
      id: s.id,
      label: s.name,
      description: `${s.objects} objects · ${s.sensitive} sensitive · ${formatBytes(
        s.sizeBytes,
      )}`,
    })) ?? []

  return (
    <Sheet open={open} onOpenChange={(next) => !next && requestClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle>{saved ? 'Policy created' : 'Create policy'}</SheetTitle>
          <SheetDescription>
            {saved
              ? `“${saved.name}” is ${saved.status ? 'enabled' : 'saved as disabled'}.`
              : 'Define what to scan for and which source to target.'}
          </SheetDescription>
        </SheetHeader>

        {saved ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-7" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Ready to run against {saved.scopeIds.length}{' '}
                {provider?.scopeNounPlural.toLowerCase() ?? 'targets'}.
              </p>
              <div className="mt-4">
                <AuditStamp at={saved.createdAt} by={saved.createdBy} />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="border-b px-5 py-4">
              <Stepper steps={STEPS} current={step} onStepClick={setStep} />
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {step === 0 && (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <Label>
                      Policy name<span className="text-red-500"> *</span>
                    </Label>
                    <Input
                      placeholder="e.g. Azure Sensitive Data Sweep"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>
                      Data source<span className="text-red-500"> *</span>
                    </Label>
                    {configurations.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No connections yet.{' '}
                        <Link
                          to="/data-discovery/sources"
                          className="text-primary underline"
                        >
                          Add a data source
                        </Link>{' '}
                        first.
                      </div>
                    ) : (
                      <SearchableSelect
                        mode="single"
                        options={sourceOptions}
                        selected={new Set(configurationId ? [configurationId] : [])}
                        onToggle={selectConfig}
                        placeholder="Search data sources…"
                        emptyHint="No data sources match."
                        maxHeightClass="max-h-56"
                        renderIcon={(o) => (
                          <ProviderIcon
                            providerId={
                              configurations.find((c) => c.id === o.id)!.providerId
                            }
                            bare
                          />
                        )}
                      />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="What this policy looks for and why."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Risk level</Label>
                    <RiskSelect value={risk} onChange={setRisk} />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Enable on creation
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Disabled policies are saved but won’t run until enabled.
                      </p>
                    </div>
                    <Switch checked={enabled} onCheckedChange={setEnabled} />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-3">
                  <StepHeading
                    title="File types"
                    subtitle="Select the file types this policy applies to."
                  />
                  <SearchableSelect
                    options={fileTypeOptions}
                    selected={fileTypeSet}
                    onToggle={toggleFileType}
                    onSelectAll={(c) =>
                      setFileTypeSet(c ? new Set(fileTypes.map((f) => f.id)) : new Set())
                    }
                    placeholder="Search file types…"
                    renderIcon={(o) => {
                      const Icon = fileTypeIcon(o.id)
                      return <Icon className="size-4" />
                    }}
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <StepHeading
                    title="Classifications"
                    subtitle="Select the data classifications to detect."
                  />
                  <SearchableSelect
                    options={classOptions}
                    selected={classSet}
                    onToggle={toggleClass}
                    onSelectAll={(c) =>
                      setClassSet(c ? new Set(classifications.map((x) => x.id)) : new Set())
                    }
                    placeholder="Search classifications…"
                    renderIcon={(o) => {
                      const Icon = classificationIcon(o.id)
                      return <Icon className="size-4" />
                    }}
                    renderMeta={(o) => {
                      const abbr = classificationById(o.id)?.abbr
                      return abbr ? (
                        <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {abbr}
                        </span>
                      ) : null
                    }}
                  />
                </div>
              )}

              {step === 3 && cfg && provider && (
                <div className="space-y-3">
                  <StepHeading
                    title={`${provider.scopeNounPlural} to scan`}
                    subtitle={`Pick which ${provider.scopeNounPlural.toLowerCase()} in ${cfg.name} this policy covers.`}
                  />
                  <SearchableSelect
                    options={scopeOptions}
                    selected={scopeSet}
                    onToggle={toggleScope}
                    onSelectAll={(c) =>
                      setScopeSet(c ? new Set(cfg.scopes.map((s) => s.id)) : new Set())
                    }
                    placeholder={`Search ${provider.scopeNounPlural.toLowerCase()}…`}
                    renderMeta={(o) => {
                      const sc = cfg.scopes.find((s) => s.id === o.id)
                      return sc?.publicAccess ? <ExposurePill public /> : null
                    }}
                  />
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3">
                  <StepHeading title="Review policy" subtitle="Confirm before creating." />
                  <div className="overflow-hidden rounded-xl border">
                    <div className="flex items-center justify-between gap-3 border-b bg-secondary/30 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {name || 'Untitled policy'}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {cfg?.name ?? 'No source'} ·{' '}
                          {enabled ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                      <RiskBadge risk={risk} />
                    </div>

                    {description.trim() && (
                      <ReviewRow label="Description">
                        <p className="text-sm text-foreground">{description.trim()}</p>
                      </ReviewRow>
                    )}
                    <ReviewRow label="Data source">
                      <p className="text-sm text-foreground">{cfg?.name ?? '—'}</p>
                    </ReviewRow>
                    <ReviewRow label="File types" count={fileTypeSet.size}>
                      <ChipList
                        items={[...fileTypeSet].map((id) => fileTypeById(id)?.label ?? id)}
                      />
                    </ReviewRow>
                    <ReviewRow label="Classifications" count={classSet.size}>
                      <ChipList
                        items={[...classSet].map(
                          (id) => classificationById(id)?.label ?? id,
                        )}
                      />
                    </ReviewRow>
                    <ReviewRow
                      label={provider?.scopeNounPlural ?? 'Scope'}
                      count={scopeSet.size}
                      countSuffix={cfg ? `of ${cfg.scopes.length}` : undefined}
                      last
                    >
                      <ChipList
                        items={
                          cfg
                            ? cfg.scopes
                                .filter((s) => scopeSet.has(s.id))
                                .map((s) => s.name)
                            : []
                        }
                      />
                    </ReviewRow>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <SheetFooter className="flex-row items-center justify-between gap-2 border-t px-5 py-4">
          {saved ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                View policies
              </Button>
              {saved.status && (
                <Button
                  onClick={() => {
                    runScan(saved.id)
                    navigate('/data-discovery/scans')
                  }}
                >
                  <Play className="size-4" />
                  Run scan now
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => (step === 0 ? requestClose() : setStep((s) => s - 1))}
              >
                <ArrowLeft className="size-4" />
                {step === 0 ? 'Cancel' : 'Back'}
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                  Next
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button onClick={handleCreate}>
                  <ShieldCheck className="size-4" />
                  Create policy
                </Button>
              )}
            </>
          )}
        </SheetFooter>
      </SheetContent>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this policy?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress here will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmClose(false)
                onOpenChange(false)
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  )
}

function StepHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  )
}

function ReviewRow({
  label,
  count,
  countSuffix,
  last,
  children,
}: {
  label: string
  count?: number
  countSuffix?: string
  last?: boolean
  children: ReactNode
}) {
  return (
    <div className={cn('flex gap-4 px-4 py-3', !last && 'border-b')}>
      <div className="w-28 shrink-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {count != null && (
          <p className="mt-0.5 text-xs text-muted-foreground/70">
            {count} {countSuffix ?? 'selected'}
          </p>
        )}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function ChipList({ items, max = 6 }: { items: string[]; max?: number }) {
  if (items.length === 0)
    return <p className="text-sm text-muted-foreground">—</p>
  const shown = items.slice(0, max)
  const rest = items.length - shown.length
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((label, i) => (
        <span
          key={i}
          className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs text-foreground"
        >
          {label}
        </span>
      ))}
      {rest > 0 && (
        <span className="inline-flex items-center rounded-md bg-secondary/50 px-2 py-0.5 text-xs text-muted-foreground">
          +{rest} more
        </span>
      )}
    </div>
  )
}
