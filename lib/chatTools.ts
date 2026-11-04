// Tools the chat assistant can call: look up places and run searches with the traveller's settings.
import 'server-only';
import { tripBrief } from './brief';
import { DESTINATIONS } from './data/destinations';
import { tripWindows } from './dates';
import { gatherFlights } from './live';
import { money } from './money';
import { planLive, runSearch } from './search';
import { normalizeSpec } from './spec';
import type { SearchSpec, Trip } from './types';

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'lookup_places',
      description:
        'Get every way to reach specific places from the traveller’s home base on their dates (limits ignored), with prices per date, stay & food costs and price confidence. Use for "compare X and Y", "how do I get to X", "how much is X".',
      parameters: {
        type: 'object',
        properties: { names: { type: 'array', items: { type: 'string' }, description: 'Place names, e.g. ["Porto", "Prague"] (max 5)' } },
        required: ['names'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_trips',
      description:
        'Run a fresh search with some settings changed (e.g. a region, tags, budget, modes, dates) and get the top results. Use when the question is about places not already on screen.',
      parameters: {
        type: 'object',
        properties: {
          changes: {
            type: 'object',
            description: 'Settings to change, using field names from the settings JSON (budgets in the traveller’s currency). e.g. {"tagsAny":["beach"],"budgetTotal":150}',
          },
        },
        required: ['changes'],
      },
    },
  },
] as const;

const ALLOWED = new Set([
  'scope', 'regions', 'countries', 'places', 'tagsAny', 'tagsNone', 'minDistanceKm', 'maxDistanceKm', 'abroad', 'inSeasonOnly',
  'when', 'modes', 'maxLegHours', 'maxTransfers', 'overnight', 'minHoursThere', 'travellers', 'budgetTransport', 'budgetTotal',
  'stayStyle', 'foodStyle', 'includeSights', 'under26', 'railcard', 'checkedBag', 'weights', 'sort', 'modeMaxHours',
]);

async function search(spec: SearchSpec) {
  const windows = tripWindows(spec.when);
  const { fares } = await gatherFlights({ ...planLive(spec, windows), google: [] }); // free sources only
  return runSearch(spec, { flights: fares });
}

function datesTable(t: Trip, spec: SearchSpec): string {
  return t.alts
    .map((a) => `  ${a.window.label}: ${(a.ways ?? []).filter((w) => w.ok).map((w) => `${w.chain.join('+')} ${money(w.price, spec.currency)}${w.source === 'live' ? ' live' : ' est.'}`).join(', ')}`)
    .join('\n');
}

export async function runTool(name: string, args: Record<string, unknown>, raw: SearchSpec, toUsd: (v: number) => number): Promise<string> {
  const spec = normalizeSpec(raw);
  if (!spec.origins.length) return 'No home base is set, so nothing can be priced. Ask the traveller to add one in the planner.';

  if (name === 'lookup_places') {
    const names = (Array.isArray(args.names) ? args.names : []).slice(0, 5).map(String);
    const found = names.map((n) => {
      const f = fold(n);
      return DESTINATIONS.find((d) => fold(d.name) === f) ?? DESTINATIONS.find((d) => fold(d.name).startsWith(f) || f.startsWith(fold(d.name))) ?? DESTINATIONS.find((d) => fold(`${d.name} ${d.country}`).includes(f));
    });
    const missing = names.filter((_, i) => !found[i]);
    const ids = [...new Set(found.filter(Boolean).map((d) => d!.id))];
    if (!ids.length) return `None of these are in Peregrine's catalog: ${names.join(', ')}.`;
    const r = await search({
      ...spec, scope: 'places', places: ids, tagsAny: [], tagsNone: [], exclude: [], skipVisited: false, skipBeenCountries: false,
      minDistanceKm: 0, maxDistanceKm: 0, budgetTotal: null, budgetTransport: null, maxLegHours: 48, maxTransfers: 9, minHoursThere: 0,
      modeMaxHours: {}, abroad: 'any', inSeasonOnly: false, limit: 5,
    });
    const trips = [...r.trips, ...r.near];
    return [
      ...trips.map((t) => `${tripBrief(t, spec.currency)}\n  prices by date:\n${datesTable(t, spec)}`),
      missing.length ? `Not in the catalog: ${missing.join(', ')}.` : '',
    ].filter(Boolean).join('\n\n');
  }

  if (name === 'search_trips') {
    const changes = (args.changes && typeof args.changes === 'object' ? args.changes : {}) as Record<string, unknown>;
    const patch = Object.fromEntries(Object.entries(changes).filter(([k]) => ALLOWED.has(k)));
    for (const k of ['budgetTotal', 'budgetTransport']) if (typeof patch[k] === 'number') patch[k] = Math.round(toUsd(patch[k] as number));
    const next = normalizeSpec({
      ...spec, ...patch,
      when: { ...spec.when, ...((patch.when as object) ?? {}) },
      modes: { ...spec.modes, ...((patch.modes as object) ?? {}) },
      weights: { ...spec.weights, ...((patch.weights as object) ?? {}) },
    });
    const r = await search({ ...next, limit: 12 });
    if (!r.trips.length) return `No trips match those settings.${r.near.length ? ` Just outside: ${r.near.slice(0, 5).map((t) => `${t.dest.name} (${t.nearMiss?.join('; ')})`).join(', ')}.` : ''}`;
    return r.trips.slice(0, 10).map((t, i) => `${i + 1}. ${tripBrief(t, spec.currency)}`).join('\n');
  }
  return `Unknown tool ${name}.`;
}
