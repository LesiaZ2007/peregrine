// The real line a train, coach or ferry follows, from Transitous journey plans (free, open data).
// Used only to draw the map. Cached for a day; callers keep requests few.
import 'server-only';

const BASE = 'https://api.transitous.org/api/v5/plan';
const TTL = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; data: ShapeLeg[] | null }>();

export type ShapeMode = 'train' | 'bus' | 'ferry' | 'local';
export interface ShapeLeg {
  mode: ShapeMode;
  coords: [number, number][]; // [lon, lat]
}

const RAIL = new Set(['HIGHSPEED_RAIL', 'LONG_DISTANCE', 'NIGHT_RAIL', 'REGIONAL_FAST_RAIL', 'REGIONAL_RAIL', 'RAIL', 'SUBURBAN']);

/** Google encoded polyline → [lon, lat] */
export function decodePolyline(str: string, precision = 6): [number, number][] {
  const f = 10 ** precision;
  const out: [number, number][] = [];
  let i = 0, lat = 0, lon = 0;
  while (i < str.length) {
    for (const which of [0, 1]) {
      let shift = 0, result = 0, b: number;
      do {
        b = str.charCodeAt(i++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const d = result & 1 ? ~(result >> 1) : result >> 1;
      if (which === 0) lat += d; else lon += d;
    }
    out.push([lon / f, lat / f]);
  }
  return out;
}

/** Keep at most `max` points, always keeping the ends. */
function thin(pts: [number, number][], max = 150): [number, number][] {
  if (pts.length <= max) return pts;
  const step = (pts.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, k) => pts[Math.round(k * step)]);
}

interface Raw {
  itineraries?: { legs: { mode: string; distance?: number; legGeometry?: { points: string; precision?: number } }[] }[];
}

export async function routeShape(from: [number, number], to: [number, number], timeIso: string): Promise<ShapeLeg[] | null> {
  const params = new URLSearchParams({
    fromPlace: `${from[0]},${from[1]}`, toPlace: `${to[0]},${to[1]}`, time: timeIso, numItineraries: '1', maxTravelTime: String(30 * 60),
  });
  const key = `${from.map((x) => x.toFixed(3))}|${to.map((x) => x.toFixed(3))}|${timeIso.slice(0, 10)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  const res = await fetch(`${BASE}?${params}`, {
    headers: { 'User-Agent': 'Peregrine trip planner (open source)' }, cache: 'no-store', signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Transitous ${res.status}`);
  const raw = (await res.json()) as Raw;
  const it = raw.itineraries?.[0];
  const data = it
    ? it.legs
        .filter((l) => l.legGeometry?.points && l.mode !== 'WALK')
        .map((l) => {
          const mode: ShapeMode = RAIL.has(l.mode) ? 'train'
            : l.mode === 'FERRY' ? 'ferry'
            : (l.mode === 'COACH' || l.mode === 'BUS') && (l.distance ?? 0) > 25_000 ? 'bus'
            : 'local';
          return { mode, coords: thin(decodePolyline(l.legGeometry!.points, l.legGeometry!.precision ?? 6)) };
        })
        .filter((l) => l.coords.length > 1)
    : null;
  cache.set(key, { at: Date.now(), data: data?.length ? data : null });
  return data?.length ? data : null;
}
