import { DEFAULT_SPEC, PRESETS, normalizeSpec } from './spec';
import type { SearchSpec } from './types';

/** Pre-populated home base and weekend preferences for /demo so results load right away. */
export const DEMO_SPEC: SearchSpec = normalizeSpec({
  ...DEFAULT_SPEC,
  ...(PRESETS[0]?.patch ?? {}),
  origins: [{ label: 'Prague', lat: 50.0755, lon: 14.4378, cc: 'CZ', airports: ['PRG'] }],
  abroad: 'only',
  tagsAny: ['old-town', 'food', 'museums'],
  maxLegHours: 5,
  budgetTotal: 320,
  budgetTransport: 150,
  stayStyle: 'budget',
  foodStyle: 'cheap',
  currency: 'EUR',
});
