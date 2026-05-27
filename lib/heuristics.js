/**
 * heuristics.js
 * Price trend scoring engine — pure logic, zero API calls.
 * Produces a structured recommendation object used by PeregrineInsight
 * and as input to the Groq AI prompt.
 */

// ── Seasonality: 0=low 1=mid 2=high demand by month (0=Jan) ──────────────
const SEASONALITY = {
  // East Asia
  TYO: [1,1,2,2,1,1,1,1,1,2,2,1], // Cherry blossom (Mar-Apr) + autumn (Oct-Nov)
  OSA: [1,1,2,2,1,1,1,1,1,2,2,1],
  ICN: [1,1,1,2,2,1,1,1,1,2,1,1], // Spring + autumn peak
  PEK: [0,0,1,2,2,1,1,1,1,2,1,0],
  PVG: [0,0,1,2,1,1,2,2,1,1,1,0],
  HKG: [0,0,1,1,1,1,2,2,2,2,1,1],
  TPE: [1,1,1,1,1,1,2,2,1,1,1,1],
  // Southeast Asia
  SIN: [1,1,1,1,1,1,2,2,1,1,1,2],
  BKK: [2,2,1,1,0,0,1,1,0,0,2,2], // Avoid monsoon (Jun-Sep)
  HAN: [1,1,1,1,1,0,0,0,0,1,1,2],
  SGN: [2,2,2,1,0,0,0,0,0,0,1,2],
  KUL: [1,1,1,1,1,1,1,1,1,1,1,2],
  DPS: [2,2,1,1,1,2,2,2,2,2,1,2], // Dry season Jul-Sep peak
  // Europe
  LHR: [0,0,0,1,2,2,2,2,1,1,0,0],
  CDG: [0,0,0,1,2,2,2,2,1,1,0,1],
  AMS: [0,0,0,2,2,2,2,2,1,1,0,0], // Tulip season Apr-May
  FCO: [1,1,1,2,2,1,2,2,2,1,1,1],
  BCN: [0,0,1,1,2,2,2,2,2,1,0,1],
  IST: [1,1,1,2,2,1,2,2,1,2,1,1],
  // Default for unknown destinations
  DEFAULT: [0,0,0,1,1,2,2,2,1,1,0,0],
};

// ── Day-of-week: 0=Mon ... 6=Sun → cost multiplier ──────────────────────
const DOW_SCORE = [0.5, 0, -0.5, -1, 0, 0.5, 1]; // negative = cheaper

// ── Booking window rules ─────────────────────────────────────────────────
function bookingWindowScore(daysUntilDeparture) {
  if (daysUntilDeparture > 120) return { score: 20, signal: 'wait',    reason: `${daysUntilDeparture} days out — prices often drop closer to ${90}-day mark` };
  if (daysUntilDeparture > 90)  return { score: 40, signal: 'monitor', reason: 'Still early — track weekly, prices may dip in next 3-4 weeks' };
  if (daysUntilDeparture > 60)  return { score: 60, signal: 'monitor', reason: 'Sweet spot approaching — good time to start serious comparison' };
  if (daysUntilDeparture > 30)  return { score: 75, signal: 'buy',     reason: 'Prime booking window — prices are near their floor for this route' };
  if (daysUntilDeparture > 14)  return { score: 85, signal: 'buy',     reason: 'Book soon — prices typically rise within 2 weeks of departure' };
  return { score: 95, signal: 'buy_now', reason: `Only ${daysUntilDeparture} days to departure — prices are rising, book immediately` };
}

// ── Seasonality score ────────────────────────────────────────────────────
function seasonalityScore(destCode, departureDate) {
  const month = new Date(departureDate).getMonth();
  const season = SEASONALITY[destCode] || SEASONALITY.DEFAULT;
  const demand = season[month]; // 0=low, 1=mid, 2=high
  if (demand === 0) return { score: -20, signal: 'low_season',  reason: 'Low season — fewer crowds and lower prices' };
  if (demand === 1) return { score: 0,   signal: 'shoulder',    reason: 'Shoulder season — good balance of price and experience' };
  return         { score: 25,  signal: 'peak_season', reason: 'Peak season — expect higher prices and more crowds' };
}

// ── Day-of-week adjustment ────────────────────────────────────────────────
function dowScore(departureDate) {
  const dow = new Date(departureDate).getDay(); // 0=Sun
  // Reorder to Mon=0
  const idx = dow === 0 ? 6 : dow - 1;
  return DOW_SCORE[idx] * 10; // scale to points
}

// ── Price trend from history ──────────────────────────────────────────────
function trendFromHistory(priceHistory = []) {
  if (priceHistory.length < 2) return { direction: 'unknown', pct: 0 };
  const sorted = [...priceHistory].sort((a, b) => a.timestamp - b.timestamp);
  const oldest = sorted[0].price;
  const newest = sorted[sorted.length - 1].price;
  const pct = ((newest - oldest) / oldest) * 100;
  if (Math.abs(pct) < 2) return { direction: 'stable', pct: 0 };
  return { direction: pct > 0 ? 'rising' : 'falling', pct: Math.round(pct) };
}

// ── Main scoring function ─────────────────────────────────────────────────
/**
 * @param {object} params
 * @param {string} params.destCode       - IATA destination code
 * @param {string} params.departureDate  - ISO date string of departure
 * @param {number} params.currentPrice   - Current lowest price found
 * @param {Array}  params.priceHistory   - [{price, timestamp}] array from localStorage
 * @returns {object} Heuristic result for use in UI + as Groq prompt input
 */
export function scoreFlight({ destCode, departureDate, currentPrice, priceHistory = [] }) {
  const now = new Date();
  const departure = new Date(departureDate);
  const daysUntil = Math.max(0, Math.round((departure - now) / (1000 * 60 * 60 * 24)));

  const window = bookingWindowScore(daysUntil);
  const seasonal = seasonalityScore(destCode, departureDate);
  const dowAdj = dowScore(departureDate);
  const trend = trendFromHistory(priceHistory);

  // Trend adjustment: if price is rising, nudge toward buy
  let trendAdj = 0;
  if (trend.direction === 'rising')  trendAdj = Math.min(15, trend.pct * 0.5);
  if (trend.direction === 'falling') trendAdj = Math.max(-15, trend.pct * 0.5);

  const rawScore = window.score + seasonal.score + dowAdj + trendAdj;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  // Derive final recommendation
  let recommendation, confidence;
  if (score >= 75) { recommendation = 'Buy Now';  confidence = Math.min(95, score); }
  else if (score >= 45) { recommendation = 'Monitor'; confidence = 60 + (score - 45) * 0.5; }
  else { recommendation = 'Wait'; confidence = Math.max(40, 100 - score); }
  confidence = Math.round(confidence);

  // Price direction indicator
  const direction = trend.direction === 'rising' ? '↑' : trend.direction === 'falling' ? '↓' : '→';

  return {
    score,
    recommendation,   // 'Buy Now' | 'Monitor' | 'Wait'
    confidence,        // 0-100
    direction,         // '↑' | '↓' | '→'
    trend,
    daysUntilDeparture: daysUntil,
    signals: {
      bookingWindow: window,
      seasonality:  seasonal,
      dayOfWeek:    { score: Math.round(dowAdj), reason: getDowReason(departureDate) },
      priceTrend:   trend,
    },
    // For Groq prompt context
    context: {
      destCode,
      departureDate,
      currentPrice,
      daysUntilDeparture: daysUntil,
      season: seasonal.signal,
      trendDirection: trend.direction,
      trendPct: trend.pct,
      historyPoints: priceHistory.length,
    },
  };
}

function getDowReason(departureDate) {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const cheap = ['Tuesday','Wednesday'];
  const day = days[new Date(departureDate).getDay()];
  if (cheap.includes(day)) return `${day} departures are typically cheapest`;
  if (day === 'Friday' || day === 'Sunday') return `${day} departures are typically most expensive`;
  return `${day} is a neutral day for prices`;
}

// ── Badge color for score ─────────────────────────────────────────────────
export function scoreColor(recommendation) {
  if (recommendation === 'Buy Now') return { bg: 'var(--green-bg)', color: 'var(--green)', border: '#a7f3d0' };
  if (recommendation === 'Monitor') return { bg: 'var(--amber-bg)', color: 'var(--amber)', border: '#fde68a' };
  return { bg: 'var(--blue-light)', color: 'var(--blue)', border: '#bfdbfe' };
}
