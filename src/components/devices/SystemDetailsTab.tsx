// System details, one thing at a time, on one page. Each category is a row
// showing the one fact people want from it; click and it opens in place
// with its sections and properties. Categories with a problem start open.
// Search jumps to any property across categories.
import { useState } from 'react'
import { Check, ChevronDown, CircleAlert, CircleCheck, Copy, Eye, EyeOff, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { isOffline, tabOf, type InventoryDevice } from '@/data/deviceInventory'
import { relTime } from '@/data/deviceActivity'
import { attention, categoryAttention, type DetailCategory, type DetailRow } from '@/data/deviceDetail'

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
      <span className="inline-flex items-center gap-2">
        {shown ? <CopyValue value={r.value} mono /> : <span className="font-mono text-xs">•••• •••• •••• ••••</span>}
        <button type="button" className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => { if (!shown) onReveal(); setShown(!shown) }}>
          {shown ? <><EyeOff className="size-3" />Hide</> : <><Eye className="size-3" />Reveal</>}
        </button>
      </span>
    )
  }
  if (r.tone === 'warn') return <span className="inline-flex items-center gap-1.5 font-medium text-amber-800"><CircleAlert className="size-3.5 text-amber-600" />{r.value}</span>
  if (r.tone === 'good') return <span className="inline-flex items-center gap-1.5"><CircleCheck className="size-3.5 text-emerald-600" />{r.value}</span>
  return <CopyValue value={r.value} mono={r.mono} />
}

function Rows({ rows, onReveal }: { rows: DetailRow[]; onReveal: (r: DetailRow) => void }) {
  return (
    <dl className="divide-y">
      {rows.map((r) => (
        <div key={r.label} className={cn('grid grid-cols-[minmax(9rem,38%)_1fr] items-center gap-4 px-5 py-3 text-sm', r.tone === 'warn' && 'bg-amber-50/50')}>
          <dt className="text-muted-foreground">{r.label}</dt>
          <dd className="min-w-0"><Value r={r} onReveal={() => onReveal(r)} /></dd>
        </div>
      ))}
    </dl>
  )
}

/** The one line people most want from each category. */
function headline(c: DetailCategory, d: InventoryDevice): string {
  const n = categoryAttention(c)
  if (n) return `${n} ${n === 1 ? 'issue' : 'issues'} to look at`
  switch (c.id) {
    case 'info': return `${d.model} · ${d.platform} ${d.osVersion}`
    case 'software': return 'Management and settings'
    case 'hardware': return `${d.storageTotalGb - d.storageUsedGb} GB free${d.batteryLevel != null ? ` · battery ${d.batteryLevel}%` : ''}`
    case 'security': return 'All checks pass'
    case 'encryption': return d.encrypted ? 'FileVault on · key escrowed' : 'FileVault off'
    case 'activation': return 'Status and bypass code'
    case 'network': return 'Carrier, SIM and hotspot'
    case 'agent': return d.agentVersion ? `Agent ${d.agentVersion}` : 'Not installed'
    default: return c.description
  }
}

/** One category as an expandable row; its sections render inline when open. */
function CategoryRow({ c, d, open, onToggle, onReveal }: {
  c: DetailCategory; d: InventoryDevice; open: boolean; onToggle: () => void; onReveal: (r: DetailRow) => void
}) {
  const n = categoryAttention(c)
  const count = c.sections.reduce((m, s) => m + s.rows.length, 0)
  return (
    <section className={cn('overflow-hidden rounded-xl border bg-card shadow-sm', n > 0 && 'border-amber-200')}>
      <button type="button" aria-expanded={open} onClick={onToggle} className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/40">
        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', n ? 'bg-amber-50 text-amber-700' : open ? 'bg-brand/10 text-brand' : 'bg-secondary text-muted-foreground')}>
          <c.icon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{c.title}</span>
          <span className={cn('block truncate text-sm', n ? 'font-medium text-amber-700' : 'text-muted-foreground')}>{headline(c, d)}</span>
        </span>
        <span className="hidden text-xs text-muted-foreground sm:block">{count} {count === 1 ? 'property' : 'properties'}</span>
        <ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t">
          {c.sections.map((s) => (
            <div key={s.title} className="border-b last:border-b-0">
              {(c.sections.length > 1 || s.title !== c.title) && (
                <p className="flex items-center gap-2 border-b bg-muted/30 px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {s.title}{attention(s.rows) > 0 && <span className="normal-case tracking-normal text-amber-700">· {attention(s.rows)} to fix</span>}
                </p>
              )}
              <Rows rows={s.rows} onReveal={onReveal} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export function SystemDetailsTab({ d, cats, toast, onRefresh }: {
  d: InventoryDevice; cats: DetailCategory[]; toast: (m: string) => void; focus?: string | null; onRefresh: () => void
}) {
  // Categories with a problem start open, so the issue is the first thing you see.
  const [open, setOpen] = useState<Set<string>>(() => new Set(cats.filter((c) => categoryAttention(c) > 0).map((c) => c.id)))
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const reveal = (r: DetailRow) => toast(`${r.label} revealed. Recorded in the audit trail.`)
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allOpen = open.size === cats.length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a property — serial, IMEI, MAC…" aria-label="Find a property" className="h-9 pl-9" />
        </div>
        {!q && (
          <Button variant="ghost" size="sm" onClick={() => setOpen(allOpen ? new Set() : new Set(cats.map((c) => c.id)))}>
            {allOpen ? 'Collapse all' : 'Expand all'}
          </Button>
        )}
        <span className={cn('ml-auto text-xs', isOffline(d) ? 'font-medium text-red-600' : 'text-muted-foreground')}>
          {isOffline(d) ? 'Last known state from' : 'Reported'} {relTime(d.lastCheckIn)}
        </span>
        <Button variant="outline" size="sm" onClick={onRefresh}><RefreshCw className="size-3.5" />Refresh</Button>
      </div>

      {q ? (() => {
        // Search: matching properties, grouped by where they live; click a group to open it in the list.
        const hits = cats.map((c) => ({ c, rows: c.sections.flatMap((s) => s.rows).filter((r) => `${r.label} ${r.value}`.toLowerCase().includes(q)) })).filter((x) => x.rows.length)
        if (!hits.length) return <p className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">No property matches “{query}”.</p>
        return hits.map(({ c, rows }) => (
          <section key={c.id} className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <button type="button" onClick={() => { setOpen((s) => new Set(s).add(c.id)); setQuery('') }}
              className="flex w-full items-center gap-2 border-b bg-muted/40 px-5 py-2.5 text-left text-sm font-semibold hover:bg-muted/60">
              <c.icon className="size-4 text-muted-foreground" />{c.title}<span className="ml-auto text-xs font-normal text-primary">Show all</span>
            </button>
            <Rows rows={rows} onReveal={reveal} />
          </section>
        ))
      })() : (
        <div className="space-y-3">
          {cats.map((c) => <CategoryRow key={c.id} c={c} d={d} open={open.has(c.id)} onToggle={() => toggle(c.id)} onReveal={reveal} />)}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{tabOf(d) === 'ios' ? 'iPhone and iPad' : 'Mac'} inventory reported by MDM{d.agentVersion ? ' and the miniOrange agent' : ''}. Revealing keys is recorded in the audit trail.</p>
    </div>
  )
}
