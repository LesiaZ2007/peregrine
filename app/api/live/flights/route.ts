import { NextResponse } from 'next/server';
import { flights, hasSerp } from '@/lib/providers/serp';

const IATA = /^[A-Z]{3}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const from = q.get('from') ?? '';
  const to = q.get('to') ?? '';
  const depart = q.get('depart') ?? '';
  const ret = q.get('ret') ?? '';
  const adults = Math.min(9, Math.max(1, Number(q.get('adults') ?? 1)));
  if (!IATA.test(from) || !IATA.test(to) || !DAY.test(depart) || !DAY.test(ret)) {
    return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  }
  if (!hasSerp()) return NextResponse.json({ error: 'no_key' }, { status: 503 });
  try {
    return NextResponse.json(await flights(from, to, depart, ret, adults));
  } catch (e) {
    return NextResponse.json({ error: 'upstream', message: (e as Error).message }, { status: 502 });
  }
}
