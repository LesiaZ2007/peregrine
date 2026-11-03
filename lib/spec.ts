import type { Mode, SearchSpec, When } from './types';

export const ALL_MODES_ON: Record<Mode, boolean> = {
  train: true, bus: true, flight: true, ferry: true, rideshare: true, drive: false,
};

export const DEFAULT_WHEN: When = {
  kind: 'weekends',
  weekendsAhead: 4,
  departDays: [5],
  returnDays: [0],
  from: '',
  to: '',
  nightsMin: 2,
  nightsMax: 4,
  depart: '',
  ret: '',
  leaveAfter: '14:00',
  backBy: '23:00',
  blackouts: [],
};

export const DEFAULT_SPEC: SearchSpec = {
  origins: [],
  airportRadiusKm: 120,
  scope: 'anywhere',
  regions: [],
  countries: [],
  places: [],
  exclude: [],
  skipVisited: false,
  visited: [],
  wishlist: [],
  tagsAny: [],
  tagsNone: [],
  minDistanceKm: 0,
  maxDistanceKm: 2500,
  abroad: 'any',
  inSeasonOnly: false,
  when: DEFAULT_WHEN,
  modes: ALL_MODES_ON,
  maxLegHours: 10,
  maxTransfers: 3,
  overnight: true,
  minHoursThere: 24,
  travellers: 1,
  currency: 'EUR',
  budgetTransport: null,
  budgetTotal: null,
  stayStyle: 'hostel',
  foodStyle: 'cheap',
  includeSights: true,
  under26: true,
  railcard: false,
  checkedBag: false,
  weights: { price: 5, time: 3, interest: 3, hoursThere: 2, comfort: 1 },
  sort: 'score',
  live: true,
  limit: 60,
};

export interface Preset {
  id: string;
  name: string;
  hint: string;
  patch: Omit<Partial<SearchSpec>, 'when' | 'modes' | 'weights'> & {
    when?: Partial<When>;
    modes?: Partial<SearchSpec['modes']>;
    weights?: Partial<SearchSpec['weights']>;
  };
}

export const PRESETS: Preset[] = [
  {
    id: 'weekend', name: 'Weekend escape', hint: 'Fri after class → Sun night',
    patch: { when: { kind: 'weekends', departDays: [5], returnDays: [0], leaveAfter: '14:00', backBy: '23:00' }, maxLegHours: 7, minHoursThere: 24, maxDistanceKm: 1800 },
  },
  {
    id: 'long', name: 'Long weekend', hint: 'Thu → Mon, further afield',
    patch: { when: { kind: 'weekends', departDays: [4, 5], returnDays: [0, 1], leaveAfter: '12:00', backBy: '23:00' }, maxLegHours: 12, minHoursThere: 48, maxDistanceKm: 3500 },
  },
  {
    id: 'day', name: 'Day trip', hint: 'Saturday, out and back',
    patch: { when: { kind: 'weekends', departDays: [6], returnDays: [6], leaveAfter: '07:00', backBy: '23:30' }, maxLegHours: 3, minHoursThere: 6, maxDistanceKm: 350, modes: { train: true, bus: true, rideshare: true, ferry: true, flight: false, drive: false } },
  },
  {
    id: 'ground', name: 'Ground only', hint: 'No flying: rails, roads, ferries',
    patch: { modes: { train: true, bus: true, rideshare: true, ferry: true, flight: false, drive: false }, overnight: true, maxLegHours: 14 },
  },
  {
    id: 'break', name: 'Week off', hint: '4–9 nights inside a date range',
    patch: { when: { kind: 'window', nightsMin: 4, nightsMax: 9 }, maxLegHours: 20, minHoursThere: 72, maxDistanceKm: 0 },
  },
  {
    id: 'shoestring', name: 'Shoestring', hint: 'Cheapest total, nothing else matters',
    patch: { weights: { price: 10, time: 1, interest: 1, hoursThere: 1, comfort: 0 }, stayStyle: 'hostel', sort: 'total' },
  },
];

export function applyPatch(spec: SearchSpec, patch: Preset['patch']): SearchSpec {
  return { ...spec, ...patch, when: { ...spec.when, ...(patch.when ?? {}) }, modes: { ...spec.modes, ...(patch.modes ?? {}) }, weights: { ...spec.weights, ...(patch.weights ?? {}) } } as SearchSpec;
}

/** Fill gaps in a stored or shared spec with defaults so old links keep working. */
export function normalizeSpec(raw: unknown): SearchSpec {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Partial<SearchSpec>;
  return {
    ...DEFAULT_SPEC,
    ...s,
    when: { ...DEFAULT_WHEN, ...(s.when ?? {}) },
    modes: { ...ALL_MODES_ON, ...(s.modes ?? {}) },
    weights: { ...DEFAULT_SPEC.weights, ...(s.weights ?? {}) },
  };
}

// share links: the spec as base64url JSON in ?s=
export function encodeSpec(spec: SearchSpec): string {
  const json = JSON.stringify(spec);
  const b64 = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(json))) : Buffer.from(json).toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodeSpec(s: string): SearchSpec | null {
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof atob === 'function' ? decodeURIComponent(escape(atob(b64))) : Buffer.from(b64, 'base64').toString();
    return normalizeSpec(JSON.parse(json));
  } catch {
    return null;
  }
}
