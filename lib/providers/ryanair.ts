// Real Ryanair fares from the public fare-finder endpoint the Ryanair site uses. Free, no key.
// One call returns the cheapest round trip to every Ryanair destination from an airport.
import 'server-only';

const BASE = 'https://services-api.ryanair.com/farfnd/v4/roundTripFares';
const TTL = 3 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; data: RyanairFare[] }>();

export interface RyanairFare {
  from: string;
  to: string;
  city: string;
  country: string;
  priceEur: number;
  outDep: string;
  outArr: string;
  inDep: string;
  inArr: string;
  flights: string;
}

interface Raw {
  fares?: {
    outbound: Leg;
    inbound: Leg;
    summary?: { price?: { value: number; currencyCode: string } };
  }[];
}
interface Leg {
  departureAirport: { iataCode: string };
  arrivalAirport: { iataCode: string; countryName: string; city?: { name: string }; name: string };
  departureDate: string;
  arrivalDate: string;
  price: { value: number; currencyCode: string };
  flightNumber: string;
}

export async function roundTrips(from: string, depart: string, ret: string): Promise<{ fares: RyanairFare[]; cached: boolean }> {
  const params = new URLSearchParams({
    departureAirportIataCode: from,
    outboundDepartureDateFrom: depart,
    outboundDepartureDateTo: depart,
    inboundDepartureDateFrom: ret,
    inboundDepartureDateTo: ret,
    currency: 'EUR',
    market: 'en-gb',
  });
  const key = params.toString();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return { fares: hit.data, cached: true };
  const res = await fetch(`${BASE}?${params}`, {
    headers: { 'User-Agent': 'Peregrine trip planner (open source)', Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Ryanair ${res.status}`);
  const raw = (await res.json()) as Raw;
  const fares: RyanairFare[] = (raw.fares ?? [])
    .filter((f) => f.outbound?.price?.currencyCode === 'EUR')
    .map((f) => ({
      from: f.outbound.departureAirport.iataCode,
      to: f.outbound.arrivalAirport.iataCode,
      city: f.outbound.arrivalAirport.city?.name ?? f.outbound.arrivalAirport.name,
      country: f.outbound.arrivalAirport.countryName,
      priceEur: f.summary?.price?.value ?? f.outbound.price.value + f.inbound.price.value,
      outDep: f.outbound.departureDate,
      outArr: f.outbound.arrivalDate,
      inDep: f.inbound.departureDate,
      inArr: f.inbound.arrivalDate,
      flights: `${f.outbound.flightNumber} / ${f.inbound.flightNumber}`,
    }));
  cache.set(key, { at: Date.now(), data: fares });
  return { fares, cached: false };
}

export function ryanairLink(f: RyanairFare): string {
  const q = new URLSearchParams({
    adults: '1', teens: '0', children: '0', infants: '0', dateOut: f.outDep.slice(0, 10), dateIn: f.inDep.slice(0, 10),
    isConnectedFlight: 'false', isReturn: 'true', discount: '0', originIata: f.from, destinationIata: f.to,
  });
  return `https://www.ryanair.com/gb/en/trip/flights/select?${q}`;
}
