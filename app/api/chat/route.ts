import { NextResponse } from 'next/server';

// Chat assistant on Groq's free tier (OpenAI-compatible API). Key: GROQ_API_KEY.
const URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b';

/** Settings the assistant may suggest; everything else in a suggestion is dropped. */
const ALLOWED = new Set([
  'scope', 'regions', 'countries', 'places', 'tagsAny', 'tagsNone', 'minDistanceKm', 'maxDistanceKm', 'abroad', 'inSeasonOnly',
  'skipVisited', 'when', 'modes', 'maxLegHours', 'maxTransfers', 'overnight', 'minHoursThere', 'travellers', 'budgetTransport',
  'budgetTotal', 'stayStyle', 'foodStyle', 'includeSights', 'under26', 'railcard', 'checkedBag', 'weights', 'sort',
]);

const SYSTEM = `You are Peregrine's trip assistant. Peregrine finds cheap, interesting trips by train, coach, flight, ferry, rideshare or car.
You get the traveller's current settings and their results as compact text. Use ONLY those numbers; never invent prices, times or routes.
Prices marked "live" are real fares. Prices marked "est." are estimates, and so are all stay and food costs: say so when it matters.
Flights are only listed with real fares (Ryanair, sometimes Google). If asked about cheaper airlines, point to the "Cheaper flights?" guidance and to Google Flights / Skyscanner.
Be brief and concrete. Use short paragraphs or a compact list. Compare on total cost, travel time, hours there, changes and what the place is like.
Money is in the traveller's currency, already converted.
If the traveller asks you to change the search (dates, budget, modes, places, interests...), end your reply with ONE fenced block:
\`\`\`settings
{ ...only the settings to change, using the field names from the settings JSON... }
\`\`\`
Budgets in that block are in the traveller's currency (the app converts them). Do not include the block unless a change was asked for or clearly helps.`;

interface Msg { role: 'user' | 'assistant'; content: string }

export async function POST(req: Request) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json({ error: 'no_key', message: 'The assistant needs a free Groq API key (GROQ_API_KEY) on the server.' }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { messages?: Msg[]; context?: string } | null;
  const messages = (body?.messages ?? []).filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string').slice(-12);
  if (!messages.length) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const context = String(body?.context ?? '').slice(0, 24_000);

  try {
    const res = await fetch(URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_completion_tokens: 1200,
        reasoning_effort: 'low',
        reasoning_format: 'hidden',
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'system', content: `Current state:\n${context}` },
          ...messages.map((m) => ({ role: m.role, content: m.content.slice(0, 2000) })),
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
    if (!res.ok) throw new Error(j.error?.message ?? `Groq ${res.status}`);
    const text = j.choices?.[0]?.message?.content?.trim() ?? '';
    // pull out a settings suggestion, keep only allowed fields
    let patch: Record<string, unknown> | null = null;
    const m = text.match(/```settings\s*([\s\S]*?)```/);
    if (m) {
      try {
        const raw = JSON.parse(m[1]) as Record<string, unknown>;
        patch = Object.fromEntries(Object.entries(raw).filter(([k]) => ALLOWED.has(k)));
        if (!Object.keys(patch).length) patch = null;
      } catch {
        patch = null;
      }
    }
    return NextResponse.json({ reply: text.replace(/```settings[\s\S]*?```/, '').trim(), patch });
  } catch (e) {
    return NextResponse.json({ error: 'upstream', message: (e as Error).message }, { status: 502 });
  }
}
