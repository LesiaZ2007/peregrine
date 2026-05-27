import { NextResponse } from 'next/server';
import { getCheapestDates } from '@/lib/amadeus';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const origin      = searchParams.get('origin') || '';
  const destination = searchParams.get('destination') || '';

  if (!origin || !destination) {
    return NextResponse.json({ error: 'Missing origin or destination' }, { status: 400 });
  }

  try {
    const dates = await getCheapestDates(origin, destination);
    return NextResponse.json({ data: dates });
  } catch (err) {
    if (err.message.includes('not set')) {
      return NextResponse.json({ error: 'api_keys_missing', message: err.message }, { status: 503 });
    }
    return NextResponse.json({ error: 'calendar_failed', message: err.message }, { status: 500 });
  }
}
