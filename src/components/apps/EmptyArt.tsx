// Empty states for the app page: a small live scene of what's missing (real
// icons and the app's own icon, gently moving), a headline and one helpful line.
// Cool greys with a blue brand accent; motion lives in index.css (.ea-*) and
// switches off for reduced motion.
import {
  User,
  Calendar,
  Mail,
  MessageSquare,
  Globe,
  KeyRound,
  Laptop,
  Lock,
  Search,
  Smartphone,
  Store,
  Tablet,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LibraryApp } from '@/data/apps'
import { AppIcon } from './forms'

export function EmptyPanel({ art, title, children, action, className }: {
  art: React.ReactNode
  title: string
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      <div className="mb-6 animate-in fade-in zoom-in-95 duration-500" aria-hidden>{art}</div>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{children}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

/** The stage every scene sits on: a blue glow under a soft dotted backdrop. */
function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-48 w-80 [contain:layout_paint]">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-40 w-64">{children}</div>
      </div>
    </div>
  )
}

const glass = 'border border-primary/25 bg-card shadow-[0_10px_24px_-8px_hsl(var(--primary)/0.5),inset_0_1px_0_hsl(0_0%_100%/0.8)]'

/** The app itself, lifted on a card with a soft blue ring that pings. */
function AppBadge({ app, className, big }: { app: LibraryApp; className?: string; big?: boolean }) {
  return (
    <div className={cn('absolute', className)}>
      <span className="ea-ping absolute inset-0 rounded-[22%] bg-primary/30" />
      <AppIcon app={app} className={cn('relative rounded-[22%] shadow-lg ring-4 ring-card', big ? 'size-20 text-4xl' : 'size-14 text-2xl')} />
    </div>
  )
}

/** Dashed connectors drawn behind the tiles; the dashes travel along them. */
function Wires({ d, faint }: { d: string; faint?: string }) {
  return (
    <svg viewBox="0 0 256 160" className="absolute inset-0 size-full" fill="none">
      {faint && <path d={faint} className="stroke-primary/15" strokeWidth="1" strokeLinecap="round" />}
      <path d={d} className="ea-march stroke-primary/45" strokeWidth="1.5" strokeDasharray="4 4" strokeLinecap="round" />
    </svg>
  )
}

/** A device with a screen; `slot` is the dashed spot the app lands in. */
function Device({ icon: Icon, className, delay = 0, app, tall }: { icon: LucideIcon; className?: string; delay?: number; app?: LibraryApp; tall?: boolean }) {
  return (
    <div className={cn('ea-pop flex w-16 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-primary/25 bg-card shadow-[0_8px_18px_-8px_hsl(var(--primary)/0.4)]', tall ? 'h-24' : 'h-20', className)} style={{ animationDelay: `${delay}s` }}>
      <Icon className="size-4 text-primary/70" />
      <span className={cn('relative size-8 rounded-lg', app ? 'border-2 border-dashed border-primary/60 bg-primary/5' : 'bg-primary/10')}>
        {app && (
          <span className="ea-land absolute inset-0">
            <AppIcon app={app} className="size-full rounded-lg shadow-md shadow-primary/30 ring-1 ring-primary/20" />
          </span>
        )}
      </span>
    </div>
  )
}

/** Overview: devices that don't have the app yet; it lands on the phone. */
export function NoDevicesArt({ app }: { app: LibraryApp }) {
  return (
    <Stage>
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-end gap-3">
        <Device icon={Laptop} delay={0} />
        <Device icon={Smartphone} delay={0.1} app={app} tall />
        <Device icon={Tablet} delay={0.2} />
      </div>
    </Stage>
  )
}

/** Scope — the app in the middle, devices, users and groups around it waiting to be picked. */
export function NoScopeArt({ app }: { app: LibraryApp }) {
  // Devices and users can each be targeted directly or through their groups.
  const targets = [{ icon: Smartphone, label: 'Devices' }, { icon: User, label: 'Users' }]
  return (
    <Stage>
      <Wires d="M128 58 C 128 86, 60 82, 60 112 M128 58 C 128 86, 196 82, 196 112" />
      <AppBadge app={app} className="left-1/2 top-0 -translate-x-1/2" />
      <div className="absolute inset-x-0 bottom-0 grid grid-cols-2 gap-4">
        {targets.map(({ icon: Icon, label }, i) => (
          <div key={label} className="ea-pop flex items-center gap-2.5 rounded-xl border border-dashed border-primary/40 bg-card px-3 py-2.5 shadow-sm" style={{ animationDelay: `${i * 0.1}s` }}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" strokeWidth={1.75} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-foreground/85">{label}</span>
              <span className="mt-1 block h-1 w-3/4 rounded-full bg-muted-foreground/20" />
            </span>
          </div>
        ))}
      </div>
    </Stage>
  )
}

/** Self Service: the catalog with apps already listed, and an empty spot the app lands in. */
export function NotListedArt({ app }: { app: LibraryApp }) {
  return (
    <Stage>
      <div className={cn('absolute left-1/2 top-0 w-60 -translate-x-1/2 overflow-hidden rounded-2xl', glass)}>
        <div className="flex items-center gap-1.5 border-b border-primary/10 bg-primary/5 px-3 py-1.5">
          <span className="size-1.5 rounded-full bg-primary/25" /><span className="size-1.5 rounded-full bg-primary/25" /><span className="size-1.5 rounded-full bg-primary/25" />
          <span className="ml-1 flex h-3.5 flex-1 items-center gap-1 rounded-full bg-card px-1.5 text-primary/50 ring-1 ring-primary/10"><Lock className="size-2" /><span className="h-1 w-14 rounded-full bg-primary/15" /></span>
        </div>
        <div className="p-3">
          <div className="mb-3 flex items-center gap-1.5">
            <Store className="size-3.5 text-primary" />
            <span className="text-[10px] font-semibold text-foreground/80">Self Service</span>
            <span className="ml-auto flex h-4 w-16 items-center gap-1 rounded-full bg-primary/10 px-1.5 text-primary/60"><Search className="size-2.5" /><span className="h-1 flex-1 rounded-full bg-primary/20" /></span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[Mail, Calendar, MessageSquare].map((Icon, i) => (
              <div key={i} className="ea-pop flex min-w-0 flex-col items-center gap-1" style={{ animationDelay: `${i * 0.08}s` }}>
                <span className="flex aspect-square w-full items-center justify-center rounded-[24%] border border-border bg-card text-muted-foreground shadow-sm">
                  <Icon className="size-5" strokeWidth={1.5} />
                </span>
                <span className="h-1 w-3/4 rounded-full bg-muted-foreground/20" />
              </div>
            ))}
            <div className="flex min-w-0 flex-col items-center gap-1">
              <span className="relative aspect-square w-full rounded-[24%] border-[1.5px] border-dashed border-primary/60 bg-primary/5">
                <span className="ea-ping absolute inset-0 rounded-[24%] bg-primary/20" />
                <span className="ea-land absolute inset-0">
                  <AppIcon app={app} className="size-full rounded-[24%] text-lg shadow-md shadow-primary/30 ring-1 ring-primary/20" />
                </span>
              </span>
              <span className="w-full truncate text-center text-[8px] font-medium text-primary">{app.name}</span>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <span className="block h-1 w-full rounded-full bg-primary/10" />
            <span className="block h-1 w-2/3 rounded-full bg-primary/10" />
          </div>
        </div>
      </div>
    </Stage>
  )
}

/** App configuration — a settings sheet with sliders and toggles, waiting for values. */
export function NoConfigArt({ app }: { app: LibraryApp }) {
  return (
    <Stage>
      <div className={cn('absolute left-1/2 top-1 w-48 -translate-x-1/2 space-y-2.5 rounded-2xl p-3.5', glass)}>
        <div className="flex items-center gap-2">
          <AppIcon app={app} className="size-6 rounded-[22%] text-xs" />
          <span className="h-2 w-16 rounded-full bg-muted-foreground/25" />
          <span className="ml-auto rounded bg-primary/10 px-1 font-mono text-[8px] text-primary">.plist</span>
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-1.5 w-10 rounded-full bg-muted-foreground/20" />
            <span className="relative h-1.5 flex-1 rounded-full bg-primary/15">
              <span className="ea-slide absolute -top-1 size-3.5 rounded-full border-2 border-primary bg-card shadow-sm" style={{ animationDelay: `${i * 0.5}s` }} />
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between">
          <span className="h-1.5 w-14 rounded-full bg-muted-foreground/20" />
          <span className="flex h-3.5 w-6 items-center rounded-full bg-primary/70 p-0.5"><span className="ml-auto size-2.5 rounded-full bg-card" /></span>
        </div>
        <div className="flex items-center gap-1.5 rounded-md bg-muted/70 px-1.5 py-1 font-mono text-[8px] text-muted-foreground"><KeyRound className="size-2.5 text-primary/70" />server = ···</div>
      </div>
    </Stage>
  )
}

/** Associated domains: the main site and its sub-domains pointing at the app. */
export function NoDomainsArt({ app }: { app: LibraryApp }) {
  return (
    <Stage>
      <Wires d="M140 80 L160 80" faint="M120 18 C 144 18, 146 70, 162 74 M120 142 C 144 142, 146 90, 162 86" />
      <div className={cn('absolute left-0 top-1/2 flex w-36 -translate-y-1/2 items-center gap-2.5 rounded-xl px-2.5 py-2.5', glass)}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/40"><Globe className="size-5" strokeWidth={1.75} /></span>
        <span className="min-w-0">
          <span className="flex items-center gap-1 text-sm font-semibold text-foreground"><Lock className="size-3 text-emerald-600" />acme.com</span>
          <span className="mt-0.5 block truncate font-mono text-[9px] text-muted-foreground">/.well-known</span>
        </span>
      </div>
      {['top-0', 'bottom-0'].map((pos, i) => (
        <div key={pos} className={cn('absolute left-3 flex h-9 w-28 items-center gap-2 rounded-lg border border-border bg-card px-2.5 shadow-sm', pos)}>
          <Lock className="size-3.5 shrink-0 text-muted-foreground/60" />
          <span className={cn('h-1.5 rounded-full bg-muted-foreground/25', i ? 'w-10' : 'w-14')} />
        </div>
      ))}
      <AppBadge app={app} big className="right-4 top-1/2 -translate-y-1/2" />
    </Stage>
  )
}
