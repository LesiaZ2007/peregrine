import { NextResponse } from 'next/server';
import { nearestAirports, searchAirports } from '@/lib/catalog';

interface GeoHit {
  name: string; latitude: number; longitude: number; country_code?: string; country?: string; admin1?: string; population?: number;
}

/** Home-base lookup: towns from Open-Meteo's free geocoder plus airports by code/name. */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim();
  if (q.length < 2) return NextResponse.json({ places: [] });

  let towns: GeoHit[] = [];
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`,
      { cache: 'force-cache', signal: AbortSignal.timeout(8000) },
    );
    towns = ((await res.json()) as { results?: GeoHit[] }).results ?? [];
  } catch {
    // fall back to airports only
  }

  const places = [
    ...towns.map((t) => ({
      kind: 'town' as const,
      label: t.name,
      detail: [t.admin1, t.country].filter(Boolean).join(', '),
      lat: t.latitude,
      lon: t.longitude,
      cc: t.country_code ?? '',
      airports: nearestAirports(t.latitude, t.longitude, 150, 3).map((a) => ({ code: a.code, name: a.name, km: Math.round(a.km) })),
    })),
    ...searchAirports(q, 4).map((a) => ({
      kind: 'airport' as const,
      label: `${a.city || a.name} (${a.code})`,
      detail: a.name,
      lat: a.lat,
      lon: a.lon,
      cc: a.cc,
      airports: [{ code: a.code, name: a.name, km: 0 }],
    })),
  ];
  return NextResponse.json({ places });
}
