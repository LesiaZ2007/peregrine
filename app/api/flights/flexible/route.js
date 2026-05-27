import { NextResponse } from 'next/server';
import { searchFlexibleDates, searchFlexibleMultiOrigin } from '@/lib/amadeus';

/**
 * GET /api/flights/flexible
 *
 * Searches across a flexible date window and returns cheapest options.
 *
 * Params:
 *   origins       comma-separated IATA codes
 *   destination   IATA code
 *   earliestDep   YYYY-MM-DD — earliest departure date
 *   latestReturn  YYYY-MM-DD — latest return date
 *   duration      nights to stay (default 7)
 *   adults        (default 1)
 *   cabin         ECONOMY | BUSINESS | etc (default ECONOMY)
 *   blackouts     comma-separated YYYY-MM-DD strings to exclude
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const originsRaw  = searchParams.get('origins') || '';
  const destination = searchParams.get('destination') || '';
  const earliestDep = searchParams.get('earliestDep') || '';
  const latestReturn = searchParams.get('latestReturn') || earliestDep; // single date fallback
  const duration    = parseInt(searchParams.get('duration') || '7');
  const adults      = parseInt(searchParams.get('adults') || '1');
  const travelClass = searchParams.get('cabin') || 'ECONOMY';
  const blackouts   = (searchParams.get('blackouts') || '').split(',').filter(Boolean);

  const origins = originsRaw.split(',').map(s => s.trim()).filter(Boolean);

  if (!origins.length || !destination || !earliestDep) {
    return NextResponse.json(
      { error: 'Missing required params: origins, destination, earliestDep' },
      { status: 400 }
    );
  }

  try {
    let results;

    if (origins.length === 1) {
      const flights = await searchFlexibleDates({
        origin: origins[0], destination,
        earliestDep, latestReturn, durationDays: duration,
        adults, travelClass, blackouts,
      });
      results = flights.map(f => ({ ...f, origin: origins[0] }));
    } else {
      results = await searchFlexibleMultiOrigin({
        origins, destination,
        earliestDep, latestReturn, durationDays: duration,
        adults, travelClass, blackouts,
      });
    }

    results.sort((a, b) => a.price - b.price);

    const best = results[0];
    return NextResponse.json({
      data:              results,
      count:             results.length,
      bestDepartureDate: best?.flexDepartureDate || null,
      bestReturnDate:    best?.flexReturnDate    || null,
      durationDays:      duration,
    });
  } catch (err) {
    console.error('[/api/flights/flexible]', err.message);
    if (err.message?.includes('not set')) {
      return NextResponse.json({ error: 'api_keys_missing', message: err.message }, { status: 503 });
    }
    return NextResponse.json({ error: 'search_failed', message: err.message }, { status: 500 });
  }
}
