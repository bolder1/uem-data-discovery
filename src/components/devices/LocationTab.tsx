// Location, in the two parts the product already has — Last location and
// History — done better: full address you can copy, accuracy and source,
// map / satellite / globe for the last fix, and history as a list, a map of
// places, or the route in order, over a range you choose.
import { useMemo, useState } from 'react'
import { Check, Clock, Copy, Globe2, History as HistoryIcon, List, Map as MapIcon, MapPin, Navigation, Route, Satellite, ShieldOff, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/common'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/format'
import { tabOf, type InventoryDevice } from '@/data/deviceInventory'
import { deviceLocation, km, type Fix } from '@/data/deviceLocation'
import { relTime } from '@/data/deviceActivity'
import { LocationMap } from './LocationMap'
import { LocationGlobe } from './LocationGlobe'

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
const dayName = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })

function Segmented<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: { id: T; label: string; icon: typeof MapIcon }[]; label: string }) {
  return (
    <div className="inline-flex rounded-lg border bg-muted/40 p-0.5" role="tablist" aria-label={label}>
      {items.map((v) => (
        <button key={v.id} type="button" role="tab" aria-selected={value === v.id} onClick={() => onChange(v.id)}
          className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            value === v.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
          <v.icon className="size-3.5" />{v.label}
        </button>
      ))}
    </div>
  )
}

export function LocationTab({ d, onLocate }: { d: InventoryDevice; onLocate: () => void }) {
  const state = useMemo(() => deviceLocation(d), [d])
  const [section, setSection] = useState<'last' | 'history'>('last')

  if (state.kind === 'no-agent') {
    return <EmptyState icon={Smartphone} title="Location needs the miniOrange agent"
      description={tabOf(d) === 'ios' ? 'Install the agent app on this device to see where it is. Without it, location is only available in Lost Mode.' : 'Install the agent on this Mac to see where it is.'} />
  }
  if (state.kind === 'denied') {
    return <EmptyState icon={ShieldOff} title="The user hasn't allowed location"
      description="The agent is installed, but location permission is off on the device. Ask the user to allow it in Settings → Privacy → Location Services." />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={section} onChange={setSection} label="Location section"
          items={[{ id: 'last', label: 'Last location', icon: MapPin }, { id: 'history', label: 'History', icon: HistoryIcon }]} />
        <Button size="sm" variant="outline" onClick={onLocate}><Navigation className="size-3.5" />Locate now</Button>
      </div>
      {section === 'last' ? <LastLocation d={d} state={state} /> : <LocationHistory state={state} />}
      <p className="text-xs text-muted-foreground">Location is kept for 30 days. Every view of it is recorded in the audit trail.</p>
    </div>
  )
}

type Live = Extract<ReturnType<typeof deviceLocation>, { kind: 'live' }>

function LastLocation({ d, state }: { d: InventoryDevice; state: Live }) {
  const { last, fence } = state
  const [view, setView] = useState<'map' | 'satellite' | 'globe'>('map')
  const [labels, setLabels] = useState(true)
  const [copied, setCopied] = useState(false)
  const warn = last.place === 'Unrecognised place'

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="grid gap-4 border-b p-5 md:grid-cols-[1fr_auto]">
        <div className="flex min-w-0 gap-3">
          <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', warn ? 'bg-red-50 text-red-600' : 'bg-brand/10 text-brand')}><MapPin className="size-5" /></span>
          <div className="min-w-0 space-y-1">
            <p className="font-semibold">{last.place}</p>
            <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <span>{last.address}</span>
              <button type="button" aria-label="Copy address" className="mt-0.5 shrink-0 hover:text-foreground"
                onClick={() => { navigator.clipboard?.writeText(last.address); setCopied(true); setTimeout(() => setCopied(false), 1200) }}>
                {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              </button>
            </p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Clock className="size-3" />{formatDateTime(last.at)} ({relTime(last.at)})</span>
              <span>Within {last.accuracyM} m</span>
              <span>Via {state.source === 'Agent' ? `agent ${d.agentVersion}` : 'Lost Mode'}</span>
              <span className="font-mono">{last.lat.toFixed(5)}, {last.lng.toFixed(5)}</span>
            </p>
            {warn && <p className="pt-1 text-sm text-red-700">{Math.round(km(last, fence))} km from {fence.name.replace(' campus', '')}, somewhere this device hasn't been in 30 days.</p>}
            {state.permission === 'While using' && <p className="pt-1 text-xs text-amber-700">Location is only allowed while the agent app is open, so this may be old.</p>}
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          <Segmented value={view} onChange={setView} label="Map view" items={[
            { id: 'map', label: 'Map', icon: MapIcon }, { id: 'satellite', label: 'Satellite', icon: Satellite }, { id: 'globe', label: 'Globe', icon: Globe2 },
          ]} />
          {view === 'satellite' && <label className="flex items-center gap-2 text-xs"><Checkbox checked={labels} onCheckedChange={(c) => setLabels(!!c)} />Labels</label>}
        </div>
      </div>
      <div className={cn('relative h-[28rem]', view === 'globe' && 'flex items-center justify-center bg-gradient-to-b from-slate-50 to-white')}>
        {view === 'globe'
          ? <LocationGlobe point={last} warn={warn} />
          : <LocationMap look={view} labels={labels} last={last} path={[last]} fence={fence} focus={null} warn={warn} mode="points" />}
      </div>
    </section>
  )
}

const ranges = { '24h': { label: 'Last 24 hours', days: 1 }, '3d': { label: 'Last 3 days', days: 3 }, '7d': { label: 'Last 7 days', days: 7 } } as const

function LocationHistory({ state }: { state: Live }) {
  const { history, last, fence } = state
  const [range, setRange] = useState<keyof typeof ranges>('24h')
  const [view, setView] = useState<'list' | 'map' | 'route'>('list')
  const [focus, setFocus] = useState<Fix | null>(null)
  const days = history.slice(0, ranges[range].days)
  const stops = days.flatMap((x) => x.stops)
  const ordered = [...stops].reverse()
  const distance = ordered.reduce((s, p, i) => (i ? s + km(ordered[i - 1], p) : 0), 0)
  const places = new Set(stops.map((s) => s.place)).size

  const openOnMap = (s: Fix) => { setFocus(s); setView('route') }

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3">
        <Select value={range} onValueChange={(v) => { setRange(v as keyof typeof ranges); setFocus(null) }}>
          <SelectTrigger className="h-9 w-40" aria-label="Range"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(ranges).map(([k, r]) => <SelectItem key={k} value={k}>{r.label}</SelectItem>)}</SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{stops.length}</span> locations · {places} places · {distance.toFixed(1)} km</p>
        <div className="ml-auto">
          <Segmented value={view} onChange={setView} label="History view" items={[
            { id: 'list', label: 'List', icon: List }, { id: 'map', label: 'Map', icon: MapIcon }, { id: 'route', label: 'Route', icon: Route },
          ]} />
        </div>
      </div>

      {stops.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No location reports in this range. The device may have been off, or location was paused.</p>
      ) : view === 'list' ? (
        <div className="max-h-[30rem] overflow-y-auto">
          {days.map((day) => (
            <div key={day.date}>
              <p className="sticky top-0 border-b bg-muted/70 px-5 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">{dayName(day.date)}</p>
              <ul className="divide-y">
                {day.stops.map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => openOnMap(s)} className="flex w-full items-center gap-4 px-5 py-2.5 text-left transition-colors hover:bg-muted/50">
                      <span className="w-16 shrink-0 text-sm tabular-nums text-muted-foreground">{time(s.at)}</span>
                      <span className={cn('size-2 shrink-0 rounded-full', s.id === last.id ? 'bg-blue-600' : s.place === 'Unrecognised place' ? 'bg-red-500' : 'bg-slate-400')} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{s.place}{s.id === last.id && <span className="ml-2 text-xs font-normal text-blue-700">last seen</span>}</span>
                        <span className="block truncate text-xs text-muted-foreground">{s.address}</span>
                      </span>
                      <span className="hidden text-xs text-muted-foreground sm:block">±{s.accuracyM} m</span>
                      <MapIcon className="size-3.5 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-[30rem]">
          <LocationMap look="map" last={last} path={stops} fence={fence} focus={focus} warn={last.place === 'Unrecognised place'} mode={view === 'route' ? 'route' : 'points'} />
        </div>
      )}
    </section>
  )
}
