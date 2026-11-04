// Live flight fares through SerpApi (Google Travel Explore + Google Flights).
// Free plan is a few hundred searches a month, so everything is cached and capped.
import 'server-only';

const BASE = 'https://serpapi.com/search.json';
const TTL = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; data: unknown }>();

export const hasSerp = () => Boolean(process.env.SERPAPI_KEY);

async function get<T>(params: Record<string, string>): Promise<{ data: T; cached: boolean }> {
  const key = JSON.stringify(params);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return { data: hit.data as T, cached: true };
  const qs = new URLSearchParams({ ...params, api_key: process.env.SERPAPI_KEY ?? '' });
  const res = await fetch(`${BASE}?${qs}`, { cache: 'no-store', signal: AbortSignal.timeout(25_000) });
  if (!res.ok) throw new Error(`SerpApi ${res.status}`);
  const data = (await res.json()) as T & { error?: string };
  if (data.error) throw new Error(data.error);
  cache.set(key, { at: Date.now(), data });
  return { data, cached: false };
}

export interface ExploreHit {
  name: string;
  country: string;
  lat: number;
  lon: number;
  airport?: string;
  price?: number;
  durationMin?: number;
  stops?: number;
  airline?: string;
  thumb?: string;
  link: string;
}

interface ExploreRaw {
  destinations?: {
    name: string; country: string; gps_coordinates: { latitude: number; longitude: number };
    destination_airport?: { code: string }; flight_price?: number; flight_duration?: number;
    number_of_stops?: number; airline?: string; thumbnail?: string; link: string;
  }[];
}

/** Everywhere you can fly from `from` on these dates, cheapest fare each (round trip, USD). */
export async function explore(from: string, depart: string, ret: string) {
  const { data, cached } = await get<ExploreRaw>({
    engine: 'google_travel_explore', departure_id: from, outbound_date: depart, return_date: ret,
    currency: 'USD', hl: 'en', gl: 'us',
  });
  const hits: ExploreHit[] = (data.destinations ?? []).map((d) => ({
    name: d.name, country: d.country, lat: d.gps_coordinates.latitude, lon: d.gps_coordinates.longitude,
    airport: d.destination_airport?.code, price: d.flight_price, durationMin: d.flight_duration,
    stops: d.number_of_stops, airline: d.airline, thumb: d.thumbnail, link: d.link,
  }));
  return { hits, cached };
}

export interface FlightOffer {
  price: number;
  airline: string;
  logo?: string;
  stops: number;
  durationMin: number;
  departTime: string;
  arriveTime: string;
  from: string;
  to: string;
}
interface FlightsRaw {
  best_flights?: FlightRaw[];
  other_flights?: FlightRaw[];
  search_metadata?: { google_flights_url?: string };
}
interface FlightRaw {
  price?: number; total_duration?: number; airline_logo?: string;
  flights: { airline: string; departure_airport: { id: string; time: string }; arrival_airport: { id: string; time: string } }[];
}

/** Concrete round-trip offers for one route and date pair. */
export async function flights(from: string, to: string, depart: string, ret: string, adults = 1) {
  const { data, cached } = await get<FlightsRaw>({
    engine: 'google_flights', departure_id: from, arrival_id: to, outbound_date: depart,
    return_date: ret, type: '1', adults: String(adults), currency: 'USD', hl: 'en',
  });
  const raw = [...(data.best_flights ?? []), ...(data.other_flights ?? [])];
  const offers: FlightOffer[] = raw
    .filter((f) => f.price && f.flights?.length)
    .map((f) => {
      const a = f.flights[0];
      const z = f.flights[f.flights.length - 1];
      return {
        price: f.price!, airline: a.airline, logo: f.airline_logo, stops: f.flights.length - 1,
        durationMin: f.total_duration ?? 0, departTime: a.departure_airport.time, arriveTime: z.arrival_airport.time,
        from: a.departure_airport.id, to: z.arrival_airport.id,
      };
    })
    .sort((x, y) => x.price - y.price)
    .slice(0, 8);
  return { offers, cached, url: data.search_metadata?.google_flights_url };
}

let quotaCache: { at: number; left: number; total: number } | null = null;
export async function quota() {
  if (!hasSerp()) return null;
  if (quotaCache && Date.now() - quotaCache.at < 5 * 60 * 1000) return quotaCache;
  try {
    const res = await fetch(`https://serpapi.com/account.json?api_key=${process.env.SERPAPI_KEY}`, { cache: 'no-store' });
    const a = (await res.json()) as { plan_searches_left?: number; searches_per_month?: number };
    quotaCache = { at: Date.now(), left: a.plan_searches_left ?? 0, total: a.searches_per_month ?? 0 };
    return quotaCache;
  } catch {
    return null;
  }
}
