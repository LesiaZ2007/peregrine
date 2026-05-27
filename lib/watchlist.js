/**
 * watchlist.js
 * localStorage-based watchlist for saved flight searches.
 * No API calls on its own — refetch logic is triggered by the UI on demand.
 *
 * API call minimization:
 * - Watchlist items are only re-fetched when the user visits /watchlist or clicks "Refresh"
 * - Last-fetched timestamp is stored; UI shows stale indicator if > 2h old
 * - Batch refresh fetches all watched routes in a single session (parallel, not sequential polls)
 */

const KEY = 'pg-watchlist';
const STALE_MS = 2 * 60 * 60 * 1000; // 2 hours

function getStore() {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

function setStore(data) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(data)); }
  catch (e) { console.warn('watchlist: localStorage write failed', e); }
}

/**
 * Generate a stable ID for a watched route.
 */
function watchId(origins, destinations, tripType, start, end) {
  return [origins.sort().join(','), destinations.sort().join(','), tripType, start, end].join('|');
}

/**
 * Add a flight search to the watchlist.
 * @param {object} item
 * @param {string[]} item.origins
 * @param {string[]} item.destinations
 * @param {string}   item.tripType
 * @param {string}   item.start       - ISO date
 * @param {string}   item.end         - ISO date (null for one-way)
 * @param {number}   item.lowestPrice - Current lowest price found
 * @param {string}   item.cabin
 * @param {object}   item.passengers
 */
export function addToWatchlist(item) {
  const id = watchId(item.origins, item.destinations, item.tripType, item.start, item.end);
  const store = getStore();
  const existing = store.findIndex(w => w.id === id);
  const entry = {
    ...item,
    id,
    savedAt: Date.now(),
    lastChecked: Date.now(),
    priceAtSave: item.lowestPrice,
    currentPrice: item.lowestPrice,
    priceChange: 0, // pct change since save
  };
  if (existing >= 0) store[existing] = entry;
  else store.push(entry);
  setStore(store);
  return id;
}

export function removeFromWatchlist(id) {
  setStore(getStore().filter(w => w.id !== id));
}

export function getWatchlist() {
  return getStore();
}

export function isWatched(origins, destinations, tripType, start, end) {
  const id = watchId(origins, destinations, tripType, start, end);
  return getStore().some(w => w.id === id);
}

/**
 * Update a watchlist item with a fresh price (after refetch).
 */
export function updateWatchlistPrice(id, newPrice) {
  const store = getStore();
  const idx = store.findIndex(w => w.id === id);
  if (idx < 0) return;
  const prev = store[idx].currentPrice;
  const pct = prev ? Math.round(((newPrice - prev) / prev) * 100) : 0;
  store[idx] = {
    ...store[idx],
    currentPrice: newPrice,
    priceChange: pct,
    lastChecked: Date.now(),
  };
  setStore(store);
  return store[idx];
}

/**
 * Check if a watchlist item's price data is stale.
 */
export function isStale(item) {
  return (Date.now() - (item.lastChecked || 0)) > STALE_MS;
}

export function formatLastChecked(item) {
  if (!item.lastChecked) return 'Never';
  const ago = Date.now() - item.lastChecked;
  const mins = Math.round(ago / 60000);
  if (mins < 2) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
