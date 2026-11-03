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
  /** where the photo comes from (Wikipedia article), for credit */
  imagePage?: string;
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
export type FoodStyle = 'self' | 'cheap' | 'restaurants';
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
  /** date range: weekdays you're free (0 = Sun … 6 = Sat). Every day of a trip must be one. Empty = any day. */
  freeDays: number[];
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
  /** countries you've been to (ISO codes), and whether to leave them out */
  beenCountries: string[];
  skipBeenCountries: boolean;
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
  /** longest you'll spend on one kind of transport, hours (e.g. { bus: 4 }); unset = no extra limit */
  modeMaxHours: Partial<Record<Mode, number>>;
  maxTransfers: number;
  overnight: boolean;
  minHoursThere: number;

  travellers: number;
  currency: Currency;
  budgetTransport: number | null;
  budgetTotal: number | null;
  stayStyle: StayStyle;
  foodStyle: FoodStyle;
  includeSights: boolean;
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

/** One part of a journey that uses more than one kind of transport. */
export interface Hop {
  mode: Mode;
  /** e.g. "coach to LIS, about 1h 40m" */
  note: string;
  /** this leg's return price per person, USD, when known */
  price?: number;
  /** minutes this leg takes one way, when known */
  min?: number;
  source?: 'live' | 'estimate';
}

/** One way of doing the round trip to a destination. Prices are USD per person, round trip. */
export interface Option {
  mode: Mode;
  /** set when the journey needs several kinds of transport, in order */
  legs?: Hop[];
  /** estimated cost of the extra legs (e.g. airport transfers), USD return; included in totals */
  extraEst?: number;
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
  /** waypoints [lon, lat] for drawing the journey (town → airport → airport → town …) */
  path?: [number, number][];
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
  /** itemised cost of being there, USD per person */
  costs: Costs;
  /** guidance on whether another airline could beat the listed fare */
  flightHint: FlightHint | null;
  /** set when the trip is just outside your settings: why */
  nearMiss?: string[];
  /** other ways there that break one of your limits, with the reason */
  blocked?: { option: Option; why: string }[];
  /** best price for each date window tried, for comparing dates */
  alts: {
    window: TripWindow; mode: Mode; price: number; total: number; source: Option['source'];
    /** every way there on these dates (allowed or not), for date-by-mode price tables */
    ways?: { chain: Mode[]; price: number; outMin: number; source: Option['source']; ok: boolean }[];
  }[];
}

export interface Costs {
  beds: number;
  food: number;
  local: number;
  sights: number;
  nights: number;
  days: number;
}

export interface FlightHint {
  /** estimated typical low round-trip fare range on this distance, USD — guidance only */
  low: number;
  high: number;
  /** budget airlines that commonly fly from your country / to theirs */
  airlines: string[];
  /** the listed real fare is above the typical low range, so shop around */
  cheaperLikely: boolean;
  /** true when no real fare was found at all */
  noRealFare: boolean;
  links: Link[];
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
  source: 'Ryanair' | 'Google Flights' | 'Estimate';
  /** upper end of an estimated fare range */
  priceHighUsd?: number;
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
  /** places just outside your settings, with reasons */
  near: Trip[];
  considered: number;
  windows: TripWindow[];
  live: { used: boolean; calls: number; cached: number; errors: string[] };
  notes: string[];
}
