import { describe, expect, it } from 'vitest';
import { addDays, tripWindows, weekday } from '@/lib/dates';
import { estimateModes, type Leg } from '@/lib/estimate';
import { haversine } from '@/lib/geo';
import { applyGroundFare, planLive, runSearch } from '@/lib/search';
import { applyPatch, decodeSpec, DEFAULT_SPEC, DEFAULT_WHEN, encodeSpec, PRESETS } from '@/lib/spec';
import type { FlightFare, HomeBase, Mode, SearchSpec } from '@/lib/types';

const TODAY = '2026-11-03'; // a Tuesday
const MADRID: HomeBase = { label: 'Madrid', lat: 40.4168, lon: -3.7038, cc: 'ES', airports: ['MAD'] };
const PARIS: HomeBase = { label: 'Paris', lat: 48.8566, lon: 2.3522, cc: 'FR', airports: [] };
const ALL: Record<Mode, boolean> = { train: true, bus: true, flight: true, ferry: true, rideshare: true, drive: true };

const spec = (over: Partial<SearchSpec> = {}): SearchSpec => ({ ...DEFAULT_SPEC, origins: [MADRID], live: false, ...over });

describe('trip windows', () => {
  it('finds Friday→Sunday weekends', () => {
    const w = tripWindows({ ...DEFAULT_WHEN, weekendsAhead: 3 }, TODAY);
    expect(w.map((x) => [x.depart, x.ret])).toEqual([
      ['2026-11-06', '2026-11-08'],
      ['2026-11-13', '2026-11-15'],
      ['2026-11-20', '2026-11-22'],
    ]);
    expect(w[0].nights).toBe(2);
    expect(w[0].spanHours).toBe(48 + 23 - 14);
  });

  it('skips weekends that touch a blackout day', () => {
    const w = tripWindows({ ...DEFAULT_WHEN, weekendsAhead: 3, blackouts: ['2026-11-14'] }, TODAY);
    expect(w.map((x) => x.depart)).toEqual(['2026-11-06', '2026-11-20']);
  });

  it('supports Saturday day trips', () => {
    const w = tripWindows({ ...DEFAULT_WHEN, weekendsAhead: 1, departDays: [6], returnDays: [6], leaveAfter: '07:00', backBy: '23:00' }, TODAY);
    expect(w).toHaveLength(1);
    expect(w[0].nights).toBe(0);
    expect(weekday(w[0].depart)).toBe(6);
    expect(w[0].spanHours).toBe(16);
  });

  it('samples a flexible window and respects nights', () => {
    const w = tripWindows({ ...DEFAULT_WHEN, kind: 'window', from: '2026-12-01', to: '2026-12-31', nightsMin: 3, nightsMax: 5 }, TODAY);
    expect(w.length).toBeGreaterThan(3);
    expect(w.length).toBeLessThanOrEqual(12);
    for (const x of w) {
      expect(x.nights).toBeGreaterThanOrEqual(3);
      expect(x.nights).toBeLessThanOrEqual(5);
      expect(x.ret <= '2026-12-31').toBe(true);
    }
  });

  it('date range can be limited to weekends or picked days', () => {
    const base = { ...DEFAULT_WHEN, kind: 'window' as const, from: '2026-12-01', to: '2026-12-31', nightsMin: 1, nightsMax: 3 };
    const wk = tripWindows({ ...base, freeDays: [5, 6, 0] }, TODAY);
    expect(wk.length).toBeGreaterThan(0);
    for (const x of wk) for (let d = x.depart; d <= x.ret; d = addDays(d, 1)) expect([5, 6, 0]).toContain(weekday(d));
    const thuSun = tripWindows({ ...base, freeDays: [4, 5, 6, 0] }, TODAY);
    expect(thuSun.some((x) => weekday(x.depart) === 4)).toBe(true);
    expect(tripWindows({ ...base, nightsMin: 4, nightsMax: 5, freeDays: [5, 6, 0] }, TODAY)).toHaveLength(0);
  });

  it('exact dates give one window', () => {
    expect(tripWindows({ ...DEFAULT_WHEN, kind: 'exact', depart: '2026-12-10', ret: '2026-12-13' }, TODAY)).toHaveLength(1);
  });
});

function leg(a: [number, number, string, string], b: [number, number, string, string], airs: [string?, string?] = []): Leg {
  return {
    fromName: 'A', toName: 'B', fromLat: a[0], fromLon: a[1], toLat: b[0], toLon: b[1], fromCc: a[2], toCc: b[2],
    fromLand: a[3], toLand: b[3], fromAir: airs[0], toAir: airs[1], km: haversine(a[0], a[1], b[0], b[1]),
    depart: '2026-11-20', ret: '2026-11-22',
  };
}
const profile = { travellers: 1, under26: false, railcard: false, checkedBag: false, leadDays: 17, departWeekday: 5 };

describe('mode estimates', () => {
  it('Paris → Brussels offers a fast train', () => {
    const o = estimateModes(leg([48.85, 2.35, 'FR', 'eurasia'], [50.85, 4.35, 'BE', 'eurasia'], ['CDG', 'BRU']), profile, ALL);
    const train = o.find((x) => x.mode === 'train')!;
    expect(train).toBeTruthy();
    expect(train.outMin).toBeLessThan(4 * 60);
    expect(o.find((x) => x.mode === 'bus')).toBeTruthy();
  });

  it('never estimates flights', () => {
    const o = estimateModes(leg([40.42, -3.7, 'ES', 'eurasia'], [52.37, 4.9, 'NL', 'eurasia'], ['MAD', 'AMS']), profile, ALL);
    expect(o.map((x) => x.mode)).not.toContain('flight');
  });

  it('Mallorca from Madrid is a ferry, never a train', () => {
    const o = estimateModes(leg([40.42, -3.7, 'ES', 'eurasia'], [39.57, 2.65, 'ES', 'balearics'], ['MAD', 'PMI']), profile, ALL);
    const modes = o.map((x) => x.mode);
    expect(modes).toContain('ferry');
    expect(modes).not.toContain('train');
    expect(modes).not.toContain('bus');
  });

  it('London → Paris can go by train through the tunnel', () => {
    const o = estimateModes(leg([51.5, -0.12, 'GB', 'eurasia'], [48.85, 2.35, 'FR', 'eurasia'], ['LHR', 'CDG']), profile, ALL);
    expect(o.map((x) => x.mode)).toContain('train');
  });

  it('youth and railcard discounts lower train fares', () => {
    const l = leg([48.85, 2.35, 'FR', 'eurasia'], [45.76, 4.83, 'FR', 'eurasia']);
    const full = estimateModes(l, profile, ALL).find((x) => x.mode === 'train')!;
    const cut = estimateModes(l, { ...profile, under26: true, railcard: true }, ALL).find((x) => x.mode === 'train')!;
    expect(cut.price).toBeLessThan(full.price);
  });

  it('switching a mode off removes it', () => {
    const o = estimateModes(leg([48.85, 2.35, 'FR', 'eurasia'], [50.85, 4.35, 'BE', 'eurasia'], ['CDG', 'BRU']), profile, { ...ALL, train: false });
    expect(o.map((x) => x.mode)).not.toContain('train');
  });
});

describe('search', () => {
  it('finds weekend trips from Madrid, ranked by score', () => {
    const r = runSearch(spec(), { today: TODAY });
    expect(r.trips.length).toBeGreaterThan(10);
    for (let i = 1; i < r.trips.length; i++) expect(r.trips[i - 1].score).toBeGreaterThanOrEqual(r.trips[i].score);
    for (const t of r.trips) {
      expect(t.hoursThere).toBeGreaterThanOrEqual(24);
      expect(t.best.outMin / 60).toBeLessThanOrEqual(10);
    }
  });

  it('honours a transport budget and a ground-only preset', () => {
    const ground = applyPatch(spec({ budgetTransport: 60 }), PRESETS.find((p) => p.id === 'ground')!.patch);
    const r = runSearch(ground, { today: TODAY });
    expect(r.trips.length).toBeGreaterThan(0);
    for (const t of r.trips) {
      expect(t.best.mode).not.toBe('flight');
      expect(t.options.every((o) => o.price <= 60)).toBe(true);
    }
  });

  it('filters by tags and excludes', () => {
    const r = runSearch(spec({ tagsAny: ['beach'], exclude: ['ES'] }), { today: TODAY });
    expect(r.trips.length).toBeGreaterThan(0);
    for (const t of r.trips) {
      expect(t.dest.tags).toContain('beach');
      expect(t.dest.cc).not.toBe('ES');
    }
  });

  it('limits to chosen countries and domestic/abroad', () => {
    const r = runSearch(spec({ scope: 'countries', countries: ['PT'] }), { today: TODAY });
    expect(r.trips.every((t) => t.dest.cc === 'PT')).toBe(true);
    const dom = runSearch(spec({ abroad: 'domestic' }), { today: TODAY });
    expect(dom.trips.every((t) => t.dest.cc === 'ES')).toBe(true);
  });

  const fare = (over: Partial<FlightFare> = {}): FlightFare => ({
    from: 'MAD', depart: '2026-11-06', ret: '2026-11-08', toAirport: 'LIS', name: 'Lisbon', country: 'Portugal',
    lat: 38.77, lon: -9.13, priceUsd: 31, stops: 0, carrier: 'Ryanair FR1', link: 'https://example.com', source: 'Ryanair',
    outDep: '2026-11-06T18:10', outArr: '2026-11-06T18:40', inDep: '2026-11-08T19:00', inArr: '2026-11-08T21:20', ...over,
  });
  const one = { ...DEFAULT_WHEN, weekendsAhead: 1 };

  it('uses real flight fares and labels them live', () => {
    const r = runSearch(spec({ scope: 'places', places: ['lisbon'], when: one }), { today: TODAY, flights: [fare()] });
    const f = r.trips[0].options.find((o) => o.mode === 'flight')!;
    expect(r.trips[0].dest.id).toBe('lisbon');
    expect(f.source).toBe('live');
    expect(f.price).toBe(31);
    expect(f.hoursThere).toBe(45);
  });

  it('never shows a flight without a real fare', () => {
    const r = runSearch(spec({ when: one }), { today: TODAY });
    expect(r.trips.flatMap((t) => t.options).some((o) => o.mode === 'flight')).toBe(false);
  });

  it('drops real fares that leave before you are free or land after you must be home', () => {
    const early = runSearch(spec({ scope: 'places', places: ['lisbon'], when: one }), { today: TODAY, flights: [fare({ outDep: '2026-11-06T09:00' })] });
    expect(early.trips[0]?.options.some((o) => o.mode === 'flight') ?? false).toBe(false);
    const late = runSearch(spec({ scope: 'places', places: ['lisbon'], when: one }), { today: TODAY, flights: [fare({ inArr: '2026-11-08T23:30' })] });
    expect(late.trips[0]?.options.some((o) => o.mode === 'flight') ?? false).toBe(false);
  });

  it('adds places that only live fares know about', () => {
    const r = runSearch(spec({ when: one }), { today: TODAY, flights: [fare({ toAirport: undefined, name: 'Nowhereville', lat: 41.0, lon: -7.0 })] });
    expect(r.trips.find((t) => t.dest.adHoc)?.dest.cc).toBe('PT');
  });

  it('swaps an estimated coach fare for a real one', () => {
    const r = runSearch(spec({ scope: 'places', places: ['lisbon'], when: one, maxLegHours: 12 }), { today: TODAY });
    const t = r.trips[0];
    expect(t.options.find((o) => o.mode === 'bus')?.source).toBe('estimate');
    const ok = applyGroundFare(t, { mode: 'bus', priceUsd: 18, outMin: 480, transfers: 0, carrier: 'FlixBus', link: 'https://x', overnight: false }, t.window && spec({ maxLegHours: 12 }));
    expect(ok).toBe(true);
    const bus = t.options.find((o) => o.mode === 'bus')!;
    expect(bus.source).toBe('live');
    expect(bus.price).toBe(18);
    expect(t.options.filter((o) => o.mode === 'bus')).toHaveLength(1);
  });

  it('caps paid live calls to protect the quota', () => {
    const s = spec({ live: true, origins: [MADRID, PARIS], when: { ...DEFAULT_WHEN, weekendsAhead: 8 } });
    const p = planLive(s, tripWindows(s.when, TODAY));
    expect(p.google.length).toBeLessThanOrEqual(6);
    expect(p.ryanair.length).toBeGreaterThan(p.google.length);
  });

  it('share links round-trip', () => {
    const s = spec({ tagsAny: ['food'], travellers: 3 });
    expect(decodeSpec(encodeSpec(s))).toEqual(s);
  });
});
