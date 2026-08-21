import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// Device groups a build is added to. The row shows the count; hovering reveals
// the group names in a small card. (Prototype names, derived per app.)
const GROUP_POOL = [
  'All Windows Devices',
  'Sales Laptops',
  'Engineering Workstations',
  'Kiosk Devices',
  'Finance BYOD',
  'Executive Devices',
  'Remote Workforce',
  'QA Lab',
  'Design Team',
  'Support Desk',
  'Field Operations',
  'HR Devices',
]

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

function groupsFor(count: number, appId: string): string[] {
  const seed = hash(appId)
  const out: string[] = []
  for (let i = 0; i < count; i++) out.push(GROUP_POOL[(seed + i) % GROUP_POOL.length])
  return out
}

export function GroupAddedCell({
  count,
  appId,
  product,
}: {
  count: number
  appId: string
  product?: boolean
}) {
  if (count <= 0) {
    return <span className={product ? 'text-slate-400' : 'text-muted-foreground'}>—</span>
  }
  const groups = groupsFor(count, appId)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'cursor-default font-medium underline decoration-dotted decoration-muted-foreground/50 underline-offset-2',
            product ? 'text-slate-800' : 'text-foreground',
          )}
        >
          {count.toLocaleString()}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-60">
        <p className="mb-1.5 font-semibold">
          Added to {count} device {count === 1 ? 'group' : 'groups'}
        </p>
        <div className="flex flex-wrap gap-1">
          {groups.map((g) => (
            <span key={g} className="rounded bg-background/15 px-1.5 py-0.5">
              {g}
            </span>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
