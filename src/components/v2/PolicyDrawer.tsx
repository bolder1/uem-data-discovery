import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Check,
  ChevronDown,
} from 'lucide-react'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Stepper, ProviderIcon } from '@/components/common'
import { ExposurePill } from '@/components/discovery/ScopeTable'
import { SearchableSelect } from '@/components/v2/SearchableSelect'
import { Combobox, type FilterGroup } from '@/components/v2/Combobox'
import { fileTypeIcon, classificationIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { formatBytes } from '@/lib/format'
import type { Policy } from '@/types'

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
  editPolicy,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-select a connection (e.g. arriving from "Create policy" on a source). */
  initialConfigId?: string
  /** When set, the drawer edits this policy instead of creating a new one. */
  editPolicy?: Policy
}) {
  const navigate = useNavigate()
  const { configurations, addPolicy, updatePolicy } = useDataDiscovery()
  const isEdit = !!editPolicy

  const initialCfg = initialConfigId
    ? configurations.find((c) => c.id === initialConfigId)
    : undefined
  const editConfigIds =
    editPolicy?.configurationIds ??
    (editPolicy ? [editPolicy.configurationId] : [])

  const [step, setStep] = useState(0)
  const [name, setName] = useState(editPolicy?.name ?? '')
  const [description, setDescription] = useState(editPolicy?.description ?? '')
  const [enabled, setEnabled] = useState(editPolicy?.status ?? true)

  // Step 2 — single data type (provider), then many sources within that type.
  const [dataType, setDataType] = useState(
    () =>
      (editConfigIds.length
        ? configurations.find((c) => c.id === editConfigIds[0])?.providerId
        : initialCfg?.providerId) ?? '',
  )
  const [configIds, setConfigIds] = useState<Set<string>>(
    () =>
      new Set(editConfigIds.length ? editConfigIds : initialCfg ? [initialCfg.id] : []),
  )

  const [fileTypeSet, setFileTypeSet, toggleFileType] = useToggleSet(
    () => new Set(editPolicy?.fileTypeIds ?? []),
  )
  const [classSet, setClassSet, toggleClass] = useToggleSet(
    () => new Set(editPolicy?.classificationIds ?? []),
  )
  const [scopeSet, setScopeSet, toggleScope] = useToggleSet(
    () =>
      new Set(editPolicy?.scopeIds ?? initialCfg?.scopes.map((s) => s.id) ?? []),
  )
  // Which source items have their "experience" (scope picker) expanded.
  const [expandedSources, setExpandedSources, toggleExpandedSource] = useToggleSet(
    () => new Set(editConfigIds.length ? editConfigIds : initialCfg ? [initialCfg.id] : []),
  )
  const expandSource = (id: string) =>
    setExpandedSources((prev) => new Set(prev).add(id))
  const [confirmClose, setConfirmClose] = useState(false)

  const provider = dataType ? providerById(dataType) : undefined

  const STEPS = [
    { key: 'basics', label: 'Basics' },
    { key: 'source', label: 'Data source' },
    { key: 'filetypes', label: 'File types' },
    { key: 'classification', label: 'Classification' },
    { key: 'review', label: 'Review' },
  ]
  const selectedConfigs = configurations.filter((c) => configIds.has(c.id))

  // Data types = providers that actually have a configured connection.
  const typeProviders = [...new Set(configurations.map((c) => c.providerId))]
    .map((id) => providerById(id))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .sort((a, b) => a.name.localeCompare(b.name))
  const countOfType = (pid: string) =>
    configurations.filter((c) => c.providerId === pid).length

  const dataTypeOptions = typeProviders.map((p) => ({
    id: p.id,
    label: p.name,
    keywords: `${p.vendor} ${p.category}`,
    category: p.category,
    count: countOfType(p.id),
  }))
  const dataTypeFilters: FilterGroup<(typeof dataTypeOptions)[number]>[] = [
    {
      key: 'category',
      label: 'Category',
      chips: [...new Set(typeProviders.map((p) => p.category))].map((c) => ({
        value: c,
        label: c,
      })),
      test: (o, active) => active.includes(o.category),
    },
  ]

  const configsForType = configurations.filter((c) => c.providerId === dataType)
  const totalScopes = selectedConfigs.reduce((n, c) => n + c.scopes.length, 0)

  // Switching the data type resets the source + scope picks below it.
  const changeDataType = (pid: string) => {
    setDataType(pid)
    setConfigIds(new Set())
    setScopeSet(new Set())
  }
  // Toggling a source also adds/removes its scopes (its "experience" stays
  // pre-filled with everything selected, then expands so the user can refine it).
  const toggleSource = (id: string) => {
    const cfg = configurations.find((c) => c.id === id)
    const ids = cfg?.scopes.map((s) => s.id) ?? []
    const on = configIds.has(id)
    setConfigIds((prev) => {
      const n = new Set(prev)
      if (on) n.delete(id)
      else n.add(id)
      return n
    })
    setScopeSet((prev) => {
      const n = new Set(prev)
      ids.forEach((x) => (on ? n.delete(x) : n.add(x)))
      return n
    })
    if (!on) expandSource(id)
  }
  // Bulk add/remove a set of sources (respects the dropdown's active filter)
  // and keeps their scopes in sync.
  const setSourcesBulk = (ids: string[], checked: boolean) => {
    setConfigIds((prev) => {
      const n = new Set(prev)
      ids.forEach((id) => (checked ? n.add(id) : n.delete(id)))
      return n
    })
    setScopeSet((prev) => {
      const n = new Set(prev)
      ids.forEach((id) => {
        const cfg = configurations.find((c) => c.id === id)
        cfg?.scopes.forEach((s) => (checked ? n.add(s.id) : n.delete(s.id)))
      })
      return n
    })
  }

  const dirty =
    name.trim().length > 0 ||
    !!dataType ||
    configIds.size > 0 ||
    fileTypeSet.size > 0 ||
    classSet.size > 0

  const canNext =
    step === 0
      ? name.trim().length > 0
      : step === 1
        ? !!dataType && configIds.size > 0 && scopeSet.size > 0
        : step === 2
          ? fileTypeSet.size > 0
          : step === 3
            ? classSet.size > 0
            : true

  const requestClose = () => {
    if (dirty) setConfirmClose(true)
    else onOpenChange(false)
  }

  const handleCreate = () => {
    const ids = [...configIds]
    const input = {
      name: name.trim(),
      description: description.trim() || undefined,
      status: enabled,
      fileTypeIds: [...fileTypeSet],
      classificationIds: [...classSet],
      configurationId: ids[0],
      configurationIds: ids,
      scopeIds: [...scopeSet],
    }
    if (editPolicy) {
      updatePolicy(editPolicy.id, input)
      onOpenChange(false)
      return
    }
    const policy = addPolicy(input)
    // Navigate straight to the new policy's details page — no separate
    // "policy created" confirmation screen. The route change unmounts this
    // drawer, so there's no need to also call onOpenChange here.
    navigate(`/data-discovery/policies/${policy.id}`)
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && requestClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle>{isEdit ? 'Edit policy' : 'Create policy'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update what this policy scans for and which sources it targets.'
              : 'Define what to scan for and which sources to target.'}
          </SheetDescription>
        </SheetHeader>

        <>
            <div className="border-b px-5 py-4">
              <Stepper steps={STEPS} current={step} onStepClick={setStep} scrollable />
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {/* Step 1 — basics */}
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
                    <Label>Description</Label>
                    <Textarea
                      placeholder="What this policy looks for and why."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
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

              {/* Step 2 — data type, then its sources */}
              {step === 1 && (
                <div className="space-y-5">
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
                    <>
                      <div className="space-y-1.5">
                        <Label>
                          Data type<span className="text-red-500"> *</span>
                        </Label>
                        <Combobox
                          options={dataTypeOptions}
                          selected={new Set(dataType ? [dataType] : [])}
                          onSelect={changeDataType}
                          placeholder="Select a data type…"
                          searchPlaceholder="Search data types…"
                          filters={dataTypeFilters}
                          renderIcon={(o) => <ProviderIcon providerId={o.id} bare />}
                          renderMeta={(o) => (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {o.count}
                            </span>
                          )}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>
                            Sources<span className="text-red-500"> *</span>
                          </Label>
                          {dataType && configsForType.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setSourcesBulk(
                                  configsForType.map((c) => c.id),
                                  configIds.size !== configsForType.length,
                                )
                              }
                              className="text-xs font-medium text-primary"
                            >
                              {configIds.size === configsForType.length
                                ? 'Clear all'
                                : 'Select all'}
                            </button>
                          )}
                        </div>
                        {!dataType ? (
                          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                            Select a data type to choose its sources.
                          </div>
                        ) : (
                          <div className="grid gap-2">
                            {configsForType.map((c) => {
                              const on = configIds.has(c.id)
                              const hasPublic = c.scopes.some((s) => s.publicAccess)
                              const expanded = expandedSources.has(c.id)
                              const selectedInSource = c.scopes.filter((s) =>
                                scopeSet.has(s.id),
                              ).length
                              return (
                                <div
                                  key={c.id}
                                  className={cn(
                                    'overflow-hidden rounded-xl border transition-colors',
                                    on
                                      ? 'border-brand/50 bg-brand/5'
                                      : 'hover:border-border hover:bg-secondary/40',
                                  )}
                                >
                                  <button
                                    type="button"
                                    aria-pressed={on}
                                    onClick={() => toggleSource(c.id)}
                                    className="flex w-full items-center gap-3 p-3 text-left"
                                  >
                                    <ProviderIcon providerId={c.providerId} size="sm" />
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-medium text-foreground">
                                        {c.name}
                                      </p>
                                      <p className="truncate text-xs text-muted-foreground">
                                        {on ? selectedInSource : c.scopes.length}{' '}
                                        {provider?.scopeNounPlural.toLowerCase()}
                                        {on && ' selected'}
                                      </p>
                                    </div>
                                    {hasPublic && <ExposurePill public />}
                                    <span
                                      className={cn(
                                        'flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                                        on
                                          ? 'border-brand bg-brand text-white'
                                          : 'border-input bg-card text-transparent',
                                      )}
                                    >
                                      <Check className="size-3" strokeWidth={3} />
                                    </span>
                                  </button>

                                  {on && (
                                    <div className="border-t bg-card px-3 py-2">
                                      <button
                                        type="button"
                                        onClick={() => toggleExpandedSource(c.id)}
                                        className="flex w-full items-center justify-between py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                                      >
                                        Configure this source’s experience
                                        <ChevronDown
                                          className={cn(
                                            'size-3.5 transition-transform',
                                            expanded && 'rotate-180',
                                          )}
                                        />
                                      </button>
                                      {expanded && (
                                        <div className="mt-2 grid gap-1.5">
                                          {c.scopes.map((s) => {
                                            const checked = scopeSet.has(s.id)
                                            return (
                                              <button
                                                key={s.id}
                                                type="button"
                                                aria-pressed={checked}
                                                onClick={() => toggleScope(s.id)}
                                                className={cn(
                                                  'flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors',
                                                  checked
                                                    ? 'border-brand/40 bg-brand/5'
                                                    : 'hover:border-border hover:bg-secondary/40',
                                                )}
                                              >
                                                <span
                                                  className={cn(
                                                    'flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                                                    checked
                                                      ? 'border-brand bg-brand text-white'
                                                      : 'border-input bg-card text-transparent',
                                                  )}
                                                >
                                                  <Check className="size-2.5" strokeWidth={3} />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                  <p className="truncate text-xs font-medium text-foreground">
                                                    {s.name}
                                                  </p>
                                                  <p className="truncate text-[11px] text-muted-foreground">
                                                    {s.objects} objects · {s.sensitive}{' '}
                                                    sensitive · {formatBytes(s.sizeBytes)}
                                                  </p>
                                                </div>
                                                {s.publicAccess && <ExposurePill public />}
                                              </button>
                                            )
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 3 — file types */}
              {step === 2 && (
                <div className="space-y-3">
                  <StepHeading
                    title="File types"
                    subtitle="Select the file types this policy applies to."
                  />
                  <SearchableSelect
                    options={fileTypes}
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

              {/* Step 4 — classifications */}
              {step === 3 && (
                <div className="space-y-3">
                  <StepHeading
                    title="Classifications"
                    subtitle="Select the data classifications to detect."
                  />
                  <SearchableSelect
                    options={classifications.map((c) => ({
                      id: c.id,
                      label: c.label,
                      description: c.description,
                      keywords: c.abbr,
                    }))}
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

              {/* Step 5 — review */}
              {step === 4 && (
                <div className="space-y-3">
                  <StepHeading
                    title="Review policy"
                    subtitle={isEdit ? 'Confirm before saving.' : 'Confirm before creating.'}
                  />
                  <div className="overflow-hidden rounded-xl border">
                    <div className="flex items-center justify-between gap-3 border-b bg-secondary/30 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {name || 'Untitled policy'}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {provider?.name ?? 'No data type'} · {selectedConfigs.length}{' '}
                          {selectedConfigs.length === 1 ? 'source' : 'sources'} ·{' '}
                          {enabled ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                    </div>

                    {description.trim() && (
                      <ReviewRow label="Description">
                        <p className="text-sm text-foreground">{description.trim()}</p>
                      </ReviewRow>
                    )}
                    <ReviewRow label="Data type">
                      <p className="text-sm text-foreground">{provider?.name ?? '—'}</p>
                    </ReviewRow>
                    <ReviewRow label="Sources" count={selectedConfigs.length}>
                      <ChipList items={selectedConfigs.map((c) => c.name)} />
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
                      countSuffix={`of ${totalScopes}`}
                      last
                    >
                      <ChipList
                        items={selectedConfigs
                          .flatMap((c) => c.scopes)
                          .filter((s) => scopeSet.has(s.id))
                          .map((s) => s.name)}
                      />
                    </ReviewRow>
                  </div>
                </div>
              )}
            </div>
        </>

        <SheetFooter className="flex-row items-center justify-between gap-2 border-t px-5 py-4">
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
              {isEdit ? 'Save changes' : 'Create policy'}
            </Button>
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
  if (items.length === 0) return <p className="text-sm text-muted-foreground">—</p>
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
