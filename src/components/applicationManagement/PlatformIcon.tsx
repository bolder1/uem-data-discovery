import { cn } from '@/lib/utils'
import type { AppPlatform } from '@/types'

// Windows and Apple wordmark glyphs — lucide has no brand logos, so these are
// inline paths tinted via `currentColor` so they inherit the tile's text color.
function WindowsGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M3 5.5L10.5 4.5V11.5H3V5.5M11.5 4.4L21 3V11.4H11.5V4.4M3 12.5H10.5V19.6L3 18.6V12.5M11.5 12.5H21V21L11.5 19.7V12.5" />
    </svg>
  )
}

function AppleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M16.365 1.43c0 1.14-.463 2.239-1.207 3.03-.845.892-2.24 1.573-3.33 1.573-.13 0-.26-.02-.35-.04-.02-.09-.05-.32-.05-.55 0-1.14.51-2.29 1.28-3.06.87-.87 2.37-1.53 3.6-1.61.02.13.06.42.06.66zm4.1 16.34c-.39.9-.57 1.3-1.06 2.1-.68 1.1-1.64 2.48-2.83 2.49-1.06.01-1.33-.68-2.77-.67-1.44.01-1.74.68-2.8.67-1.19-.01-2.1-1.25-2.78-2.35-1.9-3.1-2.1-6.73-.93-8.67.83-1.38 2.14-2.19 3.37-2.19 1.25 0 2.04.69 3.07.69 1 0 1.62-.69 3.07-.69 1.09 0 2.25.6 3.07 1.63-2.7 1.48-2.26 5.33.59 6.99z" />
    </svg>
  )
}

export const PLATFORM_META: Record<
  AppPlatform,
  { label: string; tint: string; Glyph: typeof WindowsGlyph }
> = {
  windows: { label: 'Windows', tint: 'bg-blue-50 text-blue-600', Glyph: WindowsGlyph },
  macos: { label: 'macOS', tint: 'bg-slate-100 text-slate-700', Glyph: AppleGlyph },
}

export const platformLabel = (platform: AppPlatform) => PLATFORM_META[platform].label

const SIZES = {
  sm: { box: 'size-8 rounded-md', icon: 'size-4' },
  md: { box: 'size-10 rounded-lg', icon: 'size-5' },
  lg: { box: 'size-14 rounded-xl', icon: 'size-7' },
}

export function PlatformIcon({
  platform,
  size = 'md',
  className,
  bare = false,
}: {
  platform: AppPlatform
  size?: keyof typeof SIZES
  className?: string
  /** Render just the glyph (no tinted tile) — used inline, e.g. in menus. */
  bare?: boolean
}) {
  const { tint, Glyph } = PLATFORM_META[platform]
  if (bare) return <Glyph className={cn('size-4', className)} />
  const s = SIZES[size]
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center border border-black/5',
        tint,
        s.box,
        className,
      )}
    >
      <Glyph className={s.icon} />
    </div>
  )
}
