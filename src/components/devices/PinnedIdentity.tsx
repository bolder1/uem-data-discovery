// Which device this is, for the pinned row at the top of the page. It fades in
// once the big device card has scrolled away, so the admin always knows whose
// device they are reading about or about to send a command to.
import { Laptop, Smartphone, Tablet } from 'lucide-react'
import { StatusDot } from '@/components/common'
import { cn } from '@/lib/utils'
import { daysSinceCheckIn, type InventoryDevice } from '@/data/deviceInventory'

const platformIcon = { iOS: Smartphone, iPadOS: Tablet, macOS: Laptop }

/** The few facts that follow the device name in the pinned row, in reading order. */
function pinnedFacts(d: InventoryDevice): string[] {
  return [d.model]
}

export function PinnedIdentity({ d, shown }: { d: InventoryDevice; shown: boolean }) {
  const Icon = platformIcon[d.platform]
  const days = daysSinceCheckIn(d)
  const fresh = days > 7 ? 'bad' : days > 1 ? 'stale' : 'fresh'
  return (
    <span aria-hidden={!shown}
      className={cn('flex min-w-0 items-center gap-2 transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none',
        shown ? 'opacity-100' : 'pointer-events-none translate-y-1 opacity-0')}>
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate font-semibold">{d.name}</span>
      <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium',
        fresh === 'bad' ? 'border-red-200 bg-red-50 text-red-700' : fresh === 'stale' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
        <StatusDot className={fresh === 'bad' ? 'bg-red-500' : fresh === 'stale' ? 'bg-amber-500' : 'bg-emerald-500'} />
        {fresh === 'bad' ? 'Inactive' : 'Active'}
      </span>
      {pinnedFacts(d).map((fact) => (
        <span key={fact} className="hidden shrink-0 items-center gap-2 text-muted-foreground md:inline-flex"><span aria-hidden>·</span>{fact}</span>
      ))}
    </span>
  )
}
