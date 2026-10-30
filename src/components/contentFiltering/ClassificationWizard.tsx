import { useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Plus,
  ShieldCheck,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { useContentFiltering } from '@/store/ContentFilteringContext'
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
import { Label as FieldLabel } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
import { Stepper } from '@/components/common'
import { LabelMultiSelect } from '@/components/contentFiltering/LabelMultiSelect'
import { cn } from '@/lib/utils'
import type { DlpClassification, Rule, RuleCriteriaType } from '@/types'

const CRITERIA_TYPES: RuleCriteriaType[] = [
  'Keyword',
  'Regex',
  'Dictionary',
  'File Extension',
]

function emptyCriterion() {
  return { type: 'Keyword' as RuleCriteriaType, occurrences: 1, value: '' }
}

const STEPS = [
  { key: 'basics', label: 'Basics' },
  { key: 'labels', label: 'Labels' },
  { key: 'rules', label: 'Detection Rules' },
  { key: 'review', label: 'Review' },
]

export function ClassificationWizard({
  open,
  onOpenChange,
  editClassification,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, edits this classification instead of creating a new one. */
  editClassification?: DlpClassification
}) {
  const { labels, ruleDictionary, addLabel, addClassification, updateClassification } =
    useContentFiltering()
  const isEdit = !!editClassification
  const isReadOnly = !!editClassification?.isDefault

  const [step, setStep] = useState(isReadOnly ? 3 : 0)
  const [name, setName] = useState(editClassification?.name ?? '')
  const [description, setDescription] = useState(editClassification?.description ?? '')
  const [labelIds, setLabelIds] = useState<string[]>(editClassification?.labelIds ?? [])
  const [ruleIds, setRuleIds] = useState<Set<string>>(
    () => new Set(editClassification?.ruleIds ?? []),
  )
  const [customRules, setCustomRules] = useState<Rule[]>(
    editClassification?.customRules ?? [],
  )
  const [confirmClose, setConfirmClose] = useState(false)

  const toggleLabel = (id: string) =>
    setLabelIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const toggleRule = (id: string) =>
    setRuleIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const removeCustomRule = (id: string) => {
    setCustomRules((prev) => prev.filter((r) => r.id !== id))
    setRuleIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const addCustomRule = (rule: Rule) => {
    setCustomRules((prev) => [rule, ...prev])
    setRuleIds((prev) => new Set(prev).add(rule.id))
  }

  const totalRulesSelected = ruleIds.size
  const dirty =
    !isReadOnly &&
    (name.trim().length > 0 ||
      description.trim().length > 0 ||
      labelIds.length > 0 ||
      totalRulesSelected > 0)

  const canNext =
    step === 0
      ? name.trim().length > 0 && description.trim().length > 0
      : step === 1
        ? labelIds.length > 0
        : step === 2
          ? totalRulesSelected > 0
          : true

  const requestClose = () => {
    if (dirty) setConfirmClose(true)
    else onOpenChange(false)
  }

  const handleSave = () => {
    const input = {
      name: name.trim(),
      description: description.trim(),
      labelIds,
      ruleIds: [...ruleIds].filter((id) => ruleDictionary.some((r) => r.id === id)),
      customRules,
    }
    if (editClassification) {
      updateClassification(editClassification.id, input)
    } else {
      addClassification(input)
    }
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !next && requestClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle>
            {isReadOnly
              ? editClassification!.name
              : isEdit
                ? 'Edit Classification'
                : 'Add Classification'}
          </SheetTitle>
          <SheetDescription>
            {isReadOnly
              ? 'Default classifications are read-only.'
              : 'Categorize sensitive data by pairing a sensitivity label with detection rules.'}
          </SheetDescription>
        </SheetHeader>

        {!isReadOnly && (
          <div className="border-b px-5 py-4">
            <Stepper steps={STEPS} current={step} onStepClick={setStep} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {step === 0 && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <FieldLabel>
                  Name<span className="text-red-500"> *</span>
                </FieldLabel>
                <Input
                  placeholder="e.g. Project Falcon Docs"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isReadOnly}
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel>
                  Description<span className="text-red-500"> *</span>
                </FieldLabel>
                <Textarea
                  placeholder="What this classification identifies and why it matters."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isReadOnly}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <StepHeading
                title="Sensitivity labels"
                subtitle="Tag how sensitive this data is. Type a new name to create a label on the fly."
              />
              <LabelMultiSelect
                labels={labels}
                selectedIds={labelIds}
                onToggle={toggleLabel}
                onCreate={addLabel}
              />
            </div>
          )}

          {step === 2 && (
            <RulesStep
              ruleDictionary={ruleDictionary}
              customRules={customRules}
              selected={ruleIds}
              onToggle={toggleRule}
              onAddCustomRule={addCustomRule}
              onRemoveCustomRule={removeCustomRule}
              readOnly={isReadOnly}
            />
          )}

          {step === 3 && (
            <ReviewStep
              name={name}
              description={description}
              labelIds={labelIds}
              ruleDictionary={ruleDictionary}
              customRules={customRules}
              selectedRuleIds={ruleIds}
            />
          )}
        </div>

        <SheetFooter className="flex-row items-center justify-between gap-2 border-t px-5 py-4">
          {isReadOnly ? (
            <Button
              variant="outline"
              className="ml-auto"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
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
                <Button onClick={handleSave}>
                  <ShieldCheck className="size-4" />
                  {isEdit ? 'Save changes' : 'Add Classification'}
                </Button>
              )}
            </>
          )}
        </SheetFooter>
      </SheetContent>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this classification?</AlertDialogTitle>
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

/* ------------------------------------ Rules step ---------------------------- */

function RulesStep({
  ruleDictionary,
  customRules,
  selected,
  onToggle,
  onAddCustomRule,
  onRemoveCustomRule,
  readOnly,
}: {
  ruleDictionary: Rule[]
  customRules: Rule[]
  selected: Set<string>
  onToggle: (id: string) => void
  onAddCustomRule: (rule: Rule) => void
  onRemoveCustomRule: (id: string) => void
  readOnly: boolean
}) {
  const [query, setQuery] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    () => new Set(),
  )

  const q = query.trim().toLowerCase()
  const matches = (r: Rule) =>
    !q || `${r.name} ${r.category ?? ''}`.toLowerCase().includes(q)

  const categories = [...new Set(ruleDictionary.map((r) => r.category ?? 'Other'))]
  const categoryGroups = categories
    .map((cat) => ({
      category: cat,
      rules: ruleDictionary.filter((r) => (r.category ?? 'Other') === cat && matches(r)),
    }))
    .filter((g) => g.rules.length > 0)

  const visibleCustomRules = customRules.filter(matches)

  const toggleCategory = (cat: string) =>
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })

  return (
    <div className="space-y-4">
      <StepHeading
        title="Detection rules"
        subtitle="Pick from the shared rule dictionary, or write a one-off rule just for this classification."
      />

      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rules or categories…"
            className="h-9"
          />
        </div>
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          {selected.size} selected
        </span>
      </div>

      {!readOnly && (
        <CustomRuleComposer
          open={composerOpen}
          onOpenChange={setComposerOpen}
          onSave={(rule) => {
            onAddCustomRule(rule)
            setComposerOpen(false)
          }}
        />
      )}

      {visibleCustomRules.length > 0 && (
        <div className="space-y-1.5">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Custom rules on this classification
          </p>
          <div className="divide-y rounded-lg border">
            {visibleCustomRules.map((r) => (
              <RuleRow
                key={r.id}
                rule={r}
                checked={selected.has(r.id)}
                onToggle={() => onToggle(r.id)}
                onRemove={!readOnly ? () => onRemoveCustomRule(r.id) : undefined}
                badge="Custom"
              />
            ))}
          </div>
        </div>
      )}

      {categoryGroups.length === 0 && visibleCustomRules.length === 0 ? (
        <p className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
          No rules match “{query}”.
        </p>
      ) : (
        <div className="space-y-3">
          {categoryGroups.map(({ category, rules }) => {
            const collapsed = collapsedCategories.has(category)
            const selectedInGroup = rules.filter((r) => selected.has(r.id)).length
            return (
              <div key={category} className="rounded-lg border">
                <button
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                >
                  <span className="text-sm font-medium text-foreground">{category}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {selectedInGroup > 0 && `${selectedInGroup} of `}
                    {rules.length}
                    <ChevronDown
                      className={cn(
                        'size-3.5 transition-transform',
                        !collapsed && 'rotate-180',
                      )}
                    />
                  </span>
                </button>
                {!collapsed && (
                  <div className="divide-y border-t">
                    {rules.map((r) => (
                      <RuleRow
                        key={r.id}
                        rule={r}
                        checked={selected.has(r.id)}
                        onToggle={() => onToggle(r.id)}
                        badge="Default"
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RuleRow({
  rule,
  checked,
  onToggle,
  onRemove,
  badge,
}: {
  rule: Rule
  checked: boolean
  onToggle: () => void
  onRemove?: () => void
  badge: 'Default' | 'Custom'
}) {
  return (
    <div
      className={cn(
        'flex w-full items-center gap-3 px-3 py-2.5 transition-colors',
        checked && 'bg-brand/5',
      )}
    >
      <button
        type="button"
        aria-pressed={checked}
        onClick={onToggle}
        className="flex flex-1 items-center gap-3 text-left"
      >
        <span
          className={cn(
            'flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors',
            checked ? 'border-brand bg-brand text-white' : 'border-input bg-card text-transparent',
          )}
        >
          <Check className="size-3" strokeWidth={3} />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-foreground">{rule.name}</span>
        <Badge variant={badge === 'Default' ? 'outline' : 'secondary'} className="shrink-0 text-[10px]">
          {badge}
        </Badge>
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Delete ${rule.name}`}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  )
}

function CustomRuleComposer({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (rule: Rule) => void
}) {
  const [ruleName, setRuleName] = useState('')
  const [criteria, setCriteria] = useState([emptyCriterion()])
  const [tags, setTags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState('')

  const reset = () => {
    setRuleName('')
    setCriteria([emptyCriterion()])
    setTags([])
    setTagDraft('')
  }

  const save = () => {
    if (!ruleName.trim()) return
    onSave({
      id: `custom-${Math.random().toString(36).slice(2, 9)}`,
      name: ruleName.trim(),
      isDefault: false,
      criteria: criteria.filter((c) => c.value.trim()),
      tags: tags.length ? tags : undefined,
    })
    reset()
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-2.5 text-sm font-medium text-brand transition-colors hover:border-brand/40 hover:bg-brand/5"
      >
        <Plus className="size-4" />
        Write a custom rule
      </button>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border bg-secondary/30 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">New custom rule</p>
        <button
          type="button"
          onClick={() => {
            reset()
            onOpenChange(false)
          }}
          aria-label="Close"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Scoped to this classification only — it won't be added to the shared rule dictionary.
      </p>

      <div className="space-y-1.5">
        <FieldLabel>
          Rule name<span className="text-red-500"> *</span>
        </FieldLabel>
        <Input
          placeholder="e.g. Internal project codename"
          value={ruleName}
          onChange={(e) => setRuleName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <FieldLabel>Criteria</FieldLabel>
          <button
            type="button"
            onClick={() => setCriteria((prev) => [...prev, emptyCriterion()])}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
          >
            <Plus className="size-3.5" />
            Add criteria
          </button>
        </div>
        <div className="space-y-2">
          {criteria.map((c, i) => (
            <div key={i} className="space-y-2 rounded-md border bg-card p-2.5">
              <div className="flex items-start gap-2">
                <div className="grid flex-1 grid-cols-2 gap-2">
                  <Select
                    value={c.type}
                    onValueChange={(v) =>
                      setCriteria((prev) =>
                        prev.map((x, xi) =>
                          xi === i ? { ...x, type: v as RuleCriteriaType } : x,
                        ),
                      )
                    }
                  >
                    <SelectTrigger className="h-8 w-full text-xs">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CRITERIA_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Occurrences"
                    className="h-8 text-xs"
                    value={c.occurrences}
                    onChange={(e) =>
                      setCriteria((prev) =>
                        prev.map((x, xi) =>
                          xi === i ? { ...x, occurrences: Number(e.target.value) || 1 } : x,
                        ),
                      )
                    }
                  />
                </div>
                {criteria.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setCriteria((prev) => prev.filter((_, xi) => xi !== i))}
                    aria-label="Remove criteria"
                    className="mt-1.5 shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
              <Input
                placeholder="Criteria value (keyword, regex, extension…)"
                className="h-8 text-xs"
                value={c.value}
                onChange={(e) =>
                  setCriteria((prev) =>
                    prev.map((x, xi) => (xi === i ? { ...x, value: e.target.value } : x)),
                  )
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel>Tags</FieldLabel>
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground"
            >
              <Tag className="size-3" />
              {t}
              <button
                type="button"
                onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                aria-label={`Remove ${t}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <Input
            className="h-7 w-32 text-xs"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && tagDraft.trim()) {
                e.preventDefault()
                setTags((prev) => [...prev, tagDraft.trim()])
                setTagDraft('')
              }
            }}
            placeholder="Add a tag…"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            reset()
            onOpenChange(false)
          }}
        >
          Cancel
        </Button>
        <Button size="sm" onClick={save} disabled={!ruleName.trim()}>
          Add to classification
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------ Review step --------------------------- */

function ReviewStep({
  name,
  description,
  labelIds,
  ruleDictionary,
  customRules,
  selectedRuleIds,
}: {
  name: string
  description: string
  labelIds: string[]
  ruleDictionary: Rule[]
  customRules: Rule[]
  selectedRuleIds: Set<string>
}) {
  const { labels } = useContentFiltering()
  const selectedLabels = labels.filter((l) => labelIds.includes(l.id))
  const selectedDictionaryRules = ruleDictionary.filter((r) => selectedRuleIds.has(r.id))
  const selectedCustomRules = customRules.filter((r) => selectedRuleIds.has(r.id))

  return (
    <div className="space-y-3">
      <StepHeading title="Review classification" subtitle="Confirm before saving." />
      <div className="overflow-hidden rounded-xl border">
        <div className="border-b bg-secondary/30 px-4 py-3">
          <p className="truncate text-sm font-semibold text-foreground">
            {name || 'Untitled classification'}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {description || 'No description yet.'}
          </p>
        </div>

        <ReviewRow label="Labels" count={selectedLabels.length}>
          <ChipList items={selectedLabels.map((l) => l.name)} />
        </ReviewRow>
        <ReviewRow
          label="Detection rules"
          count={selectedDictionaryRules.length + selectedCustomRules.length}
          last={selectedCustomRules.length === 0}
        >
          <ChipList items={selectedDictionaryRules.map((r) => r.name)} />
        </ReviewRow>
        {selectedCustomRules.length > 0 && (
          <ReviewRow label="Custom rules" count={selectedCustomRules.length} last>
            <ChipList items={selectedCustomRules.map((r) => r.name)} />
          </ReviewRow>
        )}
      </div>
    </div>
  )
}

function ReviewRow({
  label,
  count,
  last,
  children,
}: {
  label: string
  count?: number
  last?: boolean
  children: ReactNode
}) {
  return (
    <div className={cn('flex gap-4 px-4 py-3', !last && 'border-b')}>
      <div className="w-32 shrink-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {count != null && (
          <p className="mt-0.5 text-xs text-muted-foreground/70">{count} selected</p>
        )}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function ChipList({ items, max = 8 }: { items: string[]; max?: number }) {
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
