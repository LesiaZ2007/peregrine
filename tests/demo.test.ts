import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEMO_SPEC } from '@/lib/demo';

const { gatherFlights } = vi.hoisted(() => ({
  gatherFlights: vi.fn(async (_plan: { google: unknown[] }) => ({
    fares: new Map(),
    stats: { calls: 0, cached: 0, errors: [], skipped: 0 },
  })),
}));

vi.mock('@/lib/live', () => ({
  hasLiveAir: () => true,
  gatherFlights,
  busFare: vi.fn(),
  pool: vi.fn(async () => []),
}));

vi.mock('@/lib/providers/serp', () => ({
  hasSerp: () => true,
  quota: vi.fn(async () => ({ used: 0, limit: 250, ok: true })),
}));

import { POST } from '@/app/api/search/route';

describe('demo search route', () => {
  beforeEach(() => {
    gatherFlights.mockClear();
  });

  it('drops paid Google/SerpApi lookups when demo=true while keeping free live feeds', async () => {
    expect(DEMO_SPEC.origins.length).toBeGreaterThan(0);
    expect(DEMO_SPEC.tagsAny.length).toBeGreaterThan(0);
    expect(DEMO_SPEC.budgetTotal).toBeGreaterThan(0);
    const req = new Request('http://localhost/api/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...DEMO_SPEC, demo: true }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(gatherFlights).toHaveBeenCalledTimes(1);
    const plan = gatherFlights.mock.calls[0]?.[0];
    expect(plan?.google).toEqual([]);
  });
});
