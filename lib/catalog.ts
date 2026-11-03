import airportsRaw from './data/airports.json';
import { COUNTRIES } from './data/countries';
import { DESTINATIONS } from './data/destinations';
import { haversine } from './geo';
import type { Destination } from './types';

export interface Airport {
  code: string;
  name: string;
  city: string;
  cc: string;
  lat: number;
  lon: number;
  large: boolean;
  /** 2 large, 1 medium, 0 small */
  size: number;
}

type RawAirport = { c: string; n: string; t: string; cc: string; la: number; lo: number; l: number };
export const AIRPORTS: Airport[] = (airportsRaw as RawAirport[]).map((a) => ({
  code: a.c, name: a.n, city: a.t, cc: a.cc, lat: a.la, lon: a.lo, large: a.l === 2, size: a.l,
}));
const BY_CODE = new Map(AIRPORTS.map((a) => [a.code, a]));
export const airport = (code: string) => BY_CODE.get(code);

/** Airports within radius, large ones first, then by distance. */
export function nearestAirports(lat: number, lon: number, radiusKm: number, max = 3): (Airport & { km: number })[] {
  return AIRPORTS.map((a) => ({ ...a, km: haversine(lat, lon, a.lat, a.lon) }))
    .filter((a) => a.km <= radiusKm)
    .filter((a) => a.size > 0 || a.km < radiusKm / 3)
    .sort((a, b) => b.size - a.size || a.km - b.km)
    .slice(0, max);
}

export function searchAirports(q: string, max = 8): Airport[] {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const exact = BY_CODE.get(s.toUpperCase());
  const hits = AIRPORTS.filter(
    (a) => a.city.toLowerCase().startsWith(s) || a.name.toLowerCase().includes(s),
  ).sort((a, b) => b.size - a.size);
  return [...(exact ? [exact] : []), ...hits.filter((a) => a !== exact)].slice(0, max);
}

export const DEST_BY_ID = new Map(DESTINATIONS.map((d) => [d.id, d]));

const CC_BY_NAME = new Map<string, string>();
for (const [cc, c] of Object.entries(COUNTRIES)) CC_BY_NAME.set(c.name.toLowerCase(), cc);
const ALIASES: Record<string, string> = {
  'united states': 'US', 'usa': 'US', 'united kingdom': 'GB', 'uk': 'GB', 'czech republic': 'CZ',
  'türkiye': 'TR', 'turkey': 'TR', 'south korea': 'KR', 'russia': 'RU', 'the netherlands': 'NL',
};
export function ccForCountryName(name: string): string | undefined {
  const k = name.toLowerCase();
  return ALIASES[k] ?? CC_BY_NAME.get(k);
}

/** Match a live result (name + coords) to a catalog place, or build an ad-hoc one. */
export function matchPlace(name: string, country: string, lat: number, lon: number, thumb?: string, airportCode?: string): Destination | null {
  let best: Destination | null = null;
  let bestKm = 40;
  for (const d of DESTINATIONS) {
    const km = haversine(lat, lon, d.lat, d.lon);
    if (km < bestKm) { best = d; bestKm = km; }
  }
  if (best) return best;
  const cc = ccForCountryName(country);
  if (!cc) return null;
  const info = COUNTRIES[cc];
  // inherit landmass from the nearest catalog place in the same country
  let land = `adhoc:${cc}`;
  let near = 250;
  for (const d of DESTINATIONS) {
    if (d.cc !== cc) continue;
    const km = haversine(lat, lon, d.lat, d.lon);
    if (km < near) { near = km; land = d.land; }
  }
  const id = `x-${name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')}`;
  return {
    id, name, country: info?.name ?? country, cc, region: info?.region ?? 'france-benelux',
    lat, lon, airports: airportCode ? [airportCode] : [], land, tags: [], daily: info?.daily ?? 70,
    months: [], blurb: 'Turned up in live fares; not in our notes yet.', adHoc: true, thumb,
  };
}
