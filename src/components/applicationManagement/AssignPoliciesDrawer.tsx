import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Info, X, ShieldCheck } from 'lucide-react'
import { useApplicationManagement } from '@/store/ApplicationManagementContext'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ManagedApp } from '@/types'
import { AppIcon } from './AppIcon'
import { PolicySelect } from './PolicySelect'

// Opened from the table's "Assign" action — pick the policies (profile) that
// apply to an existing app.
export function AssignPoliciesDrawer({
  app,
  onOpenChange,
  skin,
}: {
  app: ManagedApp | null
  onOpenChange: (open: boolean) => void
  skin?: 'product'
}) {
  const product = skin === 'product'
  const { appPolicies, assignPolicies } = useApplicationManagement()
  const [sel, setSel] = useState<string[]>(app?.policyIds ?? [])

  if (!app) return null

  const save = () => {
    assignPolicies(app.id, sel)
    onOpenChange(false)
  }

  return (
    <Sheet open={!!app} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        data-skin={product ? 'product' : undefined}
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
      >
        <SheetHeader className="flex-row items-center gap-3 border-b px-5 py-4 text-left">
          <AppIcon app={app} size="sm" showPlatformBadge />
          <div className="min-w-0">
            <SheetTitle>Assign policies</SheetTitle>
            <SheetDescription className="truncate">
              {app.name} · {app.publisher}
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div
            className={cn(
              'flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm',
              product ? 'border-blue-200 bg-blue-50' : 'border-brand/20 bg-brand/5',
            )}
          >
            <Info
              className={cn('mt-0.5 size-4 shrink-0', product ? 'text-blue-600' : 'text-brand')}
            />
            <p className={product ? 'text-blue-900/80' : 'text-muted-foreground'}>
              The policy at the top of the hierarchy is the{' '}
              <span className="font-semibold">active</span> one — it takes precedence
              for every device group it targets. Reorder the hierarchy in the{' '}
              <Link
                to="/application-management/policies"
                className={cn(
                  'font-semibold underline underline-offset-2',
                  product ? 'text-blue-700' : 'text-brand',
                )}
              >
                Policy tab
              </Link>
              .
            </p>
          </div>

          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ShieldCheck className="size-4 text-muted-foreground" />
              Profile policies
            </p>
            <PolicySelect policies={appPolicies} value={sel} onChange={setSel} />
          </div>
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t px-5 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className={cn(product && 'h-11 rounded-[4px] border-[#1a56db] px-5 font-semibold text-[#1a56db] hover:bg-blue-50 hover:text-[#1e40af]')}
          >
            {product && <X className="size-4" />}
            Cancel
          </Button>
          <Button
            onClick={save}
            className={cn(product && 'h-11 rounded-[4px] bg-[#1a56db] px-5 font-semibold hover:bg-[#1e40af]')}
          >
            Save assignment
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
