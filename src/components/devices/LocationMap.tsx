// A real map (Leaflet) in two looks — street (Esri World Street Map) and satellite
// (Esri imagery). Shows the chosen day's path, the office geofence and the
// last fix with its accuracy circle. Imperative Leaflet; React says what to show.
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Fence, Fix } from '@/data/deviceLocation'

export type MapLook = 'map' | 'satellite'

const tiles: Record<MapLook, { url: string; attribution: string; labels?: string }> = {
  map: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', attribution: 'Map &copy; Esri, HERE, OpenStreetMap' },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    labels: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery &copy; Esri',
  },
}

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })

export function LocationMap({ look, last, path, fence, focus, warn, labels = true, mode = 'route' }: {
  look: MapLook; last: Fix; path: Fix[]; fence: Fence; focus: Fix | null; warn: boolean
  /** Satellite place names on/off, as in the live product. */
  labels?: boolean
  /** route = numbered stops joined in time order; points = where it was, no line. */
  mode?: 'route' | 'points'
}) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const base = useRef<L.LayerGroup | null>(null)
  const data = useRef<L.LayerGroup | null>(null)
  const ring = useRef<L.Layer | null>(null)

  useEffect(() => {
    const m = L.map(el.current!, { scrollWheelZoom: false, zoomControl: true })
    map.current = m
    base.current = L.layerGroup().addTo(m)
    data.current = L.layerGroup().addTo(m)
    return () => { m.remove(); map.current = null }
  }, [])

  // Swap the base look without losing position.
  useEffect(() => {
    const g = base.current!
    g.clearLayers()
    const t = tiles[look]
    L.tileLayer(t.url, { attribution: t.attribution, subdomains: 'abcd', maxZoom: 19 }).addTo(g)
    if (t.labels && labels) L.tileLayer(t.labels, { maxZoom: 19, opacity: 0.9 }).addTo(g)
  }, [look, labels])

  useEffect(() => {
    const g = data.current!
    const m = map.current!
    g.clearLayers()
    const sat = look === 'satellite'
    const line = sat ? '#ffffff' : '#475569'
    L.circle([fence.lat, fence.lng], { radius: fence.radiusM, color: '#3b82f6', weight: 1.5, dashArray: '6 6', fillColor: '#3b82f6', fillOpacity: sat ? 0.12 : 0.06 })
      .bindTooltip(fence.name, { direction: 'top' }).addTo(g)
    // Path in time order; stops numbered so the list and the map match.
    const ordered = [...path].reverse()
    if (mode === 'route') {
      L.polyline(ordered.map((p) => [p.lat, p.lng] as [number, number]), { color: line, weight: 3, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }).addTo(g)
      ordered.forEach((p, i) => {
        if (p.id === last.id) return
        L.marker([p.lat, p.lng], {
          icon: L.divIcon({ className: '', iconSize: [20, 20], html: `<span class="flex size-5 items-center justify-center rounded-full border-2 border-white bg-slate-700 text-[10px] font-semibold text-white shadow">${i + 1}</span>` }),
        }).bindTooltip(`${p.place} · ${time(p.at)}`, { direction: 'top', offset: [0, -8] }).addTo(g)
      })
    } else {
      // Points: one pin per place, sized by how often it was seen there.
      const byPlace = new Map<string, Fix[]>()
      ordered.forEach((p) => byPlace.set(p.place, [...(byPlace.get(p.place) ?? []), p]))
      byPlace.forEach((visits, place) => {
        if (visits.some((v) => v.id === last.id)) return
        const p = visits[visits.length - 1]
        L.circleMarker([p.lat, p.lng], { radius: 6 + Math.min(visits.length, 8), color: '#fff', weight: 2, fillColor: '#475569', fillOpacity: 0.85 })
          .bindTooltip(`${place} · ${visits.length} visit${visits.length > 1 ? 's' : ''} · last ${time(p.at)}`, { direction: 'top' }).addTo(g)
      })
    }
    const tone = warn ? 'bg-red-500' : 'bg-blue-600'
    L.circle([last.lat, last.lng], { radius: Math.max(last.accuracyM * 5, 60), color: warn ? '#ef4444' : '#2563eb', weight: 0, fillOpacity: 0.15 }).addTo(g)
    if (path.some((p) => p.id === last.id)) {
      L.marker([last.lat, last.lng], {
        zIndexOffset: 1000,
        icon: L.divIcon({
          className: '', iconSize: [26, 26],
          html: `<span class="relative flex size-[26px] items-center justify-center"><span class="absolute inline-flex size-full animate-ping rounded-full ${tone} opacity-40"></span><span class="relative inline-flex size-4 rounded-full border-[3px] border-white ${tone} shadow-md"></span></span>`,
        }),
      }).bindTooltip(`Last location · ${last.place}`, { direction: 'top', offset: [0, -12] }).addTo(g)
    }
    const pts = [...path, fence].map((p) => [p.lat, p.lng] as [number, number])
    m.fitBounds(L.latLngBounds(pts).pad(0.3), { animate: false })
  }, [path, last, fence, look, warn, mode])

  // Selecting a stop flies there and rings it.
  useEffect(() => {
    const m = map.current
    if (!m) return
    ring.current?.remove()
    if (!focus) return
    ring.current = L.circleMarker([focus.lat, focus.lng], { radius: 16, color: look === 'satellite' ? '#fff' : '#0f172a', weight: 2, fillOpacity: 0 }).addTo(m)
    m.flyTo([focus.lat, focus.lng], 16, { duration: 0.7 })
  }, [focus, look])

  return <div ref={el} className="h-full w-full" role="img" aria-label={`Map of ${last.place} and the selected day's path`} />
}
