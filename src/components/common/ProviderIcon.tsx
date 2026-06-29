import {
  Cloud,
  CloudCog,
  Boxes,
  Box,
  Container,
  HardDrive,
  Package,
  FolderTree,
  Database,
  Leaf,
  Snowflake,
  MessageSquare,
  FileText,
  SquareKanban,
  NotebookText,
  Laptop,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { providerById } from '@/data'
import type { ProviderCategory, ProviderId } from '@/types'

const ICONS: Record<string, LucideIcon> = {
  'aws-s3': Boxes,
  'azure-blob': Cloud,
  gcs: Container,
  'google-drive': HardDrive,
  dropbox: Package,
  box: Box,
  onedrive: CloudCog,
  sharepoint: FolderTree,
  postgres: Database,
  mysql: Database,
  mongodb: Leaf,
  snowflake: Snowflake,
  redshift: Database,
  bigquery: Database,
  slack: MessageSquare,
  confluence: FileText,
  jira: SquareKanban,
  salesforce: CloudCog,
  notion: NotebookText,
  endpoint: Laptop,
}

const TINT: Record<ProviderCategory, string> = {
  'Cloud Storage': 'bg-blue-50 text-blue-600',
  Database: 'bg-violet-50 text-violet-600',
  SaaS: 'bg-amber-50 text-amber-600',
  Endpoint: 'bg-emerald-50 text-emerald-600',
}

// Restore the category colour when the parent `group` is hovered/focused.
// ponytail: literal class strings (mirrors TINT) so Tailwind's scanner emits
// them — runtime-built `group-hover:${cls}` strings would be purged.
const TINT_HOVER: Record<ProviderCategory, string> = {
  'Cloud Storage':
    'group-hover:bg-blue-50 group-hover:text-blue-600 group-focus-visible:bg-blue-50 group-focus-visible:text-blue-600',
  Database:
    'group-hover:bg-violet-50 group-hover:text-violet-600 group-focus-visible:bg-violet-50 group-focus-visible:text-violet-600',
  SaaS: 'group-hover:bg-amber-50 group-hover:text-amber-600 group-focus-visible:bg-amber-50 group-focus-visible:text-amber-600',
  Endpoint:
    'group-hover:bg-emerald-50 group-hover:text-emerald-600 group-focus-visible:bg-emerald-50 group-focus-visible:text-emerald-600',
}

const SIZES = {
  sm: { box: 'size-8 rounded-md', icon: 'size-4' },
  md: { box: 'size-10 rounded-lg', icon: 'size-5' },
  lg: { box: 'size-12 rounded-xl', icon: 'size-6' },
}

export function ProviderIcon({
  providerId,
  size = 'md',
  className,
  bare = false,
  muted = false,
  liftOnHover = false,
}: {
  providerId: ProviderId
  size?: keyof typeof SIZES
  className?: string
  /** Render just the glyph (no tinted tile) — used inline, e.g. breadcrumbs. */
  bare?: boolean
  /** Grey the tile (neutral fill) for not-yet-active sources. */
  muted?: boolean
  /** When muted, restore the category colour on parent `group` hover/focus. */
  liftOnHover?: boolean
}) {
  const Icon = ICONS[providerId] ?? Database
  if (bare) return <Icon className={cn('size-4', className)} />
  const category = providerById(providerId)?.category
  const wrap = muted
    ? cn(
        'bg-secondary text-muted-foreground transition-colors',
        liftOnHover && category && TINT_HOVER[category],
      )
    : category
      ? TINT[category]
      : 'bg-secondary text-muted-foreground'
  const s = SIZES[size]
  return (
    <div
      className={cn(
        'flex items-center justify-center border border-black/5',
        wrap,
        s.box,
        className,
      )}
    >
      <Icon className={s.icon} />
    </div>
  )
}
