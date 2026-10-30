import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Rocket,
  MonitorSmartphone,
  Users,
  UserPlus,
  Laptop2,
  Mail,
  Cloud,
  ScanSearch,
  Filter,
  Globe,
  Smartphone,
  AppWindow,
  MapPin,
  Megaphone,
  Package,
  Database,
  ShieldCheck,
  FileSearch,
  ChevronDown,
  ShieldHalf,
  Tags,
  BookMarked,
  Fingerprint,
  FileDigit,
  Tag,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavLeaf {
  label: string
  icon: LucideIcon
  to?: string
  /** Not part of the prototype — shown but inert ("Soon"). */
  inert?: boolean
}

const DD_BASE = '/data-discovery'
const CF_BASE = '/content-filtering'
const AM_BASE = '/application-management'
const MDM_BASE = '/mdm'

// Scan Jobs is intentionally not a primary nav item — recent scans live on the
// Dashboard with a "View all" link into the (still-routed) scans page.
const dataDiscoveryChildren: NavLeaf[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: DD_BASE },
  { label: 'Data Sources', icon: Database, to: `${DD_BASE}/sources` },
  { label: 'Policies', icon: ShieldCheck, to: `${DD_BASE}/policies` },
  { label: 'Results', icon: FileSearch, to: `${DD_BASE}/results` },
]

// Content Filtering is filling in one page at a time, the way Data Discovery
// did — Classification and Rule Dictionary are live; the rest are inert.
const contentFilteringChildren: NavLeaf[] = [
  { label: 'Classification', icon: Tags, to: `${CF_BASE}/classification` },
  { label: 'Rule Dictionary', icon: BookMarked, to: `${CF_BASE}/rule-dictionary` },
  { label: 'File Fingerprints', icon: Fingerprint, inert: true },
  { label: 'Exact Data Matching', icon: FileDigit, inert: true },
  { label: 'Labels', icon: Tag, inert: true },
]

// Mobile Device Management → Unified Controls. Application Management is the
// live page; the rest are stubbed the way the other modules fill in over time.
const mobileDeviceMgmtChildren: NavLeaf[] = [
  { label: 'Application Management', icon: AppWindow, to: AM_BASE },
  { label: 'Policies', icon: ShieldCheck, to: `${AM_BASE}/policies` },
  { label: 'Apple App Library', icon: LayoutGrid, to: `${MDM_BASE}/apple/app-library` },
  { label: 'Categories', icon: Tag, to: `${MDM_BASE}/categories` },
  { label: 'Geofencing', icon: MapPin, inert: true },
  { label: 'Message Broadcasting', icon: Megaphone, inert: true },
]

interface Section {
  title: string
  items: NavLeaf[]
}

const sections: Section[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, inert: true },
      { label: 'Getting Started', icon: Rocket, inert: true },
    ],
  },
  {
    title: 'Device Inventory',
    items: [
      { label: 'Devices', icon: MonitorSmartphone, inert: true },
      { label: 'Device Groups', icon: Users, inert: true },
      { label: 'Onboarding Requests', icon: UserPlus, inert: true },
    ],
  },
  {
    title: 'Data Loss Prevention',
    items: [
      { label: 'Endpoint', icon: Laptop2, inert: true },
      { label: 'Email', icon: Mail, inert: true },
      { label: 'Cloud', icon: Cloud, inert: true },
    ],
  },
]

const trailing: NavLeaf[] = [
  { label: 'Secure Web Gateway', icon: Globe, inert: true },
  { label: 'Patch Management', icon: Package, inert: true },
]

function NavRow({
  item,
  active,
  indent,
  onNavigate,
}: {
  item: NavLeaf
  active?: boolean
  indent?: boolean
  onNavigate?: () => void
}) {
  const Icon = item.icon

  if (item.inert || !item.to) {
    return (
      <div
        className={cn(
          'flex cursor-default items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-muted',
          indent && 'pl-9',
        )}
        title="Not part of this prototype"
      >
        <Icon className="size-4 shrink-0 text-sidebar-muted" />
        <span className="flex-1 truncate">{item.label}</span>
        <span className="rounded border border-sidebar-border px-1 text-[10px] font-medium uppercase text-sidebar-muted">
          Soon
        </span>
      </div>
    )
  }

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
        indent && 'pl-9',
        active
          ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
          : 'text-sidebar-foreground hover:bg-secondary',
      )}
    >
      <Icon className={cn('size-4 shrink-0', !active && 'text-sidebar-muted')} />
      <span className="truncate">{item.label}</span>
    </Link>
  )
}

/** The nav content — shared by the desktop rail and the mobile drawer. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation()
  const onDataDiscovery = pathname.startsWith(DD_BASE)
  const onContentFiltering = pathname.startsWith(CF_BASE)
  const onMobileDeviceMgmt =
    pathname.startsWith(AM_BASE) || pathname.startsWith(MDM_BASE)
  const [ddOpen, setDdOpen] = useState(true)
  const [cfOpen, setCfOpen] = useState(true)
  const [mdmOpen, setMdmOpen] = useState(true)

  const isActive = (to: string) =>
    to === DD_BASE || to === AM_BASE
      ? pathname === to
      : pathname.startsWith(to)

  return (
    <>
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-brand text-brand-foreground">
          <ShieldHalf className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-foreground">miniOrange</p>
          <p className="text-xs text-muted-foreground">Endpoint Defence</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted">
              {section.title}
            </p>
            {section.items.map((item) => (
              <NavRow key={item.label} item={item} />
            ))}
          </div>
        ))}

        {/* Data Discovery — the live module */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setDdOpen((v) => !v)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
              onDataDiscovery
                ? 'text-foreground'
                : 'text-sidebar-foreground hover:bg-secondary',
            )}
          >
            <ScanSearch
              className={cn(
                'size-4 shrink-0',
                onDataDiscovery ? 'text-primary' : 'text-sidebar-muted',
              )}
            />
            <span className="flex-1 text-left font-medium">Data Discovery</span>
            <ChevronDown
              className={cn(
                'size-4 text-sidebar-muted transition-transform',
                ddOpen && 'rotate-180',
              )}
            />
          </button>
          {ddOpen && (
            <div className="space-y-1">
              {dataDiscoveryChildren.map((item) => (
                <NavRow
                  key={item.label}
                  item={item}
                  active={isActive(item.to!)}
                  indent
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content Filtering — Classification live, rest arriving next */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setCfOpen((v) => !v)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
              onContentFiltering
                ? 'text-foreground'
                : 'text-sidebar-foreground hover:bg-secondary',
            )}
          >
            <Filter
              className={cn(
                'size-4 shrink-0',
                onContentFiltering ? 'text-primary' : 'text-sidebar-muted',
              )}
            />
            <span className="flex-1 text-left font-medium">Content Filtering</span>
            <ChevronDown
              className={cn(
                'size-4 text-sidebar-muted transition-transform',
                cfOpen && 'rotate-180',
              )}
            />
          </button>
          {cfOpen && (
            <div className="space-y-1">
              {contentFilteringChildren.map((item) => (
                <NavRow
                  key={item.label}
                  item={item}
                  active={!!item.to && isActive(item.to)}
                  indent
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )}
        </div>

        {/* Mobile Device Management — Application Management live under it */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setMdmOpen((v) => !v)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
              onMobileDeviceMgmt
                ? 'text-foreground'
                : 'text-sidebar-foreground hover:bg-secondary',
            )}
          >
            <Smartphone
              className={cn(
                'size-4 shrink-0',
                onMobileDeviceMgmt ? 'text-primary' : 'text-sidebar-muted',
              )}
            />
            <span className="flex-1 text-left font-medium">
              Mobile Device Management
            </span>
            <ChevronDown
              className={cn(
                'size-4 text-sidebar-muted transition-transform',
                mdmOpen && 'rotate-180',
              )}
            />
          </button>
          {mdmOpen && (
            <div className="space-y-1">
              {mobileDeviceMgmtChildren.map((item) => (
                <NavRow
                  key={item.label}
                  item={item}
                  active={!!item.to && isActive(item.to)}
                  indent
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1">
          {trailing.map((item) => (
            <NavRow key={item.label} item={item} />
          ))}
        </div>
      </nav>
    </>
  )
}

/** Desktop rail (hidden below lg; the mobile drawer lives in AppShell). */
export function Sidebar() {
  return (
    <aside className="hidden h-svh w-[260px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <SidebarNav />
    </aside>
  )
}
