// Core shapes shared by the engine, the API routes and the UI.

export type Tag =
  | 'beach' | 'mountains' | 'hiking' | 'old-town' | 'museums' | 'nightlife' | 'food' | 'wine'
  | 'beer' | 'architecture' | 'castles' | 'lakes' | 'islands' | 'ski' | 'christmas-markets'
  | 'festivals' | 'history' | 'art' | 'nature' | 'thermal-baths' | 'quiet' | 'student-city'
  | 'big-city' | 'unesco';

export type Region =
  | 'iberia' | 'france-benelux' | 'british-isles' | 'dach' | 'italy-malta' | 'central-europe'
  | 'nordics' | 'baltics' | 'balkans' | 'greece-cyprus' | 'turkey-caucasus' | 'eastern-europe'
  | 'north-africa' | 'middle-east' | 'sub-saharan-africa' | 'north-america'
  | 'caribbean-central-america' | 'south-america' | 'east-asia' | 'southeast-asia' | 'south-asia'
  | 'oceania';

export type Landmass = string;

export interface Destination {
  id: string;
  name: string;
  country: string;
  cc: string;
  region: Region;
  lat: number;
  lon: number;
  airports: string[];
  land: Landmass;
  tags: Tag[];
  daily: number;
  months: number[];
  blurb: string;
  /** true when the place came from a live result rather than the catalog */
  adHoc?: boolean;
  thumb?: string;
}

export type Mode = 'flight' | 'train' | 'bus' | 'ferry' | 'drive' | 'rideshare';
export const MODES: Mode[] = ['train', 'bus', 'flight', 'ferry', 'rideshare', 'drive'];

export interface HomeBase {
  label: string;
  lat: number;
  lon: number;
  cc: string;
  /** IATA codes to fly from; empty = use nearest within airportRadiusKm */
  airports: string[];
}

export type Currency = 'USD' | 'EUR' | 'GBP';
export type StayStyle = 'free' | 'hostel' | 'budget' | 'mid';
export type SortKey = 'score' | 'price' | 'time' | 'hoursThere' | 'distance' | 'total';

export interface When {
  kind: 'weekends' | 'window' | 'exact';
  /** weekends: how many upcoming weekends to scan */
  weekendsAhead: number;
  /** weekends: allowed departure weekdays (0 = Sun … 6 = Sat) */
  departDays: number[];
  /** weekends: allowed return weekdays */
  returnDays: number[];
  /** window: date range the whole trip must fit inside */
  from: string;
  to: string;
  nightsMin: number;
  nightsMax: number;
  /** exact dates */
  depart: string;
  ret: string;
  /** "HH:MM" — earliest you can leave on day one */
  leaveAfter: string;
  /** "HH:MM" — latest you must be home on the last day */
  backBy: string;
  blackouts: string[];
}

export interface Weights {
  price: number;
  time: number;
  interest: number;
  hoursThere: number;
  comfort: number;
}

export interface SearchSpec {
  origins: HomeBase[];
  airportRadiusKm: number;

  scope: 'anywhere' | 'regions' | 'countries' | 'places';
  regions: Region[];
  countries: string[];
  places: string[];
  exclude: string[];
  skipVisited: boolean;
  visited: string[];
  wishlist: string[];
  tagsAny: Tag[];
  tagsNone: Tag[];
  minDistanceKm: number;
  maxDistanceKm: number;
  abroad: 'any' | 'only' | 'domestic';
  inSeasonOnly: boolean;

  when: When;

  modes: Record<Mode, boolean>;
  maxLegHours: number;
  maxTransfers: number;
  overnight: boolean;
  minHoursThere: number;

  travellers: number;
  currency: Currency;
  budgetTransport: number | null;
  budgetTotal: number | null;
  stayStyle: StayStyle;
  under26: boolean;
  railcard: boolean;
  checkedBag: boolean;

  weights: Weights;
  sort: SortKey;
  live: boolean;
  limit: number;
}

export interface Link {
  label: string;
  url: string;
}

/** One way of doing the round trip to a destination. Prices are USD per person, round trip. */
export interface Option {
  mode: Mode;
  /** one-way door-to-door minutes */
  outMin: number;
  transfers: number;
  price: number;
  priceHigh: number;
  source: 'live' | 'estimate';
  overnight: boolean;
  carrier?: string;
  stops?: number;
  note?: string;
  /** hours on the ground computed from real timetables, when known */
  hoursThere?: number;
  links: Link[];
}

export interface TripWindow {
  depart: string; // YYYY-MM-DD
  ret: string;
  nights: number;
  /** hours between leaving and having to be back, before travel */
  spanHours: number;
  label: string;
}

export interface Trip {
  key: string;
  dest: Destination;
  originLabel: string;
  originLat: number;
  originLon: number;
  distanceKm: number;
  window: TripWindow;
  options: Option[];
  best: Option;
  hoursThere: number;
  stayCost: number;
  total: number;
  interest: number;
  score: number;
  reasons: string[];
  flags: string[];
  /** best price for each date window tried, for comparing dates */
  alts: { window: TripWindow; mode: Mode; price: number; total: number; source: Option['source'] }[];
}

/** A real round-trip flight fare from a live source. */
export interface FlightFare {
  from: string;
  depart: string;
  ret: string;
  toAirport?: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  priceUsd: number;
  /** air time one way, minutes */
  airMin?: number;
  stops: number;
  carrier: string;
  link: string;
  source: 'Ryanair' | 'Google Flights';
  /** local "YYYY-MM-DDTHH:MM" times when known */
  outDep?: string;
  outArr?: string;
  inDep?: string;
  inArr?: string;
  thumb?: string;
}

/** A real ground fare (e.g. FlixBus) for one trip's dates. */
export interface GroundFare {
  mode: Mode;
  priceUsd: number;
  outMin: number;
  transfers: number;
  carrier: string;
  note?: string;
  link: string;
  overnight: boolean;
}

export interface SearchResult {
  trips: Trip[];
  considered: number;
  windows: TripWindow[];
  live: { used: boolean; calls: number; cached: number; errors: string[] };
  notes: string[];
}
