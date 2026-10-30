import { Plus, ShieldCheck, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AppPolicy, ManagedApp } from '@/types'

// The table's Policies column: a compact count chip that opens the policy
// multiselector, or an "Assign" button when none are set.
export function PoliciesCell({
  app,
  appPolicies,
  onAssign,
  product,
}: {
  app: ManagedApp
  appPolicies: AppPolicy[]
  onAssign: () => void
  product?: boolean
}) {
  const count = (app.policyIds ?? []).filter((id) =>
    appPolicies.some((p) => p.id === id),
  ).length

  if (count === 0) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onAssign()
        }}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
          product
            ? 'border-[#1a56db] text-[#1a56db] hover:bg-blue-50'
            : 'border-brand/40 text-brand hover:bg-brand/5',
        )}
      >
        <Plus className="size-3.5" />
        Assign
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onAssign()
      }}
      title="Edit assigned policies"
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
    >
      <ShieldCheck className="size-3.5 text-muted-foreground" />
      {count} {count === 1 ? 'policy' : 'policies'}
      <Pencil className="size-3 text-muted-foreground" />
    </button>
  )
}
