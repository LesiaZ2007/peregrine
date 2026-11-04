import { NextResponse } from 'next/server';
import { runTool, TOOLS } from '@/lib/chatTools';
import { toUsd } from '@/lib/money';
import { retryAfterSeconds } from '@/lib/retryAfter';
import { normalizeSpec } from '@/lib/spec';

// Chat assistant on Groq's free tier (OpenAI-compatible API). Key: GROQ_API_KEY.
const URL = 'https://api.groq.com/openai/v1/chat/completions';
// Groq's free tier allows ~8k tokens a minute per model, counting the prompt plus the reply allowance,
// so every request is kept small, and a busy model hands over to the next one (each has its own allowance).
const MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
const MAX_TOOL_ROUNDS = 3;
const REPLY_TOKENS = 1100;
const CONTEXT_CHARS = 6_000;
const TOOL_CHARS = 5_000;
/** wait this long at most for the per-minute allowance to refill before giving up */
const MAX_WAIT_S = 20;

class RateLimited extends Error {
  constructor(public waitS: number) { super('rate_limited'); }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Settings the assistant may suggest; everything else in a suggestion is dropped. */
const ALLOWED = new Set([
  'scope', 'regions', 'countries', 'places', 'tagsAny', 'tagsNone', 'minDistanceKm', 'maxDistanceKm', 'abroad', 'inSeasonOnly',
  'skipVisited', 'when', 'modes', 'maxLegHours', 'maxTransfers', 'overnight', 'minHoursThere', 'travellers', 'budgetTransport',
  'budgetTotal', 'stayStyle', 'foodStyle', 'includeSights', 'under26', 'railcard', 'checkedBag', 'weights', 'sort', 'modeMaxHours',
]);

const SYSTEM = `You are Peregrine's trip assistant. Peregrine finds cheap, interesting trips by train, coach, flight, ferry, rideshare or car.
You get the traveller's settings and what's on screen as compact text. You also have tools:
- lookup_places: every way to specific places from their home base, with prices per date and costs. Call it whenever a place they ask about isn't already in the context, or when you need per-date prices. Don't hesitate: look things up instead of saying you don't know.
- search_trips: run a fresh search with changed settings, for questions about places not on screen ("somewhere with beaches", "cheaper than 100").
Use ONLY numbers from the context or tool results; never invent prices, times or routes. "live" = real fare; "est." = estimate (say so when it matters); stay & food costs are estimates. Confidence n/5 tells how sure a price is.
Money is already in the traveller's currency.

Answer visually when comparing or when numbers matter:
- Use a markdown table for side-by-side facts (price, time, hours there, confidence).
- Add a chart as a fenced block (one or two per answer, max). Format, numbers only, in the traveller's currency:
\`\`\`chart
{"type":"bar","title":"All-in cost per person","unit":"€","labels":["Porto","Seville"],"series":[{"name":"Travel","values":[29,75]},{"name":"Stay & food","values":[120,130]}],"stacked":true}
\`\`\`
  type is always "bar"; use "stacked":true for parts of a total, false to compare series side by side (e.g. prices by date per place). Keep labels short.
Keep prose short and concrete.
If the traveller asks you to change the search, end with ONE fenced block:
\`\`\`settings
{ ...only the settings to change, field names from the settings JSON, budgets in the traveller's currency... }
\`\`\`
Only include it if a change was asked for or clearly helps.`;

interface Msg { role: 'user' | 'assistant'; content: string }
type ApiMsg = { role: string; content?: string | null; tool_calls?: { id: string; function: { name: string; arguments: string } }[]; tool_call_id?: string; name?: string };

export async function POST(req: Request) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json({ error: 'no_key', message: 'The assistant needs a free Groq API key (GROQ_API_KEY) on the server.' }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { messages?: Msg[]; context?: string; spec?: unknown } | null;
  const messages = (body?.messages ?? []).filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string').slice(-8);
  if (!messages.length) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const context = String(body?.context ?? '').slice(0, CONTEXT_CHARS);
  const spec = normalizeSpec(body?.spec);

  const convo: ApiMsg[] = [
    { role: 'system', content: SYSTEM },
    { role: 'system', content: `Current state:\n${context}` },
    // earlier answers (tables, charts) are long; the latest message is what matters most
    ...messages.map((m, i) => ({ role: m.role, content: m.content.slice(0, i === messages.length - 1 ? 2000 : 900) })),
  ];
  const used: string[] = [];

  try {
    let text = '';
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const j = await complete(key, convo, round < MAX_TOOL_ROUNDS);
      const msg = j.choices?.[0]?.message;
      if (msg?.tool_calls?.length) {
        convo.push({ role: 'assistant', content: msg.content ?? '', tool_calls: msg.tool_calls });
        for (const call of msg.tool_calls) {
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(call.function.arguments || '{}'); } catch { /* empty args */ }
          let out: string;
          try {
            out = await runTool(call.function.name, args, spec, (v) => toUsd(v, spec.currency));
          } catch (e) {
            out = `Tool failed: ${(e as Error).message}`;
          }
          used.push(call.function.name === 'lookup_places' ? `looked up ${(args.names as string[] | undefined)?.join(', ') ?? 'places'}` : 'ran a search');
          convo.push({ role: 'tool', tool_call_id: call.id, name: call.function.name, content: out.slice(0, TOOL_CHARS) });
        }
        continue;
      }
      text = msg?.content?.trim() ?? '';
      break;
    }

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
    return NextResponse.json({ reply: text.replace(/```settings[\s\S]*?```/, '').trim(), patch, used });
  } catch (e) {
    if (e instanceof RateLimited) {
      const s = Math.ceil(e.waitS);
      return NextResponse.json(
        { error: 'rate_limited', retryAfter: s, message: `The assistant is busy: the free AI plan only allows so much per minute. Try again in about ${s < 60 ? `${s} seconds` : `${Math.ceil(s / 60)} minutes`}.` },
        { status: 429, headers: { 'retry-after': String(s) } },
      );
    }
    // Groq's own error text can include account details, so it stays in the server log
    console.error('chat upstream error:', (e as Error).message);
    return NextResponse.json({ error: 'upstream', message: 'The assistant couldn’t answer just now. Try again in a moment.' }, { status: 502 });
  }
}

type Completion = { choices?: { message?: ApiMsg }[]; error?: { message?: string } };

/** One model call. A rate-limited model hands over to the next; if all are busy, wait briefly once. */
async function complete(key: string, convo: ApiMsg[], withTools: boolean): Promise<Completion> {
  let shortest = Infinity;
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const model of MODELS) {
      const res = await fetch(URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model, temperature: 0.3, max_completion_tokens: REPLY_TOKENS, reasoning_effort: 'low', reasoning_format: 'hidden',
          messages: convo, ...(withTools ? { tools: TOOLS, tool_choice: 'auto' } : {}),
        }),
        signal: AbortSignal.timeout(60_000),
      });
      const j = (await res.json().catch(() => ({}))) as Completion;
      if (res.ok) return j;
      const message = j.error?.message ?? `Groq ${res.status}`;
      if (res.status !== 429) throw new Error(message);
      shortest = Math.min(shortest, retryAfterSeconds(res.headers.get('retry-after'), message));
    }
    if (attempt === 0 && shortest <= MAX_WAIT_S) await sleep(shortest * 1000 + 250);
    else break;
  }
  throw new RateLimited(shortest);
}
