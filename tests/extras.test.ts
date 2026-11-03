import { describe, expect, it } from 'vitest';
import { flightHint, typicalLowFare } from '@/lib/airlines';
import { costTotal, stayCosts } from '@/lib/costs';
import { DEST_BY_ID } from '@/lib/catalog';
import { relaxSpec, runSearch } from '@/lib/search';
import { DEFAULT_SPEC, DEFAULT_WHEN } from '@/lib/spec';
import type { HomeBase, Option, SearchSpec } from '@/lib/types';

const TODAY = '2026-11-03';
const MADRID: HomeBase = { label: 'Madrid', lat: 40.4168, lon: -3.7038, cc: 'ES', airports: ['MAD'] };
const spec = (over: Partial<SearchSpec> = {}): SearchSpec => ({ ...DEFAULT_SPEC, origins: [MADRID], live: false, ...over });
const lisbon = DEST_BY_ID.get('lisbon')!;

describe('stay costs', () => {
  const base = { stayStyle: 'hostel' as const, foodStyle: 'cheap' as const, includeSights: true, travellers: 1 };

  it('splits into beds, food, getting around and sights', () => {
    const c = stayCosts(lisbon, 2, 50, base);
    expect(c.nights).toBe(2);
    expect(c.days).toBe(2);
    expect(c.beds).toBeGreaterThan(0);
    expect(c.food).toBeGreaterThan(0);
    expect(c.local).toBeGreaterThan(0);
    expect(c.sights).toBeGreaterThan(0);
    expect(costTotal(c)).toBe(c.beds + c.food + c.local + c.sights);
  });

  it('responds to where you sleep, how you eat and sights', () => {
    const hostel = stayCosts(lisbon, 2, 50, base);
    expect(stayCosts(lisbon, 2, 50, { ...base, stayStyle: 'free' }).beds).toBe(0);
    expect(stayCosts(lisbon, 2, 50, { ...base, stayStyle: 'mid' }).beds).toBeGreaterThan(hostel.beds);
    expect(stayCosts(lisbon, 2, 50, { ...base, foodStyle: 'self' }).food).toBeLessThan(hostel.food);
    expect(stayCosts(lisbon, 2, 50, { ...base, foodStyle: 'restaurants' }).food).toBeGreaterThan(hostel.food);
    expect(stayCosts(lisbon, 2, 50, { ...base, includeSights: false }).sights).toBe(0);
  });

  it('shares hotel rooms between two travellers', () => {
    const one = stayCosts(lisbon, 2, 50, { ...base, stayStyle: 'mid' });
    const two = stayCosts(lisbon, 2, 50, { ...base, stayStyle: 'mid', travellers: 2 });
    expect(two.beds).toBeLessThan(one.beds);
  });

  it('search results carry the breakdown and it adds up', () => {
    const r = runSearch(spec(), { today: TODAY });
    for (const t of r.trips.slice(0, 10)) {
      expect(t.stayCost).toBe(costTotal(t.costs));
      expect(t.total).toBe(t.best.price + t.stayCost);
    }
  });
});

describe('flight guidance', () => {
  const h = { km: 500, fromCc: 'ES', toCc: 'PT', fromAir: 'MAD', toAir: 'LIS', fromName: 'Madrid', toName: 'Lisbon', fromLat: 40.4, fromLon: -3.7, toLat: 38.7, toLon: -9.1, depart: '2026-11-13', ret: '2026-11-15' };
  const real = (price: number): Option => ({ mode: 'flight', outMin: 200, transfers: 0, price, priceHigh: price, source: 'live', overnight: false, carrier: 'Ryanair FR1', links: [] });

  it('gives a typical range that grows with distance', () => {
    const a = typicalLowFare(500);
    const b = typicalLowFare(2000);
    expect(a.low).toBeLessThan(a.high);
    expect(b.low).toBeGreaterThan(a.low);
  });

  it('flags a fare above the typical low range and names other airlines', () => {
    const hint = flightHint(h, real(300))!;
    expect(hint.cheaperLikely).toBe(true);
    expect(hint.airlines.length).toBeGreaterThan(0);
    expect(hint.airlines.some((a) => a.startsWith('Ryanair'))).toBe(false);
    expect(hint.links.length).toBeGreaterThan(0);
    expect(flightHint(h, real(20))!.cheaperLikely).toBe(false);
  });

  it('still guides when there is no real fare, and stays quiet for short hops', () => {
    expect(flightHint(h, undefined)!.noRealFare).toBe(true);
    expect(flightHint({ ...h, km: 100 }, undefined)).toBeNull();
  });
});

describe('multi-mode journeys', () => {
  it('a ferry trip names the way to the port', () => {
    const r = runSearch(spec({ scope: 'places', places: ['palma'], when: { ...DEFAULT_WHEN, weekendsAhead: 1 }, maxLegHours: 14 }), { today: TODAY });
    const ferry = r.trips[0]?.options.find((o) => o.mode === 'ferry');
    expect(ferry?.legs?.map((l) => l.mode)).toEqual(['train', 'ferry']);
  });

  it('a flight to an airport far from town adds the transfer leg and its cost', () => {
    const fare = {
      from: 'MAD', depart: '2026-11-06', ret: '2026-11-08', toAirport: 'LIS', name: 'Lisbon', country: 'Portugal', lat: 38.77, lon: -9.13,
      priceUsd: 40, stops: 0, carrier: 'Ryanair', link: 'x', source: 'Ryanair' as const,
    };
    const r = runSearch(spec({ scope: 'places', places: ['evora'], when: { ...DEFAULT_WHEN, weekendsAhead: 1 }, maxLegHours: 12 }), { today: TODAY, flights: [fare] });
    const f = r.trips[0]?.options.find((o) => o.mode === 'flight');
    expect(f?.legs?.map((l) => l.mode)).toEqual(['flight', 'train']);
    expect(f?.extraEst).toBeGreaterThan(0);
  });
});

describe('fly + ferry and leg prices', () => {
  const one = { ...DEFAULT_WHEN, weekendsAhead: 1 };
  it('reaches an island by flying to the mainland and taking the ferry, with both prices', () => {
    const fare = {
      from: 'MAD', depart: '2026-11-06', ret: '2026-11-08', toAirport: 'SPU', name: 'Split', country: 'Croatia', lat: 43.54, lon: 16.3,
      priceUsd: 60, stops: 0, carrier: 'Ryanair', link: 'x', source: 'Ryanair' as const,
    };
    const r = runSearch(spec({ scope: 'places', places: ['hvar'], when: one, maxLegHours: 14, minHoursThere: 0 }), { today: TODAY, flights: [fare] });
    const ff = [...r.trips, ...r.near][0]?.options.find((o) => o.legs?.some((l) => l.mode === 'flight') && o.legs?.some((l) => l.mode === 'ferry'));
    expect(ff).toBeTruthy();
    const flightLeg = ff!.legs!.find((l) => l.mode === 'flight')!;
    const ferryLeg = ff!.legs!.find((l) => l.mode === 'ferry')!;
    expect(flightLeg.source).toBe('live');
    expect(ferryLeg.source).toBe('estimate');
    expect(ferryLeg.price).toBeGreaterThan(0);
    expect(ff!.price + (ff!.extraEst ?? 0)).toBeGreaterThan(60);
  });

  it('every multi-mode option prices each leg, and the legs add up to the total', () => {
    const r = runSearch(spec({ scope: 'places', places: ['palma', 'hvar', 'palermo'], when: one, maxLegHours: 20, minHoursThere: 0 }), { today: TODAY });
    const multi = [...r.trips, ...r.near].flatMap((t) => t.options).filter((o) => o.legs);
    expect(multi.length).toBeGreaterThan(0);
    for (const o of multi) {
      const sum = o.legs!.reduce((s, l) => s + (l.price ?? 0), 0);
      expect(o.legs!.every((l) => l.price != null)).toBe(true);
      expect(Math.abs(sum - (o.price + (o.extraEst ?? 0)))).toBeLessThanOrEqual(3);
    }
  });
});

describe('countries you have been to', () => {
  it('can leave them out of results', () => {
    const all = runSearch(spec(), { today: TODAY });
    expect(all.trips.some((t) => t.dest.cc === 'PT')).toBe(true);
    const r = runSearch(spec({ beenCountries: ['PT', 'MA'], skipBeenCountries: true }), { today: TODAY });
    expect(r.trips.some((t) => t.dest.cc === 'PT' || t.dest.cc === 'MA')).toBe(false);
    const kept = runSearch(spec({ beenCountries: ['PT'], skipBeenCountries: false }), { today: TODAY });
    expect(kept.trips.some((t) => t.dest.cc === 'PT')).toBe(true);
  });
});

describe('near misses', () => {
  it('relaxes limits a little', () => {
    const s = relaxSpec(spec({ budgetTotal: 100, maxLegHours: 5 }));
    expect(s.budgetTotal).toBeCloseTo(130);
    expect(s.maxLegHours).toBe(7);
  });

  it('lists places just over budget with the reason, never ones that already fit', () => {
    const s = spec({ budgetTotal: 120, when: { ...DEFAULT_WHEN, weekendsAhead: 2 } });
    const r = runSearch(s, { today: TODAY });
    expect(r.near.length).toBeGreaterThan(0);
    const fit = new Set(r.trips.map((t) => t.dest.id));
    for (const t of r.near) {
      expect(fit.has(t.dest.id)).toBe(false);
      expect(t.nearMiss?.length).toBeGreaterThan(0);
    }
    expect(r.near.some((t) => t.nearMiss!.some((x) => x.includes('over your all-in budget')))).toBe(true);
  });

  it('explains a journey that is slightly too long', () => {
    const r = runSearch(spec({ maxLegHours: 3, when: { ...DEFAULT_WHEN, weekendsAhead: 1 } }), { today: TODAY });
    expect(r.near.some((t) => t.nearMiss!.some((x) => x.includes('journey limit')))).toBe(true);
  });
});
