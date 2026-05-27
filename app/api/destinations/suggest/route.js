import { NextResponse } from 'next/server';
import { getRecommendedLocations, getFlightInspiration } from '@/lib/amadeus';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const codes  = searchParams.get('codes') || '';  // comma-separated city codes
  const origin = searchParams.get('origin') || ''; // for inspiration

  try {
    const results = [];

    if (codes) {
      const recs = await getRecommendedLocations(codes.split(','));
      results.push(...recs.map(r => ({ ...r, source: 'recommended' })));
    }

    if (origin) {
      const inspiration = await getFlightInspiration(origin);
      results.push(...inspiration.map(r => ({ ...r, source: 'inspiration' })));
    }

    return NextResponse.json({ data: results });
  } catch (err) {
    if (err.message.includes('not set')) {
      return NextResponse.json({ error: 'api_keys_missing', message: err.message }, { status: 503 });
    }
    return NextResponse.json({ error: 'suggest_failed', message: err.message }, { status: 500 });
  }
}
