import { NextResponse } from 'next/server';
import { monthOf, tripWindows } from '@/lib/dates';
import { busFare, gatherFlights, pool } from '@/lib/live';
import { hasSerp, quota } from '@/lib/providers/serp';
import { applyGroundFare, planLive, runSearch, scoreTrips, sortTrips } from '@/lib/search';
import { normalizeSpec } from '@/lib/spec';

/** How many top results get real FlixBus prices fetched per search. */
const BUS_ENRICH = 16;
/** Outgoing requests one FlixBus price can take: destination city lookup + two ride searches. */
const BUS_REQUESTS = 3;

/**
 * Optional cap on outgoing requests per search (set MAX_SUBREQUESTS where the host limits them,
 * e.g. 50 on Cloudflare's free Workers plan). Unset means no cap.
 */
function busLimit(flightRequests: number): number {
  const max = Number(process.env.MAX_SUBREQUESTS);
  if (!Number.isFinite(max) || max <= 0) return BUS_ENRICH;
  // leave room for the flight calls, the SerpApi quota check and the home-base city lookup
  const left = max - flightRequests - (hasSerp() ? 1 : 0) - 1;
  return Math.max(0, Math.min(BUS_ENRICH, Math.floor(left / BUS_REQUESTS)));
}

export async function POST(req: Request) {
  const spec = normalizeSpec(await req.json().catch(() => ({})));
  const windows = tripWindows(spec.when);
  const plan = planLive(spec, windows);
  const { fares, stats } = await gatherFlights(plan);
  const busMax = busLimit(plan.ryanair.length + (hasSerp() ? plan.google.length : 0));
  const result = runSearch(spec, { flights: fares });

  // swap estimated coach fares for real FlixBus fares on the leading results
  if (spec.modes.bus && result.trips.length) {
    const targets = result.trips.filter((t) => t.options.some((o) => o.mode === 'bus' && o.source === 'estimate')).slice(0, busMax);
    const got = await pool(targets, 6, (t) =>
      busFare({
        fromName: t.originLabel, fromLat: t.originLat, fromLon: t.originLon,
        toName: t.dest.name, toLat: t.dest.lat, toLon: t.dest.lon,
        depart: t.window.depart, ret: t.window.ret, leaveAfter: spec.when.leaveAfter, backBy: spec.when.backBy,
        overnight: spec.overnight,
      }),
    );
    let failed = 0;
    got.forEach((g, i) => {
      if (g.status === 'rejected') { failed++; return; }
      const bus = targets[i].options.find((o) => o.mode === 'bus');
      if (g.value.fare) applyGroundFare(targets[i], g.value.fare, spec);
      else if (bus) bus.note = 'no FlixBus service that fits; other coach lines may run, check the links';
    });
    if (failed) stats.errors.push('FlixBus prices could not be fetched for some places.');
    scoreTrips(result.trips, spec, monthOf(windows[0]?.depart ?? '2026-01-01'));
    sortTrips(result.trips, spec.sort);
  }

  result.live = { used: fares.length > 0, calls: stats.calls, cached: stats.cached, errors: stats.errors };
  if (spec.modes.flight && !fares.length) result.notes.push('No live flight fares came back for these dates, so flights are estimates. Check the flight links on a place.');
  if (spec.live && !hasSerp()) result.notes.push('Google flight fares are off (no SerpApi key); Ryanair fares are still live.');
  return NextResponse.json({ ...result, quota: await quota() });
}
