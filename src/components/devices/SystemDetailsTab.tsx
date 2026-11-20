// System details as a two-pane reader: every category in a menu on the left,
// always in view, and the open one on the right. Overview comes first with the
// facts an admin checks most and anything that needs fixing. The open category
// lives in the URL (`?section=`), so a link or a reload lands on the same view.
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Activity, BatteryMedium, Bluetooth, BrickWall, Bug, Building2, Cable, CalendarClock, ChartColumn, Check, CircleAlert, CircleCheck, CloudUpload,
  Copy, Cpu, CreditCard, Eye, EyeOff, FileCog, FingerprintPattern, Globe, HardDrive, Hash, Info, Key, KeyRound, KeySquare, LayoutGrid, Layers,
  LifeBuoy, Link as LinkIcon, LocateFixed, Lock, LockKeyhole, MapPin, MemoryStick, MonitorPlay, MoonStar, Network, Plane, Power, RadioTower,
  RefreshCw, RotateCw, ScanBarcode, Search, Shield, ShieldAlert, ShieldCheck, Signal, Smartphone, Tag, Trash2, Usb, UserCheck, Users, Vault,
  Wifi, Wrench, type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { isOffline, tabOf, type InventoryDevice } from '@/data/deviceInventory'
import { relTime } from '@/data/deviceActivity'
import {type DetailCategory, type DetailRow, type DetailSection } from '@/data/deviceDetail'
import { NeedsPill } from './shared'

/** A link inside this tab: to a category by id, or to Overview when there is no id. */
type To = (id?: string) => { search: string }

const rowsOf = (c: DetailCategory) => c.sections.flatMap((s) => s.rows)
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const card = 'overflow-hidden rounded-xl border bg-card shadow-sm'

/** The facts Overview shows, in reading order. A label a device does not report is skipped. */
const KEY_FACTS = ['Device name', 'Model name', 'OS version', 'Storage', 'Battery', 'Passcode', 'Data protection', 'FileVault', 'Supervised', 'Find My', 'Carrier', 'Agent']

function CopyValue({ value, mono }: { value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <button type="button" title="Copy" onClick={() => { navigator.clipboard?.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200) }}
      className={cn('group inline-flex max-w-full items-center gap-1.5 text-left', mono && 'font-mono text-xs')}>
      <span className="truncate">{value}</span>
      {copied ? <Check className="size-3.5 shrink-0 text-emerald-600" /> : <Copy className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />}
    </button>
  )
}

function Value({ r, onReveal }: { r: DetailRow; onReveal: () => void }) {
  const [shown, setShown] = useState(false)
  if (r.missing) return <span className="text-muted-foreground">Not reported</span>
  if (r.secret) {
    return (
      <span className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1">
        {shown ? <CopyValue value={r.value} mono /> : <span className="font-mono text-xs">•••• •••• •••• ••••</span>}
        <button type="button" className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => { if (!shown) onReveal(); setShown(!shown) }}>
          {shown ? <><EyeOff className="size-3" />Hide</> : <><Eye className="size-3" />Reveal</>}
        </button>
      </span>
    )
  }
  if (r.tone === 'warn') return <span className="inline-flex items-center gap-1.5 font-medium text-amber-800"><CircleAlert className="size-3.5 text-amber-600" />{r.value}</span>
  if (r.tone === 'good') return <span className="inline-flex items-center gap-1.5 text-emerald-700"><CircleCheck className="size-3.5 text-emerald-600" />{r.value}</span>
  return <CopyValue value={r.value} mono={r.mono} />
}

/** An icon per property, so the eye finds a line by shape before reading it. Anything unlisted gets `Info`. */
const propertyIcon: Record<string, LucideIcon> = {
  'Device name': Smartphone, 'Serial number': Hash, UDID: FingerprintPattern, 'Local host name': Network,
  'Model name': Tag, 'Model identifier': ScanBarcode, 'Model number': ScanBarcode,
  'OS version': Layers, 'OS build': Wrench, 'Rapid Security Response': ShieldAlert,
  'Declarative management': FileCog, 'MDM profile expires': CalendarClock, 'Time zone': Globe,
  'App analytics': ChartColumn, 'Diagnostic submission': Activity, 'Shared iPad': Users,
  Chip: Cpu, Memory: MemoryStick, Storage: HardDrive, Battery: BatteryMedium,
  IMEI: Signal, MEID: Signal, ICCID: CreditCard, 'Modem firmware': RadioTower,
  'Wi-Fi MAC': Wifi, 'Bluetooth MAC': Bluetooth, 'Ethernet MAC': Cable,
  Passcode: KeyRound, 'Passcode compliance': ShieldCheck, 'Data protection': Lock, 'Hardware encryption': LockKeyhole,
  Supervised: Eye, 'Bootstrap token escrowed': Key, 'Jailbreak detected': Bug,
  'Lost Mode': MapPin, 'Find My': LocateFixed, 'Do Not Disturb': MoonStar, 'iCloud backup': CloudUpload,
  'System Integrity Protection': ShieldCheck, Firewall: BrickWall, 'Firewall stealth mode': EyeOff, 'Remote desktop': MonitorPlay,
  'Secure boot level': Power, 'External boot': Usb, 'Recovery Lock': LifeBuoy,
  'User-approved MDM': UserCheck, 'Automated Device Enrollment': Building2,
  FileVault: Lock, 'Escrow status': Vault, 'Recovery key': KeyRound, 'Last rotated': RotateCw,
  'Activation Lock': LockKeyhole, 'Bypass code': KeySquare,
  'Personal Hotspot': Wifi, 'Data roaming': Globe, Tethered: LinkIcon, Carrier: RadioTower, Roaming: Plane,
  Agent: Shield, 'Uninstall permission': Trash2,
}

/** Label on the left, value on the right, one property per line: the easiest shape to scan down. */
function Rows({ rows, onReveal }: { rows: DetailRow[]; onReveal: (r: DetailRow) => void }) {
  return (
    <dl className="divide-y">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[minmax(8rem,38%)_minmax(0,1fr)] items-center gap-4 px-5 py-2.5 text-sm">
          <dt className="flex min-w-0 items-center gap-2.5 text-muted-foreground">
            {(() => { const I = propertyIcon[r.label] ?? Info; return <I aria-hidden className="size-4 shrink-0 text-muted-foreground/70" /> })()}
            <span className="truncate" title={r.label}>{r.label}</span>
          </dt>
          <dd className="min-w-0"><Value r={r} onReveal={() => onReveal(r)} /></dd>
        </div>
      ))}
    </dl>
  )
}

/** One card per section, titled, one under the other. A value that needs fixing is marked on its own line. */
function Sections({ sections, onReveal }: { sections: DetailSection[]; onReveal: (r: DetailRow) => void }) {
  return (
    <div className="space-y-4">
      {sections.map((s) => (
        <section key={s.title} className={card}>
          <h4 className="border-b bg-muted/40 px-5 py-2.5 text-sm font-semibold">{s.title}</h4>
          <Rows rows={s.rows} onReveal={onReveal} />
        </section>
      ))}
    </div>
  )
}

/* ── The menu on the left ────────────────────────────────── */

function Menu({ cats, current, to }: { cats: DetailCategory[]; current?: string; to: To }) {
  const item = (id: string | undefined, label: string, Icon: typeof LayoutGrid) => {
    const active = current === id
    return (
      <Link key={id ?? 'overview'} to={to(id)} aria-current={active ? 'page' : undefined}
        className={cn('flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
          active ? 'bg-brand/10 font-medium text-brand' : 'text-foreground/80 hover:bg-muted hover:text-foreground')}>
        <Icon className={cn('size-4 shrink-0', active ? 'text-brand' : 'text-muted-foreground')} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
      </Link>
    )
  }
  return (
    // Pinned under the device name and tab bar, so every category stays one click away while reading.
    <nav aria-label="System details" className={cn(card, 'space-y-0.5 p-2 lg:sticky lg:top-32 lg:self-start')}>
      {item(undefined, 'Overview', LayoutGrid)}
      {cats.map((c) => item(c.id, c.title, c.icon))}
    </nav>
  )
}

/* ── The panel on the right ──────────────────────────────── */

function Heading({ title, description, aside }: { title: string; description: string; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {aside}
    </div>
  )
}

function Overview({ cats, to, onReveal }: { cats: DetailCategory[]; to: To; onReveal: (r: DetailRow) => void }) {
  const all = cats.flatMap((c) => c.sections.flatMap((s) => s.rows.map((r) => ({ r, c }))))
  const flagged = all.filter((x) => x.r.tone === 'warn')
  const facts = KEY_FACTS.map((l) => all.find((x) => x.r.label === l)?.r).filter((r): r is DetailRow => !!r)
  return (
    <div className="space-y-4">
      <Heading title="Overview" description="Key facts about this device at a glance" />
      {flagged.length > 0 && (
        <section className={cn(card, 'border-amber-200')}>
          <h4 className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-900">
            <CircleAlert className="size-4 text-amber-600" />Needs attention<NeedsPill n={flagged.length} />
          </h4>
          <ul className="divide-y">
            {flagged.map(({ r, c }) => (
              <li key={`${c.id}-${r.label}`}>
                <Link to={to(c.id)} className="grid grid-cols-[minmax(8rem,38%)_minmax(0,1fr)_auto] items-center gap-4 px-5 py-2.5 text-sm transition-colors hover:bg-muted/40">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-medium text-amber-800">{r.value}</span>
                  <span className="text-xs text-primary">{c.title} ›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className={card}><Rows rows={facts} onReveal={onReveal} /></section>
    </div>
  )
}

export function SystemDetailsTab({ d, cats, toast, onRefresh }: {
  d: InventoryDevice; cats: DetailCategory[]; toast: (m: string) => void; onRefresh: () => void
}) {
  const [params] = useSearchParams()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const current = cats.find((c) => c.id === params.get('section'))
  const reveal = (r: DetailRow) => toast(`${r.label} revealed. Recorded in the audit trail.`)
  // Only `section` changes; the tab and anything else in the URL stay as they are.
  const to: To = (id) => { const p = new URLSearchParams(params); if (id) p.set('section', id); else p.delete('section'); return { search: p.toString() } }
  // A masked value must not be findable by typing parts of it, so only its label is searched.
  const hits = q ? cats.map((c) => ({ c, rows: rowsOf(c).filter((r) => `${r.label} ${r.secret ? '' : r.value}`.toLowerCase().includes(q)) })).filter((x) => x.rows.length) : []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="relative mr-auto w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a property — serial, IMEI, MAC…" aria-label="Find a property" className="h-9 pl-9" />
        </div>
        <span className={cn('text-xs', isOffline(d) ? 'font-medium text-red-600' : 'text-muted-foreground')}>
          {isOffline(d) ? 'Last known state from' : 'Last synced'} {relTime(d.lastCheckIn)}
        </span>
        <Button variant="outline" size="sm" onClick={onRefresh}><RefreshCw className="size-3.5" />Refresh</Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <Menu cats={cats} current={q ? '' : current?.id} to={to} />

        {/* Keyed, so switching category fades the new one in rather than snapping. */}
        <div key={q ? 'search' : current?.id ?? 'overview'} className="min-w-0 space-y-4 animate-in fade-in duration-200 motion-reduce:animate-none">
          {q ? (
            <>
              <Heading title="Search" description={`${plural(hits.reduce((n, h) => n + h.rows.length, 0), 'property', 'properties')} match “${query.trim()}”`} />
              {hits.length ? hits.map(({ c, rows }) => (
                <section key={c.id} className={card}>
                  <Link to={to(c.id)} onClick={() => setQuery('')} className="flex items-center gap-2 border-b bg-muted/40 px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-muted/60">
                    <c.icon className="size-4 text-muted-foreground" />{c.title}<span className="ml-auto text-xs font-normal text-primary">Open ›</span>
                  </Link>
                  <Rows rows={rows} onReveal={reveal} />
                </section>
              )) : <p className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">No property matches “{query.trim()}”.</p>}
            </>
          ) : current ? (
            <>
              <Heading title={current.title} description={`${current.description} · ${plural(rowsOf(current).length, 'property', 'properties')}`} />
              <Sections sections={current.sections} onReveal={reveal} />
            </>
          ) : <Overview cats={cats} to={to} onReveal={reveal} />}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{tabOf(d) === 'ios' ? 'iPhone and iPad' : 'Mac'} inventory reported by MDM{d.agentVersion ? ' and the miniOrange agent' : ''}. Revealing keys is recorded in the audit trail.</p>
    </div>
  )
}
