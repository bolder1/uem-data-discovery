// Prototype control: switch between design versions while they're compared.
// Dashed border marks it as not part of the product. Delete with the losing designs.
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ConfigDesign, SharedIpadDesign } from '@/lib/designVariant'

export function DesignSelect<T extends string>({ value, onChange, labels }: {
  value: T
  onChange: (v: T) => void
  labels: Record<T, string>
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger size="sm" className="w-[236px] shrink-0 border-dashed" aria-label="Design version">
        <span className="text-muted-foreground">Design:</span><SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {(Object.keys(labels) as T[]).map((k) => <SelectItem key={k} value={k}>{labels[k]}</SelectItem>)}
      </SelectContent>
    </Select>
  )
}

export const configDesignLabels: Record<ConfigDesign, string> = {
  v1: 'V1 · Stepper',
  v2: 'V2 · Builder',
  v3: 'V3 · One page',
  v4: 'V4 · Live summary',
  v5: 'V5 · Focus wizard',
  v6: 'V6 · Three columns',
  v7: 'V7 · Table',
}

export const sharedIpadDesignLabels: Record<SharedIpadDesign, string> = {
  v1: 'V1 · Grouped list',
  v2: 'V2 · Guided',
  v3: 'V3 · Settings list',
  v4: 'V4 · Tiles',
  v5: 'V5 · Live preview',
  v6: 'V6 · Sentence',
  v7: 'V7 · Presets',
}
