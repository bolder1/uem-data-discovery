import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { providerById } from '@/data'
import { ProviderIcon } from '@/components/common'
import type { Configuration } from '@/types'

export function SourceSelect({
  configurations,
  value,
  onChange,
}: {
  configurations: Configuration[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="space-y-2">
      {configurations.map((c) => {
        const provider = providerById(c.providerId)!
        const on = value === c.id
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
              on ? 'border-brand/40 bg-brand/5' : 'hover:border-border hover:bg-secondary/40',
            )}
          >
            <ProviderIcon providerId={c.providerId} size="md" />
            <div className="flex-1">
              <p className="font-medium text-foreground">{c.name}</p>
              <p className="text-xs text-muted-foreground">
                {provider.name} · {c.scopes.length}{' '}
                {provider.scopeNounPlural.toLowerCase()}
              </p>
            </div>
            <span
              className={cn(
                'flex size-5 items-center justify-center rounded-full border transition-colors',
                on
                  ? 'border-brand bg-brand text-white'
                  : 'border-border bg-card text-transparent',
              )}
            >
              <Check className="size-3" strokeWidth={3} />
            </span>
          </button>
        )
      })}
    </div>
  )
}
