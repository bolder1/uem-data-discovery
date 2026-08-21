import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Rule, RuleCriteriaType, RuleCriterion } from '@/types'

const CRITERIA_TYPES: RuleCriteriaType[] = [
  'Keyword',
  'Regex',
  'Dictionary',
  'File Extension',
]

const emptyCriterion = (): RuleCriterion => ({
  type: 'Keyword',
  occurrences: 1,
  value: '',
})

// One editor for both "Add rule" and "Edit rule" — the shared Rule Dictionary
// mirrors the custom-rule composer inside ClassificationWizard, but as a
// full-height Sheet so a rule with several criteria has room to breathe.
export function RuleDrawer({
  open,
  onOpenChange,
  editRule,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editRule?: Rule
}) {
  const { ruleDictionary, addRule, updateRule } = useContentFiltering()
  const isEdit = !!editRule

  const [name, setName] = useState(editRule?.name ?? '')
  const [category, setCategory] = useState(editRule?.category ?? '')
  const [criteria, setCriteria] = useState<RuleCriterion[]>(
    editRule && editRule.criteria.length ? editRule.criteria : [emptyCriterion()],
  )

  const existingCategories = Array.from(
    new Set(ruleDictionary.map((r) => r.category).filter(Boolean) as string[]),
  ).sort()

  const cleaned = criteria.filter((c) => c.value.trim())
  const valid = name.trim().length > 0 && cleaned.length > 0

  const close = (next: boolean) => onOpenChange(next)

  const handleSave = () => {
    if (!valid) return
    const payload = {
      name: name.trim(),
      category: category.trim() || undefined,
      criteria: cleaned,
    }
    if (isEdit && editRule) updateRule(editRule.id, payload)
    else addRule(payload)
    close(false)
  }

  const setCriterion = (i: number, patch: Partial<RuleCriterion>) =>
    setCriteria((prev) => prev.map((c, ci) => (ci === i ? { ...c, ...patch } : c)))

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle>{isEdit ? 'Edit rule' : 'Add rule'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update this detection rule. Changes apply everywhere the rule is used.'
              : 'Define a reusable detection rule for the shared dictionary. Any classification can then pick it up.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div className="space-y-1.5">
            <FieldLabel>
              Rule name<span className="text-red-500"> *</span>
            </FieldLabel>
            <Input
              placeholder="e.g. Employee ID number"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <FieldLabel>Category</FieldLabel>
            <Input
              list="rule-categories"
              placeholder="e.g. Government ID"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <datalist id="rule-categories">
              {existingCategories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <p className="text-xs text-muted-foreground">
              Rules are grouped by category in the dictionary and the classification picker.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FieldLabel>
                Criteria<span className="text-red-500"> *</span>
              </FieldLabel>
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
                <div key={i} className="space-y-2 rounded-md border bg-secondary/30 p-2.5">
                  <div className="flex items-start gap-2">
                    <div className="grid flex-1 grid-cols-2 gap-2">
                      <Select
                        value={c.type}
                        onValueChange={(v) =>
                          setCriterion(i, { type: v as RuleCriteriaType })
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
                          setCriterion(i, {
                            occurrences: Number(e.target.value) || 1,
                          })
                        }
                      />
                    </div>
                    {criteria.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setCriteria((prev) => prev.filter((_, ci) => ci !== i))
                        }
                        aria-label="Remove criteria"
                        className="mt-1.5 shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                  <Input
                    placeholder="Criteria value (keyword, regex, extension…)"
                    className="h-8 font-mono text-xs"
                    value={c.value}
                    onChange={(e) => setCriterion(i, { value: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t px-5 py-4">
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!valid}>
            {isEdit ? 'Save changes' : 'Add rule'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
