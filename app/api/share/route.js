import { NextResponse } from 'next/server';
import { encodePlan, decodePlan } from '@/lib/share';

// POST /api/share — encode a plan and return share URL
export async function POST(request) {
  try {
    const plan = await request.json();
    const id = encodePlan(plan);
    if (!id) return NextResponse.json({ error: 'Failed to encode plan' }, { status: 400 });
    const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
    return NextResponse.json({ id, url: `${base}/share/${id}` });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/share?id=... — decode a share ID and return plan
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const plan = decodePlan(id);
  if (!plan) return NextResponse.json({ error: 'Invalid or expired share ID' }, { status: 404 });

  return NextResponse.json({ data: plan });
}
