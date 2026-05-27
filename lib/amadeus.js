/**
 * lib/amadeus.js  (powered by SerpAPI → Google Flights)
 * Drop-in replacement — same exports, same normalized shape.
 *
 * Get a free key (100 searches/month) at https://serpapi.com
 * Add to .env.local:  SERPAPI_KEY=your_key_here
 * Add same key to Vercel dashboard for production.
 *
 * API call minimization:
 *   - Search results cached in-memory 10 min
 *   - Calendar / location results cached 30 min
 *   - Multi-origin fan-out runs in parallel (Promise.allSettled)
 */

const SERP_BASE = 'https://serpapi.com/search.json';

// ── In-memory caches ─────────────────────────────────────────────────────
const searchCache = new Map();
const SEARCH_TTL   = 10 * 60 * 1000;
const CALENDAR_TTL = 30 * 60 * 1000;

function cacheGet(map, key) {
  const e = map.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) { map.delete(key); return null; }
  return e.data;
}
function cacheSet(map, key, data, ttl) {
  map.set(key, { data, expiresAt: Date.now() + ttl });
}

// ── Core fetch ────────────────────────────────────────────────────────────
async function serpGet(params) {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    throw new Error('SERPAPI_KEY is not set. See .env.local.example.');
  }
  const qs  = new URLSearchParams({ ...params, api_key: apiKey }).toString();
  const res = await fetch(`${SERP_BASE}?${qs}`, { next: { revalidate: 600 } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SerpAPI ${res.status}: ${body}`);
  }
  return res.json();
}

// ── Travel class mapping ──────────────────────────────────────────────────
// SerpAPI: 1 Economy · 2 Premium Economy · 3 Business · 4 First
const CLASS_MAP = { ECONOMY: 1, PREMIUM_ECONOMY: 2, BUSINESS: 3, FIRST: 4 };

// ── Flight search ─────────────────────────────────────────────────────────
/**
 * @param {string}  origin          IATA code, e.g. "BOS"
 * @param {string}  destination     IATA code, e.g. "NRT"
 * @param {string}  departureDate   YYYY-MM-DD
 * @param {string}  [returnDate]    YYYY-MM-DD (round trip)
 * @param {number}  [adults]
 * @param {string}  [travelClass]   ECONOMY | PREMIUM_ECONOMY | BUSINESS | FIRST
 * @param {number}  [max]
 * @returns {Promise<Array>}        Normalized flight objects
 */
export async function searchFlights({
  origin, destination, departureDate, returnDate,
  adults = 1, travelClass = 'ECONOMY', max = 20,
}) {
  const ckey = `serp:${origin}:${destination}:${departureDate}:${returnDate}:${adults}:${travelClass}`;
  const hit  = cacheGet(searchCache, ckey);
  if (hit) return hit;

  const params = {
    engine:       'google_flights',
    departure_id: origin,
    arrival_id:   destination,
    outbound_date: departureDate,
    adults:       String(adults),
    currency:     'USD',
    hl:           'en',
    travel_class: String(CLASS_MAP[travelClass.toUpperCase().replace(/\s+/, '_')] || 1),
    type:         returnDate ? '1' : '2', // 1 = round trip, 2 = one way
  };
  if (returnDate) params.return_date = returnDate;

  const data  = await serpGet(params);
  const raw   = [...(data.best_flights || []), ...(data.other_flights || [])];
  const result = raw.slice(0, max).map(f => normalizeFlight(f, origin, destination, !!returnDate));

  cacheSet(searchCache, ckey, result, SEARCH_TTL);
  return result;
}

// ── Multi-origin fan-out ──────────────────────────────────────────────────
export async function searchMultiOrigin({
  origins, destination, departureDate, returnDate,
  adults, travelClass, max = 10,
}) {
  const settled = await Promise.allSettled(
    origins.map(origin =>
      searchFlights({ origin, destination, departureDate, returnDate, adults, travelClass, max })
    )
  );
  return settled.flatMap((r, i) =>
    r.status === 'rejected' ? [] : r.value.map(offer => ({ ...offer, origin: origins[i] }))
  );
}

// ── Cheapest dates calendar ───────────────────────────────────────────────
// SerpAPI doesn't expose a cheapest-dates calendar. UI renders graceful placeholder.
export async function getCheapestDates(_origin, _destination) {
  return [];
}

// ── Inspiration / recommended locations ──────────────────────────────────
// Handled by the static SIMILAR_DESTINATIONS map in lib/airports.js instead.
export async function getFlightInspiration(_origin) {
  return [];
}
export async function getRecommendedLocations(_cityCodes) {
  return [];
}

// ── Flexible date search ──────────────────────────────────────────────────
/**
 * Sample departure dates evenly within the availability window.
 * Window end for departures = latestReturn - durationDays (return must be ≤ latestReturn).
 */
function sampleDepartureDates(earliestDep, latestReturn, durationDays, maxSamples = 6) {
  const start = new Date(earliestDep);
  // Latest valid departure = latestReturn - durationDays
  const endDate = new Date(latestReturn);
  endDate.setDate(endDate.getDate() - (durationDays || 0));
  if (endDate < start) endDate.setTime(start.getTime()); // single day fallback

  const spanDays = Math.round((endDate - start) / 86400000);
  const count    = Math.min(maxSamples, spanDays + 1);
  const dates    = new Set();

  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + Math.round((spanDays * i) / Math.max(count - 1, 1)));
    dates.add(d.toISOString().slice(0, 10));
  }
  return [...dates];
}

/**
 * Search for cheapest flights across a flexible date window.
 * @param {string}   origin
 * @param {string}   destination
 * @param {string}   earliestDep    YYYY-MM-DD — earliest departure
 * @param {string}   latestReturn   YYYY-MM-DD — latest return date
 * @param {number}   durationDays   how many nights to stay
 * @param {number}   [adults]
 * @param {string}   [travelClass]
 * @param {number}   [maxSamples]   max SerpAPI calls per origin (default 6)
 * @param {string[]} [blackouts]    YYYY-MM-DD strings to skip
 */
export async function searchFlexibleDates({
  origin, destination, earliestDep, latestReturn, durationDays = 7,
  adults = 1, travelClass = 'ECONOMY', maxSamples = 6, blackouts = [],
}) {
  const blackoutSet  = new Set(blackouts);
  const sampleDates_ = sampleDepartureDates(earliestDep, latestReturn, durationDays, maxSamples)
    .filter(d => !blackoutSet.has(d));

  if (sampleDates_.length === 0) return [];

  const settled = await Promise.allSettled(
    sampleDates_.map(async (depDate) => {
      const retDate = (() => {
        const d = new Date(depDate);
        d.setDate(d.getDate() + durationDays);
        return d.toISOString().slice(0, 10);
      })();
      const flights = await searchFlights({
        origin, destination,
        departureDate: depDate,
        returnDate:    retDate,
        adults, travelClass, max: 3,
      });
      return flights.map(f => ({ ...f, flexDepartureDate: depDate, flexReturnDate: retDate, origin }));
    })
  );

  return settled
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);
}

/** Multi-origin flexible fan-out */
export async function searchFlexibleMultiOrigin({
  origins, destination, earliestDep, latestReturn,
  durationDays, adults, travelClass, blackouts, maxSamples,
}) {
  const settled = await Promise.allSettled(
    origins.map(origin =>
      searchFlexibleDates({ origin, destination, earliestDep, latestReturn, durationDays, adults, travelClass, blackouts, maxSamples })
    )
  );
  return settled.flatMap(r => r.status === 'rejected' ? [] : r.value);
}

// ── Airport / city autocomplete ───────────────────────────────────────────
// Pickers fall back to their static lists when this returns empty.
export async function searchLocations(keyword) {
  const key    = `loc:${keyword.toLowerCase()}`;
  const cached = cacheGet(searchCache, key);
  if (cached) return cached;

  try {
    // SerpAPI's Google Flights airport search
    const data = await serpGet({ engine: 'google_flights', q: keyword, hl: 'en', num: 10 });
    // Extract any airports from suggestions if present
    const airports = (data.airports || data.suggestions || []).slice(0, 10).map(a => ({
      code:        a.id || a.iata || a.code || '',
      name:        a.name || '',
      city:        a.city || a.name || '',
      country:     a.country || '',
      countryCode: a.country_code || a.countryCode || '',
      subType:     'AIRPORT',
    })).filter(a => a.code);

    cacheSet(searchCache, key, airports, CALENDAR_TTL);
    return airports;
  } catch {
    return []; // static list fallback activates in pickers
  }
}

// ── Normalizer ────────────────────────────────────────────────────────────
function normalizeFlight(offer, originCode, destCode, isRoundTrip) {
  const legs      = offer.flights || [];
  const first     = legs[0]  || {};
  const last      = legs[legs.length - 1] || {};
  const stops     = Math.max(0, legs.length - 1);
  const stopCodes = (offer.layovers || []).map(l => l.id).filter(Boolean);
  const durMins   = offer.total_duration || 0;

  // Unique-ish ID
  const id = [first.flight_number, first.departure_airport?.time]
    .filter(Boolean).join('-') || Math.random().toString(36).slice(2);

  return {
    id,
    price:         offer.price || 0,
    currency:      'USD',
    pricePerAdult: offer.price || 0,
    cabin:         first.travel_class || 'Economy',
    airline:       first.airline || '',
    airlineName:   first.airline || '',
    airlineLogo:   offer.airline_logo || first.airline_logo || null,
    flightNumber:  first.flight_number || '',
    stops,
    stopCodes,
    departure: {
      airport:  first.departure_airport?.id   || originCode,
      time:     first.departure_airport?.time || '',
      terminal: '',
    },
    arrival: {
      airport:  last.arrival_airport?.id    || destCode,
      time:     last.arrival_airport?.time  || '',
      terminal: '',
    },
    durationMins: durMins,
    durationStr:  fmtDuration(durMins),
    // SerpAPI round-trip price is already the total; return leg detail needs booking token
    returnFlight: null,
    isRoundTrip,
    raw: offer,
  };
}

function fmtDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m > 0 ? ` ${m}m` : ''}`;
}
