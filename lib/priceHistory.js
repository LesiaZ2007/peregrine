/**
 * priceHistory.js
 * Self-built price history via localStorage accumulation.
 *
 * API call minimization strategy:
 * - Price samples are saved every time a search completes (piggybacks on searches the user is already doing)
 * - No dedicated polling — data accumulates naturally over repeat visits
 * - History is keyed by route (origin-destination-tripType) for clean lookup
 * - TTL: entries older than 90 days are pruned on read to prevent unbounded growth
 */

const KEY = 'pg-price-history';
const MAX_DAYS = 90;
const MAX_SAMPLES_PER_ROUTE = 30;

function getStore() {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { return {}; }
}

function setStore(data) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(data)); }
  catch (e) { console.warn('priceHistory: localStorage write failed', e); }
}

function routeKey(origin, destination, tripType = 'roundtrip') {
  return `${origin}-${destination}-${tripType}`.toUpperCase();
}

function pruneOld(samples) {
  const cutoff = Date.now() - MAX_DAYS * 24 * 60 * 60 * 1000;
  return samples.filter(s => s.timestamp > cutoff);
}

/**
 * Save a price sample for a route. Called after each successful search.
 * @param {string} origin
 * @param {string} destination
 * @param {number} price
 * @param {string} tripType
 * @param {string} departureDate ISO string
 */
export function recordPrice(origin, destination, price, tripType = 'roundtrip', departureDate = '') {
  const store = getStore();
  const key = routeKey(origin, destination, tripType);
  const existing = pruneOld(store[key] || []);
  existing.push({ price, timestamp: Date.now(), departureDate });
  // Keep only the most recent N samples
  const trimmed = existing.slice(-MAX_SAMPLES_PER_ROUTE);
  store[key] = trimmed;
  setStore(store);
}

/**
 * Get price history for a route, sorted oldest-first.
 * @returns {Array<{price, timestamp, departureDate}>}
 */
export function getHistory(origin, destination, tripType = 'roundtrip') {
  const store = getStore();
  const key = routeKey(origin, destination, tripType);
  return pruneOld(store[key] || []).sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Get the last recorded price for a route (for change detection).
 */
export function getLastPrice(origin, destination, tripType = 'roundtrip') {
  const history = getHistory(origin, destination, tripType);
  if (history.length === 0) return null;
  return history[history.length - 1].price;
}

/**
 * Calculate price change since last recorded price.
 * @returns {{ changed: boolean, pct: number, direction: 'up'|'down'|'stable', prev: number, curr: number }}
 */
export function getPriceChange(origin, destination, currentPrice, tripType = 'roundtrip') {
  const last = getLastPrice(origin, destination, tripType);
  if (!last || !currentPrice) return { changed: false, pct: 0, direction: 'stable', prev: null, curr: currentPrice };
  const pct = ((currentPrice - last) / last) * 100;
  const absP = Math.abs(pct);
  if (absP < 2) return { changed: false, pct: 0, direction: 'stable', prev: last, curr: currentPrice };
  return { changed: true, pct: Math.round(pct), direction: pct > 0 ? 'up' : 'down', prev: last, curr: currentPrice };
}

/**
 * Clear all history (for testing/reset).
 */
export function clearHistory() {
  if (typeof window !== 'undefined') localStorage.removeItem(KEY);
}
