import { NextResponse } from 'next/server';
import { getPricePrediction } from '@/lib/groq';

export async function POST(request) {
  try {
    const body = await request.json();
    const { heuristicResult } = body;

    if (!heuristicResult) {
      return NextResponse.json({ error: 'Missing heuristicResult in body' }, { status: 400 });
    }

    const prediction = await getPricePrediction(heuristicResult);
    return NextResponse.json({ data: prediction });
  } catch (err) {
    if (err.message.includes('not set')) {
      return NextResponse.json({ error: 'api_keys_missing', message: err.message }, { status: 503 });
    }
    return NextResponse.json({ error: 'prediction_failed', message: err.message }, { status: 500 });
  }
}
