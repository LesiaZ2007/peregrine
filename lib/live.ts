// Server-side gathering of real fares from free sources.
import 'server-only';
import { airport } from './catalog';
import { hours } from './dates';
import { cityId, flixLink, rides, type Ride } from './providers/flixbus';
import { roundTrips, ryanairLink } from './providers/ryanair';
import { explore, hasSerp } from './providers/serp';
import type { LiveRequest } from './search';
import type { FlightFare, GroundFare } from './types';

export const EUR_PER_USD = 0.87;
const eurToUsd = (eur: number) => eur / EUR_PER_USD;

export interface LiveStats { calls: number; cached: number; errors: string[] }

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        try {
          out[k] = { status: 'fulfilled', value: await fn(items[k]) };
        } catch (e) {
          out[k] = { status: 'rejected', reason: e };
        }
      }
    }),
  );
  return out;
}

export async function gatherFlights(plan: { ryanair: LiveRequest[]; google: LiveRequest[] }): Promise<{ fares: FlightFare[]; stats: LiveStats }> {
  const stats: LiveStats = { calls: 0, cached: 0, errors: [] };
  const fares: FlightFare[] = [];

  const [ry, go] = await Promise.all([
    pool(plan.ryanair, 6, (r) => roundTrips(r.from, r.depart, r.ret).then((x) => ({ r, x }))),
    hasSerp() ? pool(plan.google, 3, (r) => explore(r.from, r.depart, r.ret).then((x) => ({ r, x }))) : Promise.resolve([]),
  ]);

  for (const s of ry) {
    if (s.status === 'rejected') { stats.errors.push(`Ryanair: ${(s.reason as Error).message}`); continue; }
    const { r, x } = s.value;
    x.cached ? stats.cached++ : stats.calls++;
    for (const f of x.fares) {
      const a = airport(f.to);
      if (!a) continue;
      fares.push({
        from: f.from, depart: r.depart, ret: r.ret, toAirport: f.to, name: f.city, country: f.country,
        lat: a.lat, lon: a.lon, priceUsd: eurToUsd(f.priceEur), stops: 0, carrier: `Ryanair ${f.flights}`,
        link: ryanairLink(f), source: 'Ryanair', outDep: f.outDep, outArr: f.outArr, inDep: f.inDep, inArr: f.inArr,
      });
    }
  }
  for (const s of go) {
    if (s.status === 'rejected') { stats.errors.push(`Google Flights: ${(s.reason as Error).message}`); continue; }
    const { r, x } = s.value;
    x.cached ? stats.cached++ : stats.calls++;
    for (const h of x.hits) {
      if (!h.price) continue;
      fares.push({
        from: r.from, depart: r.depart, ret: r.ret, toAirport: h.airport, name: h.name, country: h.country,
        lat: h.lat, lon: h.lon, priceUsd: h.price, airMin: h.durationMin, stops: h.stops ?? 0, carrier: h.airline ?? 'Airline',
        link: h.link, source: 'Google Flights', thumb: h.thumb,
      });
    }
  }
  stats.errors = [...new Set(stats.errors)];
  return { fares, stats };
}

export interface BusQuery {
  fromName: string; fromLat: number; fromLon: number;
  toName: string; toLat: number; toLon: number;
  depart: string; ret: string; leaveAfter: string; backBy: string; overnight: boolean;
}

const clock = (iso: string) => hours(iso.slice(11, 16));

/** Cheapest real FlixBus round trip that fits your hours, or null if there's no service. */
export async function busFare(q: BusQuery): Promise<{ fare: GroundFare | null; out: Ride[]; back: Ride[] }> {
  const [a, b] = await Promise.all([cityId(q.fromName, q.fromLat, q.fromLon), cityId(q.toName, q.toLat, q.toLon)]);
  if (!a || !b) return { fare: null, out: [], back: [] };
  const [outAll, backAll] = await Promise.all([rides(a, b, q.depart), rides(b, a, q.ret)]);
  const out = outAll.filter((r) => r.dep.slice(0, 10) === q.depart && clock(r.dep) >= hours(q.leaveAfter));
  const back = backAll.filter((r) => r.dep.slice(0, 10) === q.ret && r.arr.slice(0, 10) === q.ret && clock(r.arr) <= hours(q.backBy));
  if (!out.length || !back.length) return { fare: null, out, back };
  const o = out.reduce((m, r) => (r.priceEur < m.priceEur ? r : m));
  const r = back.reduce((m, x) => (x.priceEur < m.priceEur ? x : m));
  const night = (x: Ride) => clock(x.dep) >= 20 || clock(x.dep) < 5;
  if (!q.overnight && (night(o) || night(r))) return { fare: null, out, back };
  return {
    out, back,
    fare: {
      mode: 'bus',
      priceUsd: eurToUsd(o.priceEur + r.priceEur),
      outMin: Math.round((o.durationMin + r.durationMin) / 2),
      transfers: Math.max(o.transfers, r.transfers),
      carrier: 'FlixBus',
      note: `out ${o.dep.slice(11, 16)}, back ${r.dep.slice(11, 16)}`,
      link: flixLink(a, b, q.depart, q.ret),
      overnight: night(o),
    },
  };
}

export { pool };
