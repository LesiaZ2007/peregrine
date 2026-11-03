import { NextResponse } from 'next/server';
import { pool } from '@/lib/live';
import { routeShape } from '@/lib/providers/shapes';

const MAX = 12;

interface Item { key: string; from: [number, number]; to: [number, number]; time: string }

/** Real track shapes for up to 12 ground journeys, for the map. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { items?: Item[] } | null;
  const items = (body?.items ?? [])
    .filter((i) => typeof i.key === 'string' && [...(i.from ?? []), ...(i.to ?? [])].every(Number.isFinite) && !Number.isNaN(Date.parse(i.time)))
    .slice(0, MAX);
  const got = await pool(items, 3, (i) => routeShape(i.from, i.to, new Date(i.time).toISOString()));
  const shapes: Record<string, unknown> = {};
  got.forEach((g, k) => { shapes[items[k].key] = g.status === 'fulfilled' ? g.value : null; });
  return NextResponse.json({ shapes });
}
