// Real train / bus / ferry timetables from Transitous (MOTIS), a free community service.
// Schedules only — no fares. Attribution: https://transitous.org/sources/
import 'server-only';

const BASE = 'https://api.transitous.org/api/v5/plan';
const TTL = 30 * 60 * 1000;
const cache = new Map<string, { at: number; data: Journey[] }>();

export interface JourneyLeg {
  mode: string;
  from: string;
  to: string;
  start: string;
  end: string;
  line?: string;
  agency?: string;
}
export interface Journey {
  start: string;
  end: string;
  durationMin: number;
  transfers: number;
  legs: JourneyLeg[];
}

interface Raw {
  itineraries?: {
    duration: number; startTime: string; endTime: string; transfers: number;
    legs: { mode: string; startTime: string; endTime: string; routeShortName?: string; agencyName?: string;
      from: { name: string }; to: { name: string } }[];
  }[];
}

const LONG = new Set(['HIGHSPEED_RAIL', 'LONG_DISTANCE', 'NIGHT_RAIL', 'REGIONAL_FAST_RAIL', 'REGIONAL_RAIL', 'RAIL', 'COACH', 'BUS', 'FERRY']);

export async function journeys(from: [number, number], to: [number, number], timeIso: string, n = 5): Promise<Journey[]> {
  const params = new URLSearchParams({
    fromPlace: `${from[0]},${from[1]}`,
    toPlace: `${to[0]},${to[1]}`,
    time: timeIso,
    numItineraries: String(n),
    maxTravelTime: String(36 * 60),
  });
  const key = params.toString();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  const res = await fetch(`${BASE}?${params}`, {
    headers: { 'User-Agent': 'Peregrine trip planner (open source)' },
    cache: 'no-store',
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`Transitous ${res.status}`);
  const raw = (await res.json()) as Raw;
  const data: Journey[] = (raw.itineraries ?? []).map((it) => ({
    start: it.startTime,
    end: it.endTime,
    durationMin: Math.round(it.duration / 60),
    transfers: it.transfers,
    legs: it.legs
      .filter((l) => l.mode !== 'WALK')
      .map((l) => ({
        mode: LONG.has(l.mode) ? l.mode : 'LOCAL',
        from: l.from.name, to: l.to.name, start: l.startTime, end: l.endTime,
        line: l.routeShortName, agency: l.agencyName,
      })),
  }));
  cache.set(key, { at: Date.now(), data });
  return data;
}
