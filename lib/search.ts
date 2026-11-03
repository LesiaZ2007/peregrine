// The search engine. Pure: live fares are passed in, so it runs the same in tests.
// Flights are ONLY ever real fares. Ground modes start as estimates and get swapped for
// real fares (e.g. FlixBus) when a provider has them.
import { airport, matchPlace, nearestAirports } from './catalog';
import { DESTINATIONS } from './data/destinations';
import { daysBetween, fmtDay, hours, monthOf, tripWindows, weekday } from './dates';
import { estimateModes, type Leg } from './estimate';
import { haversine } from './geo';
import { linksFor } from './links';
import type {
  Destination, FlightFare, GroundFare, HomeBase, Option, SearchResult, SearchSpec, StayStyle, Trip, TripWindow,
} from './types';

export const STAY_FACTOR: Record<StayStyle, number> = { free: 0.4, hostel: 1, budget: 1.6, mid: 2.6 };
export const MAX_GOOGLE_CALLS = 6;
export const MAX_RYANAIR_CALLS = 24;
/** time to get to the airport + security before a flight, and out the other end */
const AIRPORT_BEFORE_H = 2;
const AIRPORT_AFTER_H = 1;

export interface LiveRequest {
  from: string;
  depart: string;
  ret: string;
}

/** The origin airports for a home base: chosen ones, else the nearest within the radius. */
export function originAirports(o: HomeBase, radiusKm: number): string[] {
  if (o.airports.length) return o.airports;
  return nearestAirports(o.lat, o.lon, radiusKm, 2).map((a) => a.code);
}

/** Which flight-fare calls a search wants. Ryanair is free; Google (SerpApi) is quota-capped. */
export function planLive(spec: SearchSpec, windows: TripWindow[]): { ryanair: LiveRequest[]; google: LiveRequest[] } {
  if (!spec.modes.flight) return { ryanair: [], google: [] };
  const allAirs = [...new Set(spec.origins.flatMap((o) => originAirports(o, spec.airportRadiusKm)))];
  const ryanair: LiveRequest[] = [];
  for (const w of windows) for (const from of allAirs) {
    if (ryanair.length < MAX_RYANAIR_CALLS) ryanair.push({ from, depart: w.depart, ret: w.ret });
  }
  const google: LiveRequest[] = [];
  if (spec.live) {
    const firstAirs = [...new Set(spec.origins.map((o) => originAirports(o, spec.airportRadiusKm)[0]).filter(Boolean))];
    for (const w of windows) for (const from of firstAirs) {
      if (google.length < MAX_GOOGLE_CALLS) google.push({ from, depart: w.depart, ret: w.ret });
    }
  }
  return { ryanair, google };
}

function inScope(d: Destination, spec: SearchSpec, firstMonth: number): boolean {
  const ccs = new Set(spec.origins.map((o) => o.cc));
  if (spec.exclude.includes(d.id) || spec.exclude.includes(d.cc)) return false;
  if (spec.skipVisited && spec.visited.includes(d.id)) return false;
  switch (spec.scope) {
    case 'regions': if (!spec.regions.includes(d.region)) return false; break;
    case 'countries': if (!spec.countries.includes(d.cc)) return false; break;
    case 'places': if (!spec.places.includes(d.id)) return false; break;
  }
  if (spec.abroad === 'only' && ccs.has(d.cc)) return false;
  if (spec.abroad === 'domestic' && !ccs.has(d.cc)) return false;
  if (spec.tagsAny.length && d.adHoc) return false;
  if (spec.tagsAny.length && !spec.tagsAny.some((t) => d.tags.includes(t))) return false;
  if (spec.tagsNone.some((t) => d.tags.includes(t))) return false;
  if (spec.inSeasonOnly && d.months.length && !d.months.includes(firstMonth)) return false;
  return true;
}

function interestOf(d: Destination, spec: SearchSpec, month: number): { score: number; why: string[] } {
  const why: string[] = [];
  let s = 0.25 + Math.min(d.tags.length, 7) * 0.04;
  if (spec.tagsAny.length) {
    const hit = spec.tagsAny.filter((t) => d.tags.includes(t));
    s += (hit.length / spec.tagsAny.length) * 0.4;
    if (hit.length) why.push(hit.join(', ').replace(/-/g, ' '));
  }
  if (d.months.includes(month)) { s += 0.15; why.push('good time of year'); }
  if (spec.wishlist.includes(d.id)) { s += 0.3; why.push('on your wishlist'); }
  if (d.adHoc) s -= 0.1;
  return { score: Math.max(0, Math.min(1, s)), why };
}

/** Cost of an option for picking "the best" — money plus what time and hassle are worth to you. */
function effort(o: Option, spec: SearchSpec): number {
  const w = spec.weights;
  const perHour = 3 + 18 * (w.time / Math.max(0.1, w.price + w.time));
  // real prices are worth a small edge over guesses
  return o.price + (o.outMin / 60) * perHour * 2 + o.transfers * 4 * (0.5 + w.comfort) - (o.source === 'live' ? 3 : 0);
}

function keepOption(o: Option, spec: SearchSpec): boolean {
  return (
    o.outMin / 60 <= spec.maxLegHours &&
    o.transfers <= spec.maxTransfers &&
    (spec.overnight || !o.overnight) &&
    (spec.budgetTransport == null || o.price <= spec.budgetTransport)
  );
}

const hhmm = (iso?: string) => (iso && iso.length >= 16 ? hours(iso.slice(11, 16)) : null);

/** Does a real flight's timing fit "free from" and "home by"? */
export function flightFits(f: FlightFare, w: TripWindow, spec: SearchSpec): boolean {
  const out = hhmm(f.outDep);
  if (out != null && f.outDep!.slice(0, 10) === w.depart && out - AIRPORT_BEFORE_H < hours(spec.when.leaveAfter)) return false;
  const back = hhmm(f.inArr);
  if (back != null && f.inArr!.slice(0, 10) === w.ret && back + AIRPORT_AFTER_H > hours(spec.when.backBy)) return false;
  return true;
}

/** Hours on the ground from real flight times, when we have them. */
function groundHours(f: FlightFare | undefined, w: TripWindow, fallback: number): number {
  if (!f?.outArr || !f.inDep) return fallback;
  const a = Date.parse(f.outArr.slice(0, 16) + ':00Z');
  const b = Date.parse(f.inDep.slice(0, 16) + ':00Z');
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return fallback;
  return Math.round((b - a) / 3_600_000 - AIRPORT_AFTER_H - AIRPORT_BEFORE_H);
}

function flightOption(f: FlightFare, leg: Leg, w: TripWindow, spec: SearchSpec): Option {
  const bag = spec.checkedBag ? 70 : 0;
  const air = f.airMin ?? Math.round((leg.km / 780) * 60 + 35);
  const times = f.outDep && f.inDep ? `out ${f.outDep.slice(11, 16)}, back ${f.inDep.slice(11, 16)}` : '';
  return {
    mode: 'flight',
    outMin: air + (AIRPORT_BEFORE_H + AIRPORT_AFTER_H) * 60,
    transfers: f.stops,
    stops: f.stops,
    price: Math.round(f.priceUsd + bag),
    priceHigh: Math.round(f.priceUsd + bag),
    source: 'live',
    overnight: false,
    carrier: f.carrier,
    note: [f.source, times, spec.checkedBag ? '+ about $70 for a checked bag' : 'hand luggage'].filter(Boolean).join(' · '),
    hoursThere: Number.isFinite(groundHours(f, w, NaN)) ? groundHours(f, w, NaN) : undefined,
    links: [{ label: f.source === 'Ryanair' ? 'Book on Ryanair' : 'Google Travel', url: f.link }, ...linksFor('flight', { ...leg, fromAir: f.from, toAir: f.toAirport ?? leg.toAir })],
  };
}

export interface SearchInput {
  today?: string;
  flights?: FlightFare[];
}

interface Candidate {
  trip: Trip;
  cost: number;
}

/** Choose the best option for a trip and work out time there, stay cost and total. Mutates. */
export function settleTrip(t: Trip, spec: SearchSpec): boolean {
  t.options = t.options.filter((o) => keepOption(o, spec));
  if (!t.options.length) return false;
  t.options.sort((a, b) => effort(a, spec) - effort(b, spec));
  const best = t.options[0];
  // a night journey doubles as a bed, so it costs fewer hours on the ground
  const travelHours = (best.outMin / 60) * 2 * (best.overnight ? 0.4 : 1);
  const est = Math.round(t.window.spanHours - travelHours);
  t.best = best;
  t.hoursThere = best.hoursThere ?? est;
  if (t.hoursThere < spec.minHoursThere) return false;
  const nightsPaid = Math.max(0, t.window.nights - (best.overnight ? 1 : 0));
  t.stayCost = Math.round(t.dest.daily * STAY_FACTOR[spec.stayStyle] * Math.max(nightsPaid, 0.5));
  t.total = best.price + t.stayCost;
  if (spec.budgetTotal != null && t.total > spec.budgetTotal) return false;
  return true;
}

export function runSearch(spec: SearchSpec, input: SearchInput = {}): SearchResult {
  const today = input.today ?? fmtDay(new Date());
  const windows = tripWindows(spec.when, today);
  const empty = (note: string): SearchResult => ({ trips: [], considered: 0, windows, live: { used: false, calls: 0, cached: 0, errors: [] }, notes: [note] });
  if (!windows.length) return empty('No dates fit those settings. Loosen the days or blackouts.');
  if (!spec.origins.length) return empty('Add a home base to start from.');
  const firstMonth = monthOf(windows[0].depart);

  // real flight fares → destination id → depart date → cheapest fare that fits your hours
  const fareBy = new Map<string, Map<string, FlightFare>>();
  const extra = new Map<string, Destination>();
  const winBy = new Map(windows.map((w) => [w.depart, w]));
  for (const f of input.flights ?? []) {
    const w = winBy.get(f.depart);
    if (!w || f.ret !== w.ret || !f.priceUsd || !flightFits(f, w, spec)) continue;
    const byAir = f.toAirport ? DESTINATIONS.find((d) => d.airports[0] === f.toAirport) : undefined;
    const d = byAir ?? matchPlace(f.name, f.country, f.lat, f.lon, f.thumb, f.toAirport);
    if (!d) continue;
    if (d.adHoc) extra.set(d.id, d);
    const m = fareBy.get(d.id) ?? new Map<string, FlightFare>();
    const prev = m.get(f.depart);
    if (!prev || f.priceUsd < prev.priceUsd) m.set(f.depart, f);
    fareBy.set(d.id, m);
  }

  const pool = [...DESTINATIONS, ...extra.values()].filter((d) => inScope(d, spec, firstMonth));
  const trips: Trip[] = [];
  const maxKm = spec.maxDistanceKm > 0 ? spec.maxDistanceKm : Infinity;

  for (const dest of pool) {
    let best: Candidate | null = null;
    const alts: Trip['alts'] = [];

    for (const o of spec.origins) {
      const km = haversine(o.lat, o.lon, dest.lat, dest.lon);
      if (km < Math.max(spec.minDistanceKm, 25) || km > maxKm) continue;
      const fromAirs = originAirports(o, spec.airportRadiusKm);
      const originLand = nearestLand(o);

      for (const w of windows) {
        const leg: Leg = {
          fromName: o.label, toName: dest.name, fromLat: o.lat, fromLon: o.lon, toLat: dest.lat, toLon: dest.lon,
          fromCc: o.cc, toCc: dest.cc, fromLand: originLand, toLand: dest.land, toRegion: dest.region,
          fromAir: fromAirs[0], toAir: dest.airports[0], km, depart: w.depart, ret: w.ret,
        };
        const options = estimateModes(leg, {
          travellers: spec.travellers, under26: spec.under26, railcard: spec.railcard, checkedBag: spec.checkedBag,
          leadDays: daysBetween(today, w.depart), departWeekday: weekday(w.depart),
        }, spec.modes);
        const fare = fareBy.get(dest.id)?.get(w.depart);
        // only use a fare that leaves from this home base's airports
        const fareHere = fare && (fromAirs.includes(fare.from) || haversine(o.lat, o.lon, airport(fare.from)?.lat ?? 0, airport(fare.from)?.lon ?? 0) <= spec.airportRadiusKm) ? fare : undefined;
        if (fareHere && spec.modes.flight) options.unshift(flightOption(fareHere, leg, w, spec));

        const t: Trip = {
          key: `${dest.id}|${w.depart}`, dest, originLabel: o.label, originLat: o.lat, originLon: o.lon,
          distanceKm: Math.round(km), window: w, options, best: options[0], hoursThere: 0, stayCost: 0, total: 0,
          interest: 0, score: 0, reasons: [], flags: [], alts,
        };
        if (!settleTrip(t, spec)) continue;

        const prev = alts.find((a) => a.window.depart === w.depart);
        if (!prev || t.total < prev.total) {
          if (prev) alts.splice(alts.indexOf(prev), 1);
          alts.push({ window: w, mode: t.best.mode, price: t.best.price, total: t.total, source: t.best.source });
        }
        const cost = effort(t.best, spec) + t.stayCost;
        if (!best || cost < best.cost) best = { trip: t, cost };
      }
    }
    if (best) {
      best.trip.alts = alts.sort((a, b) => a.window.depart.localeCompare(b.window.depart));
      trips.push(best.trip);
    }
  }

  scoreTrips(trips, spec, firstMonth);
  sortTrips(trips, spec.sort);
  const notes: string[] = [];
  if (extra.size) notes.push(`${extra.size} extra place${extra.size > 1 ? 's' : ''} turned up in live flight fares.`);
  return {
    trips: trips.slice(0, spec.limit),
    considered: pool.length,
    windows,
    live: { used: (input.flights?.length ?? 0) > 0, calls: 0, cached: 0, errors: [] },
    notes,
  };
}

/** Swap an estimated ground option for a real fare, then re-settle the trip. Returns false if it no longer fits. */
export function applyGroundFare(t: Trip, fare: GroundFare, spec: SearchSpec): boolean {
  const est = t.options.find((o) => o.mode === fare.mode);
  const real: Option = {
    mode: fare.mode, outMin: fare.outMin, transfers: fare.transfers, price: Math.round(fare.priceUsd),
    priceHigh: Math.round(fare.priceUsd), source: 'live', overnight: fare.overnight, carrier: fare.carrier, note: fare.note,
    links: [{ label: `Book on ${fare.carrier}`, url: fare.link }, ...(est?.links.filter((l) => l.label !== fare.carrier) ?? [])],
  };
  const before = t.options;
  t.options = [real, ...t.options.filter((o) => o.mode !== fare.mode)];
  const ok = settleTrip(t, spec);
  if (!ok) t.options = before;
  const alt = t.alts.find((a) => a.window.depart === t.window.depart);
  if (ok && alt) Object.assign(alt, { mode: t.best.mode, price: t.best.price, total: t.total, source: t.best.source });
  return ok;
}

/** Landmass of a home base: borrowed from the nearest catalog place. */
function nearestLand(o: HomeBase): string {
  let land = 'eurasia';
  let near = Infinity;
  for (const d of DESTINATIONS) {
    const km = haversine(o.lat, o.lon, d.lat, d.lon);
    if (km < near) { near = km; land = d.land; }
  }
  if (near > 400) {
    const sameCc = DESTINATIONS.find((d) => d.cc === o.cc);
    if (sameCc) land = sameCc.land;
  }
  return land;
}

function norm(vals: number[], v: number, invert: boolean): number {
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  if (hi === lo) return 1;
  const x = (v - lo) / (hi - lo);
  return invert ? 1 - x : x;
}

export function scoreTrips(trips: Trip[], spec: SearchSpec, month: number) {
  if (!trips.length) return;
  const totals = trips.map((t) => t.total);
  const times = trips.map((t) => t.best.outMin);
  const there = trips.map((t) => t.hoursThere);
  const minTotal = Math.min(...totals);
  const w = spec.weights;
  const sum = w.price + w.time + w.interest + w.hoursThere + w.comfort || 1;
  for (const t of trips) {
    const it = interestOf(t.dest, spec, month);
    t.interest = it.score;
    const comfort = Math.max(0, 1 - t.best.transfers * 0.22 - (t.best.overnight ? 0.15 : 0));
    const s =
      w.price * norm(totals, t.total, true) +
      w.time * norm(times, t.best.outMin, true) +
      w.interest * it.score +
      w.hoursThere * norm(there, t.hoursThere, false) +
      w.comfort * comfort;
    t.score = Math.round((100 * s) / sum);
    const reasons: string[] = [];
    if (t.total === minTotal) reasons.push('cheapest overall');
    if (t.best.source === 'live') reasons.push(`real ${t.best.mode === 'flight' ? 'fare' : `${t.best.carrier ?? ''} fare`}`.replace('  ', ' '));
    if (t.best.overnight && t.best.mode !== 'ferry') reasons.push('travel overnight, save a night');
    reasons.push(...it.why);
    t.reasons = reasons;
    t.flags = [
      ...(t.dest.adHoc ? ['new'] : []),
      ...(spec.wishlist.includes(t.dest.id) ? ['wish'] : []),
      ...(spec.visited.includes(t.dest.id) ? ['been'] : []),
    ];
  }
}

export function sortTrips(trips: Trip[], key: SearchSpec['sort']) {
  const by: Record<SearchSpec['sort'], (t: Trip) => number> = {
    score: (t) => -t.score,
    price: (t) => t.best.price,
    total: (t) => t.total,
    time: (t) => t.best.outMin,
    hoursThere: (t) => -t.hoursThere,
    distance: (t) => t.distanceKm,
  };
  trips.sort((a, b) => by[key](a) - by[key](b) || a.total - b.total);
}
