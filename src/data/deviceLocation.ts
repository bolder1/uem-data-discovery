// Location as the miniOrange agent reports it: the last fix with its accuracy,
// and a week of history as stops per day. Dummy but plausible — every
// building maps to a real neighbourhood so the map and globe read true.
import { tabOf, type InventoryDevice } from './deviceInventory'

export interface LatLng { lat: number; lng: number }
export interface Fence extends LatLng { name: string; radiusM: number }
export interface Fix extends LatLng { id: string; at: string; accuracyM: number; place: string; address: string }
export interface HistoryDay { date: string; stops: Fix[] }

export type LocationState =
  | { kind: 'no-agent' }
  | { kind: 'denied' }
  | { kind: 'live'; last: Fix; history: HistoryDay[]; fence: Fence; source: 'Agent' | 'Lost Mode'; permission: 'Always' | 'While using' }

interface Spot extends LatLng { place: string; address: string }

const offices: Record<string, Spot> = {
  'Pune HQ': { place: 'Pune HQ', address: 'HQ39+CW6 Kumar Pinakin, Baner Annex, Baner, Pune, Maharashtra 411045, India', lat: 18.5603, lng: 73.7769 },
  'Mumbai Office': { place: 'Mumbai Office', address: 'G Block, Bandra Kurla Complex, Bandra East, Mumbai, Maharashtra 400051, India', lat: 19.0596, lng: 72.8656 },
  'Bangalore Office': { place: 'Bangalore Office', address: '100 Feet Rd, Indiranagar, Bengaluru, Karnataka 560038, India', lat: 12.9719, lng: 77.6412 },
  Remote: { place: 'Pune HQ', address: 'HQ39+CW6 Kumar Pinakin, Baner Annex, Baner, Pune, Maharashtra 411045, India', lat: 18.5603, lng: 73.7769 },
}
const homeAddress: Record<string, string> = {
  'Pune HQ': 'Lane 5, Aundh, Pune, Maharashtra 411007, India',
  'Mumbai Office': 'Hill Road, Bandra West, Mumbai, Maharashtra 400050, India',
  'Bangalore Office': '12th Main, HAL 2nd Stage, Bengaluru, Karnataka 560008, India',
}

function hash(s: string) {
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

export function deviceLocation(d: InventoryDevice): LocationState {
  // On iPhone, Lost Mode gives a location through MDM even without the agent.
  const viaLost = tabOf(d) === 'ios' && d.lostMode
  if (!d.agentVersion && !viaLost) return { kind: 'no-agent' }
  if (d.locationPermission === 'Denied' && !viaLost) return { kind: 'denied' }

  const h = hash(d.id)
  const office = offices[d.buildingName] ?? offices['Pune HQ']
  const home: Spot = { place: 'Home', address: homeAddress[office.place] ?? homeAddress['Pune HQ'], lat: office.lat + 0.004 + (h % 7) / 1000, lng: office.lng + 0.035 + (h % 11) / 1000 }
  const cafe: Spot = { place: 'Third Wave Coffee', address: `Near ${office.address.split(',').slice(1, 3).join(',').trim()}`, lat: office.lat - 0.006, lng: office.lng + 0.012 }
  const airport: Spot = { place: 'Pune Airport', address: 'New Airport Rd, Lohegaon, Pune, Maharashtra 411032, India', lat: 18.5793, lng: 73.9089 }
  // Some devices end the week somewhere new, so "last location" has a story to tell.
  const away = (h & 7) === 3 || viaLost
  const awaySpot: Spot = { place: 'Unrecognised place', address: 'Old Mumbai–Pune Hwy, Lonavala, Maharashtra 410401, India', lat: 18.7546, lng: 73.4062 }

  const end = Date.parse(d.lastCheckIn)
  const day = (n: number) => new Date(end - n * 86_400_000)
  const at = (n: number, hour: number, min = 0) => { const t = day(n); t.setHours(hour, min, 0, 0); return t.toISOString() }
  const fix = (s: Spot, iso: string, i: number): Fix => ({ id: `${iso}-${i}`, lat: s.lat, lng: s.lng, at: iso, accuracyM: 6 + Math.round((h + i * 37 + Date.parse(iso) / 60_000) % 28), place: s.place, address: s.address })

  const history: HistoryDay[] = []
  for (let n = 0; n < 7; n++) {
    const weekend = day(n).getDay() % 6 === 0
    const stops = weekend
      ? [fix(home, at(n, 9), 1), fix(cafe, at(n, 13, 30), 2), fix(home, at(n, 18), 3)]
      : [fix(home, at(n, 8, 40), 1), fix(office, at(n, 10, 5), 2), fix(cafe, at(n, 14, 10), 3), fix(office, at(n, 15), 4), fix(home, at(n, 19, 30), 5)]
    if (n === 4 && (h & 1)) stops.splice(2, 0, fix(airport, at(n, 12), 6))
    history.push({ date: day(n).toISOString(), stops: stops.reverse() })
  }
  // Today ends at the last check-in, wherever that was.
  const today = history[0].stops.filter((s) => Date.parse(s.at) <= end)
  const last = fix(away ? awaySpot : today[0] ?? home, new Date(end).toISOString(), 0)
  history[0].stops = [last, ...today.filter((s) => s.place !== last.place || s.at !== last.at)]

  return {
    kind: 'live',
    last,
    history,
    fence: { name: `${office.place} campus`, lat: office.lat, lng: office.lng, radiusM: 450 },
    source: viaLost && !d.agentVersion ? 'Lost Mode' : 'Agent',
    permission: d.locationPermission === 'While using' ? 'While using' : 'Always',
  }
}

/** Great-circle distance in km. */
export function km(a: LatLng, b: LatLng) {
  const r = (x: number) => (x * Math.PI) / 180
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(s))
}
