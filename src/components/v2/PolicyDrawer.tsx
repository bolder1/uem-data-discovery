import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Check,
  ChevronDown,
  Minus,
  X,
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
import { Stepper, AuditStamp, ProviderIcon } from '@/components/common'
import { ExposurePill } from '@/components/discovery/ScopeTable'
import { SearchableSelect } from '@/components/v2/SearchableSelect'
import { Combobox, type FilterGroup } from '@/components/v2/Combobox'
import { fileTypeIcon, classificationIcon } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { formatBytes } from '@/lib/format'
import { policySources } from '@/lib/policySources'
import type { Configuration, Policy } from '@/types'

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

const STEPS = [
  { key: 'basics', label: 'Basics' },
  { key: 'source', label: 'Data sources' },
  { key: 'filetypes', label: 'File types' },
  { key: 'classification', label: 'Classification' },
  { key: 'review', label: 'Review' },
]

export function PolicyDrawer({
  open,
  onOpenChange,
  initialConfigId,
  policy,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-select a connection (e.g. arriving from "Create policy" on a source). */
  initialConfigId?: string
  /** When set, the drawer edits this policy instead of creating a new one. */
  policy?: Policy
}) {
  const navigate = useNavigate()
  const { configurations, addPolicy, updatePolicy } = useDataDiscovery()

  const editing = !!policy
  const initialCfg = initialConfigId
    ? configurations.find((c) => c.id === initialConfigId)
    : undefined
  // Sources the edited policy already targets (empty when creating).
  const policyCfgs = policy ? policySources(policy, configurations) : []

  const [step, setStep] = useState(0)
  const [name, setName] = useState(policy?.name ?? '')
  const [description, setDescription] = useState(policy?.description ?? '')
  const [enabled, setEnabled] = useState(policy?.status ?? true)

  // Step 2 — everything about "what to scan where" lives in one place.
  // browseType is only a lens for the list below; the selected buckets
  // (scopeSet) are the single source of truth and survive switching types,
  // so a policy can freely mix sources across data types.
  const [browseType, setBrowseType] = useState(
    policyCfgs[0]?.providerId ?? initialCfg?.providerId ?? '',
  )
  const [expanded, setExpanded] = useState<Set<string>>(
    () =>
      new Set(
        policy ? policyCfgs.map((c) => c.id) : initialCfg ? [initialCfg.id] : [],
      ),
  )
  const [scopeSet, setScopeSet, toggleScope] = useToggleSet(
    () =>
      new Set(policy?.scopeIds ?? initialCfg?.scopes.map((s) => s.id) ?? []),
  )

  const [fileTypeSet, setFileTypeSet, toggleFileType] = useToggleSet(
    () => new Set(policy?.fileTypeIds ?? []),
  )
  const [classSet, setClassSet, toggleClass] = useToggleSet(
    () => new Set(policy?.classificationIds ?? []),
  )
  const [confirmClose, setConfirmClose] = useState(false)
  const [saved, setSaved] = useState<Policy | null>(null)

  // A source is part of the policy when at least one of its buckets is picked.
  const selectedConfigs = configurations.filter((c) =>
    c.scopes.some((s) => scopeSet.has(s.id)),
  )
  const selectedTypeIds = [...new Set(selectedConfigs.map((c) => c.providerId))]
  const selectedTypes = selectedTypeIds
    .map((id) => providerById(id))
    .filter((p): p is NonNullable<typeof p> => !!p)
  // Bucket / Container / Schema… only when the whole selection shares one type.
  const policyNoun =
    selectedTypes.length === 1 ? selectedTypes[0].scopeNounPlural : 'Targets'
  const totalScopes = selectedConfigs.reduce((n, c) => n + c.scopes.length, 0)
  const selCount = (c: Configuration) =>
    c.scopes.filter((s) => scopeSet.has(s.id)).length

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

  const browsedProvider = browseType ? providerById(browseType) : undefined
  const browseNoun = (browsedProvider?.scopeNounPlural ?? 'Buckets').toLowerCase()
  const configsForType = configurations.filter((c) => c.providerId === browseType)
  const typeScopeIds = configsForType.flatMap((c) => c.scopes.map((s) => s.id))
  const allTypeSelected =
    typeScopeIds.length > 0 && typeScopeIds.every((id) => scopeSet.has(id))

  // Switching the browsed type keeps every selection; small types open expanded.
  const changeBrowseType = (pid: string) => {
    setBrowseType(pid)
    const cfgs = configurations.filter((c) => c.providerId === pid)
    if (cfgs.length <= 3)
      setExpanded((prev) => new Set([...prev, ...cfgs.map((c) => c.id)]))
  }
  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const setScopes = (ids: string[], checked: boolean) =>
    setScopeSet((prev) => {
      const n = new Set(prev)
      ids.forEach((id) => (checked ? n.add(id) : n.delete(id)))
      return n
    })
  // Source checkbox = all of its buckets; type "Select all" = every bucket
  // on every source of the browsed type.
  const toggleSourceAll = (cfg: Configuration) => {
    const ids = cfg.scopes.map((s) => s.id)
    setScopes(ids, !ids.every((id) => scopeSet.has(id)))
  }
  const toggleTypeAll = () => setScopes(typeScopeIds, !allTypeSelected)
  const removeSource = (cfg: Configuration) =>
    setScopes(cfg.scopes.map((s) => s.id), false)
  // From the summary, jump the lens back to a selected source's type.
  const revealSource = (cfg: Configuration) => {
    setBrowseType(cfg.providerId)
    setExpanded((prev) => new Set([...prev, cfg.id]))
  }

  const sameSet = (set: Set<string>, ids: string[]) =>
    set.size === ids.length && ids.every((id) => set.has(id))
  // Editing is dirty only once something differs from the saved policy.
  const dirty =
    !saved &&
    (policy
      ? name.trim() !== policy.name ||
        description.trim() !== (policy.description ?? '') ||
        enabled !== policy.status ||
        !sameSet(scopeSet, policy.scopeIds) ||
        !sameSet(fileTypeSet, policy.fileTypeIds) ||
        !sameSet(classSet, policy.classificationIds)
      : name.trim().length > 0 ||
        scopeSet.size > 0 ||
        fileTypeSet.size > 0 ||
        classSet.size > 0)

  const canNext =
    step === 0
      ? name.trim().length > 0
      : step === 1
        ? scopeSet.size > 0
        : step === 2
          ? fileTypeSet.size > 0
          : step === 3
            ? classSet.size > 0
            : true

  const requestClose = () => {
    if (dirty) setConfirmClose(true)
    else onOpenChange(false)
  }

  const handleSave = () => {
    const ids = selectedConfigs.map((c) => c.id)
    const patch = {
      name: name.trim(),
      description: description.trim() || undefined,
      status: enabled,
      fileTypeIds: [...fileTypeSet],
      classificationIds: [...classSet],
      configurationId: ids[0],
      configurationIds: ids,
      scopeIds: [...scopeSet],
    }
    if (policy) {
      updatePolicy(policy.id, patch)
      setSaved({ ...policy, ...patch })
    } else {
      setSaved(addPolicy(patch))
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && requestClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle>
            {saved
              ? editing
                ? 'Policy updated'
                : 'Policy created'
              : editing
                ? 'Edit policy'
                : 'Create policy'}
          </SheetTitle>
          <SheetDescription>
            {saved
              ? editing
                ? `Changes to “${saved.name}” have been saved.`
                : `“${saved.name}” is ${saved.status ? 'enabled' : 'saved as disabled'}.`
              : 'Define what to scan for and which sources to target.'}
          </SheetDescription>
        </SheetHeader>

        {saved ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-7" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Targets {selectedConfigs.length}{' '}
                {selectedConfigs.length === 1 ? 'source' : 'sources'} ·{' '}
                {saved.scopeIds.length} {policyNoun.toLowerCase()}.
              </p>
              <div className="mt-4">
                <AuditStamp at={saved.createdAt} by={saved.createdBy} />
              </div>
            </div>
          </div>
        ) : (
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

              {/* Step 2 — data sources: type → sources → buckets, in one place */}
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
                      <StepHeading
                        title="Data sources"
                        subtitle="Pick a data type, its sources, then the exact targets inside. Selections are kept when you switch types, so one policy can span several sources."
                      />

                      <div className="space-y-1.5">
                        <Label>
                          Data type<span className="text-red-500"> *</span>
                        </Label>
                        <Combobox
                          options={dataTypeOptions}
                          selected={new Set(browseType ? [browseType] : [])}
                          onSelect={changeBrowseType}
                          placeholder="Select a data type…"
                          searchPlaceholder="Search data types…"
                          filters={dataTypeFilters}
                          renderIcon={(o) => <ProviderIcon providerId={o.id} bare />}
                          renderMeta={(o) => {
                            const picked = configurations.filter(
                              (c) =>
                                c.providerId === o.id &&
                                c.scopes.some((s) => scopeSet.has(s.id)),
                            ).length
                            return picked > 0 ? (
                              <span className="shrink-0 text-xs font-medium text-brand">
                                {picked} selected
                              </span>
                            ) : (
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {o.count}
                              </span>
                            )
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>
                            Sources & {browseNoun}
                            <span className="text-red-500"> *</span>
                          </Label>
                          {browseType && typeScopeIds.length > 0 && (
                            <button
                              type="button"
                              onClick={toggleTypeAll}
                              className="text-xs font-medium text-primary"
                            >
                              {allTypeSelected
                                ? 'Clear all'
                                : `Select all sources & ${browseNoun}`}
                            </button>
                          )}
                        </div>

                        {!browseType ? (
                          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                            Select a data type to browse its sources.
                          </div>
                        ) : (
                          <div className="grid gap-2">
                            {configsForType.map((c) => {
                              const ids = c.scopes.map((s) => s.id)
                              const sel = selCount(c)
                              const state: TriState =
                                sel === 0 ? 'off' : sel === ids.length ? 'on' : 'partial'
                              const isOpen = expanded.has(c.id)
                              const hasPublic = c.scopes.some((s) => s.publicAccess)
                              return (
                                <div
                                  key={c.id}
                                  className={cn(
                                    'overflow-hidden rounded-xl border transition-colors',
                                    state !== 'off' && 'border-brand/50',
                                  )}
                                >
                                  <div
                                    className={cn(
                                      'flex items-center gap-3 p-3 transition-colors',
                                      state === 'on' && 'bg-brand/5',
                                    )}
                                  >
                                    <TriBox
                                      state={state}
                                      onClick={() => toggleSourceAll(c)}
                                      label={`Select all ${browseNoun} in ${c.name}`}
                                    />
                                    <button
                                      type="button"
                                      aria-expanded={isOpen}
                                      onClick={() => toggleExpand(c.id)}
                                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                    >
                                      <ProviderIcon providerId={c.providerId} size="sm" />
                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-foreground">
                                          {c.name}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                          {sel > 0
                                            ? `${sel} of ${ids.length} ${browseNoun} selected`
                                            : `${ids.length} ${browseNoun}`}
                                        </p>
                                      </div>
                                      {hasPublic && <ExposurePill public />}
                                      <ChevronDown
                                        className={cn(
                                          'size-4 shrink-0 text-muted-foreground transition-transform',
                                          isOpen && 'rotate-180',
                                        )}
                                      />
                                    </button>
                                  </div>

                                  {isOpen && (
                                    <div className="divide-y border-t">
                                      {c.scopes.map((s) => {
                                        const on = scopeSet.has(s.id)
                                        return (
                                          <button
                                            key={s.id}
                                            type="button"
                                            aria-pressed={on}
                                            onClick={() => toggleScope(s.id)}
                                            className={cn(
                                              'flex w-full items-center gap-3 py-2.5 pl-[52px] pr-4 text-left transition-colors',
                                              on ? 'bg-brand/5' : 'hover:bg-secondary/40',
                                            )}
                                          >
                                            <span
                                              className={cn(
                                                'flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors',
                                                on
                                                  ? 'border-brand bg-brand text-white'
                                                  : 'border-input bg-card text-transparent',
                                              )}
                                            >
                                              <Check className="size-3" strokeWidth={3} />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                              <p className="truncate text-sm text-foreground">
                                                {s.name}
                                              </p>
                                              <p className="truncate text-xs text-muted-foreground">
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
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* Everything picked so far, across all data types. */}
                      {selectedConfigs.length > 0 && (
                        <div className="overflow-hidden rounded-xl border">
                          <div className="flex items-center justify-between border-b bg-secondary/30 px-4 py-2.5">
                            <p className="text-xs font-medium text-foreground">
                              Selected · {selectedConfigs.length}{' '}
                              {selectedConfigs.length === 1 ? 'source' : 'sources'} ·{' '}
                              {scopeSet.size} {policyNoun.toLowerCase()}
                              {selectedTypes.length > 1 &&
                                ` across ${selectedTypes.length} data types`}
                            </p>
                            <button
                              type="button"
                              onClick={() => setScopeSet(new Set())}
                              className="text-xs font-medium text-primary"
                            >
                              Clear all
                            </button>
                          </div>
                          <div className="max-h-56 divide-y overflow-y-auto">
                            {selectedConfigs.map((c) => {
                              const p = providerById(c.providerId)
                              return (
                                <div
                                  key={c.id}
                                  className="flex items-center gap-3 px-4 py-2.5"
                                >
                                  <button
                                    type="button"
                                    onClick={() => revealSource(c)}
                                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                    title="Show this source in the list above"
                                  >
                                    <ProviderIcon providerId={c.providerId} size="sm" />
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm text-foreground">
                                        {c.name}
                                      </p>
                                      <p className="truncate text-xs text-muted-foreground">
                                        {p?.name} · {selCount(c)} of {c.scopes.length}{' '}
                                        {p?.scopeNounPlural.toLowerCase()}
                                      </p>
                                    </div>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeSource(c)}
                                    aria-label={`Remove ${c.name}`}
                                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                  >
                                    <X className="size-4" />
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
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
                    title={editing ? 'Review changes' : 'Review policy'}
                    subtitle={editing ? 'Confirm before saving.' : 'Confirm before creating.'}
                  />
                  <div className="overflow-hidden rounded-xl border">
                    <div className="flex items-center justify-between gap-3 border-b bg-secondary/30 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {name || 'Untitled policy'}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {selectedTypes.length === 0
                            ? 'No data sources'
                            : selectedTypes.length === 1
                              ? selectedTypes[0].name
                              : `${selectedTypes.length} data types`}{' '}
                          · {selectedConfigs.length}{' '}
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
                    <ReviewRow label="Data types" count={selectedTypes.length}>
                      <ChipList items={selectedTypes.map((p) => p.name)} />
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
                      label={policyNoun}
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
        )}

        <SheetFooter className="flex-row items-center justify-between gap-2 border-t px-5 py-4">
          {saved ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  onOpenChange(false)
                  navigate(`/data-discovery/policies/${saved.id}`)
                }}
              >
                View details
                <ArrowRight className="size-4" />
              </Button>
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
                <Button onClick={handleSave} disabled={editing && !dirty}>
                  <ShieldCheck className="size-4" />
                  {editing ? 'Save changes' : 'Create policy'}
                </Button>
              )}
            </>
          )}
        </SheetFooter>
      </SheetContent>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {editing ? 'Discard changes?' : 'Discard this policy?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {editing
                ? 'Your unsaved changes will be lost.'
                : 'Your progress here will be lost.'}
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

type TriState = 'on' | 'partial' | 'off'

function TriBox({
  state,
  onClick,
  label,
}: {
  state: TriState
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === 'on' ? true : state === 'partial' ? 'mixed' : false}
      aria-label={label}
      onClick={onClick}
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
        state !== 'off'
          ? 'border-brand bg-brand text-white'
          : 'border-input bg-card text-transparent hover:border-brand/50',
      )}
    >
      {state === 'partial' ? (
        <Minus className="size-3" strokeWidth={3} />
      ) : (
        <Check className="size-3" strokeWidth={3} />
      )}
    </button>
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
