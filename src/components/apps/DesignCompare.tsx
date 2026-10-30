// Prototype control: flip between designs while they're being reviewed.
// The choice is shared across pages (see designVariant). Delete with the losing designs.
import { cn } from '@/lib/utils'
import { useHeaderDesign } from '@/lib/designVariant'

function Choice<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div role="radiogroup" aria-label={`${label} design`} className="inline-flex items-center gap-0.5">
      <span className="px-1.5 text-muted-foreground">{label}</span>
      {options.map(([v, text]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={cn('rounded-md px-2.5 py-1 font-medium transition-colors', value === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
          {text}
        </button>
      ))}
    </div>
  )
}

export function DesignCompare() {
  const [h, setH] = useHeaderDesign()
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-dashed bg-card p-0.5 text-xs">
      <Choice label="Header" value={h} onChange={setH}
        options={[['classic', 'Classic'], ['classic-v2', 'Classic V2'], ['revamped', 'Revamped'], ['revamped-v2', 'Revamped V2']]} />
    </div>
  )
}
