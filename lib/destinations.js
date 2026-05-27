/**
 * destinations.js
 * Curated destination metadata: cost-of-staying estimates, interesting layovers,
 * and region/similarity data used across the app.
 *
 * Cost figures are rough averages based on public travel data (Numbeo, Lonely Planet,
 * travel blogs) — intended as ballpark guidance, not precise quotes.
 */

// ── Cost-of-staying data per destination code ─────────────────────────────
// All prices in USD. hotel = avg/night midrange, meal = avg meal out, daily = all-in estimate
export const DESTINATION_COSTS = {
  // East Asia
  TYO: { hotel: 120, meal: 15, excursion: 30, daily: 200, currency: 'JPY', notes: 'Tokyo is pricier than rest of Japan; budget districts like Asakusa are cheaper', safety: 'Very safe', bestMonths: ['Mar','Apr','Oct','Nov'] },
  OSA: { hotel: 90,  meal: 12, excursion: 25, daily: 160, currency: 'JPY', notes: 'Osaka is more affordable than Tokyo with legendary street food', safety: 'Very safe', bestMonths: ['Mar','Apr','Oct','Nov'] },
  ICN: { hotel: 80,  meal: 10, excursion: 20, daily: 140, currency: 'KRW', notes: 'Seoul very affordable; K-pop experiences, palaces, and BBQ', safety: 'Very safe', bestMonths: ['Apr','May','Sep','Oct'] },
  PEK: { hotel: 70,  meal: 8,  excursion: 20, daily: 120, currency: 'CNY', notes: 'Visa required for most nationalities; Great Wall day trips worthwhile', safety: 'Safe', bestMonths: ['Apr','May','Sep','Oct'] },
  PVG: { hotel: 90,  meal: 10, excursion: 25, daily: 150, currency: 'CNY', notes: 'Shanghai — most cosmopolitan Chinese city, great food scene', safety: 'Safe', bestMonths: ['Apr','May','Sep','Oct'] },
  HKG: { hotel: 140, meal: 15, excursion: 30, daily: 230, currency: 'HKD', notes: 'Expensive city; day trips to Lantau and dim sum are highlights', safety: 'Very safe', bestMonths: ['Oct','Nov','Dec'] },
  TPE: { hotel: 75,  meal: 8,  excursion: 15, daily: 120, currency: 'TWD', notes: 'Taipei excellent value; night markets and mountain hikes', safety: 'Very safe', bestMonths: ['Oct','Nov','Dec','Mar'] },

  // Southeast Asia
  SIN: { hotel: 130, meal: 10, excursion: 40, daily: 200, currency: 'SGD', notes: 'Expensive hotels but hawker food is incredible value ($3-5/meal)', safety: 'Extremely safe', bestMonths: ['Feb','Mar','Jul','Aug'] },
  BKK: { hotel: 50,  meal: 5,  excursion: 20, daily: 80,  currency: 'THB', notes: 'Bangkok outstanding value; temples, markets, world-class food', safety: 'Generally safe', bestMonths: ['Nov','Dec','Jan','Feb'] },
  HAN: { hotel: 40,  meal: 3,  excursion: 15, daily: 65,  currency: 'VND', notes: 'Hanoi budget-friendly; Old Quarter charm and Halong Bay trips', safety: 'Safe', bestMonths: ['Oct','Nov','Dec','Mar'] },
  SGN: { hotel: 45,  meal: 4,  excursion: 18, daily: 70,  currency: 'VND', notes: 'Ho Chi Minh City vibrant and affordable; Mekong Delta day trips', safety: 'Safe', bestMonths: ['Dec','Jan','Feb','Mar'] },
  KUL: { hotel: 55,  meal: 5,  excursion: 20, daily: 85,  currency: 'MYR', notes: 'KL excellent value; Petronas Towers, Batu Caves, hawker food', safety: 'Generally safe', bestMonths: ['May','Jun','Jul','Dec'] },
  MNL: { hotel: 50,  meal: 5,  excursion: 25, daily: 85,  currency: 'PHP', notes: 'Manila gateway to incredible islands (Palawan, Boracay)', safety: 'Use caution', bestMonths: ['Dec','Jan','Feb','Mar'] },
  CGK: { hotel: 45,  meal: 4,  excursion: 20, daily: 75,  currency: 'IDR', notes: 'Jakarta transit hub; Bali often the real destination', safety: 'Generally safe', bestMonths: ['May','Jun','Jul','Aug','Sep'] },
  DPS: { hotel: 70,  meal: 6,  excursion: 25, daily: 110, currency: 'IDR', notes: 'Bali — beautiful temples, rice terraces, world-class surfing', safety: 'Safe', bestMonths: ['Apr','May','Jun','Jul','Aug','Sep'] },

  // Europe
  LHR: { hotel: 180, meal: 20, excursion: 35, daily: 280, currency: 'GBP', notes: 'London expensive but unmatched culture; many free museums', safety: 'Very safe', bestMonths: ['May','Jun','Sep'] },
  CDG: { hotel: 160, meal: 18, excursion: 30, daily: 250, currency: 'EUR', notes: 'Paris pricier than you\'d hope; sidewalk cafes and museums worth it', safety: 'Very safe', bestMonths: ['Apr','May','Sep','Oct'] },
  AMS: { hotel: 150, meal: 16, excursion: 25, daily: 230, currency: 'EUR', notes: 'Amsterdam compact and walkable; Rijksmuseum, canals, day trips', safety: 'Very safe', bestMonths: ['Apr','May','Jun','Sep'] },
  FCO: { hotel: 110, meal: 14, excursion: 25, daily: 185, currency: 'EUR', notes: 'Rome excellent value vs. Western Europe; Vatican, Colosseum', safety: 'Safe', bestMonths: ['Apr','May','Sep','Oct'] },
  BCN: { hotel: 120, meal: 14, excursion: 22, daily: 195, currency: 'EUR', notes: 'Barcelona vibrant food, beaches, and Gaudí architecture', safety: 'Safe (watch pickpockets)', bestMonths: ['May','Jun','Sep','Oct'] },
  FRA: { hotel: 130, meal: 16, excursion: 20, daily: 210, currency: 'EUR', notes: 'Frankfurt efficient transit hub; day trips to Rhine Valley', safety: 'Very safe', bestMonths: ['May','Jun','Sep','Oct'] },
  IST: { hotel: 60,  meal: 8,  excursion: 20, daily: 105, currency: 'TRY', notes: 'Istanbul incredible value; two continents, bazaars, Bosphorus', safety: 'Generally safe', bestMonths: ['Apr','May','Sep','Oct'] },
  ATH: { hotel: 90,  meal: 12, excursion: 20, daily: 155, currency: 'EUR', notes: 'Athens affordable Europe entry; Acropolis, islands day trips', safety: 'Very safe', bestMonths: ['Apr','May','Sep','Oct'] },

  // Middle East
  DXB: { hotel: 120, meal: 15, excursion: 50, daily: 210, currency: 'AED', notes: 'Dubai high-end but tax-free shopping; desert and skyline experiences', safety: 'Very safe', bestMonths: ['Nov','Dec','Jan','Feb','Mar'] },
  DOH: { hotel: 110, meal: 14, excursion: 40, daily: 190, currency: 'QAR', notes: 'Doha underrated gem; Museum of Islamic Art, desert dunes', safety: 'Very safe', bestMonths: ['Nov','Dec','Jan','Feb'] },

  // South Asia
  DEL: { hotel: 50,  meal: 4,  excursion: 15, daily: 75,  currency: 'INR', notes: 'Delhi incredible history; Taj Mahal day trip from Agra', safety: 'Use caution', bestMonths: ['Oct','Nov','Feb','Mar'] },
  BOM: { hotel: 60,  meal: 5,  excursion: 18, daily: 90,  currency: 'INR', notes: 'Mumbai vibrant; street food, Bollywood, coastal scenery', safety: 'Use caution', bestMonths: ['Nov','Dec','Jan','Feb'] },

  // Africa
  CAI: { hotel: 40,  meal: 5,  excursion: 20, daily: 70,  currency: 'EGP', notes: 'Cairo extremely affordable; pyramids, Nile River, bazaars', safety: 'Use caution', bestMonths: ['Oct','Nov','Feb','Mar'] },
  JNB: { hotel: 70,  meal: 8,  excursion: 30, daily: 115, currency: 'ZAR', notes: 'Jo\'burg gateway to Kruger; safari packages widely available', safety: 'Use caution', bestMonths: ['May','Jun','Jul','Aug','Sep'] },

  // Americas
  CUN: { hotel: 90,  meal: 12, excursion: 35, daily: 150, currency: 'MXN', notes: 'Cancún resorts + Mayan ruins day trips; great for families', safety: 'Generally safe in tourist zones', bestMonths: ['Nov','Dec','Jan','Feb','Mar'] },
  GRU: { hotel: 80,  meal: 10, excursion: 25, daily: 135, currency: 'BRL', notes: 'São Paulo cultural hub; Rio de Janeiro is 1hr by plane', safety: 'Use caution', bestMonths: ['Mar','Apr','May','Sep','Oct'] },

  // Oceania
  SYD: { hotel: 160, meal: 20, excursion: 45, daily: 260, currency: 'AUD', notes: 'Sydney gorgeous harbour; Opera House, Bondi Beach, Blue Mountains', safety: 'Very safe', bestMonths: ['Sep','Oct','Nov','Mar','Apr'] },
};

// ── Interesting layover airports (for LayoverExplorer) ───────────────────
export const INTERESTING_LAYOVERS = [
  { code: 'DXB', city: 'Dubai',        country: 'UAE',         emoji: '🇦🇪', minHours: 20, note: 'World-class skyline, desert, tax-free shopping' },
  { code: 'DOH', city: 'Doha',         country: 'Qatar',       emoji: '🇶🇦', minHours: 20, note: 'Stunning Hamad airport, Museum of Islamic Art, souq' },
  { code: 'AUH', city: 'Abu Dhabi',    country: 'UAE',         emoji: '🇦🇪', minHours: 20, note: 'Sheikh Zayed Grand Mosque, F1 circuit, Louvre Abu Dhabi' },
  { code: 'AMS', city: 'Amsterdam',    country: 'Netherlands', emoji: '🇳🇱', minHours: 20, note: 'Canals, Rijksmuseum, cycling, world-class beer' },
  { code: 'IST', city: 'Istanbul',     country: 'Turkey',      emoji: '🇹🇷', minHours: 20, note: 'Hagia Sophia, Grand Bazaar, Bosphorus crossing' },
  { code: 'SIN', city: 'Singapore',    country: 'Singapore',   emoji: '🇸🇬', minHours: 20, note: 'Changi airport itself is a destination; Gardens by the Bay' },
  { code: 'ICN', city: 'Seoul',        country: 'South Korea', emoji: '🇰🇷', minHours: 20, note: 'K-food, palaces, K-pop culture in Hongdae' },
  { code: 'NRT', city: 'Tokyo',        country: 'Japan',       emoji: '🇯🇵', minHours: 20, note: 'Narita town temples; city day trips via Narita Express' },
  { code: 'LHR', city: 'London',       country: 'UK',          emoji: '🇬🇧', minHours: 20, note: 'Historic landmarks, world-class free museums' },
  { code: 'CDG', city: 'Paris',        country: 'France',      emoji: '🇫🇷', minHours: 20, note: 'Eiffel Tower, Louvre, street cafes — classic Paris day' },
  { code: 'FRA', city: 'Frankfurt',    country: 'Germany',     emoji: '🇩🇪', minHours: 20, note: 'Medieval old town, apple wine, Rhine Valley day trips' },
  { code: 'ZRH', city: 'Zurich',       country: 'Switzerland', emoji: '🇨🇭', minHours: 20, note: 'Alps views, lake walks, Swiss chocolate and watches' },
  { code: 'HKG', city: 'Hong Kong',    country: 'HK',          emoji: '🇭🇰', minHours: 20, note: 'Star Ferry skyline, dim sum, night markets on Kowloon' },
  { code: 'TPE', city: 'Taipei',       country: 'Taiwan',      emoji: '🇹🇼', minHours: 20, note: 'Night markets, Taipei 101, mountain hiking' },
  { code: 'KUL', city: 'Kuala Lumpur', country: 'Malaysia',    emoji: '🇲🇾', minHours: 20, note: 'Petronas Towers, Batu Caves, exceptional hawker food' },
];

// ── Helper: get cost data for a destination code ─────────────────────────
export function getCostData(code) {
  return DESTINATION_COSTS[code] || null;
}

// ── Helper: is this airport an interesting layover? ──────────────────────
export function isInterestingLayover(code) {
  return INTERESTING_LAYOVERS.some(l => l.code === code);
}

export function getLayoverInfo(code) {
  return INTERESTING_LAYOVERS.find(l => l.code === code) || null;
}

// ── Region groups (used for suggestions) ─────────────────────────────────
export const REGIONS = {
  'East Asia':    ['TYO','OSA','ICN','PEK','PVG','HKG','TPE'],
  'SE Asia':      ['SIN','BKK','HAN','SGN','KUL','MNL','CGK','DPS'],
  'Europe':       ['LHR','CDG','AMS','FCO','BCN','FRA','IST','ATH'],
  'Middle East':  ['DXB','DOH'],
  'South Asia':   ['DEL','BOM'],
  'Africa':       ['CAI','JNB'],
  'Americas':     ['CUN','GRU'],
  'Oceania':      ['SYD'],
};
