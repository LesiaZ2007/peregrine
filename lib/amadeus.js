/**
 * amadeus.js
 * Server-side Amadeus API wrapper with token caching and request deduplication.
 *
 * API call minimization strategy:
 * - OAuth2 access token is cached in-memory and reused until it expires (~30min)
 * - Flight search results are cached per-query for 10 minutes (prices don't change faster)
 * - Multi-origin searches fan out in parallel (Promise.all), not sequentially
 * - Calendar searches are cached per route for 30 minutes
 * - All cache stored in module-level Maps (survives hot-reload in dev via Next.js module caching)
 */

const BASE = 'https://test.api.amadeus.com'; // test environment; swap to production when ready

// ── In-memory caches ─────────────────────────────────────────────────────
let tokenCache = { token: null, expiresAt: 0 };
const searchCache = new Map();  // key -> { data, expiresAt }
const SEARCH_TTL  = 10 * 60 * 1000; // 10 min
const CALENDAR_TTL = 30 * 60 * 1000; // 30 min

function cacheGet(map, key) {
  const entry = map.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { map.delete(key); return null; }
  return entry.data;
}

function cacheSet(map, key, data, ttl) {
  map.set(key, { data, expiresAt: Date.now() + ttl });
}

// ── Token management ─────────────────────────────────────────────────────
async function getToken() {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const clientId = process.env.AMADEUS_CLIENT_ID;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET are not set. See .env.local.example.');
  }

  const res = await fetch(`${BASE}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Amadeus auth failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // buffer 60s
  };
  return tokenCache.token;
}

async function amadeusGet(path, params = {}) {
  const token = await getToken();
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}${path}${qs ? '?' + qs : ''}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 600 }, // Next.js fetch cache: 10 min
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Amadeus ${path} failed: ${res.status} ${err}`);
  }
  return res.json();
}

// ── Flight offers search ─────────────────────────────────────────────────
/**
 * Search for flight offers.
 * @param {object} params
 * @param {string}   params.origin
 * @param {string}   params.destination
 * @param {string}   params.departureDate  - YYYY-MM-DD
 * @param {string}   [params.returnDate]   - YYYY-MM-DD (round trip)
 * @param {number}   [params.adults]       - default 1
 * @param {string}   [params.travelClass]  - ECONOMY | PREMIUM_ECONOMY | BUSINESS | FIRST
 * @param {number}   [params.max]          - max results, default 20
 * @returns {Promise<Array>} Normalized flight offer objects
 */
export async function searchFlights({ origin, destination, departureDate, returnDate, adults = 1, travelClass = 'ECONOMY', max = 20 }) {
  const key = `search:${origin}:${destination}:${departureDate}:${returnDate}:${adults}:${travelClass}`;
  const cached = cacheGet(searchCache, key);
  if (cached) return cached;

  const qp = {
    originLocationCode:      origin,
    destinationLocationCode: destination,
    departureDate,
    adults,
    travelClass: travelClass.toUpperCase().replace(' ', '_'),
    currencyCode: 'USD',
    max,
  };
  if (returnDate) qp.returnDate = returnDate;

  const data = await amadeusGet('/v2/shopping/flight-offers', qp);
  const normalized = (data.data || []).map(normalizeOffer);
  cacheSet(searchCache, key, normalized, SEARCH_TTL);
  return normalized;
}

/**
 * Fan-out multi-origin search in parallel.
 * Returns merged array tagged with origin.
 */
export async function searchMultiOrigin({ origins, destination, departureDate, returnDate, adults, travelClass, max = 10 }) {
  const results = await Promise.allSettled(
    origins.map(origin => searchFlights({ origin, destination, departureDate, returnDate, adults, travelClass, max }))
  );
  return results.flatMap((r, i) => {
    if (r.status === 'rejected') return [];
    return r.value.map(offer => ({ ...offer, origin: origins[i] }));
  });
}

// ── Cheapest dates calendar ───────────────────────────────────────────────
/**
 * Find cheapest departure dates in a range.
 * @param {string} origin
 * @param {string} destination
 * @returns {Promise<Array<{date, price}>>}
 */
export async function getCheapestDates(origin, destination) {
  const key = `calendar:${origin}:${destination}`;
  const cached = cacheGet(searchCache, key);
  if (cached) return cached;

  const data = await amadeusGet('/v1/shopping/flight-dates', {
    origin, destination, oneWay: false,
  });
  const result = (data.data || []).map(d => ({
    date: d.departureDate,
    price: parseFloat(d.price?.total || 0),
  }));
  cacheSet(searchCache, key, result, CALENDAR_TTL);
  return result;
}

// ── Flight inspiration (where to go from X) ───────────────────────────────
export async function getFlightInspiration(origin) {
  const key = `inspire:${origin}`;
  const cached = cacheGet(searchCache, key);
  if (cached) return cached;

  const data = await amadeusGet('/v1/shopping/flight-destinations', { origin, oneWay: false });
  const result = (data.data || []).slice(0, 12).map(d => ({
    destination: d.destination,
    price: parseFloat(d.price?.total || 0),
    departureDate: d.departureDate,
    returnDate: d.returnDate,
  }));
  cacheSet(searchCache, key, result, CALENDAR_TTL);
  return result;
}

// ── Recommended locations (similar/nearby) ────────────────────────────────
export async function getRecommendedLocations(cityCodes) {
  const key = `recloc:${cityCodes.join(',')}`;
  const cached = cacheGet(searchCache, key);
  if (cached) return cached;

  const data = await amadeusGet('/v1/reference-data/recommended-locations', {
    cityCodes: cityCodes.join(','),
  });
  const result = (data.data || []).map(d => ({
    code: d.iataCode,
    name: d.name,
    subType: d.subType,
  }));
  cacheSet(searchCache, key, result, CALENDAR_TTL);
  return result;
}

// ── Location autocomplete ─────────────────────────────────────────────────
export async function searchLocations(keyword) {
  const key = `loc:${keyword.toLowerCase()}`;
  const cached = cacheGet(searchCache, key);
  if (cached) return cached;

  const data = await amadeusGet('/v1/reference-data/locations', {
    keyword,
    subType: 'AIRPORT,CITY',
    'page[limit]': 10,
    sort: 'analytics.travelers.score',
    view: 'LIGHT',
  });
  const result = (data.data || []).map(d => ({
    code: d.iataCode,
    name: d.name,
    city: d.address?.cityName || d.name,
    country: d.address?.countryName || '',
    countryCode: d.address?.countryCode || '',
    subType: d.subType,
  }));
  cacheSet(searchCache, key, result, CALENDAR_TTL);
  return result;
}

// ── Normalize a raw Amadeus offer ─────────────────────────────────────────
function normalizeOffer(offer) {
  const itineraries = offer.itineraries || [];
  const price = offer.price || {};
  const segments = itineraries.flatMap(it => it.segments || []);

  const departure = segments[0];
  const arrival   = segments[segments.length - 1];
  const returnIt  = itineraries[1];
  const returnSeg = returnIt ? returnIt.segments : null;

  // Duration string to minutes
  const durToMins = (d) => {
    if (!d) return 0;
    const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    return (parseInt(m?.[1] || 0) * 60) + parseInt(m?.[2] || 0);
  };

  const outDuration = itineraries[0]?.duration ? durToMins(itineraries[0].duration) : 0;
  const retDuration = returnIt?.duration ? durToMins(returnIt.duration) : 0;

  // Detect interesting layovers
  const stopCodes = segments.slice(0, -1).map(s => s.arrival?.iataCode).filter(Boolean);

  return {
    id:            offer.id,
    price:         parseFloat(price.total || 0),
    currency:      price.currency || 'USD',
    pricePerAdult: parseFloat(price.grandTotal || price.total || 0),
    cabin:         offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || 'ECONOMY',
    airline:       departure?.carrierCode || '',
    airlineName:   departure?.carrierCode || '',
    flightNumber:  `${departure?.carrierCode}${departure?.number}`,
    stops:         segments.length - 1,
    stopCodes,
    departure: {
      airport:  departure?.departure?.iataCode || '',
      time:     departure?.departure?.at || '',
      terminal: departure?.departure?.terminal || '',
    },
    arrival: {
      airport:  arrival?.arrival?.iataCode || '',
      time:     arrival?.arrival?.at || '',
      terminal: arrival?.arrival?.terminal || '',
    },
    durationMins: outDuration,
    durationStr:  fmtDuration(outDuration),
    returnFlight: returnSeg ? {
      departure: {
        airport: returnSeg[0]?.departure?.iataCode || '',
        time:    returnSeg[0]?.departure?.at || '',
      },
      arrival: {
        airport: returnSeg[returnSeg.length-1]?.arrival?.iataCode || '',
        time:    returnSeg[returnSeg.length-1]?.arrival?.at || '',
      },
      durationMins: retDuration,
      durationStr:  fmtDuration(retDuration),
      stops: returnSeg.length - 1,
    } : null,
    isRoundTrip: !!returnIt,
    raw: offer,
  };
}

function fmtDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m > 0 ? ` ${m}m` : ''}`;
}
