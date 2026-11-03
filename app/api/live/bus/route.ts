import { NextResponse } from 'next/server';
import { busFare } from '@/lib/live';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

/** Real FlixBus departures and the cheapest round trip that fits, for one trip. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const n = (k: string) => Number(q.get(k));
  const s = (k: string) => q.get(k) ?? '';
  const query = {
    fromName: s('fromName'), fromLat: n('fromLat'), fromLon: n('fromLon'),
    toName: s('toName'), toLat: n('toLat'), toLon: n('toLon'),
    depart: s('depart'), ret: s('ret'), leaveAfter: s('leaveAfter') || '00:00', backBy: s('backBy') || '23:59',
    overnight: s('overnight') !== '0',
  };
  if (!query.fromName || !query.toName || !DAY.test(query.depart) || !DAY.test(query.ret) || !TIME.test(query.leaveAfter) || !TIME.test(query.backBy)
    || [query.fromLat, query.fromLon, query.toLat, query.toLon].some((v) => !Number.isFinite(v))) {
    return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  }
  try {
    return NextResponse.json(await busFare(query));
  } catch (e) {
    return NextResponse.json({ error: 'upstream', message: (e as Error).message }, { status: 502 });
  }
}
