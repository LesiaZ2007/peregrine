import { NextResponse } from 'next/server';
import { journeys } from '@/lib/providers/transitous';

const num = (v: string | null) => (v == null || v === '' ? NaN : Number(v));

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const a: [number, number] = [num(q.get('fromLat')), num(q.get('fromLon'))];
  const b: [number, number] = [num(q.get('toLat')), num(q.get('toLon'))];
  const time = q.get('time') ?? '';
  if ([...a, ...b].some((n) => !Number.isFinite(n)) || Number.isNaN(Date.parse(time))) {
    return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  }
  try {
    return NextResponse.json({ journeys: await journeys(a, b, new Date(time).toISOString()) });
  } catch (e) {
    return NextResponse.json({ error: 'upstream', message: (e as Error).message }, { status: 502 });
  }
}
