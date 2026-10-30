// Small labelled chips for app facts, shared by the library table and the app page.
// All neutral grey; the icon tells them apart.
import { useRef, useState } from 'react'
import {
  Building2,
  Download,
  KeyRound,
  Laptop,
  MousePointerClick,
  Smartphone,
  Store,
  Tablet,
  Tag,
  type LucideIcon,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { AppCategory, LibraryApp } from '@/data/apps'

/** One line that ends in "…" when it doesn't fit, with the full text on hover. */
export function Truncated({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const cut = () => !!ref.current && ref.current.scrollWidth > ref.current.clientWidth
  return (
    <Tooltip open={open} onOpenChange={(o) => setOpen(o && cut())}>
      <TooltipTrigger asChild>
        <span ref={ref} className={cn('block truncate', className)}>{text}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs break-words">{text}</TooltipContent>
    </Tooltip>
  )
}

export function Chip({ icon: Icon, children }: { icon?: LucideIcon; children: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-medium text-foreground">
      {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground" />}
      <Truncated text={children} />
    </span>
  )
}

const platformIcon: Record<LibraryApp['platform'], LucideIcon> = { iOS: Smartphone, iPadOS: Tablet, macOS: Laptop }
const sourceIcon: Record<LibraryApp['source'], LucideIcon> = { 'App Store': Store, VPP: KeyRound, 'In-house': Building2 }

export const PlatformChip = ({ platform }: { platform: LibraryApp['platform'] }) => <Chip icon={platformIcon[platform]}>{platform}</Chip>
export const SourceChip = ({ source }: { source: LibraryApp['source'] }) => <Chip icon={sourceIcon[source]}>{source}</Chip>

export function InstallTypeChip({ type, short }: { type: LibraryApp['installType']; short?: boolean }) {
  const forced = type === 'Forced install'
  return <Chip icon={forced ? Download : MousePointerClick}>{forced ? (short ? 'Forced' : 'Forced install') : 'Available'}</Chip>
}

export function CategoryChip({ category }: { category?: AppCategory }) {
  return category ? <Chip icon={Tag}>{category.name}</Chip> : <span className="text-sm text-muted-foreground">—</span>
}
