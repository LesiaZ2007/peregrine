/**
 * groq.js
 * Groq AI client for price prediction summaries.
 * Returns structured JSON so the UI can render it reliably.
 *
 * API call minimization:
 * - AI predictions are cached server-side per route + heuristic score for 60 minutes
 * - Only called when heuristic data is available (never cold-starts)
 * - Predictions are short (< 200 tokens) so cost is negligible
 */

import Groq from 'groq-sdk';

// Module-level cache (survives hot-reload)
const predictionCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 60 min

function cacheKey(context) {
  return `${context.destCode}:${context.departureDate?.slice(0,7)}:${context.season}:${context.trendDirection}:${Math.floor(context.daysUntilDeparture / 7)}`;
}

let _client = null;
function getClient() {
  if (!_client) {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error('GROQ_API_KEY is not set. See .env.local.example.');
    _client = new Groq({ apiKey: key });
  }
  return _client;
}

/**
 * Get an AI price prediction for a flight route.
 * @param {object} heuristicResult - Output from lib/heuristics.js scoreFlight()
 * @returns {Promise<{recommendation, confidence, reasoning, buyWindow, summary}>}
 */
export async function getPricePrediction(heuristicResult) {
  const ctx = heuristicResult.context;
  const key = cacheKey(ctx);

  const cached = predictionCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const prompt = buildPrompt(heuristicResult);

  const client = getClient();
  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are Peregrine, a smart travel price analyst. You give concise, actionable flight price recommendations. Always respond with valid JSON only — no markdown, no explanation outside the JSON.`,
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.4,
    max_tokens: 250,
    response_format: { type: 'json_object' },
  });

  let result;
  try {
    result = JSON.parse(completion.choices[0]?.message?.content || '{}');
  } catch {
    result = {
      recommendation: heuristicResult.recommendation,
      confidence: heuristicResult.confidence,
      reasoning: 'Based on booking window and seasonality analysis.',
      buyWindow: 'Check back in a few days for updated analysis.',
      summary: `Peregrine recommends: ${heuristicResult.recommendation}`,
    };
  }

  // Ensure required fields
  result.recommendation = result.recommendation || heuristicResult.recommendation;
  result.confidence      = result.confidence      || heuristicResult.confidence;
  result.summary         = result.summary         || `Peregrine says: ${result.recommendation}`;

  predictionCache.set(key, { data: result, expiresAt: Date.now() + CACHE_TTL });
  return result;
}

function buildPrompt(h) {
  const { score, recommendation, confidence, signals, context } = h;
  const { destCode, departureDate, currentPrice, daysUntilDeparture, season, trendDirection, trendPct, historyPoints } = context;

  return `Analyze this flight pricing situation and return a JSON object.

Flight: to ${destCode}, departing ${departureDate} (${daysUntilDeparture} days away)
Current price: $${currentPrice} USD
Booking window signal: ${signals.bookingWindow.signal} — ${signals.bookingWindow.reason}
Season: ${season} — ${signals.seasonality.reason}
Day-of-week: ${signals.dayOfWeek.reason}
Price trend: ${trendDirection}${trendPct ? ` (${trendPct > 0 ? '+' : ''}${trendPct}%)` : ''} (based on ${historyPoints} historical samples)
Heuristic score: ${score}/100 → ${recommendation} (${confidence}% confidence)

Return JSON with these exact fields:
{
  "recommendation": "Buy Now" | "Monitor" | "Wait",
  "confidence": 0-100,
  "reasoning": "2-3 sentence explanation referencing the specific signals above",
  "buyWindow": "Specific timeframe advice e.g. 'Book within the next 2 weeks' or 'Wait 4-6 weeks'",
  "summary": "One punchy sentence starting with 'Peregrine recommends...' for display in the UI"
}`;
}
