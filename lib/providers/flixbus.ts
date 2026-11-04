// Real FlixBus coach fares from the public search API the FlixBus site uses. Free, no key.
import 'server-only';
import { haversine } from '../geo';

const API = 'https://global.api.flixbus.com';
const HEADERS = { 'User-Agent': 'Peregrine trip planner (open source)', Accept: 'application/json' };
const TTL = 3 * 60 * 60 * 1000;
const cityCache = new Map<string, string | null>();
const rideCache = new Map<string, { at: number; data: Ride[] }>();

export interface Ride {
  dep: string;
  arr: string;
  priceEur: number;
  transfers: number;
  durationMin: number;
}

interface CityHit { id: string; name: string; location: { lat: number; lon: number }; is_flixbus_city: boolean }

/** FlixBus city id for a place, matched by name and checked against coordinates. */
export async function cityId(name: string, lat: number, lon: number): Promise<string | null> {
  const key = `${name}|${lat.toFixed(2)}|${lon.toFixed(2)}`;
  if (cityCache.has(key)) return cityCache.get(key)!;
  const clean = name.replace(/\s*\(.*\)\s*/g, '').trim();
  const res = await fetch(`${API}/search/autocomplete/cities?q=${encodeURIComponent(clean)}&lang=en&flixbus_cities_only=false`, {
    headers: HEADERS, signal: AbortSignal.timeout(10_000), cache: 'no-store',
  });
  if (!res.ok) throw new Error(`FlixBus ${res.status}`);
  const hits = (await res.json()) as CityHit[];
  const near = hits
    .filter((h) => h.is_flixbus_city && h.location)
    .map((h) => ({ h, km: haversine(lat, lon, h.location.lat, h.location.lon) }))
    .filter((x) => x.km < 40)
    .sort((a, b) => a.km - b.km)[0];
  const id = near?.h.id ?? null;
  cityCache.set(key, id);
  return id;
}

interface SearchRaw {
  trips?: { results: Record<string, {
    status: string; departure: { date: string }; arrival: { date: string };
    price: { total: number }; duration: { hours: number; minutes: number }; legs?: unknown[];
  }> }[];
}

export async function rides(fromId: string, toId: string, date: string): Promise<Ride[]> {
  const [y, m, d] = date.split('-');
  const q = new URLSearchParams({
    from_city_id: fromId, to_city_id: toId, departure_date: `${d}.${m}.${y}`, products: JSON.stringify({ adult: 1 }),
    currency: 'EUR', locale: 'en', search_by: 'cities', include_after_midnight_rides: '1',
  });
  const key = q.toString();
  const hit = rideCache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  const res = await fetch(`${API}/search/service/v4/search?${q}`, { headers: HEADERS, signal: AbortSignal.timeout(15_000), cache: 'no-store' });
  if (!res.ok) throw new Error(`FlixBus ${res.status}`);
  const raw = (await res.json()) as SearchRaw;
  const data: Ride[] = Object.values(raw.trips?.[0]?.results ?? {})
    .filter((r) => r.status === 'available' && r.price?.total > 0)
    .map((r) => ({
      dep: r.departure.date,
      arr: r.arrival.date,
      priceEur: r.price.total,
      transfers: Math.max(0, (r.legs?.length ?? 1) - 1),
      durationMin: r.duration.hours * 60 + r.duration.minutes,
    }));
  rideCache.set(key, { at: Date.now(), data });
  return data;
}

export function flixLink(fromId: string, toId: string, date: string, ret?: string): string {
  const fmt = (s: string) => s.split('-').reverse().join('.');
  const q = new URLSearchParams({ departureCity: fromId, arrivalCity: toId, rideDate: fmt(date), adult: '1', _locale: 'en' });
  if (ret) q.set('backRide', fmt(ret));
  return `https://shop.flixbus.com/search?${q}`;
}
