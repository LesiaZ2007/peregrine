import { NextResponse } from 'next/server';
import { searchFlights, searchMultiOrigin } from '@/lib/amadeus';

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const originsRaw      = searchParams.get('origins') || '';
  const destination     = searchParams.get('destination') || '';
  const departureDate   = searchParams.get('departureDate') || '';
  const returnDate      = searchParams.get('returnDate') || '';
  const adults          = parseInt(searchParams.get('adults') || '1');
  const travelClass     = searchParams.get('cabin') || 'ECONOMY';
  const max             = parseInt(searchParams.get('max') || '20');

  const origins = originsRaw.split(',').map(s => s.trim()).filter(Boolean);

  if (!origins.length || !destination || !departureDate) {
    return NextResponse.json({ error: 'Missing required params: origins, destination, departureDate' }, { status: 400 });
  }

  try {
    let results;
    if (origins.length === 1) {
      const offers = await searchFlights({ origin: origins[0], destination, departureDate, returnDate: returnDate || undefined, adults, travelClass, max });
      results = offers.map(o => ({ ...o, origin: origins[0] }));
    } else {
      results = await searchMultiOrigin({ origins, destination, departureDate, returnDate: returnDate || undefined, adults, travelClass, max });
    }

    // Sort by price
    results.sort((a, b) => a.price - b.price);

    return NextResponse.json({ data: results, count: results.length });
  } catch (err) {
    console.error('[/api/flights/search]', err.message);
    // Return structured error so UI can show "API keys needed" state
    if (err.message.includes('not set')) {
      return NextResponse.json({ error: 'api_keys_missing', message: err.message }, { status: 503 });
    }
    return NextResponse.json({ error: 'search_failed', message: err.message }, { status: 500 });
  }
}
