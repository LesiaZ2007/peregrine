// The search engine. Pure: live fares are passed in, so it runs the same in tests.
// Flights are ONLY ever real fares. Ground modes start as estimates and get swapped for
// real fares (e.g. FlixBus) when a provider has them.
import { budgetAirlines, flightHint, likelyCheapFare, typicalLowFare } from './airlines';
import { airport, matchPlace, nearestAirports } from './catalog';
import { sureness } from './confidence';
import { costTotal, stayCosts } from './costs';
import { COUNTRIES } from './data/countries';
import { DESTINATIONS } from './data/destinations';
import { daysBetween, fmtDay, hours, monthOf, tripWindows, weekday } from './dates';
import { estimateModes, ferryHours, ferryLegPrice, type Leg } from './estimate';
import { haversine } from './geo';
import { linksFor } from './links';
import { money } from './money';
import type {
  Destination, FlightFare, GroundFare, HomeBase, Mode, Option, SearchResult, SearchSpec, Trip, TripWindow,
} from './types';

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
  if (spec.skipBeenCountries && spec.beenCountries.includes(d.cc)) return false;
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
  // real prices get a small edge; guessed flight fares carry an uncertainty penalty
  // ("other airlines" beside a live fare gets only a nudge: missing a cheaper flight costs more than a slight overestimate)
  const doubt = o.mode === 'flight' && o.source === 'estimate' ? (o.alsoLive ? 4 : 12 + o.price * 0.12) : 0;
  return o.price + (o.extraEst ?? 0) + (o.outMin / 60) * perHour * 2 + o.transfers * 4 * (0.5 + w.comfort) - (o.source === 'live' ? 3 : 0) + doubt;
}

const MODE_WORD: Record<Mode, string> = { flight: 'air', train: 'train', bus: 'coach', ferry: 'ferry', rideshare: 'rideshare', drive: 'car' };

/** Why an option breaks your limits, or null if it doesn't. */
function whyBlocked(o: Option, spec: SearchSpec): string | null {
  const h = o.outMin / 60 - spec.maxLegHours;
  if (h > 0) return `${Math.ceil(h * 2) / 2} h over your journey limit`;
  if (o.transfers > spec.maxTransfers) return `${o.transfers} changes (you allow ${spec.maxTransfers})`;
  if (!spec.overnight && o.overnight) return 'travels overnight';
  const price = o.price + (o.extraEst ?? 0);
  if (spec.budgetTransport != null && price > spec.budgetTransport) return `${money(price - spec.budgetTransport, spec.currency)} over your travel budget`;
  // per-mode limits ("no more than 4 h on a coach"), checked leg by leg where legs are known
  const lim = spec.modeMaxHours ?? {};
  const parts: { mode: Mode; min: number }[] = o.legs?.length
    ? o.legs.filter((l) => l.min != null).map((l) => ({ mode: l.mode, min: l.min! }))
    : [{ mode: o.mode, min: o.outMin }];
  for (const p of parts) {
    const max = lim[p.mode];
    if (max != null && max > 0 && p.min / 60 > max) return `${Math.round((p.min / 60) * 2) / 2} h by ${MODE_WORD[p.mode]} (your limit is ${max} h)`;
  }
  return null;
}
function keepOption(o: Option, spec: SearchSpec): boolean {
  return whyBlocked(o, spec) === null;
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

/** Getting between a town and an airport that's a real trip away (over 25 km). */
function transfer(lat: number, lon: number, code: string | undefined, cc: string): { min: number; usd: number; mode: 'train' | 'bus'; km: number } | null {
  const a = code ? airport(code) : undefined;
  if (!a) return null;
  const km = haversine(lat, lon, a.lat, a.lon);
  if (km <= 25) return null;
  const mode = (COUNTRIES[cc]?.railScore ?? 0) >= 2 ? 'train' : 'bus';
  return { min: Math.round((km * 1.25) / 65 * 60 + 15), usd: Math.round((4 + km * 0.07) * 2), mode, km: Math.round(km) };
}

function flightOption(f: FlightFare, leg: Leg, w: TripWindow, spec: SearchSpec): Option {
  const est = f.source === 'Estimate';
  const bag = spec.checkedBag ? 70 : 0;
  const air = f.airMin ?? Math.round((leg.km / 780) * 60 + 35);
  const times = f.outDep && f.inDep ? `out ${f.outDep.slice(11, 16)}, back ${f.inDep.slice(11, 16)}` : '';
  const toAir = f.toAirport ?? leg.toAir;
  const before = transfer(leg.fromLat, leg.fromLon, f.from, leg.fromCc);
  const after = transfer(leg.toLat, leg.toLon, toAir, leg.toCc);
  const word = (m: 'train' | 'bus') => (m === 'train' ? 'train' : 'coach');
  const legs: Option['legs'] = before || after
    ? [
        ...(before ? [{ mode: before.mode, note: `${word(before.mode)} to ${f.from}, ${before.km} km, about ${Math.round(before.min / 6) / 10} h`, price: before.usd, source: 'estimate' as const, min: before.min }] : []),
        { mode: 'flight' as const, note: `fly ${f.from} → ${toAir ?? leg.toName}`, price: Math.round(f.priceUsd + bag), source: est ? ('estimate' as const) : ('live' as const), min: air + (AIRPORT_BEFORE_H + AIRPORT_AFTER_H) * 60 },
        ...(after ? [{ mode: after.mode, note: `${word(after.mode)} from ${toAir} to ${leg.toName}, ${after.km} km, about ${Math.round(after.min / 6) / 10} h`, price: after.usd, source: 'estimate' as const, min: after.min }] : []),
      ]
    : undefined;
  const extraEst = (before?.usd ?? 0) + (after?.usd ?? 0);
  const searchLinks = linksFor('flight', { ...leg, fromAir: f.from, toAir: f.toAirport ?? leg.toAir });
  return {
    mode: 'flight',
    legs,
    extraEst: extraEst || undefined,
    outMin: air + (AIRPORT_BEFORE_H + AIRPORT_AFTER_H) * 60 + (before?.min ?? 0) + (after?.min ?? 0),
    transfers: f.stops,
    stops: f.stops,
    price: Math.round(f.priceUsd + bag),
    priceHigh: Math.round((f.priceHighUsd ?? f.priceUsd) + bag),
    source: est ? 'estimate' : 'live',
    overnight: false,
    carrier: f.carrier,
    note: est
      ? `no live fare for these dates; typical budget fare for ${Math.round(leg.km)} km${spec.checkedBag ? ', + about $70 for a checked bag' : ''}`
      : [f.source, times, spec.checkedBag ? '+ about $70 for a checked bag' : 'hand luggage'].filter(Boolean).join(' · '),
    hoursThere: Number.isFinite(groundHours(f, w, NaN)) ? Math.round(groundHours(f, w, NaN) - ((after?.min ?? 0) * 2) / 60) : undefined,
    path: airPath(leg, f.from, toAir),
    links: est ? searchLinks : [{ label: f.source === 'Ryanair' ? 'Book on Ryanair' : 'Google Travel', url: f.link }, ...searchLinks],
  };
}

/**
 * When no live source has a fare, estimate one from typical budget fares for the distance,
 * nudged up for late booking and Friday departures. Always shown as an estimate.
 */
function estimatedFare(from: string, to: string, km: number, w: TripWindow, leadDays: number): FlightFare {
  const { low, high } = typicalLowFare(km);
  const lead = leadDays < 7 ? 1.5 : leadDays < 21 ? 1.15 : 1;
  const dow = weekday(w.depart) === 5 ? 1.1 : 1;
  const a = airport(to);
  return {
    from, depart: w.depart, ret: w.ret, toAirport: to, name: a?.city ?? to, country: '', lat: a?.lat ?? 0, lon: a?.lon ?? 0,
    priceUsd: Math.round((low + (high - low) * 0.4) * lead * dow),
    priceHighUsd: Math.round(high * lead * dow),
    stops: km > 3500 ? 1 : 0,
    carrier: 'Budget airlines (estimate)',
    link: '',
    source: 'Estimate',
  };
}

/** If an airport sits on a different landmass from the place (linked by ferry), the catalog place by that airport. */
function gatewayFor(code: string | undefined, dest: Destination): Destination | null {
  const a = code ? airport(code) : undefined;
  if (!a) return null;
  let near: Destination | null = null;
  let best = 80;
  for (const d of DESTINATIONS) {
    const km = haversine(a.lat, a.lon, d.lat, d.lon);
    if (km < best) { best = km; near = d; }
  }
  if (!near || near.land === dest.land || ferryHours(near.land, dest.land) === null) return null;
  return near;
}

/** town → departure airport → arrival airport → town, as [lon, lat] */
function airPath(leg: Leg, fromAir?: string, toAir?: string): [number, number][] {
  const a = fromAir ? airport(fromAir) : undefined;
  const b = toAir ? airport(toAir) : undefined;
  return [
    [leg.fromLon, leg.fromLat],
    ...(a ? [[a.lon, a.lat] as [number, number]] : []),
    ...(b ? [[b.lon, b.lat] as [number, number]] : []),
    [leg.toLon, leg.toLat],
  ];
}

/**
 * Fly to a mainland gateway with a real fare, then take the ferry (e.g. fly to Split, ferry to Hvar).
 * The flight is real; the transfer and the crossing are estimates. All of it is in the price.
 */
function flyFerryOption(f: FlightFare, gate: Destination, dest: Destination, leg: Leg, w: TripWindow, spec: SearchSpec): Option | null {
  const base = flightOption(f, { ...leg, toName: gate.name, toLat: gate.lat, toLon: gate.lon, toCc: gate.cc, toAir: gate.airports[0] }, w, spec);
  const seaKm = haversine(gate.lat, gate.lon, dest.lat, dest.lon);
  const hours = seaKm / 28 + 0.5;
  const sail = ferryLegPrice(hours);
  const flightLegs = (base.legs ?? [{ mode: 'flight' as const, note: `fly ${f.from} → ${gate.airports[0]}`, price: base.price, source: base.source, min: base.outMin }]);
  return {
    ...base,
    legs: [...flightLegs, { mode: 'ferry', note: `ferry ${gate.name} → ${dest.name}, about ${Math.round(hours * 2) / 2} h`, price: sail, source: 'estimate', min: Math.round(hours * 60) }],
    extraEst: (base.extraEst ?? 0) + sail,
    outMin: base.outMin + Math.round(hours * 60 + 45),
    transfers: base.transfers + 1,
    hoursThere: undefined,
    carrier: `${base.carrier} + ferry`,
    note: `${base.note} · then ferry from ${gate.name}`,
    path: [...(base.path ?? []).slice(0, -1), [gate.lon, gate.lat], [dest.lon, dest.lat]],
    links: [...base.links, { label: 'Ferryhopper', url: 'https://www.ferryhopper.com/' }, { label: 'Direct Ferries', url: 'https://www.directferries.com/' }],
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
  const ccs = [...new Set([t.dest.cc, ...spec.origins.filter((o) => o.label === t.originLabel).map((o) => o.cc)])];
  for (const o of t.options) o.sure = sureness(o, t.distanceKm, ccs);
  const blocked = t.options.map((o) => ({ option: o, why: whyBlocked(o, spec) })).filter((b): b is { option: Option; why: string } => b.why !== null);
  t.blocked = [...(t.blocked ?? []).filter((b) => !t.options.includes(b.option)), ...blocked];
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
  t.costs = stayCosts(t.dest, nightsPaid, Math.max(t.hoursThere, 4), spec);
  t.stayCost = costTotal(t.costs);
  t.total = best.price + (best.extraEst ?? 0) + t.stayCost;
  if (spec.budgetTotal != null && t.total > spec.budgetTotal) return false;
  return true;
}

/** Loosen the hard limits a little, to find places that only just miss. */
export function relaxSpec(spec: SearchSpec): SearchSpec {
  return {
    ...spec,
    budgetTotal: spec.budgetTotal == null ? null : spec.budgetTotal * 1.3,
    budgetTransport: spec.budgetTransport == null ? null : spec.budgetTransport * 1.3,
    maxLegHours: spec.maxLegHours + 2,
    minHoursThere: Math.max(0, spec.minHoursThere - 8),
    maxTransfers: spec.maxTransfers + 1,
    maxDistanceKm: spec.maxDistanceKm > 0 ? spec.maxDistanceKm * 1.25 : 0,
    minDistanceKm: spec.minDistanceKm * 0.8,
  };
}

/** Why a trip found with relaxed limits breaks the real ones. Empty if it doesn't. */
export function nearReasons(t: Trip, spec: SearchSpec): string[] {
  const r: string[] = [];
  const usd = (v: number) => money(v, spec.currency);
  if (spec.budgetTotal != null && t.total > spec.budgetTotal) r.push(`${usd(t.total - spec.budgetTotal)} over your all-in budget`);
  const travel = t.best.price + (t.best.extraEst ?? 0);
  if (spec.budgetTransport != null && travel > spec.budgetTransport) r.push(`${usd(travel - spec.budgetTransport)} over your travel budget`);
  const h = t.best.outMin / 60 - spec.maxLegHours;
  if (h > 0) r.push(`${Math.ceil(h * 2) / 2} h longer than your journey limit`);
  if (t.hoursThere < spec.minHoursThere) r.push(`${spec.minHoursThere - t.hoursThere} h short of your time there`);
  if (t.best.transfers > spec.maxTransfers) r.push('one change more than you allow');
  if (spec.maxDistanceKm > 0 && t.distanceKm > spec.maxDistanceKm) r.push(`${t.distanceKm - spec.maxDistanceKm} km past your max distance`);
  if (t.distanceKm < spec.minDistanceKm) r.push(`${Math.round(spec.minDistanceKm - t.distanceKm)} km closer than your min distance`);
  return r;
}

export function runSearch(spec: SearchSpec, input: SearchInput = {}): SearchResult {
  const main = searchCore(spec, input);
  if (!main.windows.length || !spec.origins.length) return main;
  // places you hid stay visible, greyed, alongside the near misses
  const hiddenIds = new Set(spec.exclude.filter((x) => !/^[A-Z]{2}$/.test(x)));
  const loose = searchCore(relaxSpec({ ...spec, exclude: spec.exclude.filter((x) => !hiddenIds.has(x)) }), input);
  const have = new Set(main.trips.map((t) => t.dest.id));
  const near: Trip[] = [];
  const hidden: Trip[] = [];
  for (const t of loose.trips) {
    if (have.has(t.dest.id)) continue;
    if (hiddenIds.has(t.dest.id)) {
      t.nearMiss = ['hidden by you', ...nearReasons(t, spec)];
      t.flags = [...t.flags, 'hidden'];
      hidden.push(t);
      continue;
    }
    const why = nearReasons(t, spec);
    if (!why.length) continue;
    t.nearMiss = why;
    near.push(t);
  }
  main.near = [...near.slice(0, 30), ...hidden];
  return main;
}

function searchCore(spec: SearchSpec, input: SearchInput): SearchResult {
  const today = input.today ?? fmtDay(new Date());
  const windows = tripWindows(spec.when, today);
  const empty = (note: string): SearchResult => ({ trips: [], near: [], considered: 0, windows, live: { used: false, calls: 0, cached: 0, errors: [] }, notes: [note] });
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
    // a fare into an airport serves every place that uses that airport (Lisbon, Sintra, Évora…)
    const served = f.toAirport ? DESTINATIONS.filter((d) => d.airports.includes(f.toAirport!)) : [];
    const places = served.length ? served : [matchPlace(f.name, f.country, f.lat, f.lon, f.thumb, f.toAirport)].filter((d): d is Destination => !!d);
    for (const d of places) {
      if (d.adHoc) extra.set(d.id, d);
      const m = fareBy.get(d.id) ?? new Map<string, FlightFare>();
      const prev = m.get(f.depart);
      if (!prev || f.priceUsd < prev.priceUsd) m.set(f.depart, f);
      fareBy.set(d.id, m);
    }
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
        const lead = daysBetween(today, w.depart);
        // no live fare (Ryanair doesn't fly everywhere): estimate one so flying still shows up
        const flightFare = fareHere ?? (
          spec.modes.flight && fromAirs[0] && dest.airports[0] && fromAirs[0] !== dest.airports[0] &&
          // short hops rarely have flights; water in the way is the exception
          (km >= 450 || (km > 150 && originLand !== dest.land)) &&
          (airport(fromAirs[0])?.size ?? 0) >= 1 && (airport(dest.airports[0])?.size ?? 1) >= 1
            ? estimatedFare(fromAirs[0], dest.airports[0], km, w, lead)
            : undefined
        );
        if (flightFare && spec.modes.flight) {
          // airport across the water (e.g. Split's airport for Hvar): it's fly + ferry, not fly + coach
          const gate = gatewayFor(flightFare.toAirport, dest);
          const ff = gate ? flyFerryOption(flightFare, gate, dest, leg, w, spec) : null;
          options.unshift(ff ?? flightOption(flightFare, leg, w, spec));
          // a live fare (often Ryanair) isn't the whole market: if a typical cheap fare on this distance
          // is clearly lower, show "other airlines, likely from …" so the trip doesn't look pricier than it is
          if (fareHere && !ff) {
            const likely = Math.round(likelyCheapFare(km) * (lead < 7 ? 1.4 : lead < 21 ? 1.1 : 1));
            if (fareHere.priceUsd - likely >= 28) {
              const carrierWord = fareHere.carrier.split(' ')[0];
              const names = budgetAirlines(o.cc, dest.cc, carrierWord);
              const guess = flightOption({ ...estimatedFare(fareHere.from, fareHere.toAirport ?? dest.airports[0], km, w, lead), priceUsd: likely, priceHighUsd: Math.round(fareHere.priceUsd) }, leg, w, spec);
              options.splice(1, 0, {
                ...guess,
                alsoLive: true,
                carrier: names.length ? `Other airlines: ${names.slice(0, 4).join(', ')}` : 'Other airlines',
                note: `${carrierWord}'s fare is ${money(fareHere.priceUsd, spec.currency)}; other airlines on this distance often go for about ${money(likely, spec.currency)}. Check before you book.`,
              });
            }
          }
        }
        // islands: fly to a nearby mainland gateway with a real fare, then the ferry
        if (spec.modes.flight && spec.modes.ferry && !flightFare) {
          let bestFF: Option | null = null;
          for (const g of DESTINATIONS) {
            if (g.land === dest.land || !g.airports.length || ferryHours(g.land, dest.land) === null) continue;
            if (haversine(g.lat, g.lon, dest.lat, dest.lon) > 300) continue;
            const live = fareBy.get(g.id)?.get(w.depart);
            const gf = live && fromAirs.includes(live.from)
              ? live
              : fromAirs[0] && fromAirs[0] !== g.airports[0] ? estimatedFare(fromAirs[0], g.airports[0], haversine(o.lat, o.lon, g.lat, g.lon), w, lead) : undefined;
            if (!gf) continue;
            const ff = flyFerryOption(gf, g, dest, leg, w, spec);
            if (ff && (!bestFF || ff.price + (ff.extraEst ?? 0) < bestFF.price + (bestFF.extraEst ?? 0))) bestFF = ff;
          }
          if (bestFF) options.unshift(bestFF);
        }

        const t: Trip = {
          key: `${dest.id}|${w.depart}`, dest, originLabel: o.label, originLat: o.lat, originLon: o.lon,
          distanceKm: Math.round(km), window: w, options, best: options[0], hoursThere: 0, stayCost: 0, total: 0,
          interest: 0, score: 0, reasons: [], flags: [], alts,
          costs: { beds: 0, food: 0, local: 0, sights: 0, nights: 0, days: 0 }, flightHint: null,
        };
        if (!settleTrip(t, spec)) continue;
        if (spec.modes.flight) {
          t.flightHint = flightHint(
            { km, fromCc: o.cc, toCc: dest.cc, fromAir: fromAirs[0], toAir: dest.airports[0], fromName: o.label, toName: dest.name,
              fromLat: o.lat, fromLon: o.lon, toLat: dest.lat, toLon: dest.lon, depart: w.depart, ret: w.ret },
            t.options.find((x) => x.mode === 'flight' && x.source === 'live'),
          );
        }

        const prev = alts.find((a) => a.window.depart === w.depart);
        if (!prev || t.total < prev.total) {
          if (prev) alts.splice(alts.indexOf(prev), 1);
          const chainOf = (o: Option) => (o.legs?.map((l) => l.mode) ?? [o.mode]).filter((m, i, a) => i === 0 || a[i - 1] !== m);
          alts.push({
            window: w, mode: t.best.mode, price: t.best.price, total: t.total, source: t.best.source,
            ways: [
              ...t.options.map((o) => ({ chain: chainOf(o), price: o.price + (o.extraEst ?? 0), outMin: o.outMin, source: o.source, ok: true })),
              ...(t.blocked ?? []).map((b) => ({ chain: chainOf(b.option), price: b.option.price + (b.option.extraEst ?? 0), outMin: b.option.outMin, source: b.option.source, ok: false })),
            ],
          });
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
    near: [],
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
  // FlixBus isn't every coach company: if its fare is well above the usual coach price here,
  // keep the estimate as "other coach lines" alongside it (e.g. RegioJet often undercuts it)
  const keepEst = est && est.source === 'estimate' && real.price > est.price * 1.15;
  const others: Option | null = keepEst
    ? { ...est, carrier: est.carrier?.replace(/, FlixBus…$/, '') || 'Other coach lines', note: `other coach lines are often cheaper than ${fare.carrier} here${est.note ? ` · ${est.note.replace(/, FlixBus$/, '')}` : ''}` }
    : null;
  t.options = [real, ...(others ? [others] : []), ...t.options.filter((o) => o.mode !== fare.mode)];
  const ok = settleTrip(t, spec);
  if (!ok) t.options = before;
  const alt = t.alts.find((a) => a.window.depart === t.window.depart);
  if (ok && alt) {
    Object.assign(alt, { mode: t.best.mode, price: t.best.price, total: t.total, source: t.best.source });
    // the date-by-way table should show the real fare too
    alt.ways = [
      ...(alt.ways ?? []).filter((w) => !(w.chain.length === 1 && w.chain[0] === fare.mode)),
      { chain: [fare.mode], price: real.price, outMin: real.outMin, source: 'live', ok: true },
    ];
  }
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
