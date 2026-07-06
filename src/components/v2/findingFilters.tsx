import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { providerById, classificationById } from '@/data'
import { cn } from '@/lib/utils'
import type { Configuration, Finding } from '@/types'

/*
  Dynamic, cascading filter for Findings.

  Each filter is a single descriptor in FINDING_FILTERS — add one entry and it
  renders, filters, resets, and shows a chip automatically. Two kinds:

  • Structural cascade (data type → data source → scope): options come from the
    data model. Picking a data type narrows the sources to that type and resets
    everything below it; picking a source narrows the scopes. This is the
    "select the data type and the data source first" flow.
  • Faceted (classification, exposure, status): options are derived from the
    findings left after the filters above them, so they "adjust automatically".

  `resets` declares which downstream keys snap back to "all" when a filter
  changes, which is what keeps the cascade consistent.
*/

export type FilterState = Record<string, string>
export type Opt = { value: string; label: string }

type Ctx = {
  configurations: Configuration[]
  state: FilterState
  /** Findings remaining after every filter above this one — drives faceting. */
  upstream: Finding[]
}

export type FilterDef = {
  key: string
  label: string
  allLabel: string
  width?: string
  options: (ctx: Ctx) => Opt[]
  match: (f: Finding, value: string, configs: Configuration[]) => boolean
  resets?: string[]
  chip: (value: string, configs: Configuration[]) => string
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const providerOf = (f: Finding, configs: Configuration[]) =>
  configs.find((c) => c.id === f.configurationId)?.providerId
const configName = (id: string, configs: Configuration[]) =>
  configs.find((c) => c.id === id)?.name ?? id
const scopeName = (id: string, configs: Configuration[]) =>
  configs.flatMap((c) => c.scopes).find((s) => s.id === id)?.name ?? id

const dedupe = (opts: Opt[]): Opt[] => {
  const seen = new Set<string>()
  const out: Opt[] = []
  for (const o of opts) {
    if (!seen.has(o.value)) {
      seen.add(o.value)
      out.push(o)
    }
  }
  return out
}

export const FINDING_FILTERS: FilterDef[] = [
  {
    key: 'dataType',
    label: 'Data type',
    allLabel: 'All data types',
    width: 'w-[160px]',
    // Structural: every provider that has at least one configuration.
    options: ({ configurations }) =>
      dedupe(
        configurations.map((c) => ({
          value: c.providerId,
          label: providerById(c.providerId)?.name ?? c.providerId,
        })),
      ).sort((a, b) => a.label.localeCompare(b.label)),
    match: (f, v, configs) => providerOf(f, configs) === v,
    resets: ['source', 'scope'],
    chip: (v) => providerById(v)?.name ?? v,
  },
  {
    key: 'source',
    label: 'Data source',
    allLabel: 'All sources',
    width: 'w-[170px]',
    // Structural cascade: the sources defined for the chosen data type.
    options: ({ configurations, state }) =>
      configurations
        .filter((c) => state.dataType === 'all' || c.providerId === state.dataType)
        .map((c) => ({ value: c.id, label: c.name })),
    match: (f, v) => f.configurationId === v,
    resets: ['scope'],
    chip: (v, configs) => `Source: ${configName(v, configs)}`,
  },
  {
    key: 'scope',
    label: 'Scope',
    allLabel: 'All scopes',
    width: 'w-[150px]',
    // Structural cascade: scopes within the chosen source (or data type).
    options: ({ configurations, state }) =>
      configurations
        .filter((c) => {
          if (state.source !== 'all') return c.id === state.source
          if (state.dataType !== 'all') return c.providerId === state.dataType
          return true
        })
        .flatMap((c) => c.scopes.map((s) => ({ value: s.id, label: s.name }))),
    match: (f, v) => f.scopeId === v,
    chip: (v, configs) => `Scope: ${scopeName(v, configs)}`,
  },
  {
    key: 'cls',
    label: 'Classification',
    allLabel: 'All classifications',
    width: 'w-[160px]',
    // Faceted: only classifications present in the narrowed results.
    options: ({ upstream }) =>
      dedupe(
        upstream.flatMap((f) =>
          f.classificationIds.map((id) => ({
            value: id,
            label: classificationById(id)?.abbr ?? id,
          })),
        ),
      ),
    match: (f, v) => f.classificationIds.includes(v),
    chip: (v) => classificationById(v)?.abbr ?? v,
  },
  {
    key: 'exposure',
    label: 'Exposure',
    allLabel: 'All exposure',
    width: 'w-[140px]',
    options: ({ upstream }) =>
      dedupe(
        upstream.map((f) =>
          f.publicAccess
            ? { value: 'public', label: 'Public' }
            : { value: 'private', label: 'Private' },
        ),
      ),
    match: (f, v) => (v === 'public' ? f.publicAccess : !f.publicAccess),
    chip: (v) => cap(v),
  },
  {
    key: 'status',
    label: 'Status',
    allLabel: 'All statuses',
    width: 'w-[140px]',
    options: ({ upstream }) =>
      dedupe(
        upstream.map((f) => {
          const s = f.status ?? 'open'
          return { value: s, label: cap(s) }
        }),
      ),
    match: (f, v) => (f.status ?? 'open') === v,
    chip: (v) => cap(v),
  },
]

export const initialFilterState = (overrides: FilterState = {}): FilterState =>
  Object.fromEntries(
    FINDING_FILTERS.map((d) => [d.key, overrides[d.key] ?? 'all']),
  )

function applyDefs(
  findings: Finding[],
  defs: FilterDef[],
  state: FilterState,
  configs: Configuration[],
) {
  return findings.filter((f) =>
    defs.every((d) => state[d.key] === 'all' || d.match(f, state[d.key], configs)),
  )
}

/** Narrow findings by the full filter set (applied on top of search/scan). */
export function applyFilters(
  findings: Finding[],
  state: FilterState,
  configs: Configuration[],
) {
  return applyDefs(findings, FINDING_FILTERS, state, configs)
}

/** Active (non-"all") filters, for the removable chip row. */
export function activeChips(state: FilterState, configs: Configuration[]) {
  return FINDING_FILTERS.filter((d) => state[d.key] !== 'all').map((d) => ({
    key: d.key,
    label: d.chip(state[d.key], configs),
  }))
}

export function FindingFilterBar({
  base,
  state,
  onChange,
  configurations,
}: {
  /** Findings after search + scan, before the cascade — drives faceting. */
  base: Finding[]
  state: FilterState
  onChange: (key: string, value: string) => void
  configurations: Configuration[]
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {FINDING_FILTERS.map((d, i) => {
        const upstream = applyDefs(
          base,
          FINDING_FILTERS.slice(0, i),
          state,
          configurations,
        )
        const opts = d.options({ configurations, state, upstream })
        return (
          <Select
            key={d.key}
            value={state[d.key]}
            onValueChange={(v) => onChange(d.key, v)}
          >
            <SelectTrigger className={cn('h-9 bg-card', d.width)}>
              <SelectValue placeholder={d.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{d.allLabel}</SelectItem>
              {opts.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      })}
    </div>
  )
}
