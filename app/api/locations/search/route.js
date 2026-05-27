import { NextResponse } from 'next/server';
import { searchLocations } from '@/lib/amadeus';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('q')?.trim();

  if (!keyword || keyword.length < 2) {
    return NextResponse.json({ data: [] });
  }

  try {
    const results = await searchLocations(keyword);
    return NextResponse.json({ data: results });
  } catch (err) {
    // If keys not set, return empty (pickers fall back to static list)
    if (err.message?.includes('not set')) {
      return NextResponse.json({ data: [], error: 'api_keys_missing' });
    }
    console.error('Location search error:', err.message);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
