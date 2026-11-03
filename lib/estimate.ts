// Rough, honest estimates for ground and sea modes. Every number here is a model, and the UI
// labels it "est." with links to check. Live sources replace it where we have them.
// Flights are never estimated.
import { COUNTRIES } from './data/countries';
import { linksFor } from './links';
import type { Mode, Option, Region } from './types';

export interface Leg {
  fromName: string;
  toName: string;
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  fromCc: string;
  toCc: string;
  fromLand: string;
  toLand: string;
  fromRegion?: Region;
  toRegion?: Region;
  fromAir?: string;
  toAir?: string;
  /** km between the two airports' cities, used for the flight */
  km: number;
  depart: string;
  ret: string;
}

export interface Profile {
  travellers: number;
  under26: boolean;
  railcard: boolean;
  checkedBag: boolean;
  /** days until departure, drives the last-minute premium */
  leadDays: number;
  departWeekday: number;
}

/** Islands and coasts with regular passenger (and car) ferries between them. */
const FERRY_LINKS: [string, string, number][] = [
  // [landA, landB, typical crossing hours]
  ['eurasia', 'ireland', 3.5],
  ['eurasia', 'balearics', 6],
  ['eurasia', 'corsica', 6],
  ['eurasia', 'sardinia', 8],
  ['eurasia', 'sicily', 0.5],
  ['sicily', 'malta', 1.75],
  ['eurasia', 'malta', 9],
  ['eurasia', 'greek-islands', 5],
  ['eurasia', 'crete', 9],
  ['greek-islands', 'crete', 3],
  ['eurasia', 'croatian-islands', 1.5],
  ['eurasia', 'gotland', 3.25],
  ['eurasia', 'africa', 1.5],
  ['eurasia', 'canaries', 32],
  ['eurasia', 'faroe', 36],
  ['faroe', 'iceland', 19],
  ['eurasia', 'cyprus', 30],
  ['africa', 'zanzibar', 2],
  ['japan', 'korea', 3.5],
  ['indonesia-java', 'bali', 1],
  ['sardinia', 'corsica', 1],
];

export function ferryHours(a: string, b: string): number | null {
  if (a === b) return null;
  for (const [x, y, h] of FERRY_LINKS) if ((x === a && y === b) || (x === b && y === a)) return h;
  return null;
}

/** Fare level by region: multiplier on a western-Europe baseline. */
const PRICE_LEVEL: Partial<Record<Region, number>> = {
  'iberia': 0.85, 'france-benelux': 1, 'british-isles': 1.25, 'dach': 1.15, 'italy-malta': 0.8,
  'central-europe': 0.5, 'nordics': 1.3, 'baltics': 0.6, 'balkans': 0.45, 'greece-cyprus': 0.75,
  'turkey-caucasus': 0.35, 'eastern-europe': 0.35, 'north-africa': 0.35, 'middle-east': 0.7,
  'sub-saharan-africa': 0.5, 'north-america': 1.4, 'caribbean-central-america': 0.6,
  'south-america': 0.45, 'east-asia': 1.0, 'southeast-asia': 0.3, 'south-asia': 0.2, 'oceania': 1.3,
};
const BLABLA = new Set<Region>([
  'iberia', 'france-benelux', 'british-isles', 'dach', 'italy-malta', 'central-europe', 'balkans',
  'baltics', 'eastern-europe', 'turkey-caucasus', 'south-america', 'caribbean-central-america', 'south-asia',
]);

function regionOf(cc: string, r?: Region): Region | undefined {
  return r ?? COUNTRIES[cc]?.region;
}
function level(l: Leg): number {
  const a = PRICE_LEVEL[regionOf(l.fromCc, l.fromRegion) ?? 'france-benelux'] ?? 1;
  const b = PRICE_LEVEL[regionOf(l.toCc, l.toRegion) ?? 'france-benelux'] ?? 1;
  return (a + b) / 2;
}
const round = (n: number) => Math.max(1, Math.round(n));

/** Fares rise close to departure and on Fridays/Sundays. */
function demand(p: Profile): number {
  const lead = p.leadDays < 4 ? 1.45 : p.leadDays < 10 ? 1.2 : p.leadDays < 21 ? 1.05 : 1;
  const dow = p.departWeekday === 5 || p.departWeekday === 0 ? 1.1 : 1;
  return lead * dow;
}

function option(mode: Mode, l: Leg, outMin: number, oneWay: number, spread: number, transfers: number, extra: Partial<Option> = {}): Option {
  const rt = oneWay * 2;
  return {
    mode,
    outMin: Math.round(outMin),
    transfers,
    price: round(rt),
    priceHigh: round(rt * spread),
    source: 'estimate',
    overnight: false,
    links: linksFor(mode, l),
    ...extra,
  };
}

export function estimateModes(l: Leg, p: Profile, modes: Record<Mode, boolean>): Option[] {
  const out: Option[] = [];
  const d = l.km;
  const lvl = level(l);
  const dem = demand(p);
  const fromC = COUNTRIES[l.fromCc];
  const toC = COUNTRIES[l.toCc];
  const rail = Math.min(fromC?.railScore ?? 1, toC?.railScore ?? 1);
  const bus = Math.min(fromC?.busScore ?? 1, toC?.busScore ?? 1);
  const sameLand = l.fromLand === l.toLand;
  const ferry = ferryHours(l.fromLand, l.toLand);
  const overland = sameLand || (ferry !== null && ferry <= 2);

  // Flights are never estimated: they only appear with a real fare (see search.ts).

  if (modes.train && overland && rail > 0 && d < 1800) {
    const km = d * 1.25;
    const speed = [45, 55, 80, 125][rail];
    const outMin = (km / speed) * 60 + 30 + (ferry ? ferry * 60 : 0);
    const perKm = 0.11 * lvl;
    let fare = Math.max(9, km * perKm) * dem;
    if (p.under26) fare *= 0.75;
    if (p.railcard) fare *= 0.7;
    const transfers = Math.min(4, Math.floor(km / 450) + (rail < 2 ? 1 : 0));
    const night = outMin > 8 * 60 && km > 600;
    out.push(option('train', l, outMin, fare, 2.2, transfers, { overnight: night, note: night ? 'a night train saves a hotel night' : undefined }));
  }

  if (modes.bus && overland && bus > 0 && d < 2200) {
    const km = d * 1.2;
    const outMin = (km / 68) * 60 + 20 + (ferry ? ferry * 60 : 0);
    const fare = Math.max(7, km * 0.045 * (0.5 + lvl / 2)) * (0.85 + dem * 0.15);
    const night = outMin > 7 * 60;
    out.push(option('bus', l, outMin, fare, 1.9, Math.floor(km / 900), { overnight: night, note: night ? 'overnight coach' : undefined }));
  }

  if (modes.ferry && ferry !== null && ferry > 0.4) {
    const outMin = ferry * 60 + 90 + (d / 70) * 60 * 0.3;
    const fare = (18 + ferry * 9 + d * 0.02) * (0.7 + lvl * 0.3);
    out.push(option('ferry', l, outMin, fare, 1.7, 1, { overnight: ferry >= 8, note: ferry >= 8 ? 'overnight sailing, cabin extra' : undefined }));
  }

  const roadOk = sameLand || (ferry !== null && ferry <= 10);
  if (modes.rideshare && roadOk && d < 1100 && d > 40 && BLABLA.has(regionOf(l.fromCc, l.fromRegion) as Region)) {
    const km = d * 1.3;
    const outMin = (km / 82) * 60 + 25 + (ferry ? ferry * 60 : 0);
    out.push(option('rideshare', l, outMin, Math.max(5, km * 0.055 * (0.6 + lvl * 0.4)), 1.5, 0, { note: 'seat in a shared car, times depend on drivers' }));
  }

  if (modes.drive && roadOk && d < 1500) {
    const km = d * 1.3;
    const outMin = (km / 85) * 60 + 15 + (ferry ? ferry * 60 + 60 : 0);
    const costCar = km * 0.14 * (0.7 + lvl * 0.3) + (ferry ? 60 + ferry * 25 : 0);
    const share = Math.min(Math.max(1, p.travellers), 4);
    out.push(option('drive', l, outMin, costCar / share, 1.3, 0, { note: `fuel and tolls split ${share} way${share > 1 ? 's' : ''}` }));
  }

  return out;
}
