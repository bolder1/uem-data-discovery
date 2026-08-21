import { AppWindow } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AppPlatform } from '@/types'
import { PlatformIcon } from './PlatformIcon'

const SIZES = {
  sm: { box: 'size-9 rounded-md', icon: 'size-4', badge: 'size-4 -right-1 -bottom-1', glyph: 'size-2.5' },
  md: { box: 'size-11 rounded-lg', icon: 'size-5', badge: 'size-5 -right-1 -bottom-1', glyph: 'size-3' },
  lg: { box: 'size-14 rounded-xl', icon: 'size-7', badge: 'size-6 -right-1.5 -bottom-1.5', glyph: 'size-3.5' },
}

// The app's real logo when it has one, else a neutral placeholder tile. An
// optional corner badge keeps the platform (Windows / macOS) legible at a glance.
export function AppIcon({
  app,
  size = 'md',
  showPlatformBadge = false,
  className,
}: {
  app: { iconUrl?: string; name: string; platform: AppPlatform }
  size?: keyof typeof SIZES
  showPlatformBadge?: boolean
  className?: string
}) {
  const s = SIZES[size]
  return (
    <div className={cn('relative shrink-0', className)}>
      {app.iconUrl ? (
        <img
          src={app.iconUrl}
          alt=""
          className={cn('border border-black/5 bg-white object-cover', s.box)}
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center border border-black/5 bg-secondary text-muted-foreground',
            s.box,
          )}
        >
          <AppWindow className={s.icon} />
        </div>
      )}
      {showPlatformBadge && (
        <span
          className={cn(
            'absolute flex items-center justify-center rounded-full bg-white ring-1 ring-black/5',
            s.badge,
          )}
        >
          <PlatformIcon
            platform={app.platform}
            bare
            className={cn(
              s.glyph,
              app.platform === 'windows' ? 'text-blue-600' : 'text-slate-700',
            )}
          />
        </span>
      )}
    </div>
  )
}
